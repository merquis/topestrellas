import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { getStripeOrThrow } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function POST(
  request: Request,
  context: any
) {
  try {
    // Verificar autenticación - aceptar Bearer token o cookies
    let user = null;
    
    // Intentar con Bearer token (mismo formato base64 que la cookie 'auth-token')
    const authorizationHeader = request.headers.get('authorization');
    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
      const token = authorizationHeader.substring(7).trim();
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.email) {
          user = parsed;
        }
      } catch {
        // Ignorar y probar con cookies
      }
    }
    
    // Si no hay Bearer válido, intentar con cookies
    if (!user) {
      const cookieHeader = request.headers.get('cookie');
      user = verifyAuth(cookieHeader || '');
    }
    
    if (!user) {
      console.error('Authentication failed - no valid token or cookie found');
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

    // Verificar que tiene una suscripción activa de Stripe
    if (!business.subscription?.stripeSubscriptionId) {
      await client.close();
      return NextResponse.json(
        { error: 'No hay suscripción activa de Stripe' },
        { status: 400 }
      );
    }

    // Pausar la suscripción en Stripe
    const stripe = getStripeOrThrow();
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
          'subscription.pauseStatus': true,  // ← NUEVO: marcar como pausada
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
