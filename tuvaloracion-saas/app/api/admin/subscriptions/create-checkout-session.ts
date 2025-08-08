import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { businessId, planKey, userEmail } = await req.json();

    if (!businessId || !planKey || !userEmail) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const prices: Record<string, string> = {
      basic: process.env.STRIPE_PRICE_BASIC!,
      premium: process.env.STRIPE_PRICE_PREMIUM!,
    };

    const priceId = prices[planKey];
    if (!priceId) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        businessId,
        planKey,
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/subscriptions/payment-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/subscriptions`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creando sesión de pago:', error);
    return NextResponse.json({ error: 'Error creando sesión de pago' }, { status: 500 });
  }
}
