import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

export async function POST(
  request: Request,
  context: any
) {
  try {
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = context?.params?.id;
    if (!businessId) {
      return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    
    // Obtener el negocio actual
    const business = await db.collection('businesses').findOne({ _id: new ObjectId(businessId) });
    
    if (!business) {
      await client.close();
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    // 1. Re-activar la suscripción en Stripe
    const stripeSubscription = await stripe.subscriptions.update(
      business.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        proration_behavior: 'create_prorations',
        items: [{
          id: business.subscription.stripeSubscriptionItemId,
          price: business.subscription.stripePriceId,
        }],
      }
    );

    // 2. Actualizar el negocio en la base de datos
    const now = new Date();
    const updateResult = await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'subscription.status': 'active',
          'subscription.validUntil': new Date(stripeSubscription.current_period_end * 1000),
          'subscription.cancelledAt': null,
          'subscription.cancellationReason': null,
          'subscription.cancellationFeedback': null,
          updatedAt: now
        },
        $unset: {
          'subscription.cancellationReason': "",
          'subscription.cancellationFeedback': ""
        }
      }
    );

    // 3. Registrar en el historial
    await db.collection('subscription_history').insertOne({
      businessId: new ObjectId(businessId),
      userId: user.email,
      action: 'reactivated',
      plan: business.subscription.plan,
      createdAt: now
    });

    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Suscripción reactivada correctamente'
    });

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Error al reactivar la suscripción' },
      { status: 500 }
    );
  }
}
