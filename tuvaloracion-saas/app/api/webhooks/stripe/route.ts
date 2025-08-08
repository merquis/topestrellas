import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return new NextResponse('Webhook Error', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const businessId = session.metadata?.businessId;
    const planKey = session.metadata?.planKey;

    if (!businessId || !planKey) {
      console.error('Missing metadata in session');
      return new NextResponse('Missing metadata', { status: 400 });
    }

    try {
      const db = await getDatabase();
      await db.collection('businesses').updateOne(
        { _id: new ObjectId(businessId) },
        {
          $set: {
            subscriptionPlan: planKey,
            subscriptionStatus: 'active',
            subscriptionUpdatedAt: new Date(),
          },
        }
      );
      console.log(`Updated business ${businessId} to plan ${planKey}`);
    } catch (err) {
      console.error('Database update failed', err);
      return new NextResponse('Database error', { status: 500 });
    }
  }

  return new NextResponse('Received', { status: 200 });
}
