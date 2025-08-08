import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyAuth } from "@/lib/auth";
import { getDatabase } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const PLANS = {
  basic: { price: process.env.STRIPE_PRICE_BASIC, name: 'Plan Básico' },
  premium: { price: process.env.STRIPE_PRICE_PREMIUM, name: 'Plan Premium' },
};

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const user = verifyAuth(authHeader);

    if (!user || !user.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { plan, businessId } = await request.json();

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }
    
    if (!businessId) {
        return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Buscar el negocio por _id (ObjectId de MongoDB)
    const { ObjectId } = await import('mongodb');
    let business;
    
    try {
      // Intentar buscar por _id si es un ObjectId válido
      if (ObjectId.isValid(businessId)) {
        business = await db.collection('businesses').findOne({ 
          _id: new ObjectId(businessId)
        });
      }
      
      // Si no se encuentra, intentar buscar por otros campos
      if (!business) {
        business = await db.collection('businesses').findOne({ 
          $or: [
            { subdomain: businessId },
            { id: businessId }
          ]
        });
      }
    } catch (error) {
      console.error('Error buscando negocio:', error);
    }

    if (!business) {
        console.error('Negocio no encontrado con businessId:', businessId);
        return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const amount = PLANS[plan as keyof typeof PLANS].price;
    const planName = PLANS[plan as keyof typeof PLANS].name;

    // Crear un PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: user.id,
        userEmail: user.email,
        businessId: businessId,
        businessName: business.name,
        plan: plan,
      },
      description: `Suscripción al ${planName} para ${business.name}`,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error('Error al crear Payment Intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
