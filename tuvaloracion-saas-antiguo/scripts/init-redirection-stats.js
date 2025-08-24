const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion';

async function initRedirectionStats() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db('tuvaloracion');
    
    // Buscar negocios que no tengan redirectionStats
    const businessesWithoutStats = await db.collection('businesses').find({
      'config.redirectionStats': { $exists: false }
    }).toArray();
    
    console.log(`Encontrados ${businessesWithoutStats.length} negocios sin redirectionStats`);
    
    if (businessesWithoutStats.length === 0) {
      console.log('Todos los negocios ya tienen redirectionStats inicializadas');
      return;
    }
    
    // Inicializar redirectionStats para cada negocio
    for (const business of businessesWithoutStats) {
      console.log(`Inicializando redirectionStats para: ${business.name} (${business.subdomain})`);
      
      await db.collection('businesses').updateOne(
        { _id: business._id },
        {
          $set: {
            'config.redirectionStats': {
              googleRedirections: 0,
              tripadvisorRedirections: 0,
              lastRedirections: []
            }
          }
        }
      );
    }
    
    console.log('✅ redirectionStats inicializadas correctamente para todos los negocios');
    
  } catch (error) {
    console.error('❌ Error inicializando redirectionStats:', error);
  } finally {
    await client.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initRedirectionStats();
}

module.exports = { initRedirectionStats };
