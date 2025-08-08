import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

// Configuración de PayPal
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' o 'live'
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Configuración de Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

// URLs de retorno
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Función para obtener precios de la base de datos
async function getPlanPrice(planKey: string) {
  const db = await getDatabase();
  const plan = await db.collection('subscriptionplans').findOne({ key: planKey, active: true });
  return plan ? plan.recurringPrice : null;
}

// Función para obtener token de acceso de PayPal
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

// Función para crear orden de PayPal
async function createPayPalOrder(plan: string, businessName: string) {
  const accessToken = await getPayPalAccessToken();
  const amount = await getPlanPrice(plan);

  if (!amount) {
    throw new Error(`Plan no encontrado: ${plan}`);
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: amount.toString()
        },
        description: `Suscripción ${plan} para ${businessName}`
      }],
      application_context: {
        return_url: `${BASE_URL}/admin/subscriptions/payment-success`,
        cancel_url: `${BASE_URL}/admin/subscriptions`,
        brand_name: 'TopEstrellas',
        locale: 'es-ES',
        user_action: 'PAY_NOW'
      }
    })
  });

  const data = await response.json();
  return data;
}

// Función para crear sesión de Stripe
async function createStripeSession(plan: string, businessName: string, businessId: string) {
  // Importar Stripe dinámicamente
  const stripe = require('stripe')(STRIPE_SECRET_KEY);

  // Obtener el plan de la base de datos
  const db = await getDatabase();
  const planData = await db.collection('subscriptionplans').findOne({ key: plan, active: true });

  if (!planData) {
    throw new Error(`Plan no encontrado: ${plan}`);
  }

  // Crear o buscar el precio en Stripe usando el precio de la base de datos
  const priceInCents = planData.recurringPrice < 20 ? Math.round(planData.recurringPrice * 100) : planData.recurringPrice;
  
  // Buscar si ya existe un precio en Stripe para este plan con el precio correcto
  const existingPrices = await stripe.prices.list({
    lookup_keys: [plan],
    limit: 10,
  });

  let priceId: string;
  
  // Buscar un precio existente que coincida con el precio actual de la BD
  const matchingPrice = existingPrices.data.find((price: any) => 
    price.unit_amount === priceInCents && 
    price.currency === (planData.currency?.toLowerCase() || 'eur') &&
    price.recurring?.interval === (planData.interval === 'mensual' ? 'month' : 'year')
  );

  if (matchingPrice) {
    priceId = matchingPrice.id;
  } else {
    // Crear un nuevo precio en Stripe con el precio correcto de la BD
    const stripePrice = await stripe.prices.create({
      unit_amount: priceInCents,
      currency: planData.currency?.toLowerCase() || 'eur',
      recurring: {
        interval: planData.interval === 'mensual' ? 'month' : 'year',
      },
      product_data: {
        name: planData.name,
        description: planData.description,
      },
      lookup_key: `${plan}_${Date.now()}`, // Hacer único el lookup_key
    });
    priceId = stripePrice.id;
  }
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${BASE_URL}/admin/subscriptions/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/admin/subscriptions`,
    metadata: {
      businessId: businessId,
      plan: plan,
      planName: planData.name,
      recurringPrice: planData.recurringPrice.toString(),
    },
    locale: 'es'
  });

  return session;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessId, plan, paymentMethod } = await request.json();

    if (!businessId || !plan || !paymentMethod) {
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

    let paymentUrl = '';
    let paymentData = {};

    // Procesar según el método de pago
    if (paymentMethod === 'paypal') {
      const order = await createPayPalOrder(plan, business.name);
      
      // Guardar información temporal del pago pendiente
      await db.collection('pending_payments').insertOne({
        businessId: new ObjectId(businessId),
        plan,
        paymentMethod: 'paypal',
        orderId: order.id,
        status: 'pending',
        createdAt: new Date(),
        userId: user.email
      });

      // Obtener el enlace de aprobación
      const approveLink = order.links.find((link: any) => link.rel === 'approve');
      paymentUrl = approveLink?.href || '';
      
      paymentData = {
        paypalUrl: paymentUrl,
        orderId: order.id
      };
    } else if (paymentMethod === 'stripe') {
      const session = await createStripeSession(plan, business.name, businessId);
      
      // Guardar información temporal del pago pendiente
      await db.collection('pending_payments').insertOne({
        businessId: new ObjectId(businessId),
        plan,
        paymentMethod: 'stripe',
        sessionId: session.id,
        status: 'pending',
        createdAt: new Date(),
        userId: user.email
      });

      paymentUrl = session.url;
      
      paymentData = {
        stripeUrl: paymentUrl,
        sessionId: session.id
      };
    }

    await client.close();

    return NextResponse.json({
      success: true,
      ...paymentData
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: 'Error al procesar la actualización de suscripción' },
      { status: 500 }
    );
  }
}
