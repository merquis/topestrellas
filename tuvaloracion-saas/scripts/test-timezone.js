const { MongoClient } = require('mongodb');

async function testTimezone() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion');
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Verificando opiniones recientes...');
    
    // Buscar las últimas 5 opiniones
    const opinions = await db.collection('opinions')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`\n📊 Encontradas ${opinions.length} opiniones:`);
    
    opinions.forEach((opinion, index) => {
      console.log(`\n--- Opinión ${index + 1} ---`);
      console.log(`ID: ${opinion._id}`);
      console.log(`Rating: ${opinion.rating}/5`);
      console.log(`Cliente: ${opinion.customerName || opinion.name || 'Anónimo'}`);
      console.log(`Comentario: "${opinion.comment || opinion.review || 'Sin comentario'}"`);
      
      // Verificar campos de tiempo
      console.log(`\n⏰ Información de tiempo:`);
      console.log(`  - createdAt: ${opinion.createdAt}`);
      console.log(`  - date: ${opinion.date || 'NO EXISTE'}`);
      console.log(`  - time: ${opinion.time || 'NO EXISTE'}`);
      console.log(`  - date_real: ${opinion.date_real || 'NO EXISTE'}`);
      
      // Verificar campos de premio
      console.log(`\n🎁 Información de premio:`);
      console.log(`  - prize: ${JSON.stringify(opinion.prize) || 'NO EXISTE'}`);
      console.log(`  - premio: ${opinion.premio || 'NO EXISTE'}`);
      console.log(`  - codigoPremio: ${opinion.codigoPremio || 'NO EXISTE'}`);
      
      console.log(`  - subdomain: ${opinion.subdomain || 'NO EXISTE'}`);
    });
    
    // Verificar negocios y sus zonas horarias
    console.log(`\n\n🏢 Verificando negocios y zonas horarias:`);
    const businesses = await db.collection('businesses')
      .find({})
      .toArray();
    
    businesses.forEach((business, index) => {
      console.log(`\n--- Negocio ${index + 1} ---`);
      console.log(`ID: ${business._id}`);
      console.log(`Nombre: ${business.name}`);
      console.log(`Subdomain: ${business.subdomain}`);
      console.log(`Ciudad: ${business.location?.city || 'NO DEFINIDA'}`);
      console.log(`Zona horaria: ${business.location?.timezone || 'NO DEFINIDA'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testTimezone();
