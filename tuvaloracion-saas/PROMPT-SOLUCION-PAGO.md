# 🎯 PROMPT PARA RESOLVER ERROR DE PAGO EN REGISTRO

## CONTEXTO DEL PROBLEMA
Tengo una aplicación Next.js con Stripe integrado. Al registrar un nuevo usuario y seleccionar un plan de pago, aparece el error "Error creando payment intent" pero el sistema no muestra el formulario de pago de Stripe para completar la transacción.

## ARCHIVOS CLAVE
- `/app/admin/page.tsx` - Página principal con el flujo de registro
- `/app/api/admin/subscriptions/route.ts` - API que crea las suscripciones con Stripe
- `/components/StripePaymentForm.tsx` - Componente de pago que YA FUNCIONA en otro contexto
- `/components/admin/ChangePlanModal.tsx` - Modal donde SÍ funciona el pago correctamente

## FLUJO ACTUAL (ROTO)
1. Usuario completa datos personales (Paso 1) ✅
2. Busca y selecciona negocio en Google Places (Paso 2) ✅
3. Elige plan y hace clic en "Prueba gratuita" (Paso 3) ✅
4. Se crea el negocio y se intenta crear payment intent ✅
5. Se obtiene un clientSecret de Stripe ✅
6. ❌ ERROR: No se muestra el formulario de pago, solo un alert temporal

## FLUJO DESEADO
1. Pasos 1-5 igual que arriba
2. Cuando se obtiene el clientSecret, mostrar el componente StripePaymentForm
3. Usuario completa el pago con su tarjeta
4. Tras pago exitoso, redirigir al login

## SOLUCIÓN REQUERIDA
Necesito que:

1. **REUTILICES** el componente `StripePaymentForm` que ya existe y funciona
2. **COPIES LA LÓGICA** de `ChangePlanModal` donde el pago SÍ funciona:
   - Cuando recibe clientSecret exitoso → muestra StripePaymentForm
   - Gestiona estados: showPaymentForm, clientSecret, etc.
3. **IMPLEMENTES** en la función `handleSelectPlanAndPay` de `/app/admin/page.tsx`:
   ```javascript
   // Cuando obtengas el clientSecret exitoso:
   setClientSecret(clientSecret);
   setShowPaymentForm(true);
   
   // Y antes del return principal, agregar:
   if (showPaymentForm && clientSecret) {
     return <StripePaymentForm ... />
   }
   ```

## CÓDIGO DE REFERENCIA QUE FUNCIONA
En `ChangePlanModal.tsx` líneas 95-120:
```javascript
if (response.ok && data.clientSecret) {
  if (selectedPlan !== 'trial') {
    setClientSecret(data.clientSecret);
    setShowPaymentForm(true);
  }
}

// Y luego:
if (showPaymentForm && clientSecret) {
  return (
    <StripePaymentForm
      businessId={businessId}
      businessName={businessName}
      plan={selectedPlan}
      clientSecret={clientSecret}
      onSuccess={() => {...}}
      onCancel={() => {...}}
    />
  );
}
```

## RESTRICCIONES
- NO crear nuevos componentes
- NO modificar la API de Stripe
- NO cambiar el flujo de registro (3 pasos)
- SÍ reutilizar código existente que funciona
- SÍ mantener consistencia con el resto de la app

## RESULTADO ESPERADO
Al hacer clic en "Prueba gratuita" en el paso 3 del registro:
1. Se crea el negocio
2. Se obtiene el clientSecret de Stripe
3. **SE MUESTRA EL FORMULARIO DE PAGO** (StripePaymentForm)
4. Usuario introduce tarjeta
5. Se procesa el pago
6. Se redirige al login con mensaje de éxito

## COMANDO PARA VERIFICAR
```bash
# Después de implementar, verificar que:
1. El componente StripePaymentForm se importa correctamente
2. Los estados necesarios están definidos (showPaymentForm, clientSecret, etc.)
3. La condición para mostrar el formulario está antes del return principal
4. Los props del StripePaymentForm coinciden con los esperados
```

---

**NOTA**: El componente StripePaymentForm YA EXISTE y FUNCIONA. Solo necesitas integrarlo en el flujo de registro copiando la lógica de ChangePlanModal donde sí funciona correctamente.
