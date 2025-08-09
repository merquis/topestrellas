const { MongoClient } = require('mongodb');
const Stripe = require('stripe');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion';
const STRIPE_SECRET_KEY = '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';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY no está configurada');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

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
  console.log(`\n📦 Procesando plan: ${plan.name} (${plan.key})`);
  
  // No sincronizar el plan trial
  if (plan.key === 'trial') {
    console.log('  ⏭️  Plan trial - saltando sincronización con Stripe');
    return {
      productId: 'local_trial_product',
      priceId: 'local_trial_price',
    };
  }

  try {
    let product;
    let price;

    // Si ya tiene un stripeProductId, intentar recuperarlo
    if (plan.stripeProductId) {
      try {
        console.log(`  🔍 Buscando producto existente: ${plan.stripeProductId}`);
        product = await stripe.products.retrieve(plan.stripeProductId);
        console.log(`  ✓ Producto encontrado, actualizando...`);
        
        // Actualizar el producto
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
        console.log(`  ✓ Producto actualizado`);
      } catch (error) {
        console.log(`  ⚠️  Producto no encontrado en Stripe, creando uno nuevo...`);
        product = null;
      }
    }

    // Si no se encontró o no existía, crear nuevo producto
    if (!product) {
      // Buscar si existe un producto con el mismo planKey en metadata
      console.log(`  🔍 Buscando producto por metadata planKey='${plan.key}'...`);
      const existingProducts = await stripe.products.search({
        query: `metadata['planKey']:'${plan.key}'`,
      });

      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0];
        console.log(`  ✓ Producto encontrado por metadata: ${product.id}`);
        
        // Actualizar el producto
        product = await stripe.products.update(product.id, {
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
        console.log(`  ✓ Producto actualizado`);
      } else {
        // Crear nuevo producto
        console.log(`  ➕ Creando nuevo producto en Stripe...`);
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
        console.log(`  ✓ Producto creado: ${product.id}`);
      }
    }

    // Buscar precios activos para este producto
    console.log(`  🔍 Buscando precios existentes para el producto...`);
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
      console.log(`  ➕ Creando nuevo precio...`);
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

      console.log(`  📊 Datos del precio:`, {
        amount: eurosToCents(plan.recurringPrice),
        currency: plan.currency,
        interval: plan.interval || 'one_time'
      });

      price = await stripe.prices.create(priceData);
      console.log(`  ✓ Precio creado: ${price.id}`);

      // Desactivar precios anteriores
      if (existingPrices.data.length > 0) {
        console.log(`  🔄 Desactivando ${existingPrices.data.length} precio(s) anterior(es)...`);
        for (const oldPrice of existingPrices.data) {
          if (oldPrice.id !== price.id) {
            await stripe.prices.update(oldPrice.id, { active: false });
            console.log(`    - Precio ${oldPrice.id} desactivado`);
          }
        }
      }
    }

    console.log(`  ✅ Sincronización completada`);
    console.log(`     - Product ID: ${product.id}`);
    console.log(`     - Price ID: ${price.id}`);

    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error) {
    console.error(`  ❌ Error sincronizando con Stripe:`, error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('  ⚠️  Error de autenticación. Verifica tu STRIPE_SECRET_KEY');
    }
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
    
    const collection = db.collection('subscriptionplans');

    // Obtener todos los planes activos
    const plans = await collection.find({ active: true }).toArray();
    
    console.log(`\n📊 Encontrados ${plans.length} planes activos para sincronizar`);
    console.log('═'.repeat(60));

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const plan of plans) {
      try {
        const { productId, priceId } = await syncPlanToStripe(plan);

        // Actualizar el plan en MongoDB con los IDs de Stripe
        if (plan.key !== 'trial') {
          const updateResult = await collection.updateOne(
            { _id: plan._id },
            { 
              $set: { 
                stripeProductId: productId,
                stripePriceId: priceId,
                updatedAt: new Date()
              }
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(`  💾 IDs de Stripe guardados en MongoDB`);
          }
        }

        results.push({
          plan: plan.name,
          key: plan.key,
          status: 'success',
          productId,
          priceId
        });
        successCount++;
      } catch (error) {
        results.push({
          plan: plan.name,
          key: plan.key,
          status: 'error',
          error: error.message
        });
        errorCount++;
        console.error(`  ❌ Error procesando plan ${plan.name}:`, error.message);
      }

      console.log('─'.repeat(60));
    }

    // Mostrar resumen
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE SINCRONIZACIÓN');
    console.log('═'.repeat(60));
    console.log(`✅ Planes sincronizados exitosamente: ${successCount}`);
    console.log(`❌ Planes con errores: ${errorCount}`);
    console.log(`📦 Total de planes procesados: ${plans.length}`);
    
    console.log('\n📋 Detalle de resultados:');
    console.log('─'.repeat(60));
    results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`${icon} ${result.plan} (${result.key})`);
      if (result.status === 'success') {
        console.log(`   Product: ${result.productId}`);
        console.log(`   Price: ${result.priceId}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Verificar planes en la DB después de la sincronización
    const dbPlans = await collection.find({}).toArray();
    const plansWithStripe = dbPlans.filter(p => p.stripeProductId && p.stripePriceId);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ESTADO FINAL EN BASE DE DATOS');
    console.log('═'.repeat(60));
    console.log(`📦 Total de planes en DB: ${dbPlans.length}`);
    console.log(`✅ Planes activos: ${dbPlans.filter(p => p.active).length}`);
    console.log(`🔗 Planes con IDs de Stripe: ${plansWithStripe.length}`);
    console.log(`⏭️  Planes sin Stripe (trial): ${dbPlans.filter(p => p.key === 'trial').length}`);

    if (errorCount === 0) {
      console.log('\n🎉 ¡Sincronización completada exitosamente!');
    } else {
      console.log('\n⚠️  Sincronización completada con algunos errores. Revisa los logs arriba.');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Conexión a MongoDB cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  console.log('🚀 SINCRONIZACIÓN DE PLANES CON STRIPE');
  console.log('═'.repeat(60));
  console.log('Stripe API Key:', STRIPE_SECRET_KEY.substring(0, 20) + '...');
  console.log('MongoDB URI:', MONGODB_URI);
  console.log('═'.repeat(60));
  
  main().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { syncPlanToStripe };
