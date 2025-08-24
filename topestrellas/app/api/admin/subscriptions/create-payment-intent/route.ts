import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyAuth } from "@/lib/auth";
import { getDatabase } from '@/lib/mongodb';

// Inicialización lazy de Stripe para evitar errores durante el build
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY no está configurada');
    }
    stripe = new Stripe(key, {
      apiVersion: '2025-07-30.basil',
    });
  }
  return stripe;
}

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

    if (!plan) {
      return NextResponse.json({ error: 'Plan requerido' }, { status: 400 });
    }
    
    if (!businessId) {
        return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Buscar el plan en la base de datos
    const planData = await db.collection('subscriptionplans').findOne({ 
      key: plan, 
      active: true 
    });

    if (!planData) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 400 });
    }
    
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

    // Obtener el precio de la base de datos y convertir a céntimos para Stripe
    const priceInEuros = planData.recurringPrice;
    const amount = Math.round(priceInEuros * 100); // Convertir euros a céntimos
    const planName = planData.name;

    // Validar que el precio sea mayor que 0 para PaymentIntent
    if (amount <= 0) {
      return NextResponse.json({ error: 'No se puede crear un PaymentIntent para un plan gratuito' }, { status: 400 });
    }

    // Crear un PaymentIntent en Stripe
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amount, // Stripe requiere el monto en céntimos
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
