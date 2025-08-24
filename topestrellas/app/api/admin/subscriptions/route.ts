import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  createSubscriptionAndReturnClientSecret,
  confirmSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  changePlan,
  getSubscriptionStatus,
  getPlanFromDB,
  validateBusinessAccess
} from '@/lib/subscriptions';
import Stripe from 'stripe';

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

const toDate = (secs?: number | null) =>
  typeof secs === 'number' ? new Date(secs * 1000) : null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');

    const db = await getDatabase();

    if (businessId) {
      // Lógica existente para un businessId específico
      const business = await db.collection('businesses').findOne({
        _id: new ObjectId(businessId)
      });

      if (!business) {
        return NextResponse.json(
          { success: false, error: 'Negocio no encontrado' },
          { status: 404 }
        );
      }

      // Si hay una suscripción de Stripe, obtener información actualizada
      let stripeSubscription = null;
      if (business.subscription?.stripeSubscriptionId) {
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(
            business.subscription.stripeSubscriptionId
          );
        } catch (error) {
          console.error('Error obteniendo suscripción de Stripe:', error);
        }
      }

      // Obtener información del plan actual
      let currentPlan = null;
      if (business.subscription?.plan) {
        currentPlan = await getPlanFromDB(business.subscription.plan);
      }

      // Obtener historial de pagos
      let paymentHistory: any[] = [];
      if (business.subscription?.stripeSubscriptionId) {
        try {
          const invoices = await stripe.invoices.list({
            subscription: business.subscription.stripeSubscriptionId,
            limit: 10,
          });
          paymentHistory = invoices.data.map((invoice: any) => ({
            id: invoice.id,
            amount: invoice.amount_paid / 100, // Convertir de céntimos a euros
            currency: invoice.currency,
            status: invoice.status,
            date: new Date(invoice.created * 1000),
            pdfUrl: invoice.invoice_pdf,
          }));
        } catch (error) {
          console.error('Error obteniendo historial de pagos:', error);
        }
      }

      return NextResponse.json({
        success: true,
        subscription: {
          ...business.subscription,
          currentPlan,
          stripeDetails: stripeSubscription ? {
            status: stripeSubscription.status,
            currentPeriodEnd: toDate((stripeSubscription as any).current_period_end),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            trialEnd: toDate((stripeSubscription as any).trial_end),
          } : null,
          paymentHistory,
        }
      });
    } else if (userEmail && userRole === 'admin') {
      // Obtener lista de suscripciones para los negocios del usuario
      const businesses = await db.collection('businesses').find({
        'contact.email': userEmail
      }).toArray();

      const subscriptions = await Promise.all(
        businesses.map(async (business) => {
          let stripeSubscription = null;
          if (business.subscription?.stripeSubscriptionId) {
            try {
              stripeSubscription = await stripe.subscriptions.retrieve(
                business.subscription.stripeSubscriptionId
              );
            } catch (error) {
              console.error('Error obteniendo suscripción de Stripe:', error);
            }
          }

          let currentPlan = null;
          if (business.subscription?.plan) {
            currentPlan = await getPlanFromDB(business.subscription.plan);
          }

          return {
            businessId: business._id.toString(),
            businessName: business.name,
            subdomain: business.subdomain,
            createdAt: business.createdAt, // Añadir createdAt directamente
            subscription: business.subscription,
            plan: business.subscription?.plan || 'trial',
            status: business.subscription?.status || 'active',
            startDate: business.createdAt,
            endDate: business.subscription?.validUntil,
            trialEndsAt: business.subscription?.validUntil, // Para trials
            autoRenew: !!business.subscription?.stripeSubscriptionId,
            paymentMethod: business.subscription?.stripeSubscriptionId ? 'stripe' : null,
            currentPlan,
            stripeDetails: stripeSubscription ? {
              status: stripeSubscription.status,
              currentPeriodEnd: toDate((stripeSubscription as any).current_period_end),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
              trialEnd: toDate((stripeSubscription as any).trial_end),
            } : null,
            // Incluir también los datos de Google Places y stats si existen
            googlePlaces: business.googlePlaces || null,
            stats: business.stats || null,
          };
        })
      );

      return NextResponse.json(subscriptions);
    } else {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error obteniendo información de suscripción:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo información de suscripción' },
      { status: 500 }
    );
  }
}

// POST - Crear sesión de checkout para nueva suscripción o cambio de plan
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, planKey, userEmail, action = 'subscribe', billingInfo } = body;

    if (!businessId || !planKey || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'businessId, planKey y userEmail son requeridos' },
        { status: 400 }
      );
    }

    // Validar billingInfo solo si se proporciona y tiene datos
    if (billingInfo && (billingInfo.legalName || billingInfo.taxId || billingInfo.email)) {
      // Solo validar si al menos uno de los campos principales está presente
      if (billingInfo.taxId && !billingInfo.legalName) {
        return NextResponse.json(
          { success: false, error: 'Si proporcionas el NIF/CIF, también debes proporcionar el nombre fiscal' },
          { status: 400 }
        );
      }
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

    // Verificar el plan
    const plan = await getPlanFromDB(planKey);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan no encontrado' },
        { status: 404 }
      );
    }

    // Si es un cambio de plan y ya tiene suscripción activa
    if (action === 'change' && business.subscription?.stripeSubscriptionId) {
      try {
        const updatedSubscription = await changePlan(
          business.subscription.stripeSubscriptionId,
          planKey,
          true // Prorratear
        );

        return NextResponse.json({
          success: true,
          message: 'Plan cambiado exitosamente',
          subscription: updatedSubscription,
        });
      } catch (error) {
        console.error('Error cambiando plan:', error);
        return NextResponse.json(
          { success: false, error: 'Error cambiando plan' },
          { status: 500 }
        );
      }
    }

    // Crear un SetupIntent para el nuevo flujo de suscripción
    try {
      const { clientSecret, customerId, taxId, mode } = await createSubscriptionAndReturnClientSecret(
        businessId,
        planKey,
        userEmail,
        business.name,
        billingInfo // Pasar los datos de facturación
      );

      // Preparar la estructura completa de billing para MongoDB
      const billingDataToSave = billingInfo ? {
        billing: {
          customerType: billingInfo.customerType || 'empresa',
          legalName: billingInfo.legalName || '',
          taxId: billingInfo.taxId || '',
          email: billingInfo.email || userEmail,
          phone: billingInfo.phone || '',
          address: {
            line1: billingInfo.address?.line1 || '',
            line2: billingInfo.address?.line2 || '',
            city: billingInfo.address?.city || '',
            state: billingInfo.address?.state || '',
            postal_code: billingInfo.address?.postal_code || '',
            country: billingInfo.address?.country || 'ES'
          },
          stripeCustomerId: customerId,
          stripeTaxId: taxId || '',
          metadata: {
            businessId: businessId,
            customerType: billingInfo.customerType || 'empresa',
            legalName: billingInfo.legalName || ''
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } : {};

      // Guardar el ID de cliente de Stripe, el plan seleccionado y la estructura completa de billing
      await db.collection('businesses').updateOne(
        { _id: new ObjectId(businessId) },
        { 
          $set: { 
            'subscription.stripeCustomerId': customerId,
            'selectedPlanKey': planKey, // Guardamos el plan que el usuario quiere
            ...billingDataToSave, // Guardar estructura completa de billing
            updatedAt: new Date()
          } 
        }
      );

      console.log(`[POST /api/admin/subscriptions] Estructura completa de billing guardada para negocio ${businessId}`);
      if (billingInfo) {
        console.log(`[POST /api/admin/subscriptions] Datos guardados:`, {
          customerType: billingInfo.customerType,
          legalName: billingInfo.legalName,
          taxId: billingInfo.taxId ? '***' + billingInfo.taxId.slice(-4) : 'No proporcionado',
          stripeTaxId: taxId || 'No creado'
        });
      }

      return NextResponse.json({
        success: true,
        clientSecret,
        customerId,
        taxId,
        mode, // Enviar el modo 'setup' al frontend
        plan: {
          name: plan.name,
          price: plan.recurringPrice,
          setupFee: plan.setupPrice,
          currency: plan.currency,
          interval: plan.interval,
        }
      });
    } catch (error: any) {
      // Mejorar el manejo de errores para mostrar el error real de Stripe
      const stripeError = error?.raw || error;
      console.error('[POST /api/admin/subscriptions] Error detallado:', {
        type: stripeError?.type,
        code: stripeError?.code,
        message: stripeError?.message || error?.message,
        statusCode: stripeError?.statusCode,
        param: stripeError?.param,
        businessId,
        planKey,
        userEmail
      });
      
      const errorMessage = stripeError?.message || error?.message || 'Error procesando el pago';
      const statusCode = stripeError?.statusCode || 400;
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          code: stripeError?.code,
          type: stripeError?.type
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('Error procesando suscripción:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando suscripción' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar suscripción (pausar, reanudar, etc.)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { businessId, action } = body;

    if (!businessId || !action) {
      return NextResponse.json(
        { success: false, error: 'businessId y action son requeridos' },
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

    if (!business.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No hay suscripción activa' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'pause':
        result = await pauseSubscription(business.subscription.stripeSubscriptionId);
        break;
      
      case 'resume':
        result = await resumeSubscription(business.subscription.stripeSubscriptionId);
        break;
      
      case 'cancel':
        const immediately = body.immediately || false;
        result = await cancelSubscription(business.subscription.stripeSubscriptionId, immediately);
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Suscripción ${action} exitosamente`,
      subscription: result,
    });
  } catch (error) {
    console.error('Error actualizando suscripción:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando suscripción' },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar suscripción
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const immediately = searchParams.get('immediately') === 'true';

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId requerido' },
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

    if (!business.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No hay suscripción activa para cancelar' },
        { status: 400 }
      );
    }

    try {
      const canceledSubscription = await cancelSubscription(
        business.subscription.stripeSubscriptionId,
        immediately
      );

      // Registrar la cancelación en el log de actividad
      await db.collection('activity_logs').insertOne({
        businessId,
        type: 'subscription_canceled',
        description: immediately ? 'Suscripción cancelada inmediatamente' : 'Suscripción cancelada al final del período',
        metadata: {
          subscriptionId: canceledSubscription.id,
          canceledAt: new Date(),
          immediately,
        },
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: immediately 
          ? 'Suscripción cancelada inmediatamente' 
          : 'Suscripción se cancelará al final del período de facturación',
        subscription: canceledSubscription,
      });
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      return NextResponse.json(
        { success: false, error: 'Error cancelando suscripción' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en cancelación:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando cancelación' },
      { status: 500 }
    );
  }
}
