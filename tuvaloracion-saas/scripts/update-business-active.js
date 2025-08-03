const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function updateBusinessActive() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI no está configurado en .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('tuvaloracion');
    
    // Buscar todos los negocios que no tienen el campo active
    const businessesWithoutActive = await db.collection('businesses').find({
      active: { $exists: false }
    }).toArray();
    
    console.log(`\n📊 Negocios sin campo active: ${businessesWithoutActive.length}`);
    
    if (businessesWithoutActive.length > 0) {
      // Actualizar todos los negocios sin active para que lo tengan como true
      const result = await db.collection('businesses').updateMany(
        { active: { $exists: false } },
        { 
          $set: { 
            active: true,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`✅ Actualizados ${result.modifiedCount} negocios con active = true`);
    }
    
    // Verificar el negocio demo específicamente
    const demoBusiness = await db.collection('businesses').findOne({ subdomain: 'demo' });
    if (demoBusiness) {
      console.log('\n📋 Estado del negocio demo:');
      console.log('   - Nombre:', demoBusiness.name);
      console.log('   - active:', demoBusiness.active);
      console.log('   - Plan:', demoBusiness.plan);
      
      // Si el demo no tiene active o está en false, actualizarlo
      if (!demoBusiness.active) {
        await db.collection('businesses').updateOne(
          { subdomain: 'demo' },
          { 
            $set: { 
              active: true,
              updatedAt: new Date()
            } 
          }
        );
        console.log('✅ Negocio demo actualizado con active = true');
      }
    }
    
    console.log('\n🎉 Actualización completada');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

updateBusinessActive();
