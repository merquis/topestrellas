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
  currency: string;
  interval: 'month' | 'year';
  trialDays: number;
  features: string[];
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
  // No sincronizar el plan de prueba con Stripe
  if (plan.key === 'trial') {
    return {
      productId: 'local_trial_product',
      priceId: 'local_trial_price',
    };
  }

  try {
    let product: Stripe.Product;
    let price: Stripe.Price;

    // Verificar si el producto ya existe en Stripe
    if (plan.stripeProductId) {
      try {
        product = await stripe.products.retrieve(plan.stripeProductId);
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
      } catch (error) {
        // Si el producto no existe, lo creamos
        console.log(`Producto ${plan.stripeProductId} no encontrado, creando uno nuevo`);
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
      }
    } else {
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
      priceData.recurring = {
        interval: plan.interval === 'year' ? 'year' : 'month',
        interval_count: 1,
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      };
      priceData.unit_amount = eurosToCents(plan.recurringPrice);
    } else {
      priceData.unit_amount = eurosToCents(plan.recurringPrice);
    }

    price = await stripe.prices.create(priceData);

    // Si hay un precio anterior, lo desactivamos
    if (plan.stripePriceId && plan.stripePriceId !== price.id) {
      try {
        await stripe.prices.update(plan.stripePriceId, { active: false });
      } catch (error) {
        console.log(`No se pudo desactivar el precio anterior: ${plan.stripePriceId}`);
      }
    }

    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error) {
    console.error('Error sincronizando plan con Stripe:', error);
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
 * Crea o obtiene un cliente de Stripe
 */
export async function getOrCreateStripeCustomer(
  email: string,
  businessId: string,
  name?: string
): Promise<string> {
  try {
    // Buscar si ya existe un cliente con este email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      // Actualizar metadata del cliente existente
      const customer = await stripe.customers.update(existingCustomers.data[0].id, {
        metadata: {
          businessId,
        },
      });
      return customer.id;
    }

    // Crear nuevo cliente
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        businessId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error('Error creando/obteniendo cliente de Stripe:', error);
    throw error;
  }
}

/**
 * Crea una suscripción y devuelve el client secret para el pago embebido
 */
export async function createSubscriptionAndReturnClientSecret(
  businessId: string,
  planKey: string,
  userEmail: string,
  userName?: string
): Promise<{
  clientSecret: string;
  subscriptionId?: string;
  customerId: string;
}> {
  try {
    // Obtener el plan de la DB
    const plan = await getPlanFromDB(planKey);
    if (!plan) {
      throw new Error(`Plan ${planKey} no encontrado`);
    }

    // Asegurarse de que el plan esté sincronizado con Stripe
    if (!plan.stripePriceId) {
      const { productId, priceId } = await syncPlanToStripe(plan);
      
      // Actualizar el plan en la DB con los IDs de Stripe
      const db = await getDatabase();
      await db.collection('subscriptionplans').updateOne(
        { key: planKey },
        { 
          $set: { 
            stripeProductId: productId,
            stripePriceId: priceId,
            updatedAt: new Date()
          } 
        }
      );
      
      plan.stripeProductId = productId;
      plan.stripePriceId = priceId;
    }

    // Obtener o crear cliente de Stripe
    const customerId = await getOrCreateStripeCustomer(userEmail, businessId, userName);

    // Si es una suscripción recurrente
    if (plan.interval) {
      // Crear la suscripción con payment_behavior='default_incomplete'
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: plan.stripePriceId,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card', 'paypal'], // Especificar métodos de pago permitidos
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          businessId,
          planKey,
        },
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
        // Si hay setup fee, agregarlo como un item adicional
        add_invoice_items: plan.setupPrice > 0 ? [
          {
            price_data: {
              currency: plan.currency.toLowerCase(),
              product: plan.stripeProductId!,
              unit_amount: eurosToCents(plan.setupPrice),
            },
          },
        ] : undefined,
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent;

      return {
        clientSecret: paymentIntent.client_secret!,
        subscriptionId: subscription.id,
        customerId,
      };
    } else {
      // Para pagos únicos, crear un Payment Intent simple
      const totalAmount = eurosToCents(plan.recurringPrice + (plan.setupPrice || 0));
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: plan.currency.toLowerCase(),
        customer: customerId,
        metadata: {
          businessId,
          planKey,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        customerId,
      };
    }
  } catch (error) {
    console.error('Error creando payment intent:', error);
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
