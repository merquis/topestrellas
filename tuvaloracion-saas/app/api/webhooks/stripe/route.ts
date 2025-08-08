import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_4452e008873fd0375ecaa7129ea17157c7c66b676eb0c25d0cabfafe3ced2af8';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Manejar los diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Obtener los metadatos
        const businessId = session.metadata?.businessId;
        const plan = session.metadata?.plan;
        
        if (!businessId || !plan) {
          console.error('Missing metadata in checkout session');
          break;
        }

        // Actualizar el negocio con la información de la suscripción
        await db.collection('businesses').updateOne(
          { _id: new ObjectId(businessId) },
          {
            $set: {
              'subscription.status': 'active',
              'subscription.plan': plan,
              'subscription.stripeCustomerId': session.customer,
              'subscription.stripeSubscriptionId': session.subscription,
              'subscription.startDate': new Date(),
              'subscription.lastPayment': new Date(),
              'subscription.paymentMethod': 'stripe',
              updatedAt: new Date()
            }
          }
        );

        // Actualizar el pago pendiente
        await db.collection('pending_payments').updateOne(
          { sessionId: session.id },
          {
            $set: {
              status: 'completed',
              completedAt: new Date()
            }
          }
        );

        console.log(`✅ Subscription activated for business ${businessId} with plan ${plan}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Actualizar la fecha del último pago
        if (invoice.subscription && invoice.customer) {
          await db.collection('businesses').updateOne(
            { 'subscription.stripeSubscriptionId': invoice.subscription },
            {
              $set: {
                'subscription.lastPayment': new Date(),
                'subscription.status': 'active',
                updatedAt: new Date()
              }
            }
          );
          console.log(`✅ Payment received for subscription ${invoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Detectar cambios de plan
        const priceId = subscription.items.data[0]?.price.id;
        let newPlan = 'basic';
        
        if (priceId === process.env.STRIPE_PREMIUM_PLAN_PRICE_ID) {
          newPlan = 'premium';
        } else if (priceId === process.env.STRIPE_BASIC_PLAN_PRICE_ID) {
          newPlan = 'basic';
        }

        await db.collection('businesses').updateOne(
          { 'subscription.stripeSubscriptionId': subscription.id },
          {
            $set: {
              'subscription.plan': newPlan,
              'subscription.status': subscription.status,
              updatedAt: new Date()
            }
          }
        );
        console.log(`✅ Subscription updated: ${subscription.id} - Plan: ${newPlan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Marcar la suscripción como cancelada
        await db.collection('businesses').updateOne(
          { 'subscription.stripeSubscriptionId': subscription.id },
          {
            $set: {
              'subscription.status': 'cancelled',
              'subscription.cancelledAt': new Date(),
              updatedAt: new Date()
            }
          }
        );
        console.log(`❌ Subscription cancelled: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Marcar la suscripción como pausada
        await db.collection('businesses').updateOne(
          { 'subscription.stripeSubscriptionId': subscription.id },
          {
            $set: {
              'subscription.status': 'paused',
              'subscription.pausedAt': new Date(),
              updatedAt: new Date()
            }
          }
        );
        console.log(`⏸️ Subscription paused: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Reactivar la suscripción
        await db.collection('businesses').updateOne(
          { 'subscription.stripeSubscriptionId': subscription.id },
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
        console.log(`▶️ Subscription resumed: ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    await client.close();
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    await client.close();
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}
