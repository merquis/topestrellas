const { MongoClient, ObjectId } = require('mongodb');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

async function diagnosePlans() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');
    
    const db = client.db(process.env.MONGODB_DB || 'tuvaloracion');
    
    // Obtener todos los planes de MongoDB
    const plans = await db.collection('subscriptionplans').find({}).toArray();
    
    console.log('='.repeat(80));
    console.log('DIAGNÓSTICO DE SINCRONIZACIÓN MONGODB <-> STRIPE');
    console.log('='.repeat(80));
    
    for (const plan of plans) {
      console.log(`\n📋 PLAN: ${plan.name} (${plan.key})`);
      console.log('-'.repeat(40));
      
      // Datos de MongoDB
      console.log('📦 MongoDB:');
      console.log(`  - ID: ${plan._id}`);
      console.log(`  - Precio Recurrente: ${plan.recurringPrice}€`);
      console.log(`  - Precio Original: ${plan.originalPrice || 'N/A'}€`);
      console.log(`  - Intervalo: ${plan.interval}`);
      console.log(`  - Stripe Product ID: ${plan.stripeProductId || 'NO TIENE'}`);
      console.log(`  - Stripe Price ID: ${plan.stripePriceId || 'NO TIENE'}`);
      console.log(`  - Activo: ${plan.active ? 'Sí' : 'No'}`);
      console.log(`  - Última actualización: ${plan.updatedAt}`);
      
      // Si tiene IDs de Stripe, verificar en Stripe
      if (plan.stripeProductId && plan.stripePriceId) {
        console.log('\n💳 Stripe:');
        
        try {
          // Obtener producto de Stripe
          const product = await stripe.products.retrieve(plan.stripeProductId);
          console.log(`  - Producto: ${product.name} (${product.id})`);
          console.log(`  - Producto Activo: ${product.active ? 'Sí' : 'No'}`);
          
          // Obtener precio de Stripe
          const price = await stripe.prices.retrieve(plan.stripePriceId);
          const priceInEuros = price.unit_amount / 100;
          console.log(`  - Precio ID: ${price.id}`);
          console.log(`  - Precio: ${priceInEuros}€ (${price.unit_amount} céntimos)`);
          console.log(`  - Precio Activo: ${price.active ? 'Sí' : 'No'}`);
          
          // Mapear intervalo
          let intervalDescription = '';
          if (price.recurring) {
            if (price.recurring.interval === 'month' && price.recurring.interval_count === 3) {
              intervalDescription = 'quarter (cada 3 meses)';
            } else if (price.recurring.interval === 'month' && price.recurring.interval_count === 6) {
              intervalDescription = 'semester (cada 6 meses)';
            } else {
              intervalDescription = `${price.recurring.interval} (cada ${price.recurring.interval_count})`;
            }
          }
          console.log(`  - Intervalo: ${intervalDescription}`);
          
          // Verificar discrepancias
          console.log('\n🔍 Verificación:');
          
          if (Math.abs(priceInEuros - plan.recurringPrice) > 0.01) {
            console.log(`  ❌ DISCREPANCIA EN PRECIO: MongoDB=${plan.recurringPrice}€ vs Stripe=${priceInEuros}€`);
          } else {
            console.log(`  ✅ Precio sincronizado correctamente`);
          }
          
          // Listar todos los precios del producto
          const allPrices = await stripe.prices.list({
            product: plan.stripeProductId,
            limit: 10
          });
          
          if (allPrices.data.length > 1) {
            console.log(`\n  ⚠️  MÚLTIPLES PRECIOS ENCONTRADOS (${allPrices.data.length} total):`);
            for (const p of allPrices.data) {
              const pEuros = p.unit_amount / 100;
              console.log(`     - ${p.id}: ${pEuros}€ (${p.active ? 'ACTIVO' : 'INACTIVO'}) - Creado: ${new Date(p.created * 1000).toLocaleString()}`);
            }
          }
          
        } catch (stripeError) {
          console.log(`  ❌ Error obteniendo datos de Stripe: ${stripeError.message}`);
        }
      } else {
        console.log('\n⚠️  Este plan NO está sincronizado con Stripe');
      }
      
      console.log('\n' + '='.repeat(80));
    }
    
    // Resumen
    console.log('\n📊 RESUMEN:');
    console.log(`  - Total de planes en MongoDB: ${plans.length}`);
    console.log(`  - Planes activos: ${plans.filter(p => p.active).length}`);
    console.log(`  - Planes con Stripe ID: ${plans.filter(p => p.stripePriceId).length}`);
    console.log(`  - Planes sin Stripe ID: ${plans.filter(p => !p.stripePriceId).length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Diagnóstico completado');
  }
}

// Ejecutar diagnóstico
diagnosePlans().catch(console.error);
