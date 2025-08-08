import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

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

    // Verificar que tiene una suscripción activa de Stripe
    if (!business.subscription?.stripeSubscriptionId) {
      await client.close();
      return NextResponse.json(
        { error: 'No hay suscripción activa de Stripe' },
        { status: 400 }
      );
    }

    // Pausar la suscripción en Stripe
    const subscription = await stripe.subscriptions.update(
      business.subscription.stripeSubscriptionId,
      {
        pause_collection: {
          behavior: 'mark_uncollectible'
        }
      }
    );

    // Actualizar en la base de datos
    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'subscription.status': 'paused',
          'subscription.pausedAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Suscripción pausada correctamente',
      subscription: {
        id: subscription.id,
        status: 'paused'
      }
    });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    return NextResponse.json(
      { error: 'Error al pausar la suscripción' },
      { status: 500 }
    );
  }
}
