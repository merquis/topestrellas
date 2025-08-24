// Ejecutar en mongo shell: 
// 1. Conectar a la base de datos: use tuvaloracion
// 2. Ejecutar el script: load("init-subscription-plans.mongo.js")

use tuvaloracion;

db.subscriptionplans.deleteMany({});

db.subscriptionplans.insertMany([
  {
    key: "trial",
    name: "Prueba Gratis",
    description: "Periodo de prueba de 7 días",
    setupPrice: 0,
    recurringPrice: 0,
    currency: "EUR",
    interval: "mensual",
    trialDays: 7,
    features: [
      "Hasta 100 reseñas",
      "Sistema de premios básico",
      "Soporte por email",
      "Sin tarjeta de crédito"
    ],
    active: true,
    icon: "🎁",
    color: "green",
    popular: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: "basic",
    name: "Plan Básico",
    description: "Ideal para negocios en crecimiento",
    setupPrice: 0,
    recurringPrice: 2900,
    currency: "EUR",
    interval: "mensual",
    trialDays: 0,
    features: [
      "Hasta 500 reseñas",
      "Sistema de premios completo",
      "Estadísticas avanzadas",
      "Soporte prioritario",
      "Personalización básica"
    ],
    active: true,
    icon: "🚀",
    color: "blue",
    popular: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    key: "premium",
    name: "Plan Premium",
    description: "Para negocios que lo quieren todo",
    setupPrice: 0,
    recurringPrice: 5900,
    currency: "EUR",
    interval: "mensual",
    trialDays: 0,
    features: [
      "Reseñas ilimitadas",
      "Múltiples ubicaciones",
      "API personalizada",
      "Soporte 24/7",
      "Personalización completa",
      "Análisis avanzado",
      "Integración con CRM"
    ],
    active: true,
    icon: "👑",
    color: "purple",
    popular: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);
