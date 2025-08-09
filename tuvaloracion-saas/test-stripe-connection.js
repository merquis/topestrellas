const Stripe = require('stripe');

// Usar las claves de producción
const stripe = new Stripe('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', {
  apiVersion: '2025-07-30.basil',
});

async function testStripeConnection() {
  try {
    console.log('🔍 Probando conexión con Stripe...\n');
    
    // 1. Verificar que podemos conectar con Stripe
    const account = await stripe.accounts.retrieve();
    console.log('✅ Conexión exitosa con Stripe');
    console.log('   Cuenta:', account.email);
    console.log('   País:', account.country);
    console.log('   Moneda por defecto:', account.default_currency);
    console.log('');
    
    // 2. Listar productos existentes
    console.log('📦 Productos en Stripe:');
    const products = await stripe.products.list({ limit: 5 });
    if (products.data.length === 0) {
      console.log('   ⚠️ No hay productos creados en Stripe');
    } else {
      products.data.forEach(product => {
        console.log(`   - ${product.name} (${product.id}) - Activo: ${product.active}`);
      });
    }
    console.log('');
    
    // 3. Listar precios existentes
    console.log('💰 Precios en Stripe:');
    const prices = await stripe.prices.list({ limit: 5, active: true });
    if (prices.data.length === 0) {
      console.log('   ⚠️ No hay precios activos en Stripe');
    } else {
      prices.data.forEach(price => {
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
        const interval = price.recurring ? `/${price.recurring.interval}` : ' (pago único)';
        console.log(`   - ${price.id}: ${amount} ${price.currency.toUpperCase()}${interval}`);
      });
    }
    console.log('');
    
    // 4. Verificar si podemos crear un PaymentIntent de prueba
    console.log('🧪 Probando creación de PaymentIntent...');
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100, // 1 euro
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
      });
      console.log('✅ PaymentIntent creado exitosamente');
      console.log('   ID:', paymentIntent.id);
      console.log('   Client Secret:', paymentIntent.client_secret ? 'Generado correctamente' : 'ERROR: No se generó');
      
      // Cancelar el PaymentIntent de prueba
      await stripe.paymentIntents.cancel(paymentIntent.id);
      console.log('   (PaymentIntent de prueba cancelado)');
    } catch (error) {
      console.log('❌ Error creando PaymentIntent:', error.message);
    }
    console.log('');
    
    // 5. Verificar configuración de métodos de pago
    console.log('💳 Verificando configuración de métodos de pago...');
    const paymentMethodConfigs = await stripe.paymentMethodConfigurations.list({ limit: 5 });
    if (paymentMethodConfigs.data.length === 0) {
      console.log('   ⚠️ No hay configuraciones de métodos de pago');
      console.log('   Esto puede causar problemas con automatic_payment_methods');
    } else {
      console.log('   ✅ Configuraciones encontradas:', paymentMethodConfigs.data.length);
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error conectando con Stripe:', error.message);
    console.error('   Tipo:', error.type);
    console.error('   Código:', error.code);
  }
}

testStripeConnection();
