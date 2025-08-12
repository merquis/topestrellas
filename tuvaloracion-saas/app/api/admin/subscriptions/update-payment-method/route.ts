import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { verifyAuth } from "@/lib/auth";
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

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

    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Buscar el negocio
    let business;
    try {
      if (ObjectId.isValid(businessId)) {
        business = await db.collection('businesses').findOne({ 
          _id: new ObjectId(businessId)
        });
      }
      
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

    // Validar que el negocio tenga una suscripción activa con Stripe
    if (!business.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ 
        error: 'No hay suscripción de Stripe para actualizar' 
      }, { status: 400 });
    }

    // Validar que el estado permita actualizar método de pago
    const allowedStatuses = ['active', 'paused', 'suspended', 'past_due', 'trialing'];
    if (!allowedStatuses.includes(business.subscription.status)) {
      return NextResponse.json({ 
        error: 'No se puede actualizar el método de pago en el estado actual de la suscripción' 
      }, { status: 400 });
    }

    // Obtener el customer ID de Stripe
    let customerId = business.subscription.stripeCustomerId;
    
    if (!customerId) {
      // Si no tenemos el customer ID guardado, obtenerlo de la suscripción
      try {
        const subscription = await stripe.subscriptions.retrieve(
          business.subscription.stripeSubscriptionId
        );
        customerId = subscription.customer as string;
        
        // Guardar el customer ID para futuras referencias
        await db.collection('businesses').updateOne(
          { _id: new ObjectId(businessId) },
          { 
            $set: { 
              'subscription.stripeCustomerId': customerId,
              updatedAt: new Date()
            } 
          }
        );
      } catch (error) {
        console.error('Error obteniendo suscripción de Stripe:', error);
        return NextResponse.json({ 
          error: 'Error accediendo a la suscripción en Stripe' 
        }, { status: 500 });
      }
    }

    // Crear un SetupIntent para capturar el nuevo método de pago
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session', // Para pagos futuros automáticos
        metadata: {
          businessId: businessId,
          userEmail: user.email,
          action: 'update_payment_method',
          subscriptionId: business.subscription.stripeSubscriptionId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return NextResponse.json({
        success: true,
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
        businessName: business.name
      });

    } catch (error: any) {
      console.error('Error creando SetupIntent:', error);
      const errorMessage = error?.message || 'Error creando SetupIntent';
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          code: error?.code,
          type: error?.type
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error en update-payment-method:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
