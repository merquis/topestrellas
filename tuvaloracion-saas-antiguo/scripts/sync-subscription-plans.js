const { MongoClient } = require('mongodb');
const Stripe = require('stripe');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY no está configurada');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

// Planes predefinidos
const plans = [
  {
    key: 'trial',
    name: 'Prueba Gratis',
    description: 'Periodo de prueba de 7 días',
    setupPrice: 0,
    recurringPrice: 0,
    currency: 'EUR',
    interval: 'month',
    trialDays: 7,
    features: [
      'Hasta 100 reseñas',
      'Sistema de premios básico',
      'Soporte por email',
      'Sin tarjeta de crédito'
    ],
    active: true,
    icon: '🎁',
    color: 'green',
    popular: false
  },
  {
    key: 'basic',
    name: 'Plan Básico',
    description: 'Ideal para negocios en crecimiento',
    setupPrice: 0,
    recurringPrice: 29,
    currency: 'EUR',
    interval: 'month',
    trialDays: 0,
    features: [
      'Hasta 500 reseñas',
      'Sistema de premios completo',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Personalización básica'
    ],
    active: true,
    icon: '🚀',
    color: 'blue',
    popular: false
  },
  {
    key: 'premium',
    name: 'Plan Premium',
    description: 'Para negocios que lo quieren todo',
    setupPrice: 89,
    recurringPrice: 90,
    currency: 'EUR',
    interval: 'month',
    trialDays: 0,
    features: [
      'Reseñas ilimitadas',
      'Múltiples ubicaciones',
      'API personalizada',
      'Soporte 24/7',
      'Personalización completa',
      'Análisis avanzado',
      'Integración con CRM'
    ],
    active: true,
    icon: '👑',
    color: 'purple',
    popular: true
  }
];

/**
 * Convierte euros a céntimos
 */
function eurosToCents(euros) {
  return Math.round(euros * 100);
}

/**
 * Sincroniza un plan con Stripe
 */
async function syncPlanToStripe(plan) {
  try {
    let product;
    let price;

    // Buscar si el producto ya existe por metadata
    const existingProducts = await stripe.products.search({
      query: `metadata['planKey']:'${plan.key}'`,
    });

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  ✓ Producto encontrado en Stripe: ${product.id}`);
      
      // Actualizar el producto
      product = await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description || undefined,
        active: plan.active,
        metadata: {
          planKey: plan.key,
          icon: plan.icon,
          color: plan.color,
          popular: plan.popular ? 'true' : 'false',
        },
      });
      console.log(`  ✓ Producto actualizado`);
    } else {
      // Crear nuevo producto
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description || undefined,
        active: plan.active,
        metadata: {
          planKey: plan.key,
          icon: plan.icon,
          color: plan.color,
          popular: plan.popular ? 'true' : 'false',
        },
      });
      console.log(`  ✓ Producto creado en Stripe: ${product.id}`);
    }

    // Buscar precios activos para este producto
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });

    // Verificar si ya existe un precio con las mismas características
    const matchingPrice = existingPrices.data.find(p => {
      if (plan.interval) {
        return p.recurring &&
               p.recurring.interval === plan.interval &&
               p.unit_amount === eurosToCents(plan.recurringPrice) &&
               p.currency === plan.currency.toLowerCase();
      } else {
        return !p.recurring &&
               p.unit_amount === eurosToCents(plan.recurringPrice) &&
               p.currency === plan.currency.toLowerCase();
      }
    });

    if (matchingPrice) {
      price = matchingPrice;
      console.log(`  ✓ Precio existente encontrado: ${price.id}`);
    } else {
      // Crear nuevo precio
      const priceData = {
        product: product.id,
        currency: plan.currency.toLowerCase(),
        active: plan.active,
        nickname: `${plan.name} - ${new Date().toISOString()}`,
        metadata: {
          planKey: plan.key,
          setupPrice: plan.setupPrice.toString(),
        },
      };

      if (plan.interval) {
        priceData.recurring = {
          interval: plan.interval,
          interval_count: 1,
          trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
        };
        priceData.unit_amount = eurosToCents(plan.recurringPrice);
      } else {
        priceData.unit_amount = eurosToCents(plan.recurringPrice);
      }

      price = await stripe.prices.create(priceData);
      console.log(`  ✓ Precio creado en Stripe: ${price.id}`);

      // Desactivar precios anteriores
      for (const oldPrice of existingPrices.data) {
        if (oldPrice.id !== price.id) {
          await stripe.prices.update(oldPrice.id, { active: false });
          console.log(`  ✓ Precio anterior desactivado: ${oldPrice.id}`);
        }
      }
    }

    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error) {
    console.error(`  ❌ Error sincronizando con Stripe:`, error.message);
    throw error;
  }
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 Conectando a MongoDB...');
    await client.connect();
    const db = client.db();
    
    console.log('✅ Conectado a MongoDB');
    console.log('');

    // Crear colección si no existe
    const collections = await db.listCollections({ name: 'subscriptionplans' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('subscriptionplans');
      console.log('✅ Colección subscriptionplans creada');
    }

    const collection = db.collection('subscriptionplans');

    console.log('🔄 Sincronizando planes de suscripción...\n');

    for (const plan of plans) {
      console.log(`📦 Procesando plan: ${plan.name} (${plan.key})`);

      try {
        // Sincronizar con Stripe
        const { productId, priceId } = await syncPlanToStripe(plan);

        // Buscar si el plan ya existe en la DB
        const existingPlan = await collection.findOne({ key: plan.key });

        const planData = {
          ...plan,
          stripeProductId: productId,
          stripePriceId: priceId,
          updatedAt: new Date(),
        };

        if (existingPlan) {
          // Actualizar plan existente
          await collection.updateOne(
            { key: plan.key },
            { 
              $set: planData
            }
          );
          console.log(`  ✓ Plan actualizado en MongoDB`);
        } else {
          // Insertar nuevo plan
          await collection.insertOne({
            ...planData,
            createdAt: new Date(),
          });
          console.log(`  ✓ Plan creado en MongoDB`);
        }

        console.log(`✅ Plan ${plan.name} sincronizado correctamente\n`);
      } catch (error) {
        console.error(`❌ Error procesando plan ${plan.name}:`, error.message);
        console.log('');
      }
    }

    // Verificar planes en la DB
    const dbPlans = await collection.find({}).toArray();
    console.log(`\n📊 Resumen:`);
    console.log(`  - Total de planes en DB: ${dbPlans.length}`);
    console.log(`  - Planes activos: ${dbPlans.filter(p => p.active).length}`);
    console.log(`  - Planes con Stripe ID: ${dbPlans.filter(p => p.stripeProductId).length}`);

    console.log('\n✅ Sincronización completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { syncPlanToStripe, plans };
