import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

// Configuración de Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = params.id;

    if (!businessId) {
      return NextResponse.json(
        { error: 'ID de negocio requerido' },
        { status: 400 }
      );
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    // Obtener información del negocio
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      await client.close();
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (user.role === 'admin') {
      const usersCollection = db.collection('users');
      const userData = await usersCollection.findOne({ email: user.email });
      
      if (!userData?.businessIds?.includes(businessId)) {
        await client.close();
        return NextResponse.json(
          { error: 'No tienes permisos para este negocio' },
          { status: 403 }
        );
      }
    }

    // Cancelar suscripción en Stripe si existe
    if (business.subscription?.stripeSubscriptionId) {
      try {
        const stripe = require('stripe')(STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(business.subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Error cancelando suscripción en Stripe:', stripeError);
      }
    }

    // Actualizar el negocio
    const now = new Date();
    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          plan: 'trial',
          'subscription.status': 'cancelled',
          'subscription.cancelledAt': now,
          'subscription.autoRenew': false,
          'subscription.cancellationReason': 'User requested',
          updatedAt: now
        }
      }
    );

    // Registrar la cancelación en el historial
    await db.collection('subscription_history').insertOne({
      businessId: new ObjectId(businessId),
      userId: user.email,
      action: 'cancelled',
      previousPlan: business.plan,
      newPlan: 'trial',
      reason: 'User requested',
      createdAt: now
    });

    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Suscripción cancelada correctamente'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Error al cancelar la suscripción' },
      { status: 500 }
    );
  }
}
