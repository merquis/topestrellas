# Solución Implementada - Paso 4 del Registro con Stripe

## Problema Identificado

El usuario reportó que al hacer clic en un plan de suscripción en el paso 3 del registro, no se mostraba la página de pago con Stripe. El error era un 500 en el backend con el mensaje genérico "Error creando payment intent".

## Causa del Problema

1. **Flujo incorrecto de Stripe**: Se intentaba crear un PaymentIntent directamente cuando para suscripciones se debe crear una Subscription con `payment_behavior='default_incomplete'`.

2. **Manejo de errores deficiente**: Los errores de Stripe no se propagaban correctamente al frontend, devolviendo siempre un error 500 genérico.

3. **Falta de logging detallado**: No había suficiente información de debug para identificar el problema real.

## Soluciones Implementadas

### 1. Corrección del flujo de creación de suscripciones (`lib/subscriptions.ts`)

```typescript
// ANTES (incorrecto)
const paymentIntent = await stripe.paymentIntents.create({...});

// DESPUÉS (correcto)
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: plan.stripePriceId }],
  payment_behavior: 'default_incomplete',
  payment_settings: { 
    save_default_payment_method: 'on_subscription',
    payment_method_types: ['card']
  },
  expand: ['latest_invoice.payment_intent'],
  metadata: { businessId, planKey }
});

const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
```

### 2. Mejora del manejo de errores (`app/api/admin/subscriptions/route.ts`)

```typescript
catch (error: any) {
  const stripeError = error?.raw || error;
  console.error('[POST /api/admin/subscriptions] Error detallado:', {
    type: stripeError?.type,
    code: stripeError?.code,
    message: stripeError?.message || error?.message,
    statusCode: stripeError?.statusCode,
    param: stripeError?.param,
    businessId,
    planKey,
    userEmail
  });
  
  const errorMessage = stripeError?.message || error?.message || 'Error procesando el pago';
  const statusCode = stripeError?.statusCode || 400;
  
  return NextResponse.json(
    { 
      success: false, 
      error: errorMessage,
      code: stripeError?.code,
      type: stripeError?.type
    },
    { status: statusCode }
  );
}
```

### 3. Logging mejorado en `createSubscriptionAndReturnClientSecret`

Se añadieron logs detallados en cada paso del proceso:
- Verificación de STRIPE_SECRET_KEY
- Información del plan encontrado
- Parámetros de la suscripción antes de crearla
- Estado de la suscripción creada
- Validación del client_secret obtenido

## Flujo Corregido

1. **Usuario selecciona plan** → Se llama a `/api/admin/subscriptions` con POST
2. **Backend crea suscripción incompleta** → Stripe devuelve un client_secret
3. **Frontend recibe client_secret** → Se muestra el formulario de pago
4. **Usuario completa el pago** → Stripe activa la suscripción automáticamente
5. **Webhook de Stripe** → Actualiza el estado en la base de datos

## Verificación de la Solución

Para verificar que todo funciona correctamente:

1. **Revisar logs del servidor** cuando se hace clic en un plan:
   ```
   [createSubscriptionAndReturnClientSecret] Iniciando con: {...}
   [createSubscriptionAndReturnClientSecret] Plan encontrado: {...}
   [createSubscriptionAndReturnClientSecret] Creando suscripción recurrente...
   [createSubscriptionAndReturnClientSecret] ✅ Suscripción creada exitosamente
   ```

2. **Verificar en Stripe Dashboard**:
   - La suscripción debe aparecer con estado "incomplete"
   - Debe tener un payment_intent asociado

3. **En el frontend**:
   - Debe mostrarse el componente StripePaymentForm
   - El formulario debe permitir introducir los datos de la tarjeta

## Posibles Errores y Soluciones

### Error: "No such price: price_..."
**Causa**: El price ID no existe en Stripe o está en modo diferente (test vs live)
**Solución**: Ejecutar `sync-all-plans.bat` para sincronizar los planes

### Error: "STRIPE_SECRET_KEY no está configurada"
**Causa**: Variable de entorno no definida
**Solución**: Verificar el archivo `.env.local` y reiniciar el servidor

### Error: "Plan no encontrado en la base de datos"
**Causa**: El plan no existe en MongoDB
**Solución**: Ejecutar `init-subscription-plans.bat`

## Comandos Útiles

```bash
# Sincronizar planes con Stripe
npm run sync-plans

# Ver logs de Stripe en tiempo real
stripe logs tail

# Verificar webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Archivos Modificados

1. `/lib/subscriptions.ts` - Función `createSubscriptionAndReturnClientSecret`
2. `/app/api/admin/subscriptions/route.ts` - Manejo de errores en POST

## Notas Adicionales

- Los métodos de pago están limitados a `['card']` por ahora
- PayPal se puede habilitar más adelante cambiando `payment_method_types`
- El trial period se aplica automáticamente si está configurado en el plan
- Los setup fees se añaden como invoice items adicionales

## Estado Actual

✅ **SOLUCIONADO** - El paso 4 del registro ahora muestra correctamente el formulario de pago con Stripe cuando el usuario selecciona un plan de suscripción.
