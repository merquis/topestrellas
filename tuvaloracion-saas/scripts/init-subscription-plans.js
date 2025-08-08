const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

const subscriptionPlans = [
  {
    key: 'trial',
    name: 'Prueba Gratis',
    description: 'Periodo de prueba de 7 días',
    setupPrice: 0,
    recurringPrice: 0,
    currency: 'EUR',
    interval: 'month',
    trialDays: 7,
    features: [
      'Hasta 100 reseñas',
      'Sistema de premios básico',
      'Soporte por email',
      'Sin tarjeta de crédito'
    ],
    active: true,
    icon: '🎁',
    color: 'green',
    popular: false
  },
  {
    key: 'basic',
    name: 'Plan Básico',
    description: 'Ideal para negocios en crecimiento',
    setupPrice: 0,
    recurringPrice: 2900,
    currency: 'EUR',
    interval: 'month',
    trialDays: 0,
    features: [
      'Hasta 500 reseñas',
      'Sistema de premios completo',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Personalización básica'
    ],
    active: true,
    icon: '🚀',
    color: 'blue',
    popular: false
  },
  {
    key: 'premium',
    name: 'Plan Premium',
    description: 'Para negocios que lo quieren todo',
    setupPrice: 0,
    recurringPrice: 5900,
    currency: 'EUR',
    interval: 'month',
    trialDays: 0,
    features: [
      'Reseñas ilimitadas',
      'Múltiples ubicaciones',
      'API personalizada',
      'Soporte 24/7',
      'Personalización completa',
      'Análisis avanzado',
      'Integración con CRM'
    ],
    active: true,
    icon: '👑',
    color: 'purple',
    popular: true
  }
];

const planSchema = new mongoose.Schema({
  key: String,
  name: String,
  description: String,
  setupPrice: Number,
  recurringPrice: Number,
  currency: String,
  interval: String,
  trialDays: Number,
  features: [String],
  active: Boolean,
  icon: String,
  color: String,
  popular: Boolean
}, { timestamps: true });

const Plan = mongoose.model('SubscriptionPlan', planSchema);

async function init() {
  try {
    await mongoose.connect(MONGODB_URI);
    await Plan.deleteMany({});
    await Plan.insertMany(subscriptionPlans);
    console.log('Planes de suscripción insertados correctamente');
    process.exit(0);
  } catch (err) {
    console.error('Error al insertar los planes:', err);
    process.exit(1);
  }
}

init();
