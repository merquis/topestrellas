// Script para verificar la conexión con Stripe y los métodos de pago disponibles
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

async function testStripeConnection() {
  console.log('🔍 Verificando configuración de Stripe...\n');

  // Verificar que tenemos las claves
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY no está configurada en .env.local');
    return;
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada en .env.local');
    return;
  }

  console.log('✅ Claves de Stripe encontradas');
  console.log(`   - Secret Key: ${process.env.STRIPE_SECRET_KEY.substring(0, 20)}...`);
  console.log(`   - Public Key: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...`);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  });

  try {
    // Verificar la cuenta
    console.log('\n📊 Información de la cuenta:');
    const account = await stripe.accounts.retrieve();
    console.log(`   - ID: ${account.id}`);
    console.log(`   - País: ${account.country}`);
    console.log(`   - Moneda por defecto: ${account.default_currency}`);
    console.log(`   - Modo: ${account.charges_enabled ? 'LIVE' : 'TEST'}`);

    // Verificar métodos de pago configurados
    console.log('\n💳 Métodos de pago configurados:');
    const paymentMethodConfigs = await stripe.paymentMethodConfigurations.list({ limit: 10 });
    
    if (paymentMethodConfigs.data.length > 0) {
      paymentMethodConfigs.data.forEach(config => {
        console.log(`   - Configuración: ${config.id}`);
        if (config.card) console.log('     ✓ Tarjetas habilitadas');
        if (config.paypal) console.log('     ✓ PayPal habilitado');
        if (config.sepa_debit) console.log('     ✓ SEPA habilitado');
        if (config.google_pay) console.log('     ✓ Google Pay habilitado');
        if (config.apple_pay) console.log('     ✓ Apple Pay habilitado');
      });
    } else {
      console.log('   ℹ️  No hay configuraciones específicas (usando configuración por defecto)');
    }

    // Verificar productos y precios
    console.log('\n📦 Productos y precios en Stripe:');
    const products = await stripe.products.list({ limit: 10, active: true });
    
    for (const product of products.data) {
      console.log(`   - ${product.name} (${product.id})`);
      
      // Obtener precios del producto
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 5
      });
      
      prices.data.forEach(price => {
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0.00';
        const interval = price.recurring ? `/${price.recurring.interval}` : ' (único)';
        console.log(`     • ${amount} ${price.currency.toUpperCase()}${interval} - ${price.id}`);
      });
    }

    // Test de creación de suscripción
    console.log('\n🧪 Test de creación de suscripción:');
    
    // Crear un cliente de prueba
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      metadata: {
        test: 'true'
      }
    });
    console.log(`   ✅ Cliente de prueba creado: ${testCustomer.id}`);

    // Buscar un precio de prueba
    const prices = await stripe.prices.list({ active: true, limit: 1 });
    if (prices.data.length > 0) {
      const testPrice = prices.data[0];
      
      // Intentar crear una suscripción de prueba
      try {
        const subscription = await stripe.subscriptions.create({
          customer: testCustomer.id,
          items: [{ price: testPrice.id }],
          payment_behavior: 'default_incomplete',
          payment_settings: { 
            save_default_payment_method: 'on_subscription'
          },
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'always'
          },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            test: 'true'
          }
        });
        
        console.log(`   ✅ Suscripción de prueba creada: ${subscription.id}`);
        console.log(`   ✅ Estado: ${subscription.status}`);
        
        const invoice = subscription.latest_invoice;
        const paymentIntent = invoice.payment_intent;
        
        if (paymentIntent && paymentIntent.client_secret) {
          console.log(`   ✅ Client secret generado correctamente`);
          console.log(`   ✅ Métodos de pago automáticos habilitados`);
        }
        
        // Limpiar: cancelar la suscripción de prueba
        await stripe.subscriptions.cancel(subscription.id);
        console.log(`   🧹 Suscripción de prueba cancelada`);
        
      } catch (error) {
        console.error(`   ❌ Error creando suscripción: ${error.message}`);
      }
    }

    // Limpiar: eliminar el cliente de prueba
    await stripe.customers.del(testCustomer.id);
    console.log(`   🧹 Cliente de prueba eliminado`);

    console.log('\n✅ ¡Configuración verificada correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Activa PayPal en: https://dashboard.stripe.com/settings/payment_methods');
    console.log('   2. Completa la verificación del negocio si es necesario');
    console.log('   3. Prueba el flujo de pago en tu aplicación');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   La clave de API no es válida. Verifica tu configuración.');
    }
  }
}

// Ejecutar el test
testStripeConnection();
