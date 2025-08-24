import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { confirmSubscription, updateBusinessSubscription } from '@/lib/subscriptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscriptionId, businessId, paymentIntentId } = body;

    if (!businessId || !paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'businessId y paymentIntentId son requeridos' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Verificar que el negocio existe
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Verificar el estado del PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'El pago no se ha completado exitosamente' },
        { status: 400 }
      );
    }

    // Si hay un subscriptionId, confirmar la suscripción
    if (subscriptionId) {
      try {
        const subscription = await confirmSubscription(subscriptionId);
        
        // Actualizar la información de suscripción en la base de datos
        await updateBusinessSubscription(businessId, {
          plan: subscription.metadata?.planKey || 'unknown',
          status: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0]?.price.id,
          validUntil: new Date((subscription as any).current_period_end * 1000),
          active: subscription.status === 'active' || subscription.status === 'trialing',
        });

        // Eliminar el pendingSubscriptionId
        await db.collection('businesses').updateOne(
          { _id: new ObjectId(businessId) },
          { 
            $unset: { 'subscription.pendingSubscriptionId': '' },
            $set: { updatedAt: new Date() }
          }
        );

        // Registrar el evento en el log de actividad
        await db.collection('activity_logs').insertOne({
          businessId,
          type: 'subscription_activated',
          description: 'Suscripción activada exitosamente',
          metadata: {
            subscriptionId: subscription.id,
            paymentIntentId,
            plan: subscription.metadata?.planKey,
            status: subscription.status,
          },
          createdAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          message: 'Suscripción confirmada exitosamente',
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          }
        });
      } catch (error) {
        console.error('Error confirmando suscripción:', error);
        return NextResponse.json(
          { success: false, error: 'Error confirmando suscripción' },
          { status: 500 }
        );
      }
    } else {
      // Para pagos únicos, solo actualizar el estado
      const planKey = paymentIntent.metadata?.planKey;
      
      await updateBusinessSubscription(businessId, {
        plan: planKey || 'unknown',
        status: 'active',
        active: true,
      });

      // Registrar el evento
      await db.collection('activity_logs').insertOne({
        businessId,
        type: 'payment_completed',
        description: 'Pago único completado exitosamente',
        metadata: {
          paymentIntentId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          plan: planKey,
        },
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Pago confirmado exitosamente',
      });
    }
  } catch (error) {
    console.error('Error confirmando pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando confirmación' },
      { status: 500 }
    );
  }
}
