import { NextResponse } from 'next/server';
import { getOrCreateStripeCustomer } from '@/lib/subscriptions';
import Stripe from 'stripe';
import { verifyAuth } from '@/lib/auth';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    const user = verifyAuth(authHeader || ''); // Pasamos el header de autorización
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { businessId, userEmail, userName } = await request.json();

    if (!businessId || !userEmail) {
      return NextResponse.json({ error: 'Faltan businessId o userEmail' }, { status: 400 });
    }

    // 1. Obtener o crear el cliente de Stripe
    const { customerId, taxId } = await getOrCreateStripeCustomer(userEmail, businessId, userName);

    // 2. Crear un SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'link'], // Se elimina PayPal temporalmente
      metadata: {
        businessId,
        userEmail, // Guardamos el email para referencia
      },
      usage: 'off_session', // Importante para indicar que se usará para pagos futuros
    });

    // 3. Devolver el client_secret
    return NextResponse.json({ clientSecret: setupIntent.client_secret });

  } catch (error: any) {
    console.error('[API SetupIntent] Error creando SetupIntent:', error);
    return NextResponse.json(
      { error: `Error interno del servidor: ${error.message}` },
      { status: 500 }
    );
  }
}
