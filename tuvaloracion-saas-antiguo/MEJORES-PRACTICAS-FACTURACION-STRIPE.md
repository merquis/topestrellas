# Mejores Prácticas - Facturación con Stripe

## 📋 Orden Correcto del Flujo

### ✅ CORRECTO: Facturación → Pago → Suscripción
```javascript
1. Recopilar datos de facturación
2. Crear/actualizar Customer en Stripe con datos de facturación
3. Crear SetupIntent
4. Confirmar método de pago
5. Crear suscripción (via webhook)
```

### ❌ INCORRECTO: Pago → Facturación
```javascript
1. Crear SetupIntent sin datos
2. Confirmar pago
3. Intentar añadir datos de facturación después // MAL!
```

## 🔑 Puntos Clave

### 1. Datos de Facturación ANTES del Pago
```javascript
// En preparePayment (app/admin/page.tsx)
const billingInfo = {
  customerType: 'empresa',
  legalName: 'Mi Empresa S.L.',
  taxId: 'B12345678',
  email: 'facturas@empresa.com',
  phone: '+34 900 000 000',
  address: {
    line1: 'Calle Principal 123',
    city: 'Madrid',
    postal_code: '28001',
    country: 'ES'
  }
};

// Enviar JUNTO con la creación del SetupIntent
const response = await fetch('/api/admin/subscriptions', {
  method: 'POST',
  body: JSON.stringify({
    businessId,
    planKey,
    userEmail,
    billingInfo // ← IMPORTANTE: Incluir aquí
  })
});
```

### 2. Customer en Stripe con Tax ID
```javascript
// En getOrCreateStripeCustomer (lib/subscriptions.ts)
const customer = await stripe.customers.create({
  email,
  name: billingInfo.legalName,
  phone: billingInfo.phone,
  address: {
    line1: billingInfo.address.line1,
    city: billingInfo.address.city,
    postal_code: billingInfo.address.postal_code,
    country: 'ES'
  },
  metadata: {
    businessId,
    customerType: billingInfo.customerType,
    legalName: billingInfo.legalName
  }
});

// Añadir Tax ID para facturas españolas
if (billingInfo.taxId) {
  await stripe.customers.createTaxId(customer.id, {
    type: 'es_cif', // Para España (NIF y CIF)
    value: billingInfo.taxId
  });
}
```

### 3. Estructura en MongoDB
```javascript
// Guardar estructura completa de billing
{
  billing: {
    customerType: 'empresa',
    legalName: 'Nombre Fiscal',
    taxId: 'B12345678',
    email: 'facturas@empresa.com',
    phone: '+34 900 000 000',
    address: {
      line1: 'Dirección',
      line2: '',
      city: 'Ciudad',
      state: 'Provincia',
      postal_code: 'CP',
      country: 'ES'
    },
    stripeCustomerId: 'cus_xxx',
    stripeTaxId: 'tax_xxx',
    metadata: {...},
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
```

## 🚫 Errores Comunes a Evitar

### 1. NO enviar datos después del pago
```javascript
// ❌ MAL - No hacer esto
if (paymentSuccessful) {
  await updateBillingInfo(); // Los datos deben estar ANTES
}
```

### 2. NO crear Customer sin datos
```javascript
// ❌ MAL
const customer = await stripe.customers.create({
  email: 'user@example.com'
  // Falta toda la información de facturación
});

// ✅ BIEN
const customer = await stripe.customers.create({
  email: 'user@example.com',
  name: 'Empresa S.L.',
  address: {...},
  // Incluir todos los datos necesarios
});
```

### 3. NO olvidar el Tax ID
```javascript
// ❌ MAL - Sin Tax ID las facturas no tendrán NIF/CIF
const customer = await stripe.customers.create({...});

// ✅ BIEN - Añadir Tax ID para facturas correctas
const customer = await stripe.customers.create({...});
await stripe.customers.createTaxId(customer.id, {
  type: 'es_cif',
  value: 'B12345678'
});
```

## 🔄 Flujo de Actualización

Si el cliente necesita cambiar sus datos de facturación:

```javascript
// 1. Actualizar en Stripe
await stripe.customers.update(customerId, {
  name: newLegalName,
  address: newAddress,
  // ...
});

// 2. Actualizar Tax ID si cambió
if (taxIdChanged) {
  // Eliminar el anterior
  await stripe.customers.deleteTaxId(customerId, oldTaxId);
  // Crear el nuevo
  await stripe.customers.createTaxId(customerId, {
    type: 'es_cif',
    value: newTaxId
  });
}

// 3. Actualizar en MongoDB
await db.collection('businesses').updateOne(
  { _id: businessId },
  { 
    $set: { 
      billing: newBillingInfo,
      updatedAt: new Date()
    } 
  }
);
```

## 📊 Validaciones Importantes

### 1. Validación de NIF/CIF
```javascript
// Para empresas (CIF)
const validateCIF = (cif) => {
  return /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(cif);
};

// Para autónomos (NIF)
const validateNIF = (nif) => {
  return /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(nif);
};
```

### 2. Campos Obligatorios
```javascript
const requiredFields = {
  legalName: 'Nombre fiscal obligatorio',
  taxId: 'NIF/CIF obligatorio',
  email: 'Email de facturación obligatorio',
  address: {
    line1: 'Dirección obligatoria',
    city: 'Ciudad obligatoria',
    postal_code: 'Código postal obligatorio'
  }
};
```

## 🌍 Consideraciones para España

### 1. Tipos de Tax ID
- `es_cif`: Para empresas y autónomos en España
- Acepta tanto NIF como CIF

### 2. IGIC para Canarias
```javascript
// TODO: Implementar lógica para IGIC
if (isCanaryIslands(postalCode)) {
  taxRate = 0.07; // IGIC 7%
} else {
  taxRate = 0.21; // IVA 21%
}
```

### 3. Formato de Dirección
```javascript
// Formato español típico
{
  line1: 'Calle Principal, 123',
  line2: 'Escalera A, 3º B', // Opcional
  city: 'Madrid',
  state: 'Madrid', // Provincia
  postal_code: '28001',
  country: 'ES'
}
```

## ✅ Checklist de Implementación

- [x] Recopilar datos de facturación en el formulario
- [x] Validar NIF/CIF en tiempo real
- [x] Enviar datos ANTES de crear SetupIntent
- [x] Crear/actualizar Customer con todos los datos
- [x] Añadir Tax ID al Customer
- [x] Guardar estructura completa en MongoDB
- [x] Autocompletar dirección desde Google Places
- [ ] Implementar endpoint para actualizar facturación
- [ ] Añadir soporte para IGIC (Canarias)
- [ ] Crear webhook para sincronizar cambios

## 🔗 Referencias

- [Stripe Tax IDs](https://stripe.com/docs/api/customer_tax_ids)
- [Stripe Customers](https://stripe.com/docs/api/customers)
- [Stripe Billing](https://stripe.com/docs/billing)
- [Spanish Tax Requirements](https://stripe.com/docs/tax/spain)
