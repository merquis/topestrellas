# 🎯 Implementación del Sistema de Suscripciones con Stripe

## 📋 Resumen General

Se ha implementado un sistema completo de suscripciones con Stripe siguiendo las mejores prácticas actuales:
- ✅ Pagos embebidos en la aplicación (sin salir de tu web)
- ✅ Soporte para múltiples métodos de pago (Tarjeta, PayPal, Apple Pay, Google Pay)
- ✅ Gestión completa de planes y suscripciones
- ✅ Webhooks optimizados para sincronización automática
- ✅ Sistema inteligente de fallos de pago con suspensión automática

## 🏗️ Arquitectura Implementada

### 1. Backend - Módulo Central (`lib/subscriptions.ts`)
```typescript
// Funciones principales implementadas:
- syncPlanToStripe()                        // Sincroniza planes con Stripe
- createSubscriptionAndReturnClientSecret() // Crea suscripción con payment_behavior='default_incomplete'
- getOrCreateStripeCustomer()               // Gestión de clientes en Stripe
- confirmSubscription()                     // Verifica estado de suscripción después del pago
- cancelSubscription()                      // Cancela suscripciones (inmediata o al final del período)
- pauseSubscription()                       // Pausa suscripciones con pause_collection
- resumeSubscription()                      // Reanuda suscripciones pausadas
- changePlan()                              // Cambio de planes con prorrateo opcional
- handlePaymentFailure()                    // Manejo de fallos de pago con contador
- resetPaymentFailures()                    // Resetea contador cuando el pago es exitoso
```

### 2. API Routes

#### `/api/admin/subscription-plans`
- **GET**: Obtener todos los planes
- **POST**: Crear nuevo plan
- **PUT**: Actualizar plan existente
- **DELETE**: Desactivar plan

#### `/api/admin/subscriptions`
- **GET**: Obtener información de suscripción actual
- **POST**: Crear Subscription con `payment_behavior='default_incomplete'` y devolver `client_secret` del `latest_invoice.payment_intent`
- **PUT**: Actualizar suscripción (pausar/reanudar)
- **DELETE**: Cancelar suscripción

#### `/api/admin/subscriptions/confirm`
- **POST**: Confirmar suscripción después del pago exitoso

#### `/api/webhooks/stripe`
- Maneja solo los eventos esenciales (optimizado):
  - `customer.subscription.*` - Gestión completa de suscripciones
  - `invoice.payment_succeeded` - Pagos recurrentes exitosos
  - `invoice.payment_failed` - Fallos en pagos recurrentes
  - `invoice.upcoming` - Notificaciones de próximas facturas
  - `payment_intent.succeeded/processing/payment_failed` - Estados del primer pago

### 3. Frontend - Componente de Pago (`components/StripePaymentElement.tsx`)

Implementa un formulario de pago embebido con:
- **Express Checkout Element** (arriba): Para PayPal, Apple Pay, Google Pay
- **Payment Element** (abajo): Para pagos con tarjeta
- Ambos elementos trabajan con el mismo `client_secret` del `latest_invoice.payment_intent`
- Configurado para suscripciones recurrentes con PayPal

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
   - Eventos a escuchar (solo los necesarios):
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.paused`
     - `customer.subscription.resumed`
     - `customer.subscription.trial_will_end`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `invoice.upcoming`
     - `payment_intent.succeeded`
     - `payment_intent.processing`
     - `payment_intent.payment_failed`

3. **Habilitar PayPal para suscripciones**:
   - Dashboard → Payments → Wallets
   - Activar PayPal
   - **IMPORTANTE**: Verificar que "Recurring payments" esté habilitado
   - Configurar cuenta de PayPal Business

## 📦 Planes de Suscripción Predefinidos

```javascript
// En scripts/sync-subscription-plans.js
1. Plan Trial (Prueba Gratis)
   - 0€/mes
   - 7 días de prueba
   - Hasta 100 reseñas

2. Plan Básico
   - 129€/mes
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

1. **Usuario selecciona plan** → Se crea Subscription con `payment_behavior='default_incomplete'`
2. **Backend devuelve** → `client_secret` del `latest_invoice.payment_intent`
3. **Frontend muestra formulario embebido** con:
   - Express Checkout Element (PayPal, Apple Pay, Google Pay)
   - Payment Element (tarjetas)
4. **Usuario completa el pago** → Sin salir de tu web
5. **Stripe activa la suscripción automáticamente** → Webhook confirma en DB
6. **Usuario tiene acceso inmediato** → Sistema activo

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

El sistema implementa un mecanismo híbrido de reintentos:

1. **Smart Retries de Stripe**: Configurado en Dashboard → Billing → Settings
2. **Contador interno de telemetría**: 
   - **Primer fallo**: Se registra y notifica
   - **Segundo fallo**: Se envía recordatorio
   - **Tercer fallo**: Se pausa la suscripción con `pause_collection`
3. **Pago exitoso**: Se resetean los contadores y reactiva la cuenta automáticamente

## 📊 Estructura de Base de Datos

### Colección: `subscriptionplans`
```javascript
{
  _id: ObjectId,
  key: "basic",
  name: "Plan Básico",
  recurringPrice: 129,
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

// 1. Crear Suscripción y obtener client secret
const response = await fetch('/api/admin/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
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
    price: 129,
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
2. **Suscripciones incompletas**: Uso de `payment_behavior='default_incomplete'`
3. **Metadata tracking**: BusinessId en todos los objetos de Stripe
4. **Idempotencia**: Prevención de pagos duplicados
5. **HTTPS obligatorio**: Para todos los endpoints
6. **Métodos de pago guardados**: `save_default_payment_method='on_subscription'`

## 📈 Próximos Pasos Recomendados

1. **Configurar Smart Retries en Stripe**:
   - Dashboard → Billing → Settings → Manage failed payments
   - Configurar política de reintentos automáticos
   - Establecer acciones después de fallos

2. **Configurar emails transaccionales**:
   - Bienvenida después del pago
   - Recordatorios de pago fallido
   - Confirmación de cancelación

3. **Implementar portal de cliente de Stripe**:
   - Ver historial de pagos
   - Descargar facturas
   - Actualizar método de pago
   - Cancelar suscripción

4. **Analytics y métricas**:
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - LTV (Lifetime Value)

5. **Pruebas con tarjetas de test**:
   ```
   4242 4242 4242 4242 - Pago exitoso
   4000 0000 0000 9995 - Pago rechazado
   4000 0025 0000 3155 - Requiere autenticación
   4000 0000 0000 0341 - Requiere autenticación (siempre falla)
   ```

## 🐛 Troubleshooting

### Error: "No stripe-signature header"
- Verifica que el webhook esté configurado correctamente en Stripe Dashboard
- Asegúrate de que `STRIPE_WEBHOOK_SECRET` esté configurado

### PayPal no aparece
- Verifica que PayPal esté habilitado en Stripe Dashboard → Payments → Wallets
- Confirma que "Recurring payments" esté activado para PayPal
- No requieras campos de dirección de facturación (configurado como `address: 'never'`)
- Asegúrate de que el país y la moneda soporten PayPal
- Usa una única divisa (EUR) en toda la factura

### Suscripción no se activa
- Revisa los logs del webhook `customer.subscription.updated`
- Verifica que el metadata incluya `businessId` en la suscripción
- Confirma que el PaymentIntent del `latest_invoice` se completó
- Verifica que el webhook esté recibiendo los eventos correctamente

## 📚 Referencias

- [Stripe Payment Element](https://stripe.com/docs/payments/payment-element)
- [Express Checkout Element](https://stripe.com/docs/elements/express-checkout-element)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Stripe Integration](https://stripe.com/docs/testing)

---

## 🔄 Cambios Importantes en la Implementación

### Correcciones aplicadas según mejores prácticas de Stripe:

1. **Renombrado de función principal**:
   - Antes: `createSubscriptionPaymentIntent()`
   - Ahora: `createSubscriptionAndReturnClientSecret()`
   - Crea Subscription con `payment_behavior='default_incomplete'`

2. **PayPal para suscripciones**:
   - Habilitado mediante `payment_method_types: ['card', 'paypal', 'link']`
   - Express Checkout Element configurado para modo suscripción

3. **Webhooks optimizados**:
   - Eliminado `checkout.session.completed` (no usamos Checkout hospedado)
   - Eliminados eventos `charge.*` (redundantes)
   - Solo eventos esenciales para el flujo

4. **Pausas mejoradas**:
   - Usa `pause_collection` en lugar de estado "suspended" personalizado
   - Opción de programar reanudación automática

5. **Setup fees correctos**:
   - Implementados como `add_invoice_items` en la creación
   - No se modifica el PaymentIntent después de crearlo

---

**Última actualización**: 9 de Agosto de 2025  
**Versión de Stripe API**: 2025-07-30.basil  
**Compatibilidad**: Payment Element + Express Checkout Element
