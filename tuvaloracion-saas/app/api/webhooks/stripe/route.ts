import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { 
  updateBusinessSubscription,
  handlePaymentFailure,
  resetPaymentFailures,
  getPlanFromDB
} from '@/lib/subscriptions';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Mapeo de estados de Stripe a nuestros estados
const stripeStatusToOurStatus: Record<string, string> = {
  'active': 'active',
  'past_due': 'past_due',
  'unpaid': 'suspended',
  'canceled': 'canceled',
  'incomplete': 'inactive',
  'incomplete_expired': 'canceled',
  'trialing': 'trialing',
  'paused': 'suspended',
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No stripe-signature header');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Webhook recibido: ${event.type}`);

    const db = await getDatabase();

    // Manejar solo los eventos esenciales para suscripciones con Payment Elements
    switch (event.type) {
      // ========== EVENTOS DE SETUP INTENT (NUEVO FLUJO) ==========
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const { businessId, userEmail, action } = setupIntent.metadata!;

        if (!businessId) {
          console.error('[Webhook] Falta businessId en metadata de setup_intent.succeeded');
          break;
        }

        console.log(`[Webhook] SetupIntent exitoso para businessId: ${businessId}, action: ${action}`);

        const customerId = setupIntent.customer as string;
        const paymentMethodId = setupIntent.payment_method as string;

        // Buscar el negocio
        const business = await db.collection('businesses').findOne({ _id: new ObjectId(businessId) });
        
        if (!business) {
          console.error(`[Webhook] No se encontró el negocio con ID: ${businessId}`);
          break;
        }

        // 1. Adjuntar el método de pago al cliente y establecerlo como predeterminado
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
        console.log(`[Webhook] Método de pago ${paymentMethodId} asignado al cliente ${customerId}`);

        // 2. Si es una actualización de método de pago, solo actualizar el método predeterminado
        if (action === 'update_payment_method') {
          console.log(`[Webhook] Método de pago actualizado exitosamente para negocio ${businessId}`);
          
          // Registrar el evento
          await db.collection('activity_logs').insertOne({
            businessId,
            type: 'payment_method_updated',
            description: 'Método de pago actualizado exitosamente',
            metadata: {
              paymentMethodId,
              customerId,
            },
            createdAt: new Date(),
          });
          
          break;
        }

        // 3. Si es una nueva suscripción, verificar idempotencia
        if (business?.subscription?.stripeSubscriptionId && (business?.subscription?.status === 'active' || business?.subscription?.status === 'trialing')) {
          console.log(`[Webhook] El negocio ${businessId} ya tiene una suscripción activa o en prueba. Se ignora el evento.`);
          break;
        }

        // 4. Crear la suscripción usando el plan guardado dinámicamente
        const planKey = business.selectedPlanKey;
        if (!planKey) {
          console.error(`[Webhook] No se encontró 'selectedPlanKey' en el negocio ${businessId}. No se puede crear la suscripción.`);
          break;
        }
        
        const plan = await getPlanFromDB(planKey);

        if (!plan || !plan.stripePriceId) {
          console.error(`[Webhook] No se pudo encontrar un plan válido ('${planKey}') para crear la suscripción.`);
          break;
        }

        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: plan.stripePriceId }],
          collection_method: 'charge_automatically',
          trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
          metadata: {
            businessId,
            planKey,
          },
        });

        console.log(`[Webhook] Suscripción ${subscription.id} creada para el negocio ${businessId}`);
        
        // La actualización de la DB se manejará en el evento 'customer.subscription.created'
        // para mantener la lógica centralizada. Stripe enviará ese evento inmediatamente.

        break;
      }

      case 'setup_intent.setup_failed': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const { businessId } = setupIntent.metadata!;
        
        console.error(`[Webhook] Falló el SetupIntent para businessId: ${businessId}. Razón: ${setupIntent.last_setup_error?.message}`);

        // Aquí podrías marcar el negocio en la DB para notificar al usuario
        await db.collection('businesses').updateOne(
          { _id: new ObjectId(businessId) },
          { $set: { 'subscription.status': 'payment_failed' } }
        );
        
        break;
      }

      // ========== EVENTOS DE SUSCRIPCIÓN (los más importantes) ==========
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de suscripción');
          break;
        }

        const planKey = subscription.metadata?.planKey || 
                       subscription.items.data[0]?.price.metadata?.planKey;

        const plan = planKey ? await getPlanFromDB(planKey) : null;

        await updateBusinessSubscription(businessId, {
          plan: planKey || 'unknown',
          status: stripeStatusToOurStatus[subscription.status] || 'active',
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          validUntil: new Date((subscription as any).current_period_end * 1000),
          active: subscription.status === 'active' || subscription.status === 'trialing',
          ...(plan?.color ? { color: plan.color } : {})
        });

        // Si la suscripción está activa, resetear fallos de pago
        if (subscription.status === 'active') {
          await resetPaymentFailures(businessId);
        }

        // También actualizar el usuario asociado al negocio
        await db.collection('users').updateOne(
          { businessId },
          {
            $set: {
              role: 'admin',
              paymentCompleted: true,
              registrationStatus: 'complete',
              updatedAt: new Date()
            }
          }
        );

        console.log(`Suscripción ${event.type} para negocio ${businessId}, estado: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de suscripción cancelada');
          break;
        }

        await updateBusinessSubscription(businessId, {
          status: 'canceled',
          active: false,
        });

        console.log(`Suscripción cancelada para negocio ${businessId}`);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de suscripción pausada');
          break;
        }

        await updateBusinessSubscription(businessId, {
          status: 'suspended',
          active: false,
        });

        console.log(`Suscripción pausada para negocio ${businessId}`);
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de suscripción reanudada');
          break;
        }

        await updateBusinessSubscription(businessId, {
          status: 'active',
          active: true,
        });

        await resetPaymentFailures(businessId);

        console.log(`Suscripción reanudada para negocio ${businessId}`);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de trial_will_end');
          break;
        }

        // Aquí podrías enviar un email recordatorio
        console.log(`Periodo de prueba terminará pronto para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'subscription_trial_ending',
          description: 'El periodo de prueba terminará en 3 días',
          metadata: {
            subscriptionId: subscription.id,
            trialEnd: new Date((subscription as any).trial_end! * 1000),
          },
          createdAt: new Date(),
        });

        break;
      }

      // ========== EVENTOS DE FACTURA (para gestionar pagos recurrentes) ==========
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as any).subscription;

        if (!subscription) break;

        const subscriptionObj = await stripe.subscriptions.retrieve(
          subscription as string
        );
        const businessId = subscriptionObj.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de factura pagada');
          break;
        }

        await updateBusinessSubscription(businessId, {
          status: 'active',
          active: true,
          validUntil: new Date((subscriptionObj as any).current_period_end * 1000),
        });

        await resetPaymentFailures(businessId);

        console.log(`Pago de factura exitoso para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'invoice_paid',
          description: 'Factura pagada exitosamente',
          metadata: {
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            subscriptionId: subscription,
          },
          createdAt: new Date(),
        });

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as any).subscription;

        if (!subscription) break;

        const subscriptionObj = await stripe.subscriptions.retrieve(
          subscription as string
        );
        const businessId = subscriptionObj.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de factura fallida');
          break;
        }

        // Manejar el fallo de pago (incrementar contador, suspender si es necesario)
        await handlePaymentFailure(businessId);

        console.log(`Pago fallido para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'payment_failed',
          description: 'Fallo en el pago de la factura',
          metadata: {
            invoiceId: invoice.id,
            amountDue: invoice.amount_due,
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
          },
          createdAt: new Date(),
        });

        break;
      }

      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as any).subscription;

        if (!subscription) break;

        const subscriptionObj = await stripe.subscriptions.retrieve(
          subscription as string
        );
        const businessId = subscriptionObj.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de factura próxima');
          break;
        }

        // Aquí podrías enviar un email de recordatorio
        console.log(`Factura próxima para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'upcoming_invoice',
          description: 'Próxima factura de suscripción',
          metadata: {
            amountDue: invoice.amount_due,
            dueDate: new Date((invoice as any).period_end * 1000),
          },
          createdAt: new Date(),
        });

        break;
      }

      // ========== EVENTOS DE PAYMENT INTENT (para pagos únicos y primera suscripción) ==========
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const businessId = paymentIntent.metadata?.businessId;

        if (!businessId) {
          // Es normal que algunos payment intents no tengan businessId
          console.log('PaymentIntent sin businessId en metadata (puede ser de una invoice)');
          break;
        }

        console.log(`Pago exitoso para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'payment_succeeded',
          description: 'Pago procesado exitosamente',
          metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
          createdAt: new Date(),
        });

        break;
      }

      case 'payment_intent.processing': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const businessId = paymentIntent.metadata?.businessId;

        if (!businessId) break;

        console.log(`Pago en procesamiento para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'payment_processing',
          description: 'Pago en procesamiento',
          metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
          },
          createdAt: new Date(),
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const businessId = paymentIntent.metadata?.businessId;

        if (!businessId) {
          console.log('PaymentIntent fallido sin businessId en metadata');
          break;
        }

        console.log(`Pago fallido para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'payment_failed',
          description: 'Fallo en el procesamiento del pago',
          metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            error: paymentIntent.last_payment_error?.message,
          },
          createdAt: new Date(),
        });

        break;
      }

      // Eliminar la lógica de payment_intent.* que dependía de default_incomplete
      // Los eventos de payment_intent seguirán ocurriendo para los pagos de facturas,
      // pero ya no son el desencadenante principal de la activación de la suscripción.
      // La lógica actual que solo registra logs es correcta y puede permanecer.

      default:
        // Solo loguear eventos no manejados en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log(`Evento no manejado: ${event.type}`);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
