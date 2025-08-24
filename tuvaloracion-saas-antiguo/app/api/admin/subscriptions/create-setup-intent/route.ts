import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: Request) {
  try {
    const { 
      email, 
      name, 
      businessId,
      planKey,
      isNewUser = false 
    } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ 
        error: 'Email y nombre son requeridos' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Buscar si el usuario ya tiene un customer en Stripe
    let user = null;
    if (!isNewUser) {
      user = await db.collection('users').findOne({ email });
    }

    let customer;
    
    if (user?.stripeCustomerId) {
      // Usuario existente con customer en Stripe
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      // Crear nuevo customer en Stripe
      customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          businessId: businessId || '',
          planKey: planKey || ''
        }
      });

      // Si es un usuario existente, actualizar con el customerId
      if (user) {
        await db.collection('users').updateOne(
          { email },
          { $set: { stripeCustomerId: customer.id } }
        );
      }
    }

    // Crear SetupIntent para guardar método de pago
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session', // Permite cobros futuros automáticos
      metadata: {
        businessId: businessId || '',
        planKey: planKey || '',
        userEmail: email
      }
    });

    return NextResponse.json({ 
      clientSecret: setupIntent.client_secret,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Error al crear Setup Intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
