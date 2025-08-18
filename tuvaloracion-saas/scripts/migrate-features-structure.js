/**
 * Script de migración para actualizar la estructura de características
 * de los planes de suscripción de array de strings a array de objetos
 * con propiedades 'name' e 'included'
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion';

async function migrateFeatures() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    const collection = db.collection('subscriptionplans');
    
    // Obtener todos los planes
    const plans = await collection.find({}).toArray();
    console.log(`📋 Encontrados ${plans.length} planes para migrar`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const plan of plans) {
      // Verificar si las características ya están en el nuevo formato
      const needsMigration = plan.features && 
        plan.features.length > 0 && 
        typeof plan.features[0] === 'string';
      
      if (needsMigration) {
        // Convertir características de strings a objetos
        const newFeatures = plan.features.map(feature => {
          if (typeof feature === 'string') {
            return {
              name: feature,
              included: true // Por defecto, todas las características existentes se marcan como incluidas
            };
          }
          return feature; // Si ya es un objeto, dejarlo como está
        });
        
        // Actualizar el plan en la base de datos
        await collection.updateOne(
          { _id: plan._id },
          { 
            $set: { 
              features: newFeatures,
              updatedAt: new Date()
            } 
          }
        );
        
        console.log(`✅ Migrado plan: ${plan.name} (${plan.key})`);
        console.log(`   - Características convertidas: ${plan.features.length}`);
        migratedCount++;
      } else {
        console.log(`⏭️  Plan ${plan.name} (${plan.key}) ya está en el formato correcto o no tiene características`);
        skippedCount++;
      }
    }
    
    console.log('\n📊 Resumen de migración:');
    console.log(`   - Planes migrados: ${migratedCount}`);
    console.log(`   - Planes omitidos: ${skippedCount}`);
    console.log(`   - Total procesado: ${plans.length}`);
    
    // Verificar la migración mostrando un ejemplo
    if (migratedCount > 0) {
      const samplePlan = await collection.findOne({ 
        'features.0.name': { $exists: true } 
      });
      
      if (samplePlan) {
        console.log('\n📝 Ejemplo de plan migrado:');
        console.log(`   Plan: ${samplePlan.name}`);
        console.log('   Características:');
        samplePlan.features.forEach((feature, index) => {
          const icon = feature.included ? '✅' : '❌';
          console.log(`     ${index + 1}. ${icon} ${feature.name}`);
        });
      }
    }
    
    console.log('\n✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar la migración
migrateFeatures().catch(console.error);
