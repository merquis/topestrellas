const { MongoClient, ObjectId } = require('mongodb');

async function fixTenerifeTimezone() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db('tuvaloracion');
    
    // Buscar el negocio de Tenerife
    const business = await db.collection('businesses').findOne({ 
      subdomain: 'restaurante-pizzeria-euro' 
    });
    
    if (!business) {
      console.log('❌ No se encontró el negocio con subdomain: restaurante-pizzeria-euro');
      
      // Buscar todos los negocios para ver cuáles hay
      const allBusinesses = await db.collection('businesses').find({}).toArray();
      console.log('\n📋 Negocios disponibles:');
      allBusinesses.forEach(b => {
        console.log(`  - ${b.name} (${b.subdomain}) - Ciudad: ${b.location?.city || 'Sin ciudad'} - Timezone: ${b.location?.timezone || 'Sin timezone'}`);
      });
      return;
    }
    
    console.log('\n🏢 Negocio encontrado:');
    console.log(`  - Nombre: ${business.name}`);
    console.log(`  - Subdomain: ${business.subdomain}`);
    console.log(`  - Ciudad actual: ${business.location?.city || 'Sin ciudad'}`);
    console.log(`  - Timezone actual: ${business.location?.timezone || 'Sin timezone'}`);
    
    // Actualizar la zona horaria a Atlantic/Canary
    const updateResult = await db.collection('businesses').updateOne(
      { _id: business._id },
      {
        $set: {
          'location.timezone': 'Atlantic/Canary',
          'location.city': 'Tenerife',
          'updatedAt': new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('\n✅ Negocio actualizado correctamente');
      console.log('  - Nueva timezone: Atlantic/Canary');
      console.log('  - Nueva ciudad: Tenerife');
      
      // Verificar la actualización
      const updatedBusiness = await db.collection('businesses').findOne({ _id: business._id });
      console.log('\n🔍 Verificación:');
      console.log(`  - Timezone: ${updatedBusiness.location?.timezone}`);
      console.log(`  - Ciudad: ${updatedBusiness.location?.city}`);
      
      // Probar el formateo de fecha/hora
      const now = new Date();
      const canaryTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Atlantic/Canary',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      
      const madridTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      
      console.log('\n🕐 Prueba de horarios:');
      console.log(`  - Hora en Madrid: ${madridTime}`);
      console.log(`  - Hora en Canarias: ${canaryTime}`);
      
    } else {
      console.log('❌ No se pudo actualizar el negocio');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixTenerifeTimezone();
}

module.exports = { fixTenerifeTimezone };
