const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

async function testPauseStatus() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Buscar el negocio específico
    const businessId = '68a4a87bb83e1caa3be6c77e';
    const business = await db.collection('businesses').findOne({
      _id: new ObjectId(businessId)
    });
    
    if (!business) {
      console.log('❌ Negocio no encontrado');
      return;
    }
    
    console.log('🔍 Estado actual del negocio:');
    console.log('- Nombre:', business.name);
    console.log('- Status:', business.subscription?.status);
    console.log('- PauseStatus:', business.subscription?.pauseStatus);
    console.log('- PausedAt:', business.subscription?.pausedAt);
    console.log('- ResumedAt:', business.subscription?.resumedAt);
    
    // Determinar qué debería mostrar el componente
    const isActive = (business.subscription?.status === 'active' || business.subscription?.status === 'trialing') 
                     && !business.subscription?.pauseStatus;
    const isPaused = business.subscription?.pauseStatus === true;
    
    console.log('\n🎯 Lógica del componente:');
    console.log('- isActive:', isActive);
    console.log('- isPaused:', isPaused);
    console.log('- Debería mostrar:', isPaused ? '🔴 Suspendido' : (isActive ? '🟢 Activo' : '⚪ Otro estado'));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testPauseStatus();
