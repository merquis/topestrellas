const { MongoClient, ObjectId } = require('mongodb');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

// Función para convertir euros a céntimos
function eurosToCents(euros) {
  return Math.round(euros * 100);
}

async function forceSyncPlan(planKey) {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');
    
    const db = client.db(process.env.MONGODB_DB || 'tuvaloracion');
    
    // Obtener el plan de MongoDB
    const plan = await db.collection('subscriptionplans').findOne({ key: planKey });
    
    if (!plan) {
      console.error(`❌ No se encontró el plan con key: ${planKey}`);
      return;
    }
    
    console.log('📋 Plan encontrado en MongoDB:');
    console.log(`  - Nombre: ${plan.name}`);
    console.log(`  - Precio Recurrente: ${plan.recurringPrice}€`);
    console.log(`  - Intervalo: ${plan.interval}`);
    console.log(`  - Stripe Product ID: ${plan.stripeProductId}`);
    console.log(`  - Stripe Price ID actual: ${plan.stripePriceId}`);
    
    if (!plan.stripeProductId) {
      console.error('❌ Este plan no tiene un Product ID de Stripe');
      return;
    }
    
    // Mapear intervalo
    let stripeInterval = 'month';
    let intervalCount = 1;
    
    switch(plan.interval) {
      case 'month':
        stripeInterval = 'month';
        intervalCount = 1;
        break;
      case 'quarter':
        stripeInterval = 'month';
        intervalCount = 3;
        break;
      case 'semester':
        stripeInterval = 'month';
        intervalCount = 6;
        break;
      case 'year':
        stripeInterval = 'year';
        intervalCount = 1;
        break;
    }
    
    console.log(`\n🔄 Creando nuevo precio en Stripe...`);
    console.log(`  - Precio en euros: ${plan.recurringPrice}€`);
    console.log(`  - Precio en céntimos: ${eurosToCents(plan.recurringPrice)}`);
    console.log(`  - Intervalo: ${stripeInterval} (cada ${intervalCount})`);
    
    // Crear nuevo precio en Stripe
    const newPrice = await stripe.prices.create({
      product: plan.stripeProductId,
      currency: 'eur',
      unit_amount: eurosToCents(plan.recurringPrice),
      recurring: {
        interval: stripeInterval,
        interval_count: intervalCount,
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      },
      nickname: `${plan.name} - Actualizado ${new Date().toISOString()}`,
      metadata: {
        planKey: plan.key,
        setupPrice: plan.setupPrice?.toString() || '0',
      },
      active: true,
    });
    
    console.log(`✅ Nuevo precio creado: ${newPrice.id}`);
    console.log(`  - Monto: ${newPrice.unit_amount / 100}€`);
    
    // Desactivar el precio anterior si existe
    if (plan.stripePriceId && plan.stripePriceId !== newPrice.id) {
      try {
        console.log(`\n🔄 Desactivando precio anterior: ${plan.stripePriceId}`);
        await stripe.prices.update(plan.stripePriceId, { active: false });
        console.log(`✅ Precio anterior desactivado`);
      } catch (error) {
        console.log(`⚠️  No se pudo desactivar el precio anterior: ${error.message}`);
      }
    }
    
    // Actualizar MongoDB con el nuevo Price ID
    console.log(`\n🔄 Actualizando MongoDB con el nuevo Price ID...`);
    const updateResult = await db.collection('subscriptionplans').updateOne(
      { key: planKey },
      { 
        $set: { 
          stripePriceId: newPrice.id,
          updatedAt: new Date()
        } 
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log(`✅ MongoDB actualizado correctamente`);
    } else {
      console.log(`⚠️  No se pudo actualizar MongoDB`);
    }
    
    // Verificar el resultado
    const updatedPlan = await db.collection('subscriptionplans').findOne({ key: planKey });
    console.log(`\n📊 Verificación final:`);
    console.log(`  - Nuevo Stripe Price ID en MongoDB: ${updatedPlan.stripePriceId}`);
    console.log(`  - Precio en MongoDB: ${updatedPlan.recurringPrice}€`);
    
    // Verificar en Stripe
    const verifyPrice = await stripe.prices.retrieve(updatedPlan.stripePriceId);
    console.log(`  - Precio en Stripe: ${verifyPrice.unit_amount / 100}€`);
    
    if (Math.abs((verifyPrice.unit_amount / 100) - updatedPlan.recurringPrice) < 0.01) {
      console.log(`\n✅ ¡SINCRONIZACIÓN EXITOSA!`);
    } else {
      console.log(`\n⚠️  Hay una discrepancia entre MongoDB y Stripe`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

// Obtener el plan key de los argumentos de línea de comandos
const planKey = process.argv[2] || 'crecimiento';

console.log('='.repeat(60));
console.log(`FORZAR SINCRONIZACIÓN DEL PLAN: ${planKey}`);
console.log('='.repeat(60));

forceSyncPlan(planKey).catch(console.error);
