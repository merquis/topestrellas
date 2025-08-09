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
    const signature = headers().get('stripe-signature');

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

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      // ========== EVENTOS DE CHECKOUT ==========
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completado:', session.id);

        const businessId = session.metadata?.businessId;
        const planKey = session.metadata?.planKey;

        if (!businessId || !planKey) {
          console.error('Metadata incompleta en checkout session');
          break;
        }

        // Si es una suscripción
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await updateBusinessSubscription(businessId, {
            plan: planKey,
            status: stripeStatusToOurStatus[subscription.status] || 'active',
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id,
            validUntil: new Date(subscription.current_period_end * 1000),
            active: true,
          });

          console.log(`Suscripción creada para negocio ${businessId}`);
        } 
        // Si es un pago único
        else if (session.payment_intent) {
          await updateBusinessSubscription(businessId, {
            plan: planKey,
            status: 'active',
            active: true,
          });

          console.log(`Pago único procesado para negocio ${businessId}`);
        }

        break;
      }

      // ========== EVENTOS DE SUSCRIPCIÓN ==========
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

        await updateBusinessSubscription(businessId, {
          plan: planKey || 'unknown',
          status: stripeStatusToOurStatus[subscription.status] || 'active',
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          validUntil: new Date(subscription.current_period_end * 1000),
          active: subscription.status === 'active' || subscription.status === 'trialing',
        });

        // Si la suscripción está activa, resetear fallos de pago
        if (subscription.status === 'active') {
          await resetPaymentFailures(businessId);
        }

        console.log(`Suscripción ${event.type} para negocio ${businessId}`);
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
            trialEnd: new Date(subscription.trial_end! * 1000),
          },
          createdAt: new Date(),
        });

        break;
      }

      // ========== EVENTOS DE FACTURA ==========
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription;

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
          validUntil: new Date(subscriptionObj.current_period_end * 1000),
        });

        await resetPaymentFailures(businessId);

        console.log(`Factura pagada para negocio ${businessId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription;

        if (!subscription) break;

        const subscriptionObj = await stripe.subscriptions.retrieve(
          subscription as string
        );
        const businessId = subscriptionObj.metadata?.businessId;

        if (!businessId) {
          console.error('No businessId en metadata de factura fallida');
          break;
        }

        await handlePaymentFailure(businessId);

        console.log(`Pago fallido para negocio ${businessId}`);
        
        // Registrar el evento
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'payment_failed',
          description: 'Fallo en el pago de la suscripción',
          metadata: {
            invoiceId: invoice.id,
            amountDue: invoice.amount_due,
            attemptCount: invoice.attempt_count,
          },
          createdAt: new Date(),
        });

        break;
      }

      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription;

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
            dueDate: new Date(invoice.period_end * 1000),
          },
          createdAt: new Date(),
        });

        break;
      }

      // ========== EVENTOS DE PAGO ==========
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const businessId = paymentIntent.metadata?.businessId;

        if (!businessId) {
          console.log('PaymentIntent sin businessId en metadata');
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

      // ========== EVENTOS DE MÉTODO DE PAGO ==========
      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`Método de pago adjuntado: ${paymentMethod.id}`);
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`Método de pago desvinculado: ${paymentMethod.id}`);
        break;
      }

      case 'payment_method.updated': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`Método de pago actualizado: ${paymentMethod.id}`);
        break;
      }

      // ========== EVENTOS DE CARGO ==========
      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Cargo exitoso: ${charge.id}`);
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Cargo fallido: ${charge.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const businessId = charge.metadata?.businessId;

        if (businessId) {
          console.log(`Reembolso procesado para negocio ${businessId}`);
          
          // Registrar el evento
          await db.collection('activity_logs').insertOne({
            businessId,
            type: 'refund_processed',
            description: 'Reembolso procesado',
            metadata: {
              chargeId: charge.id,
              amount: charge.amount_refunded,
              currency: charge.currency,
            },
            createdAt: new Date(),
          });
        }
        break;
      }

      // ========== EVENTOS DE DISPUTA ==========
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = await stripe.charges.retrieve(dispute.charge as string);
        const businessId = charge.metadata?.businessId;

        if (businessId) {
          console.log(`Disputa creada para negocio ${businessId}`);
          
          // Suspender la cuenta temporalmente
          await updateBusinessSubscription(businessId, {
            status: 'suspended',
            active: false,
          });
          
          // Registrar el evento
          await db.collection('activity_logs').insertOne({
            businessId,
            type: 'dispute_created',
            description: 'Disputa de pago iniciada',
            metadata: {
              disputeId: dispute.id,
              amount: dispute.amount,
              reason: dispute.reason,
            },
            createdAt: new Date(),
          });
        }
        break;
      }

      default:
        console.log(`Evento no manejado: ${event.type}`);
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
