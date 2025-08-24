# 🔧 CORRECCIÓN DEL ERROR DE BUILD - FACTURACIÓN

## Error Identificado

El build falló con el siguiente error:
```
Type error: No overload matches this call.
  Type '{ customerId: string; taxId: string | null; }' is not assignable to type 'string'.
```

## Causa del Error

La función `getOrCreateStripeCustomer` fue modificada para devolver un objeto con dos propiedades:
```typescript
return { customerId: string, taxId: string | null }
```

Pero el archivo `app/api/admin/payment-methods/setup/route.ts` esperaba solo una string.

## Corrección Aplicada

### Archivo: `app/api/admin/payment-methods/setup/route.ts`

**Antes:**
```typescript
const customerId = await getOrCreateStripeCustomer(userEmail, businessId, userName);
```

**Después:**
```typescript
const { customerId, taxId } = await getOrCreateStripeCustomer(userEmail, businessId, userName);
```

## Archivos Modificados

1. ✅ `app/api/admin/payment-methods/setup/route.ts` - Corregido para desestructurar el objeto devuelto
2. ✅ `lib/subscriptions.ts` - Ya estaba correcto, devuelve `{ customerId, taxId }`

## Estado del Build

La corrección debería resolver el error de compilación. El sistema ahora:
- Crea correctamente el cliente en Stripe con datos de facturación
- Devuelve tanto el `customerId` como el `taxId` creado
- Maneja correctamente los datos de facturación españoles (NIF/CIF)

## Próximos Pasos para el Deployment

1. **Hacer commit y push de los cambios:**
```bash
git add .
git commit -m "fix: corregir tipo de retorno de getOrCreateStripeCustomer en payment-methods/setup"
git push
```

2. **El Docker build debería funcionar ahora correctamente**

3. **Verificar en el VPS remoto que el build se complete sin errores**

## Resumen del Análisis de Facturación

Como documenté en `ANALISIS-COMPLETO-PASO-4-FACTURACION.md`, el problema principal identificado es que:

- **Los datos de facturación se envían ANTES de que el usuario los complete**
- El NIF/CIF llega vacío a Stripe
- Las facturas no tendrán los datos fiscales correctos

### Solución Recomendada (Pendiente de Implementar)

Separar el flujo en dos fases:
1. Crear SetupIntent básico al cargar el paso 4
2. Actualizar datos de facturación cuando el usuario hace clic en pagar

---

*Corrección aplicada el 16/08/2025*
