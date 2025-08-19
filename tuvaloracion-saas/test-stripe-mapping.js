// Script de prueba para verificar el mapeo de Stripe
const { eurosToCents } = require('./lib/subscriptions');

// Simular un plan de prueba
const testPlan = {
  key: 'crecimiento',
  name: 'Plan Crecimiento',
  recurringPrice: 1.5,
  currency: 'EUR',
  interval: 'quarter',
  trialDays: 1,
  active: true
};

console.log('=== PRUEBA DE MAPEO DE STRIPE ===');
console.log('Plan de entrada:', {
  recurringPrice: testPlan.recurringPrice,
  interval: testPlan.interval
});

// Probar conversión de euros a céntimos
const centimos = eurosToCents(testPlan.recurringPrice);
console.log(`\nConversión de precio:`);
console.log(`${testPlan.recurringPrice} euros = ${centimos} céntimos`);

// Simular el mapeo de intervalos
let stripeInterval = 'month';
let intervalCount = 1;

switch(testPlan.interval) {
  case 'month':
    stripeInterval = 'month';
    intervalCount = 1;
    break;
  case 'quarter':
    stripeInterval = 'month';
    intervalCount = 3;
    break;
  case 'semester':
    stripeInterval = 'month';
    intervalCount = 6;
    break;
  case 'year':
    stripeInterval = 'year';
    intervalCount = 1;
    break;
  default:
    stripeInterval = 'month';
    intervalCount = 1;
}

console.log(`\nMapeo de intervalos:`);
console.log(`${testPlan.interval} -> interval: "${stripeInterval}", interval_count: ${intervalCount}`);

// Simular el objeto que se enviaría a Stripe
const priceData = {
  currency: testPlan.currency.toLowerCase(),
  recurring: {
    interval: stripeInterval,
    interval_count: intervalCount,
  },
  unit_amount: centimos
};

console.log(`\nJSON que se enviaría a Stripe:`);
console.log(JSON.stringify(priceData, null, 2));

console.log(`\n✅ El mapeo debería funcionar correctamente`);
