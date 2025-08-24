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
    let user = verifyAuth(authHeader || '');

    // Leer el cuerpo para obtener el email y rol del usuario real
    let requestEmail: string | undefined;
    let requestRole: string | undefined;
    try {
      const body = await request.json();
      requestEmail = body?.userEmail;
      requestRole = body?.userRole;
    } catch {}

    // Usar el usuario del token si existe, si no, el del body
    if (!user && requestEmail) {
      user = {
        id: '', // El ID no es crucial aquí si confiamos en el email
        email: requestEmail,
        name: '', // El nombre no es crucial
        role: requestRole as any || 'admin',
      };
    }
    
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

    // Verificar permisos
    const effectiveRole = (requestRole as any) || user.role;
    const effectiveEmail = requestEmail || user.email;

    if (effectiveRole !== 'super_admin') {
      const usersCollection = db.collection('users');
      const userData = await usersCollection.findOne({ email: effectiveEmail });

      const candidateIds = [
        ...(Array.isArray((userData as any)?.businessIds) ? (userData as any).businessIds : []),
        (userData as any)?.businessId
      ]
        .filter(Boolean)
        .map((x: any) => (typeof x === 'string' ? x : x.toString()));

      const isOwnerById = candidateIds.includes(businessId.toString());
      const isOwnerByEmail = (business as any)?.contact?.email === effectiveEmail;

      if (!isOwnerById && !isOwnerByEmail) {
        await client.close();
        return NextResponse.json(
          { error: 'No tienes permisos para este negocio' },
          { status: 403 }
        );
      }
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    // Obtener el item de la suscripción desde Stripe
    const existingSubscription = await stripe.subscriptions.retrieve(
      business.subscription.stripeSubscriptionId
    );

    if (!existingSubscription || !existingSubscription.items || existingSubscription.items.data.length === 0) {
      await client.close();
      return NextResponse.json({ error: 'No se encontró la suscripción en Stripe' }, { status: 404 });
    }

    const subscriptionItemId = existingSubscription.items.data[0].id;

    // 1. Re-activar la suscripción en Stripe
    const stripeSubscription = await stripe.subscriptions.update(
      business.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        proration_behavior: 'create_prorations',
        items: [{
          id: subscriptionItemId,
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
