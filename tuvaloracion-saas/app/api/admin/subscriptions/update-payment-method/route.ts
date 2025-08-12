import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(request: Request) {
  try {
    const { businessId, userEmail } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'Email de usuario requerido' }, { status: 400 });
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

    // Obtener información del cliente de Stripe para pre-rellenar datos
    let customerInfo = null;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        customerInfo = {
          email: (customer as any).email,
          name: (customer as any).name,
          phone: (customer as any).phone,
          address: (customer as any).address
        };
      }
    } catch (error) {
      console.log('No se pudo obtener información del cliente:', error);
    }

    // Crear un SetupIntent para capturar el nuevo método de pago
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session', // Para pagos futuros automáticos
        metadata: {
          businessId: businessId,
          userEmail: userEmail,
          action: 'update_payment_method',
          subscriptionId: business.subscription.stripeSubscriptionId
        },
        payment_method_types: ['card'], // Solo tarjetas de crédito/débito
        automatic_payment_methods: {
          enabled: false, // Deshabilitamos métodos automáticos
        }
      });

      return NextResponse.json({
        success: true,
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
        businessName: business.name,
        customerInfo: customerInfo // Enviar info del cliente al frontend
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
