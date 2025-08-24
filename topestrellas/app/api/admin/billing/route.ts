import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';

// Inicializar Stripe solo si la clave está disponible
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-07-30.basil',
}) : null;

// PUT - Actualizar datos de facturación después de validar el pago
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { businessId, billingInfo } = body;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId es requerido' },
        { status: 400 }
      );
    }

    if (!billingInfo) {
      return NextResponse.json(
        { success: false, error: 'billingInfo es requerido' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios de facturación
    if (!billingInfo.legalName || !billingInfo.taxId || !billingInfo.email) {
      return NextResponse.json(
        { success: false, error: 'Todos los datos de facturación son obligatorios' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar cliente en Stripe si existe
    if (business.subscription?.stripeCustomerId && stripe) {
      try {
        // Actualizar datos del cliente en Stripe
        await stripe.customers.update(business.subscription.stripeCustomerId, {
          name: billingInfo.legalName,
          email: billingInfo.email,
          phone: billingInfo.phone || undefined,
          address: billingInfo.address ? {
            line1: billingInfo.address.line1,
            line2: billingInfo.address.line2 || undefined,
            city: billingInfo.address.city,
            state: billingInfo.address.state || undefined,
            postal_code: billingInfo.address.postal_code,
            country: billingInfo.address.country || 'ES'
          } : undefined,
          metadata: {
            businessId,
            customerType: billingInfo.customerType,
            legalName: billingInfo.legalName
          }
        });

        // Gestionar tax_id
        if (billingInfo.taxId && stripe) {
          // Obtener tax_ids existentes
          const existingTaxIds = await stripe.customers.listTaxIds(
            business.subscription.stripeCustomerId
          );
          
          // Eliminar tax_ids antiguos
          for (const taxId of existingTaxIds.data) {
            await stripe!.customers.deleteTaxId(
              business.subscription.stripeCustomerId,
              taxId.id
            );
          }
          
          // Añadir nuevo tax_id
          const newTaxId = await stripe!.customers.createTaxId(
            business.subscription.stripeCustomerId,
            {
              type: 'es_cif',
              value: billingInfo.taxId
            }
          );
          
          // Guardar el ID del tax_id en la base de datos
          billingInfo.stripeTaxId = newTaxId.id;
        }
      } catch (stripeError) {
        console.error('Error actualizando cliente en Stripe:', stripeError);
        // No fallar si hay error con Stripe, continuar guardando en MongoDB
      }
    }

    // Guardar datos de facturación en MongoDB
    const updateData = {
      'billing.customerType': billingInfo.customerType,
      'billing.legalName': billingInfo.legalName,
      'billing.taxId': billingInfo.taxId,
      'billing.email': billingInfo.email,
      'billing.phone': billingInfo.phone,
      'billing.address': billingInfo.address,
      'billing.stripeCustomerId': business.subscription?.stripeCustomerId,
      'billing.stripeTaxId': billingInfo.stripeTaxId,
      'billing.updatedAt': new Date(),
      updatedAt: new Date()
    };

    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: updateData }
    );

    console.log(`[PUT /api/admin/billing] Datos de facturación actualizados para negocio ${businessId}`);

    return NextResponse.json({
      success: true,
      message: 'Datos de facturación actualizados correctamente'
    });
  } catch (error) {
    console.error('Error actualizando datos de facturación:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando datos de facturación' },
      { status: 500 }
    );
  }
}

// GET - Obtener datos de facturación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId es requerido' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      billing: business.billing || null
    });
  } catch (error) {
    console.error('Error obteniendo datos de facturación:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo datos de facturación' },
      { status: 500 }
    );
  }
}
