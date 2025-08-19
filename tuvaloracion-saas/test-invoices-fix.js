// Script para verificar la corrección del problema de facturas
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function testInvoicesFix() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db('topestrellas');
    
    // Buscar el usuario de prueba
    const testUser = await db.collection('users').findOne({
      email: 'merquis85@gmail.com'
    });
    
    if (!testUser) {
      console.error('❌ Usuario no encontrado');
      return;
    }
    
    console.log('\n📋 Información del Usuario:');
    console.log('- Email:', testUser.email);
    console.log('- Nombre:', testUser.name);
    console.log('- Rol:', testUser.role);
    console.log('- Business ID:', testUser.businessId);
    
    // Buscar el business asociado
    if (testUser.businessId) {
      const business = await db.collection('businesses').findOne({
        _id: testUser.businessId
      });
      
      if (business) {
        console.log('\n🏪 Información del Negocio:');
        console.log('- Nombre:', business.name);
        console.log('- Subdominio:', business.subdomain);
        console.log('- Estado:', business.active ? 'Activo' : 'Inactivo');
        
        if (business.subscription) {
          console.log('\n💳 Información de Suscripción:');
          console.log('- Plan:', business.subscription.plan);
          console.log('- Estado:', business.subscription.status);
          console.log('- Stripe Customer ID:', business.subscription.stripeCustomerId);
          console.log('- Stripe Subscription ID:', business.subscription.stripeSubscriptionId);
          
          if (business.subscription.stripeCustomerId) {
            console.log('\n✅ El negocio tiene un Stripe Customer ID configurado');
            console.log('   La API de facturas debería poder obtener las facturas correctamente');
          } else {
            console.log('\n⚠️ El negocio NO tiene un Stripe Customer ID configurado');
            console.log('   Esto causará que no se puedan obtener las facturas');
          }
        } else {
          console.log('\n⚠️ El negocio no tiene información de suscripción');
        }
      } else {
        console.log('\n❌ No se encontró el negocio asociado al usuario');
      }
    } else {
      console.log('\n⚠️ El usuario no tiene un businessId asociado');
    }
    
    // Verificar la estructura esperada
    console.log('\n🔍 Verificación de la estructura:');
    console.log('- Usuario tiene businessId:', !!testUser.businessId);
    console.log('- Business existe:', !!(testUser.businessId && await db.collection('businesses').findOne({ _id: testUser.businessId })));
    
    const businessCheck = testUser.businessId ? await db.collection('businesses').findOne({ _id: testUser.businessId }) : null;
    console.log('- Business tiene subscription:', !!(businessCheck && businessCheck.subscription));
    console.log('- Subscription tiene stripeCustomerId:', !!(businessCheck && businessCheck.subscription && businessCheck.subscription.stripeCustomerId));
    
    console.log('\n📝 Resumen:');
    if (businessCheck && businessCheck.subscription && businessCheck.subscription.stripeCustomerId) {
      console.log('✅ La estructura está correcta. Las facturas deberían mostrarse correctamente.');
      console.log('   Stripe Customer ID:', businessCheck.subscription.stripeCustomerId);
    } else {
      console.log('❌ Hay problemas con la estructura de datos que impedirán mostrar las facturas.');
      console.log('   Se necesita configurar correctamente el stripeCustomerId en el business.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Conexión cerrada');
  }
}

// Ejecutar el test
testInvoicesFix().catch(console.error);
