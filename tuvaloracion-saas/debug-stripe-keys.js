// Script de diagnóstico para verificar las claves de Stripe
console.log('=== DIAGNÓSTICO DE CLAVES STRIPE ===');
console.log('');

// Variables de entorno
console.log('Variables de entorno:');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 
  `${process.env.STRIPE_SECRET_KEY.substring(0, 20)}...${process.env.STRIPE_SECRET_KEY.slice(-6)}` : 
  'NO DEFINIDA');

console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 
  `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.slice(-6)}` : 
  'NO DEFINIDA');

console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 
  `${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 20)}...${process.env.STRIPE_WEBHOOK_SECRET.slice(-6)}` : 
  'NO DEFINIDA');

console.log('');

// Verificar si contiene la clave caducada
const secretKey = process.env.STRIPE_SECRET_KEY || '';
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

console.log('Verificación de claves caducadas:');
console.log('¿Secret key contiene WKy0Bs?', secretKey.includes('WKy0Bs') ? '❌ SÍ (PROBLEMA)' : '✅ NO');
console.log('¿Publishable key contiene WKy0Bs?', publishableKey.includes('WKy0Bs') ? '❌ SÍ (PROBLEMA)' : '✅ NO');

console.log('');
console.log('=== FIN DIAGNÓSTICO ===');
