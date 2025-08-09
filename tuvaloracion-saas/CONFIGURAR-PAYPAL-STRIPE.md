# Configuración de PayPal con Stripe

## Estado Actual ✅

El código ya está configurado correctamente para aceptar tanto tarjetas como PayPal. Los cambios implementados incluyen:

1. **Uso de `automatic_payment_methods`** en lugar de `payment_method_types` en la creación de suscripciones
2. **Mejor manejo de errores** que muestra el error real de Stripe
3. **Payment Element** configurado para mostrar todos los métodos de pago disponibles

## Activar PayPal en Stripe Dashboard

Para que PayPal aparezca como opción de pago, necesitas activarlo en tu cuenta de Stripe:

### Paso 1: Acceder a la configuración de métodos de pago

1. Inicia sesión en [dashboard.stripe.com](https://dashboard.stripe.com)
2. Ve a **Settings** → **Payment methods**
3. Busca **PayPal** en la lista de métodos de pago

### Paso 2: Activar PayPal

1. Haz clic en **PayPal**
2. Haz clic en **Turn on** o **Configure**
3. Completa los siguientes requisitos:
   - **Verificación del negocio**: Stripe puede requerir información adicional sobre tu negocio
   - **Configuración de la cuenta**: Acepta los términos de PayPal
   - **Monedas soportadas**: Asegúrate de que EUR está habilitado

### Paso 3: Configuración adicional (si es necesario)

Si Stripe requiere verificación adicional:

1. Ve a **Settings** → **Business settings** → **Business details**
2. Completa toda la información requerida:
   - Nombre del negocio
   - Dirección
   - Tipo de negocio
   - Descripción del producto/servicio

## Verificar la Configuración

### En el código (ya implementado ✅)

```typescript
// lib/subscriptions.ts - línea 374
automatic_payment_methods: {
  enabled: true,
  allow_redirects: 'always' // Permite PayPal y otros métodos con redirección
}
```

### En el frontend (ya implementado ✅)

El Payment Element detectará automáticamente los métodos disponibles:

```typescript
// components/StripePaymentForm.tsx
const paymentElement = elements.create('payment', {
  layout: {
    type: 'accordion',
    defaultCollapsed: false,
    radios: true,
    spacedAccordionItems: false
  }
});
```

## Flujo de Pago con PayPal

1. **Usuario selecciona plan** → Se crea suscripción incompleta
2. **Payment Element muestra opciones**:
   - Tarjeta de crédito/débito (formulario embebido)
   - PayPal (botón que abre popup de PayPal)
   - Google Pay / Apple Pay (si están disponibles)
3. **Usuario elige PayPal**:
   - Se abre popup de PayPal
   - Usuario se autentica en PayPal
   - Autoriza el pago
   - Vuelve a tu sitio
4. **Suscripción se activa** automáticamente

## Solución de Problemas

### PayPal no aparece en el Payment Element

**Causas posibles:**

1. **PayPal no está activado en Stripe Dashboard**
   - Solución: Sigue los pasos de activación arriba

2. **Verificación del negocio pendiente**
   - Solución: Completa la verificación en Stripe Dashboard

3. **Modo test vs live**
   - PayPal puede no estar disponible en modo test
   - Usa claves de producción para ver PayPal

4. **Región/moneda no soportada**
   - Verifica que tu cuenta de Stripe y moneda soporten PayPal

### Error "No such payment_method_type: paypal"

Este error ya está solucionado. El código ahora usa `automatic_payment_methods` que detecta automáticamente los métodos disponibles.

### El Payment Element no se carga

Verifica en la consola del navegador:
- Que el `clientSecret` se está recibiendo correctamente
- Que no hay errores de Stripe.js

## Testing

### Modo Test

En modo test, puedes probar con:
- **Tarjetas de prueba**: 4242 4242 4242 4242
- **PayPal**: Puede no estar disponible en modo test

### Modo Live

Para probar PayPal en producción:
1. Usa las claves de API de producción
2. Asegúrate de que PayPal está activado
3. Realiza una transacción de prueba pequeña

## Logs y Debug

El código ya incluye logs detallados:

```typescript
// Ver logs en el servidor
console.log('[createSubscriptionAndReturnClientSecret] ...');
```

Para ver errores de Stripe en tiempo real:
```bash
stripe logs tail
```

## Webhooks para PayPal

PayPal puede requerir manejo especial de webhooks:

- `payment_intent.succeeded` - Pago completado
- `payment_intent.requires_action` - Requiere acción adicional
- `invoice.payment_succeeded` - Factura pagada

## Soporte

- [Documentación de Stripe PayPal](https://stripe.com/docs/payments/paypal)
- [Payment Element docs](https://stripe.com/docs/payments/payment-element)
- [Stripe Dashboard](https://dashboard.stripe.com)

## Estado del Sistema

✅ **Código actualizado** - El backend y frontend están listos
⏳ **Pendiente** - Activar PayPal en Stripe Dashboard
📝 **Nota** - Los métodos de pago mostrados dependen de la configuración en Stripe Dashboard
