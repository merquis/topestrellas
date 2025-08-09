import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  createSubscriptionAndReturnClientSecret,
  confirmSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  changePlan,
  getSubscriptionStatus,
  getPlanFromDB,
  validateBusinessAccess
} from '@/lib/subscriptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// GET - Obtener información de suscripción del negocio actual
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId requerido' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Si hay una suscripción de Stripe, obtener información actualizada
    let stripeSubscription = null;
    if (business.subscription?.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          business.subscription.stripeSubscriptionId
        );
      } catch (error) {
        console.error('Error obteniendo suscripción de Stripe:', error);
      }
    }

    // Obtener información del plan actual
    let currentPlan = null;
    if (business.subscription?.plan) {
      currentPlan = await getPlanFromDB(business.subscription.plan);
    }

    // Obtener historial de pagos
    let paymentHistory: any[] = [];
    if (business.subscription?.stripeSubscriptionId) {
      try {
        const invoices = await stripe.invoices.list({
          subscription: business.subscription.stripeSubscriptionId,
          limit: 10,
        });
        paymentHistory = invoices.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100, // Convertir de céntimos a euros
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000),
          pdfUrl: invoice.invoice_pdf,
        }));
      } catch (error) {
        console.error('Error obteniendo historial de pagos:', error);
      }
    }

    return NextResponse.json({
      success: true,
      subscription: {
        ...business.subscription,
        currentPlan,
        stripeDetails: stripeSubscription ? {
          status: stripeSubscription.status,
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        } : null,
        paymentHistory,
      }
    });
  } catch (error) {
    console.error('Error obteniendo información de suscripción:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo información de suscripción' },
      { status: 500 }
    );
  }
}

// POST - Crear sesión de checkout para nueva suscripción o cambio de plan
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, planKey, userEmail, action = 'subscribe' } = body;

    if (!businessId || !planKey || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'businessId, planKey y userEmail son requeridos' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Verificar el plan
    const plan = await getPlanFromDB(planKey);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    // Si es un cambio de plan y ya tiene suscripción activa
    if (action === 'change' && business.subscription?.stripeSubscriptionId) {
      try {
        const updatedSubscription = await changePlan(
          business.subscription.stripeSubscriptionId,
          planKey,
          true // Prorratear
        );

        return NextResponse.json({
          success: true,
          message: 'Plan cambiado exitosamente',
          subscription: updatedSubscription,
        });
      } catch (error) {
        console.error('Error cambiando plan:', error);
        return NextResponse.json(
          { success: false, error: 'Error cambiando plan' },
          { status: 500 }
        );
      }
    }

    // Crear suscripción y obtener client secret para pago embebido
    try {
      const { clientSecret, subscriptionId, customerId } = await createSubscriptionAndReturnClientSecret(
        businessId,
        planKey,
        userEmail,
        business.name
      );

      // Guardar el ID de suscripción temporal en la DB si es una suscripción recurrente
      if (subscriptionId) {
        await db.collection('businesses').updateOne(
          { _id: new ObjectId(businessId) },
          { 
            $set: { 
              'subscription.pendingSubscriptionId': subscriptionId,
              'subscription.stripeCustomerId': customerId,
              updatedAt: new Date()
            } 
          }
        );
      }

      return NextResponse.json({
        success: true,
        clientSecret,
        subscriptionId,
        customerId,
        plan: {
          name: plan.name,
          price: plan.recurringPrice,
          setupFee: plan.setupPrice,
          currency: plan.currency,
          interval: plan.interval,
        }
      });
    } catch (error) {
      console.error('Error creando payment intent:', error);
      return NextResponse.json(
        { success: false, error: 'Error creando payment intent' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error procesando suscripción:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando suscripción' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar suscripción (pausar, reanudar, etc.)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { businessId, action } = body;

    if (!businessId || !action) {
      return NextResponse.json(
        { success: false, error: 'businessId y action son requeridos' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    if (!business.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No hay suscripción activa' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'pause':
        result = await pauseSubscription(business.subscription.stripeSubscriptionId);
        break;
      
      case 'resume':
        result = await resumeSubscription(business.subscription.stripeSubscriptionId);
        break;
      
      case 'cancel':
        const immediately = body.immediately || false;
        result = await cancelSubscription(business.subscription.stripeSubscriptionId, immediately);
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Suscripción ${action} exitosamente`,
      subscription: result,
    });
  } catch (error) {
    console.error('Error actualizando suscripción:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando suscripción' },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar suscripción
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const immediately = searchParams.get('immediately') === 'true';

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId requerido' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    if (!business.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No hay suscripción activa para cancelar' },
        { status: 400 }
      );
    }

    try {
      const canceledSubscription = await cancelSubscription(
        business.subscription.stripeSubscriptionId,
        immediately
      );

      // Registrar la cancelación en el log de actividad
      await db.collection('activity_logs').insertOne({
        businessId,
        type: 'subscription_canceled',
        description: immediately ? 'Suscripción cancelada inmediatamente' : 'Suscripción cancelada al final del período',
        metadata: {
          subscriptionId: canceledSubscription.id,
          canceledAt: new Date(),
          immediately,
        },
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: immediately 
          ? 'Suscripción cancelada inmediatamente' 
          : 'Suscripción se cancelará al final del período de facturación',
        subscription: canceledSubscription,
      });
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      return NextResponse.json(
        { success: false, error: 'Error cancelando suscripción' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en cancelación:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando cancelación' },
      { status: 500 }
    );
  }
}
