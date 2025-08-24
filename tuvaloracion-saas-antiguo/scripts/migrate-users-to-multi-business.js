// Script para migrar usuarios de businessId (single) a businessIds (array)
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'tuvaloracion';

async function migrateUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Buscar usuarios que tengan businessId pero no businessIds
    const usersToMigrate = await usersCollection.find({
      businessId: { $exists: true },
      businessIds: { $exists: false }
    }).toArray();
    
    console.log(`📊 Encontrados ${usersToMigrate.length} usuarios para migrar`);
    
    if (usersToMigrate.length === 0) {
      console.log('✅ No hay usuarios que migrar');
      return;
    }
    
    // Migrar cada usuario
    let migratedCount = 0;
    
    for (const user of usersToMigrate) {
      const businessIds = user.businessId ? [user.businessId] : [];
      
      const result = await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            businessIds: businessIds,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        migratedCount++;
        console.log(`✅ Migrado usuario: ${user.name} (${user.email})`);
        console.log(`   businessId: ${user.businessId} → businessIds: [${businessIds.join(', ')}]`);
      }
    }
    
    console.log(`\n🎉 Migración completada:`);
    console.log(`   - Usuarios migrados: ${migratedCount}`);
    console.log(`   - Total usuarios: ${usersToMigrate.length}`);
    
    // Verificar migración
    const verifyUsers = await usersCollection.find({
      businessIds: { $exists: true }
    }).toArray();
    
    console.log(`\n📋 Verificación:`);
    console.log(`   - Usuarios con businessIds: ${verifyUsers.length}`);
    
    verifyUsers.forEach(user => {
      console.log(`   - ${user.name}: businessIds = [${user.businessIds.join(', ')}]`);
    });
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar migración
if (require.main === module) {
  console.log('🚀 Iniciando migración de usuarios...\n');
  migrateUsers()
    .then(() => {
      console.log('\n✅ Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { migrateUsers };
