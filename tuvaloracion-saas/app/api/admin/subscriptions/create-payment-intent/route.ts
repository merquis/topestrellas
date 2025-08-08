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

const PLAN_PRICES = {
  basic: 29,
  premium: 59
};

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessId, plan } = await request.json();

    if (!businessId || !plan) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
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

    // Buscar o crear cliente en Stripe
    let customerId = business.stripeCustomerId;
    
    if (!customerId) {
      // Crear nuevo cliente en Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          businessId: businessId,
          businessName: business.name
        }
      });
      
      customerId = customer.id;
      
      // Guardar el ID del cliente en la base de datos
      await db.collection('businesses').updateOne(
        { _id: new ObjectId(businessId) },
        { $set: { stripeCustomerId: customerId } }
      );
    }

    // Obtener el precio según el plan
    const amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];
    
    // Crear el Payment Intent para la primera cuota
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe usa centavos
      currency: 'eur',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        businessId: businessId,
        plan: plan,
        type: 'subscription_setup'
      },
      description: `Suscripción ${plan === 'basic' ? 'Básica' : 'Premium'} para ${business.name}`
    });

    // Guardar información temporal del pago pendiente
    await db.collection('pending_payments').insertOne({
      businessId: new ObjectId(businessId),
      plan,
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntent.id,
      status: 'pending',
      createdAt: new Date(),
      userId: user.email
    });

    await client.close();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Error al crear el intento de pago' },
      { status: 500 }
    );
  }
}
