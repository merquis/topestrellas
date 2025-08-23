const { MongoClient } = require('mongodb');

async function testSuperAdminUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db('tuvaloracion');
    
    // Buscar usuario con email jesus0985@gmail.com
    const user = await db.collection('users').findOne({ 
      email: 'jesus0985@gmail.com' 
    });
    
    if (user) {
      console.log('\n📧 Usuario encontrado:');
      console.log('  Email:', user.email);
      console.log('  Nombre:', user.name);
      console.log('  Rol actual:', user.role);
      console.log('  ID:', user._id);
      
      // Verificar si el rol es super_admin
      if (user.role !== 'super_admin') {
        console.log('\n⚠️  PROBLEMA DETECTADO: El usuario NO tiene rol super_admin');
        console.log('    Rol actual:', user.role);
        
        // Actualizar a super_admin
        const result = await db.collection('users').updateOne(
          { email: 'jesus0985@gmail.com' },
          { $set: { role: 'super_admin' } }
        );
        
        if (result.modifiedCount > 0) {
          console.log('\n✅ Usuario actualizado a super_admin correctamente');
        }
      } else {
        console.log('\n✅ El usuario YA tiene rol super_admin');
      }
      
      // Verificar el usuario actualizado
      const updatedUser = await db.collection('users').findOne({ 
        email: 'jesus0985@gmail.com' 
      });
      console.log('\n📋 Estado final del usuario:');
      console.log('  Email:', updatedUser.email);
      console.log('  Rol:', updatedUser.role);
      
    } else {
      console.log('\n❌ Usuario no encontrado con email jesus0985@gmail.com');
      
      // Listar todos los usuarios para debug
      const allUsers = await db.collection('users').find({}).toArray();
      console.log('\n📋 Usuarios en la base de datos:');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (rol: ${u.role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Conexión cerrada');
  }
}

// Ejecutar el test
testSuperAdminUser();
