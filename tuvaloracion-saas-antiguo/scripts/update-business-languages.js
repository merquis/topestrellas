const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function updateBusinessLanguages() {
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
    
    // Actualizar el negocio restaurante-euro para incluir más idiomas
    const result = await db.collection('businesses').updateOne(
      { subdomain: 'restaurante-euro' },
      { 
        $set: { 
          'config.languages': ['es', 'en', 'de', 'fr'],
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Actualizado restaurante-euro con idiomas: es, en, de, fr');
    } else {
      console.log('⚠️  No se encontró el negocio o ya tenía los idiomas configurados');
    }
    
    // Verificar el estado actual
    const business = await db.collection('businesses').findOne({ subdomain: 'restaurante-euro' });
    if (business) {
      console.log('\n📋 Estado actual del negocio:');
      console.log('   - Nombre:', business.name);
      console.log('   - Idiomas:', business.config.languages);
      console.log('   - Active:', business.active);
    }
    
    console.log('\n🎉 Actualización completada');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

updateBusinessLanguages();
