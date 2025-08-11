import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil',
});

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function POST(
  request: Request,
  context: any
) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = context?.params?.id;

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
    if (user.role !== 'super_admin') {
      const usersCollection = db.collection('users');
      const userData = await usersCollection.findOne({ email: user.email });
      
      const candidateIds = [
        ...(Array.isArray((userData as any)?.businessIds) ? (userData as any).businessIds : []),
        (userData as any)?.businessId
      ]
        .filter(Boolean)
        .map((x: any) => (typeof x === 'string' ? x : x.toString()));

      const isOwnerById = candidateIds.includes(businessId.toString());
      const isOwnerByEmail = (business as any)?.contact?.email === user.email;

      if (!isOwnerById && !isOwnerByEmail) {
        await client.close();
        return NextResponse.json(
          { error: 'No tienes permisos para este negocio' },
          { status: 403 }
        );
      }
    }

    // Verificar que tiene una suscripción pausada de Stripe
    if (!business.subscription?.stripeSubscriptionId) {
      await client.close();
      return NextResponse.json(
        { error: 'No hay suscripción de Stripe' },
        { status: 400 }
      );
    }

    // Reanudar la suscripción en Stripe
    const subscription = await stripe.subscriptions.update(
      business.subscription.stripeSubscriptionId,
      {
        pause_collection: null
      }
    );

    // Actualizar en la base de datos
    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'subscription.status': 'active',
          'subscription.resumedAt': new Date(),
          updatedAt: new Date()
        },
        $unset: {
          'subscription.pausedAt': ''
        }
      }
    );

    await client.close();

    return NextResponse.json({
      success: true,
      message: 'Suscripción reanudada correctamente',
      subscription: {
        id: subscription.id,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Error al reanudar la suscripción' },
      { status: 500 }
    );
  }
}
