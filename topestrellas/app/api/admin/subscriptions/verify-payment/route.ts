import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

// Configuración de Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Función para obtener precio del plan desde la base de datos
async function getPlanPrice(planKey: string) {
  const db = await getDatabase();
  const plan = await db.collection('subscriptionplans').findOne({ key: planKey, active: true });
  return plan ? plan.recurringPrice : 0;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { sessionId, orderId } = await request.json();

    if (!sessionId && !orderId) {
      return NextResponse.json(
        { error: 'Faltan parámetros de verificación' },
        { status: 400 }
      );
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    // Buscar el pago pendiente
    const pendingPayment = await db.collection('pending_payments').findOne({
      $or: [
        { sessionId: sessionId },
        { orderId: orderId }
      ],
      userId: user.email,
      status: 'pending'
    });

    if (!pendingPayment) {
      await client.close();
      return NextResponse.json(
        { error: 'No se encontró el pago pendiente' },
        { status: 404 }
      );
    }

    let paymentVerified = false;
    let subscriptionData: any = {};

    // Verificar según el método de pago
    if (pendingPayment.paymentMethod === 'stripe' && sessionId) {
      // Verificar con Stripe
      const stripe = require('stripe')(STRIPE_SECRET_KEY);
      
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
          paymentVerified = true;
          subscriptionData = {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            paymentMethod: 'stripe'
          };
        }
      } catch (stripeError) {
        console.error('Error verificando con Stripe:', stripeError);
      }
    } else if (pendingPayment.paymentMethod === 'paypal' && orderId) {
      // Para PayPal, normalmente verificarías con su API
      // Por simplicidad, asumimos que si llegó aquí es porque el pago fue exitoso
      // En producción, deberías verificar con la API de PayPal
      paymentVerified = true;
      subscriptionData = {
        paypalOrderId: orderId,
        paymentMethod: 'paypal'
      };
    }

    if (paymentVerified) {
      // Actualizar el negocio con la nueva suscripción
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      await db.collection('businesses').updateOne(
        { _id: pendingPayment.businessId },
        {
          $set: {
            plan: pendingPayment.plan,
            'subscription.plan': pendingPayment.plan,
            'subscription.status': 'active',
            'subscription.startDate': now,
            'subscription.endDate': endDate,
            'subscription.paymentMethod': pendingPayment.paymentMethod,
            'subscription.autoRenew': true,
            'subscription.lastPayment': {
              date: now,
              amount: await getPlanPrice(pendingPayment.plan),
              method: pendingPayment.paymentMethod
            },
            ...subscriptionData,
            updatedAt: now
          }
        }
      );

      // Marcar el pago como completado
      await db.collection('pending_payments').updateOne(
        { _id: pendingPayment._id },
        {
          $set: {
            status: 'completed',
            completedAt: now
          }
        }
      );

      // Crear registro en el historial de pagos
      await db.collection('payment_history').insertOne({
        businessId: pendingPayment.businessId,
        userId: user.email,
        plan: pendingPayment.plan,
        amount: await getPlanPrice(pendingPayment.plan),
        currency: 'EUR',
        paymentMethod: pendingPayment.paymentMethod,
        status: 'completed',
        ...subscriptionData,
        createdAt: now
      });

      await client.close();
      return NextResponse.json({ success: true });
    } else {
      // Marcar el pago como fallido
      await db.collection('pending_payments').updateOne(
        { _id: pendingPayment._id },
        {
          $set: {
            status: 'failed',
            failedAt: new Date()
          }
        }
      );

      await client.close();
      return NextResponse.json(
        { error: 'El pago no pudo ser verificado' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Error al verificar el pago' },
      { status: 500 }
    );
  }
}
