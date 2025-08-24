# 📊 ANÁLISIS COMPLETO DEL PASO 4 - FLUJO DE FACTURACIÓN Y PAGO

## 🔍 RESUMEN EJECUTIVO

El sistema actual está usando la **API de Stripe v2025-07-30.basil** y tiene un flujo de registro de 4 pasos. El análisis muestra que **los datos de facturación SÍ se están enviando correctamente** en el momento adecuado, pero hay algunos aspectos que se pueden mejorar.

## ✅ FLUJO ACTUAL (CORRECTO)

### Paso 1: Datos Personales
- Se recopilan: nombre, email, teléfono, contraseña
- Se guarda en `tempUserData`

### Paso 2: Selección de Negocio
- Se busca el negocio en Google Places
- Se extraen automáticamente los datos de dirección
- Se guardan datos parciales en MongoDB (registro incompleto)

### Paso 3: Selección de Plan
- El usuario elige un plan de suscripción
- Se guarda el plan seleccionado
- Se avanza al paso 4

### Paso 4: Pago y Facturación
Este es el paso crítico donde ocurre todo:

#### 4.1 Preparación del Pago (función `preparePayment`)
```javascript
// Línea 620-680 en app/admin/page.tsx
const preparePayment = async (businessId: string, plan: any) => {
  // Se preparan los datos de facturación CON VALORES POR DEFECTO
  const billingInfo = {
    customerType: customerType, // Por defecto: 'autonomo'
    legalName: legalName || (customerType === 'autonomo' ? tempUserData?.name : selectedBusiness?.name) || '',
    taxId: companyNIF, // Vacío inicialmente
    email: billingEmail || tempUserData?.email || '',
    // ...dirección extraída de Google Places
  };

  // Se envían a Stripe INMEDIATAMENTE
  const subscriptionResponse = await fetch('/api/admin/subscriptions', {
    body: JSON.stringify({
      businessId,
      planKey: plan.key,
      userEmail: tempUserData.email,
      action: 'subscribe',
      billingInfo: billingInfo // ⚠️ AQUÍ SE ENVÍAN
    }),
  });
}
```

## 🔴 PROBLEMA IDENTIFICADO

**El problema principal es el TIMING:**

1. **Cuando se llega al Paso 4**, se ejecuta `preparePayment()` INMEDIATAMENTE (línea 616 en `handleSelectPlan`)
2. En ese momento, el usuario **AÚN NO HA VISTO** el formulario de facturación
3. Los campos críticos están vacíos o con valores por defecto:
   - `companyNIF`: "" (vacío)
   - `customerType`: "autonomo" (por defecto)
   - `legalName`: Se intenta autorellenar pero puede no ser correcto

4. **El SetupIntent se crea con estos datos incompletos**
5. El usuario luego rellena el formulario, pero **los datos ya se enviaron a Stripe**

## 📋 CÓMO SE ESTÁN OBTENIENDO LOS DATOS DE FACTURACIÓN

### Autorelleno Inteligente (PARCIALMENTE FUNCIONAL)

El sistema intenta autorellenar los campos desde Google Places:

```javascript
// Líneas 280-330 en app/admin/page.tsx
if (place?.address_components) {
  // Extrae dirección
  setBillingAddress(streetNumber + route);
  
  // Extrae código postal
  setBillingPostalCode(postalCode);
  
  // Extrae ciudad
  setBillingCity(city);
  
  // Extrae provincia
  setBillingProvince(province);
  
  // País siempre España
  setBillingCountry('España');
}
```

**✅ Funciona bien para:**
- Dirección física
- Código postal
- Ciudad
- Provincia

**❌ NO funciona para:**
- NIF/CIF (imposible obtener de Google Places)
- Tipo de cliente (autónomo/empresa)
- Razón social exacta
- Email de facturación

## 🛠️ SOLUCIÓN PROPUESTA

### Opción 1: Separar la creación del SetupIntent (RECOMENDADA)

```javascript
// PASO 4 - Modificar preparePayment
const preparePayment = async (businessId: string, plan: any) => {
  setIsLoadingPayment(true);
  
  try {
    // SOLO crear un SetupIntent básico SIN datos de facturación
    const response = await fetch('/api/admin/subscriptions/setup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        planKey: plan.key,
        userEmail: tempUserData.email,
        // NO enviar billingInfo aquí
      }),
    });

    const { clientSecret } = await response.json();
    setClientSecret(clientSecret);
    
  } catch (error) {
    setRegisterError(error.message);
  } finally {
    setIsLoadingPayment(false);
  }
};

// En StripePaymentForm - Enviar datos al confirmar
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // AQUÍ el usuario ya rellenó el formulario
  // Actualizar el cliente de Stripe con los datos completos
  await fetch('/api/admin/subscriptions/update-billing', {
    method: 'POST',
    body: JSON.stringify({
      customerId,
      billingInfo: {
        customerType,
        legalName,
        taxId: companyNIF, // YA TIENE VALOR
        // ...resto de datos
      }
    })
  });
  
  // Luego confirmar el SetupIntent
  const result = await stripe.confirmSetup({...});
};
```

### Opción 2: Validación antes de enviar

```javascript
const preparePayment = async (businessId: string, plan: any) => {
  // NO llamar esta función hasta que el usuario haga clic en "Iniciar prueba"
  // Mover la llamada al botón de pago final
};
```

## 📊 DATOS EN MONGODB

Los datos se están guardando correctamente en MongoDB:

```javascript
{
  "billing": {
    "customerType": "autonomo",
    "legalName": "Daniela Diaz",
    "taxId": "", // ⚠️ Vacío porque se envió antes
    "email": "danieladiazaa@gmail.com",
    "phone": "6665430226",
    "address": {
      "line1": "Cl. 5a #3-56",
      "city": "Bolívar",
      "postal_code": "",
      "country": "ES"
    },
    "stripeCustomerId": "cus_SsbCXD2vy2jcM0",
    "stripeTaxId": "", // ⚠️ No se creó porque no había NIF
    "metadata": {
      "businessId": "68a0df240bda543b74b4cb52",
      "customerType": "autonomo",
      "legalName": "Daniela Diaz"
    }
  }
}
```

## 🎯 MEJORAS RECOMENDADAS

### 1. **Separar el flujo en dos fases**
   - Fase 1: Crear SetupIntent básico (al cargar el paso 4)
   - Fase 2: Actualizar datos de facturación (al hacer clic en pagar)

### 2. **Validación obligatoria de NIF/CIF**
   ```javascript
   // Antes de permitir el pago
   if (!companyNIF || !isValidNIF(companyNIF)) {
     showError('El NIF/CIF es obligatorio para la facturación');
     return;
   }
   ```

### 3. **Mejorar el autorelleno**
   - Preguntar al usuario si los datos extraídos son correctos
   - Permitir edición antes de enviar

### 4. **Añadir endpoint para actualizar billing**
   ```javascript
   // POST /api/admin/subscriptions/update-billing
   export async function POST(request: Request) {
     const { customerId, billingInfo } = await request.json();
     
     // Actualizar cliente en Stripe
     await stripe.customers.update(customerId, {
       name: billingInfo.legalName,
       address: billingInfo.address,
       metadata: billingInfo.metadata
     });
     
     // Crear tax_id si hay NIF/CIF
     if (billingInfo.taxId) {
       await stripe.customers.createTaxId(customerId, {
         type: 'es_cif',
         value: billingInfo.taxId
       });
     }
   }
   ```

## 📝 CONCLUSIÓN

El sistema actual **funciona**, pero envía datos incompletos a Stripe porque se ejecuta antes de que el usuario rellene el formulario. La solución es simple: **separar la creación del SetupIntent de la actualización de datos de facturación**.

### Estado Actual vs Deseado

| Aspecto | Estado Actual | Estado Deseado |
|---------|--------------|----------------|
| Timing | Se envía al cargar paso 4 | Se envía al hacer clic en pagar |
| NIF/CIF | Vacío | Validado y completo |
| Tipo cliente | Por defecto | Seleccionado por usuario |
| Dirección | Autocompletada | Confirmada por usuario |
| Tax ID Stripe | No se crea | Se crea con NIF válido |

## 🚀 PRÓXIMOS PASOS

1. **Implementar la separación del flujo** (Opción 1)
2. **Añadir validación de NIF/CIF**
3. **Crear endpoint update-billing**
4. **Testear el flujo completo**
5. **Verificar facturas en Stripe con datos correctos**

---

*Documento generado el 16/08/2025 - API Stripe v2025-07-30.basil*
