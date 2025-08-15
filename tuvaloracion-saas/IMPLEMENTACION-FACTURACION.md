# Implementación del Sistema de Facturación - TopEstrellas

## Resumen
Se ha implementado un sistema completo de captura y gestión de datos de facturación para cumplir con los requisitos fiscales españoles y permitir la gestión de facturas a través de Stripe.

## Cambios Realizados

### 1. Estructura de Datos de Facturación (`lib/types.ts`)

Se añadió una interfaz completa de facturación al tipo `Business`:

```typescript
billing?: {
  customerType: 'autonomo' | 'empresa'  // Tipo de cliente
  legalName: string                      // Nombre fiscal/Razón social
  taxId: string                          // NIF/CIF
  email: string                          // Email para facturas
  phone?: string                         // Teléfono
  address: {
    line1: string
    line2?: string
    city: string
    state?: string                      // Provincia
    postal_code: string
    country: 'ES'                       // Siempre España
  }
  stripeCustomerId?: string             // ID del cliente en Stripe
  stripeTaxId?: string                  // ID del tax_id en Stripe
  updatedAt: Date
}
```

### 2. Frontend - Formulario de Facturación (`app/admin/page.tsx`)

#### Características Implementadas:
- **Formulario dinámico**: Las etiquetas cambian según el tipo de cliente:
  - Autónomo: "NIF" y "Nombre y apellidos"
  - Empresa: "CIF" y "Razón Social"
  
- **Validación de NIF/CIF en tiempo real**:
  - NIF: 8 dígitos + 1 letra (ej: 12345678A)
  - CIF: 1 letra + 7 dígitos + 1 carácter (ej: A12345678)
  
- **Pre-llenado inteligente**: Los campos se rellenan automáticamente con datos de Google Places cuando están disponibles

- **Integración con el flujo de pago**: Los datos se envían junto con la petición de suscripción

### 3. Backend - Procesamiento de Datos (`app/api/admin/subscriptions/route.ts`)

#### Funcionalidades:
- **Validación de datos**: Verifica que los campos obligatorios estén presentes
- **Guardado en MongoDB**: Los datos de facturación se almacenan en el documento del negocio
- **Integración con Stripe**: Los datos se pasan a las funciones de creación de cliente

### 4. Integración con Stripe (`lib/subscriptions.ts`)

#### Características de la integración:
- **Creación/actualización de clientes** con datos fiscales completos
- **Gestión de tax_id**: Se añade el NIF/CIF como `es_cif` para facturas españolas
- **Metadata enriquecida**: Se guarda información adicional en los metadatos del cliente

```typescript
// Ejemplo de creación de cliente con datos fiscales
const customer = await stripe.customers.create({
  email: billingInfo.email,
  name: billingInfo.legalName,
  phone: billingInfo.phone,
  address: {
    line1: billingInfo.address.line1,
    city: billingInfo.address.city,
    state: billingInfo.address.state,
    postal_code: billingInfo.address.postal_code,
    country: 'ES'
  },
  metadata: {
    businessId,
    customerType: billingInfo.customerType,
    legalName: billingInfo.legalName
  }
});

// Añadir NIF/CIF como tax_id
await stripe.customers.createTaxId(customer.id, {
  type: 'es_cif',
  value: billingInfo.taxId
});
```

### 5. Integración con Google Places

Se actualizó la captura de datos de Google Places para incluir:
- `address_components`: Componentes detallados de la dirección
- `formatted_phone_number`: Número de teléfono formateado
- `geometry`: Información de ubicación

## Flujo de Datos

1. **Usuario completa el formulario** en el paso 4 del registro
2. **Validación en frontend** del NIF/CIF en tiempo real
3. **Envío de datos** al endpoint `/api/admin/subscriptions`
4. **Creación/actualización del cliente en Stripe** con datos fiscales
5. **Guardado en MongoDB** de toda la información de facturación
6. **Stripe genera facturas** con los datos fiscales correctos

## Beneficios de la Implementación

### Para el Cumplimiento Fiscal:
- ✅ Captura completa de datos fiscales españoles
- ✅ Validación de NIF/CIF según formato español
- ✅ Integración con el sistema de tax_id de Stripe
- ✅ Facturas generadas con todos los requisitos legales

### Para la Gestión:
- ✅ Panel de control futuro podrá recuperar todas las facturas
- ✅ Historial de pagos disponible en el GET del endpoint
- ✅ Datos estructurados para reporting fiscal
- ✅ Sincronización automática con Stripe

### Para el Usuario:
- ✅ Formulario intuitivo con etiquetas dinámicas
- ✅ Pre-llenado automático desde Google Places
- ✅ Validación en tiempo real para evitar errores
- ✅ Proceso de registro fluido y profesional

## Próximos Pasos Recomendados

1. **Implementar página de facturas** en el panel de administración:
   ```typescript
   // Endpoint para listar facturas
   GET /api/admin/invoices?businessId={id}
   ```

2. **Configurar webhooks de Stripe** para sincronización:
   - `invoice.created`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.updated`

3. **Añadir funcionalidad de edición** de datos de facturación:
   ```typescript
   PUT /api/admin/businesses/{id}/billing
   ```

4. **Implementar descarga masiva** de facturas para contabilidad

## Notas Técnicas

- Los datos de facturación se guardan tanto en MongoDB como en Stripe para redundancia
- El tipo `es_cif` en Stripe se usa tanto para NIF como para CIF
- La validación del formato de NIF/CIF es solo de formato, no se valida el dígito de control
- Los datos de facturación se actualizan cada vez que se procesa una suscripción

## Testing

Para probar la implementación:

1. Crear un nuevo negocio y llegar al paso 4
2. Seleccionar tipo de cliente (autónomo/empresa)
3. Verificar que las etiquetas cambien dinámicamente
4. Introducir un NIF/CIF válido y verificar la validación
5. Completar el pago y verificar en Stripe Dashboard:
   - Cliente creado con datos correctos
   - Tax ID añadido correctamente
   - Dirección y datos de contacto presentes
6. Verificar en MongoDB que los datos se guardaron en el campo `billing`

## Conclusión

La implementación proporciona una base sólida para la gestión de facturación cumpliendo con todos los requisitos fiscales españoles y preparando el sistema para futuras funcionalidades de gestión de facturas y reporting fiscal.
