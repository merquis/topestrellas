# 🎯 Implementación del Sistema de Suscripciones con Stripe

## 📋 Resumen General

Se ha implementado un sistema completo de suscripciones con Stripe que permite:
- ✅ Pagos embebidos en la aplicación (sin salir de tu web)
- ✅ Soporte para múltiples métodos de pago (Tarjeta, PayPal, Apple Pay, Google Pay)
- ✅ Gestión completa de planes y suscripciones
- ✅ Webhooks para sincronización automática
- ✅ Sistema de fallos de pago y suspensión automática

## 🏗️ Arquitectura Implementada

### 1. Backend - Módulo Central (`lib/subscriptions.ts`)
```typescript
// Funciones principales implementadas:
- syncPlanToStripe()           // Sincroniza planes con Stripe
- createSubscriptionPaymentIntent() // Crea Payment Intent para pagos embebidos
- getOrCreateStripeCustomer()  // Gestión de clientes en Stripe
- confirmSubscription()        // Confirma suscripciones después del pago
- cancelSubscription()         // Cancela suscripciones
- pauseSubscription()          // Pausa suscripciones
- resumeSubscription()         // Reanuda suscripciones
- changePlan()                 // Cambio de planes con prorrateo
- handlePaymentFailure()       // Manejo de fallos de pago
```

### 2. API Routes

#### `/api/admin/subscription-plans`
- **GET**: Obtener todos los planes
- **POST**: Crear nuevo plan
- **PUT**: Actualizar plan existente
- **DELETE**: Desactivar plan

#### `/api/admin/subscriptions`
- **GET**: Obtener información de suscripción actual
- **POST**: Crear Payment Intent para nueva suscripción
- **PUT**: Actualizar suscripción (pausar/reanudar)
- **DELETE**: Cancelar suscripción

#### `/api/admin/subscriptions/confirm`
- **POST**: Confirmar suscripción después del pago exitoso

#### `/api/webhooks/stripe`
- Maneja todos los eventos de Stripe:
  - `checkout.session.completed`
  - `customer.subscription.*`
  - `invoice.*`
  - `payment_intent.*`
  - `charge.*`

### 3. Frontend - Componente de Pago (`components/StripePaymentElement.tsx`)

Implementa un formulario de pago embebido con:
- **Express Checkout Element**: Para PayPal, Apple Pay, Google Pay
- **Payment Element**: Para pagos con tarjeta
- Ambos elementos trabajan con el mismo Payment Intent

## 🔧 Configuración Requerida

### 1. Variables de Entorno (.env)
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# MongoDB
MONGODB_URI=mongodb://...

# App
NEXT_PUBLIC_APP_URL=https://admin.topestrellas.com
```

### 2. Configuración en Stripe Dashboard

1. **Habilitar métodos de pago**:
   - Dashboard → Payments → Payment methods
   - Activar: Cards, PayPal, Apple Pay, Google Pay

2. **Configurar Webhook**:
   - Dashboard → Developers → Webhooks
   - Endpoint URL: `https://tudominio.com/api/webhooks/stripe`
   - Eventos a escuchar:
     - `checkout.session.completed`
     - `customer.subscription.*`
     - `invoice.*`
     - `payment_intent.*`
     - `charge.*`

3. **Habilitar PayPal** (si lo necesitas):
   - Dashboard → Payments → Wallets
   - Activar PayPal y configurar cuenta

## 📦 Planes de Suscripción Predefinidos

```javascript
// En scripts/sync-subscription-plans.js
1. Plan Trial (Prueba Gratis)
   - 0€/mes
   - 7 días de prueba
   - Hasta 100 reseñas

2. Plan Básico
   - 29€/mes
   - Hasta 500 reseñas
   - Soporte prioritario

3. Plan Premium
   - 90€/mes + 89€ setup
   - Reseñas ilimitadas
   - Soporte 24/7
```

## 🚀 Inicialización y Sincronización

### 1. Sincronizar Planes con Stripe
```bash
# Windows
sync-plans.bat

# O directamente con Node
node scripts/sync-subscription-plans.js
```

### 2. Flujo de Pago del Usuario

1. **Usuario selecciona plan** → Se crea Payment Intent
2. **Muestra formulario de pago embebido** con:
   - Botones de pago rápido (PayPal, Apple Pay, Google Pay)
   - Formulario de tarjeta
3. **Usuario completa el pago** → Sin salir de tu web
4. **Confirmación automática** → Webhook actualiza la DB
5. **Suscripción activa** → Usuario tiene acceso inmediato

## 🔄 Estados de Suscripción

```typescript
type SubscriptionStatus = 
  | 'active'      // Suscripción activa
  | 'trialing'    // En período de prueba
  | 'past_due'    // Pago vencido
  | 'suspended'   // Suspendida por fallo de pago
  | 'canceled'    // Cancelada
  | 'inactive'    // Inactiva
```

## 🛡️ Manejo de Fallos de Pago

El sistema implementa un mecanismo automático de reintentos:

1. **Primer fallo**: Se registra y notifica
2. **Segundo fallo**: Se envía recordatorio
3. **Tercer fallo**: Se suspende la cuenta automáticamente
4. **Pago exitoso**: Se resetean los contadores y reactiva la cuenta

## 📊 Estructura de Base de Datos

### Colección: `subscriptionplans`
```javascript
{
  _id: ObjectId,
  key: "basic",
  name: "Plan Básico",
  recurringPrice: 29,
  setupPrice: 0,
  currency: "EUR",
  interval: "month",
  trialDays: 0,
  features: [...],
  stripeProductId: "prod_...",
  stripePriceId: "price_...",
  active: true
}
```

### Colección: `businesses` (campos de suscripción)
```javascript
{
  subscription: {
    plan: "basic",
    status: "active",
    stripeSubscriptionId: "sub_...",
    stripePriceId: "price_...",
    stripeCustomerId: "cus_...",
    validUntil: Date,
    paymentFailures: 0,
    lastPaymentAttempt: Date
  }
}
```

## 🎨 Integración en el Frontend

### Ejemplo de uso del componente de pago:

```tsx
import StripePaymentElement from '@/components/StripePaymentElement';

// En tu componente de suscripción
const [clientSecret, setClientSecret] = useState('');

// 1. Crear Payment Intent
const response = await fetch('/api/admin/subscriptions', {
  method: 'POST',
  body: JSON.stringify({
    businessId,
    planKey: 'basic',
    userEmail: user.email
  })
});

const { clientSecret, subscriptionId } = await response.json();

// 2. Renderizar formulario de pago
<StripePaymentElement
  clientSecret={clientSecret}
  subscriptionId={subscriptionId}
  businessId={businessId}
  planDetails={{
    name: 'Plan Básico',
    price: 29,
    currency: 'EUR',
    interval: 'month'
  }}
  onSuccess={() => {
    // Redirigir o actualizar UI
  }}
  onError={(error) => {
    // Mostrar error
  }}
/>
```

## 🔐 Seguridad Implementada

1. **Validación de Webhooks**: Verificación de firma con `stripe-signature`
2. **Payment Intents**: Confirmación server-side
3. **Metadata tracking**: BusinessId en todos los objetos de Stripe
4. **Idempotencia**: Prevención de pagos duplicados
5. **HTTPS obligatorio**: Para todos los endpoints

## 📈 Próximos Pasos Recomendados

1. **Configurar emails transaccionales**:
   - Bienvenida después del pago
   - Recordatorios de pago fallido
   - Confirmación de cancelación

2. **Implementar portal de cliente**:
   - Ver historial de pagos
   - Descargar facturas
   - Actualizar método de pago

3. **Analytics y métricas**:
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - LTV (Lifetime Value)

4. **Pruebas con tarjetas de test**:
   ```
   4242 4242 4242 4242 - Pago exitoso
   4000 0000 0000 9995 - Pago rechazado
   4000 0025 0000 3155 - Requiere autenticación
   ```

## 🐛 Troubleshooting

### Error: "No stripe-signature header"
- Verifica que el webhook esté configurado correctamente en Stripe Dashboard
- Asegúrate de que `STRIPE_WEBHOOK_SECRET` esté configurado

### PayPal no aparece
- Verifica que PayPal esté habilitado en Stripe Dashboard
- No requieras campos de dirección (pueden ocultar PayPal)
- Asegúrate de que el país soporte PayPal

### Suscripción no se activa
- Revisa los logs del webhook
- Verifica que el metadata incluya `businessId`
- Comprueba que el Payment Intent se completó

## 📚 Referencias

- [Stripe Payment Element](https://stripe.com/docs/payments/payment-element)
- [Express Checkout Element](https://stripe.com/docs/elements/express-checkout-element)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Stripe Integration](https://stripe.com/docs/testing)

---

**Última actualización**: 9 de Agosto de 2025
**Versión de Stripe API**: 2025-07-30.basil
