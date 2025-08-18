import Stripe from 'stripe';
import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// Inicializar Stripe con la versión de API correcta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Tipos para los planes
export interface SubscriptionPlan {
  _id?: ObjectId | string;
  key: string;
  name: string;
  description?: string;
  setupPrice: number; // En euros
  recurringPrice: number; // En euros
  originalPrice?: number; // En euros - Precio original (antes del descuento) para mostrar tachado
  currency: string;
  interval: 'month' | 'quarter' | 'semester' | 'year';
  trialDays: number;
  features: (string | { name: string; included: boolean })[]; // Soporta ambos formatos para compatibilidad
  active: boolean;
  icon?: string;
  color?: string;
  popular: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tipos para las suscripciones
export interface BusinessSubscription {
  businessId: string;
  plan: string;
  status: 'active' | 'inactive' | 'suspended' | 'canceled' | 'past_due' | 'trialing';
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date;
  paymentFailures?: number;
  lastPaymentAttempt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Convierte euros a céntimos para Stripe
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Convierte céntimos a euros
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Sincroniza un plan con Stripe (crea o actualiza producto y precio)
 */
export async function syncPlanToStripe(plan: SubscriptionPlan): Promise<{
  productId: string;
  priceId: string;
}> {
  console.log(`[syncPlanToStripe] Iniciando sincronización para plan: ${plan.key}`);
  
  // No sincronizar el plan de prueba con Stripe
  if (plan.key === 'trial') {
    console.log(`[syncPlanToStripe] Plan trial detectado, saltando sincronización con Stripe`);
    return {
      productId: 'local_trial_product',
      priceId: 'local_trial_price',
    };
  }

  try {
    console.log(`[syncPlanToStripe] Procesando plan: ${plan.name} (${plan.key})`);
    let product: Stripe.Product;
    let price: Stripe.Price;

    // Verificar si el producto ya existe en Stripe
    if (plan.stripeProductId) {
      try {
        console.log(`[syncPlanToStripe] Buscando producto existente: ${plan.stripeProductId}`);
        product = await stripe.products.retrieve(plan.stripeProductId);
        console.log(`[syncPlanToStripe] Producto encontrado, actualizando...`);
        
        // Actualizar el producto si es necesario
        product = await stripe.products.update(plan.stripeProductId, {
          name: plan.name,
          description: plan.description || undefined,
          active: plan.active,
          metadata: {
            planKey: plan.key,
            icon: plan.icon || '',
            color: plan.color || '',
            popular: plan.popular ? 'true' : 'false',
          },
        });
        console.log(`[syncPlanToStripe] Producto actualizado exitosamente`);
      } catch (error: any) {
        // Si el producto no existe, lo creamos
        console.log(`[syncPlanToStripe] Producto ${plan.stripeProductId} no encontrado en Stripe: ${error.message}`);
        console.log(`[syncPlanToStripe] Creando nuevo producto...`);
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description || undefined,
          active: plan.active,
          metadata: {
            planKey: plan.key,
            icon: plan.icon || '',
            color: plan.color || '',
            popular: plan.popular ? 'true' : 'false',
          },
        });
        console.log(`[syncPlanToStripe] Nuevo producto creado: ${product.id}`);
      }
    } else {
      console.log(`[syncPlanToStripe] No hay stripeProductId, creando nuevo producto...`);
      // Crear nuevo producto en Stripe
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description || undefined,
        active: plan.active,
        metadata: {
          planKey: plan.key,
          icon: plan.icon || '',
          color: plan.color || '',
          popular: plan.popular ? 'true' : 'false',
        },
      });
      console.log(`[syncPlanToStripe] Nuevo producto creado: ${product.id}`);
    }

    // Crear un nuevo precio para el producto
    // Siempre creamos un nuevo precio para permitir grandfathering
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      currency: plan.currency.toLowerCase(),
      active: plan.active,
      nickname: `${plan.name} - ${new Date().toISOString()}`,
      metadata: {
        planKey: plan.key,
        setupPrice: plan.setupPrice.toString(),
      },
    };

    // Configurar el precio según si es recurrente o no
    if (plan.interval) {
      // Mapear nuestros intervalos a los de Stripe
      let stripeInterval: 'month' | 'year' = 'month';
      let intervalCount = 1;
      
      switch(plan.interval) {
        case 'month':
          stripeInterval = 'month';
          intervalCount = 1;
          break;
        case 'quarter':
          stripeInterval = 'month';
          intervalCount = 3; // Stripe cobrará cada 3 meses
          break;
        case 'semester':
          stripeInterval = 'month';
          intervalCount = 6; // Stripe cobrará cada 6 meses
          break;
        case 'year':
          stripeInterval = 'year';
          intervalCount = 1;
          break;
        default:
          stripeInterval = 'month';
          intervalCount = 1;
      }
      
      priceData.recurring = {
        interval: stripeInterval,
        interval_count: intervalCount,
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      };
      priceData.unit_amount = eurosToCents(plan.recurringPrice);
    } else {
      priceData.unit_amount = eurosToCents(plan.recurringPrice);
    }

    console.log(`[syncPlanToStripe] Creando nuevo precio con datos:`, {
      product: product.id,
      currency: plan.currency,
      amount: eurosToCents(plan.recurringPrice),
      interval: plan.interval
    });
    
    price = await stripe.prices.create(priceData);
    console.log(`[syncPlanToStripe] Nuevo precio creado: ${price.id}`);

    // Si hay un precio anterior, lo desactivamos
    if (plan.stripePriceId && plan.stripePriceId !== price.id) {
      try {
        console.log(`[syncPlanToStripe] Desactivando precio anterior: ${plan.stripePriceId}`);
        await stripe.prices.update(plan.stripePriceId, { active: false });
        console.log(`[syncPlanToStripe] Precio anterior desactivado exitosamente`);
      } catch (error: any) {
        console.log(`[syncPlanToStripe] No se pudo desactivar el precio anterior: ${plan.stripePriceId} - ${error.message}`);
      }
    }

    console.log(`[syncPlanToStripe] ✅ Sincronización completada - ProductID: ${product.id}, PriceID: ${price.id}`);
    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error: any) {
    console.error('[syncPlanToStripe] ❌ Error sincronizando plan con Stripe:', error.message);
    console.error('[syncPlanToStripe] Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Obtiene un plan de la base de datos por su key
 */
export async function getPlanFromDB(key: string): Promise<SubscriptionPlan | null> {
  try {
    const db = await getDatabase();
    const plan = await db.collection('subscriptionplans').findOne({ key });
    return plan as SubscriptionPlan | null;
  } catch (error) {
    console.error('Error obteniendo plan de la DB:', error);
    throw error;
  }
}

/**
 * Obtiene un plan de la base de datos por su ID
 */
export async function getPlanById(id: string): Promise<SubscriptionPlan | null> {
  try {
    const db = await getDatabase();
    const plan = await db.collection('subscriptionplans').findOne({ 
      _id: new ObjectId(id) 
    });
    return plan as SubscriptionPlan | null;
  } catch (error) {
    console.error('Error obteniendo plan por ID:', error);
    throw error;
  }
}

/**
 * Actualiza la suscripción de un negocio
 */
export async function updateBusinessSubscription(
  businessId: string,
  updates: Partial<{
    plan: string;
    status: string;
    validUntil: Date;
    stripeSubscriptionId: string;
    stripePriceId: string;
    active: boolean;
  }>
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Actualizar campos de suscripción
    if (updates.plan !== undefined) {
      updateData['subscription.plan'] = updates.plan;
    }
    if (updates.status !== undefined) {
      updateData['subscription.status'] = updates.status;
    }
    if (updates.validUntil !== undefined) {
      updateData['subscription.validUntil'] = updates.validUntil;
    }
    if (updates.stripeSubscriptionId !== undefined) {
      updateData['subscription.stripeSubscriptionId'] = updates.stripeSubscriptionId;
    }
    if (updates.stripePriceId !== undefined) {
      updateData['subscription.stripePriceId'] = updates.stripePriceId;
    }
    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }

    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      { $set: updateData }
    );
  } catch (error) {
    console.error('Error actualizando suscripción del negocio:', error);
    throw error;
  }
}

/**
 * Crea o obtiene un cliente de Stripe con datos de facturación
 * Devuelve tanto el customerId como el taxId creado
 */
export async function getOrCreateStripeCustomer(
  email: string,
  businessId: string,
  name?: string,
  billingInfo?: any
): Promise<{ customerId: string; taxId: string | null }> {
  try {
    let createdTaxId: string | null = null;
    
    // Buscar si ya existe un cliente con este email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customerId = existingCustomers.data[0].id;
      
      // Actualizar cliente existente con datos de facturación
      const updateData: any = {
        metadata: {
          businessId,
          customerType: billingInfo?.customerType || '',
          legalName: billingInfo?.legalName || '',
        },
      };

      // Si hay datos de facturación, actualizar la dirección y el tax_id
      if (billingInfo) {
        updateData.name = billingInfo.legalName || name;
        updateData.phone = billingInfo.phone || undefined;
        updateData.address = {
          line1: billingInfo.address?.line1 || '',
          line2: billingInfo.address?.line2 || '',
          city: billingInfo.address?.city || '',
          state: billingInfo.address?.state || '',
          postal_code: billingInfo.address?.postal_code || '',
          country: billingInfo.address?.country || 'ES',
        };

        // Añadir el NIF/CIF como tax_id para facturas españolas
        if (billingInfo.taxId) {
          try {
            // Verificar si ya existe un tax_id para este cliente
            const taxIds = await stripe.customers.listTaxIds(customerId);
            const existingSpanishTaxId = taxIds.data.find((tid: any) => tid.type === 'es_cif');
            
            if (!existingSpanishTaxId) {
              // Crear nuevo tax_id
              const newTaxId = await stripe.customers.createTaxId(customerId, {
                type: 'es_cif', // Para España, tanto NIF como CIF usan es_cif
                value: billingInfo.taxId,
              });
              createdTaxId = newTaxId.id;
              console.log(`[getOrCreateStripeCustomer] Tax ID creado: ${createdTaxId}`);
            } else {
              createdTaxId = existingSpanishTaxId.id;
              console.log(`[getOrCreateStripeCustomer] Tax ID existente: ${createdTaxId}`);
            }
          } catch (taxError) {
            console.error('Error añadiendo tax_id:', taxError);
            // No fallar si hay error con el tax_id, continuar sin él
          }
        }
      }

      await stripe.customers.update(customerId, updateData);
      return { customerId, taxId: createdTaxId };
    }

    // Crear nuevo cliente con datos de facturación
    const createData: any = {
      email,
      name: billingInfo?.legalName || name,
      metadata: {
        businessId,
        customerType: billingInfo?.customerType || '',
        legalName: billingInfo?.legalName || '',
      },
    };

    if (billingInfo) {
      createData.phone = billingInfo.phone || undefined;
      createData.address = {
        line1: billingInfo.address?.line1 || '',
        line2: billingInfo.address?.line2 || '',
        city: billingInfo.address?.city || '',
        state: billingInfo.address?.state || '',
        postal_code: billingInfo.address?.postal_code || '',
        country: billingInfo.address?.country || 'ES',
      };
    }

    const customer = await stripe.customers.create(createData);

    // Añadir el NIF/CIF como tax_id después de crear el cliente
    if (billingInfo?.taxId && customer.id) {
      try {
        const newTaxId = await stripe.customers.createTaxId(customer.id, {
          type: 'es_cif', // Para España
          value: billingInfo.taxId,
        });
        createdTaxId = newTaxId.id;
        console.log(`[getOrCreateStripeCustomer] Tax ID creado para nuevo cliente: ${createdTaxId}`);
      } catch (taxError) {
        console.error('Error añadiendo tax_id al nuevo cliente:', taxError);
        // No fallar si hay error con el tax_id
      }
    }

    return { customerId: customer.id, taxId: createdTaxId };
  } catch (error) {
    console.error('Error creando/obteniendo cliente de Stripe:', error);
    throw error;
  }
}

/**
 * Crea un SetupIntent para guardar un método de pago y devuelve el client secret.
 * Este es el primer paso del nuevo flujo de suscripción.
 */
export async function createSetupIntentAndReturnClientSecret(
  userEmail: string,
  businessId: string,
  userName?: string,
  billingInfo?: any
): Promise<{ clientSecret: string; customerId: string; taxId: string | null }> {
  try {
    console.log('[createSetupIntentAndReturnClientSecret] Iniciando con:', { userEmail, businessId });

    // 1. Obtener o crear el cliente de Stripe con datos de facturación
    const { customerId, taxId } = await getOrCreateStripeCustomer(userEmail, businessId, userName, billingInfo);
    console.log('[createSetupIntentAndReturnClientSecret] Cliente de Stripe:', customerId, 'Tax ID:', taxId);

    // 2. Crear un SetupIntent para validar y guardar el método de pago
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'link'], // Se elimina PayPal temporalmente
      metadata: {
        businessId,
        userEmail,
      },
      usage: 'off_session', // Clave para pagos recurrentes
    });

    console.log('[createSetupIntentAndReturnClientSecret] ✅ SetupIntent creado exitosamente');

    // 3. Devolver el client_secret para que el frontend pueda confirmar el setup
    return {
      clientSecret: setupIntent.client_secret!,
      customerId,
      taxId,
    };
  } catch (error: any) {
    console.error('[createSetupIntentAndReturnClientSecret] ❌ Error detallado:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
    });
    throw error;
  }
}


/**
 * Función OBSOLETA que crea una suscripción directamente.
 * Ahora solo crea un SetupIntent para mantener la compatibilidad con el flujo de registro.
 * El frontend debería migrar a llamar a /api/admin/payment-methods/setup directamente.
 */
export async function createSubscriptionAndReturnClientSecret(
  businessId: string,
  planKey: string,
  userEmail: string,
  userName?: string,
  billingInfo?: any
): Promise<{
  clientSecret: string;
  customerId: string;
  taxId?: string | null;
  mode: 'setup'; // Siempre será 'setup' ahora
}> {
  console.warn(`[createSubscriptionAndReturnClientSecret] Esta función está obsoleta. 
    El flujo de registro debería llamar a un endpoint que solo cree un SetupIntent.`);

  try {
    // El objetivo ahora es solo crear un SetupIntent con datos de facturación.
    // La creación de la suscripción se delega al webhook 'setup_intent.succeeded'.
    const { clientSecret, customerId, taxId } = await createSetupIntentAndReturnClientSecret(
      userEmail,
      businessId,
      userName,
      billingInfo
    );

    // Devolvemos una estructura compatible con la antigua para no romper el frontend de inmediato.
    return {
      clientSecret,
      customerId,
      taxId,
      mode: 'setup', // El modo siempre será 'setup'
    };
  } catch (error: any) {
    console.error('[createSubscriptionAndReturnClientSecret] ❌ Error:', error);
    throw error;
  }
}

/**
 * Confirma una suscripción después del pago exitoso
 * Nota: Normalmente Stripe activa la suscripción automáticamente cuando el PaymentIntent se completa
 */
export async function confirmSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    });
    
    // La suscripción se activa automáticamente cuando el payment intent de la invoice se completa
    // Solo necesitamos verificar el estado
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      console.log(`Suscripción ${subscriptionId} confirmada con estado: ${subscription.status}`);
    }

    return subscription;
  } catch (error) {
    console.error('Error confirmando suscripción:', error);
    throw error;
  }
}

/**
 * Cancela una suscripción en Stripe
 */
export async function cancelSubscription(
  stripeSubscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  try {
    if (immediately) {
      // Cancelar inmediatamente
      return await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      // Cancelar al final del período de facturación
      return await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    throw error;
  }
}

/**
 * Pausa una suscripción en Stripe (por ejemplo, por impago)
 */
export async function pauseSubscription(
  stripeSubscriptionId: string,
  resumeAt?: Date
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
        resumes_at: resumeAt ? Math.floor(resumeAt.getTime() / 1000) : undefined,
      },
    });
  } catch (error) {
    console.error('Error pausando suscripción:', error);
    throw error;
  }
}

/**
 * Reanuda una suscripción pausada en Stripe
 */
export async function resumeSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: null,
    });
  } catch (error) {
    console.error('Error reanudando suscripción:', error);
    throw error;
  }
}

/**
 * Cambia el plan de una suscripción
 */
export async function changePlan(
  stripeSubscriptionId: string,
  newPlanKey: string,
  prorate: boolean = true
): Promise<Stripe.Subscription> {
  try {
    // Obtener el nuevo plan de la DB
    const newPlan = await getPlanFromDB(newPlanKey);
    if (!newPlan) {
      throw new Error(`Plan ${newPlanKey} no encontrado`);
    }

    // Asegurarse de que el plan esté sincronizado con Stripe
    if (!newPlan.stripePriceId) {
      const { productId, priceId } = await syncPlanToStripe(newPlan);
      
      // Actualizar el plan en la DB
      const db = await getDatabase();
      await db.collection('subscriptionplans').updateOne(
        { key: newPlanKey },
        { 
          $set: { 
            stripeProductId: productId,
            stripePriceId: priceId,
            updatedAt: new Date()
          } 
        }
      );
      
      newPlan.stripePriceId = priceId;
    }

    // Obtener la suscripción actual
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    // Actualizar el item de la suscripción
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: prorate ? 'create_prorations' : 'none',
      metadata: {
        ...subscription.metadata,
        planKey: newPlanKey,
      },
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error cambiando plan:', error);
    throw error;
  }
}

/**
 * Obtiene el estado de una suscripción desde Stripe
 */
export async function getSubscriptionStatus(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(stripeSubscriptionId);
  } catch (error) {
    console.error('Error obteniendo estado de suscripción:', error);
    return null;
  }
}

/**
 * Maneja el fallo de pago incrementando el contador y suspendiendo si es necesario
 */
export async function handlePaymentFailure(
  businessId: string,
  maxFailures: number = 3
): Promise<void> {
  try {
    const db = await getDatabase();
    
    // Obtener el negocio actual
    const business = await db.collection('businesses').findOne({ 
      _id: new ObjectId(businessId) 
    });
    
    if (!business) {
      throw new Error(`Negocio ${businessId} no encontrado`);
    }

    const currentFailures = (business.subscription?.paymentFailures || 0) + 1;
    
    if (currentFailures >= maxFailures) {
      // Suspender la cuenta
      await updateBusinessSubscription(businessId, {
        status: 'suspended',
        active: false,
      });
      
      console.log(`Negocio ${businessId} suspendido después de ${currentFailures} fallos de pago`);
    } else {
      // Incrementar contador de fallos
      await db.collection('businesses').updateOne(
        { _id: new ObjectId(businessId) },
        { 
          $set: { 
            'subscription.paymentFailures': currentFailures,
            'subscription.lastPaymentAttempt': new Date(),
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`Negocio ${businessId}: fallo de pago ${currentFailures}/${maxFailures}`);
    }
  } catch (error) {
    console.error('Error manejando fallo de pago:', error);
    throw error;
  }
}

/**
 * Resetea el contador de fallos de pago cuando un pago es exitoso
 */
export async function resetPaymentFailures(businessId: string): Promise<void> {
  try {
    const db = await getDatabase();
    
    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      { 
        $set: { 
          'subscription.paymentFailures': 0,
          'subscription.lastPaymentAttempt': new Date(),
          active: true,
          updatedAt: new Date()
        } 
      }
    );
  } catch (error) {
    console.error('Error reseteando fallos de pago:', error);
    throw error;
  }
}

/**
 * Obtiene todos los planes activos
 */
export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  try {
    const db = await getDatabase();
    const plans = await db.collection('subscriptionplans')
      .find({ active: true })
      .sort({ recurringPrice: 1 })
      .toArray();
    return plans as SubscriptionPlan[];
  } catch (error) {
    console.error('Error obteniendo planes activos:', error);
    throw error;
  }
}

/**
 * Valida si un negocio tiene acceso según su plan
 */
export async function validateBusinessAccess(
  businessId: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const business = await db.collection('businesses').findOne({ 
      _id: new ObjectId(businessId) 
    });
    
    if (!business) {
      return false;
    }

    // Verificar si está activo y con suscripción válida
    return business.active === true && 
           business.subscription?.status === 'active';
  } catch (error) {
    console.error('Error validando acceso del negocio:', error);
    return false;
  }
}
