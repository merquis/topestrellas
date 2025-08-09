# 🔧 Instrucciones para Completar la Corrección del Sistema de Suscripciones

## 📋 Resumen de Cambios Realizados

### ✅ Cambios Completados

1. **Mejorado el sistema de logging** en `lib/subscriptions.ts`
   - Añadidos logs detallados para debugging
   - Mejor manejo de errores con stack traces

2. **Corregido el endpoint de planes** en `app/api/admin/subscription-plans/route.ts`
   - Los errores de Stripe ya no se silencian
   - Se elimina el plan si falla la sincronización con Stripe
   - Logs detallados del proceso de sincronización

3. **Creado script de sincronización completo** `scripts/sync-all-plans-to-stripe.js`
   - Sincroniza todos los planes activos con Stripe
   - Maneja productos y precios existentes
   - Guarda los IDs en MongoDB

4. **Unificado el sistema de pagos**
   - Actualizado `ChangePlanModal.tsx` para usar Payment Elements
   - Eliminado el sistema obsoleto de Checkout Sessions
   - Integración con `StripePaymentForm.tsx`

## 🚀 Pasos para Completar en el VPS

### 1. Actualizar el código en el VPS

```bash
# Conectar al VPS
ssh tu-usuario@tu-vps

# Ir al directorio del proyecto
cd /ruta/a/tuvaloracion-saas

# Hacer pull de los cambios
git pull origin main
```

### 2. Reconstruir la imagen Docker

```bash
# Detener el contenedor actual
docker-compose down

# Reconstruir la imagen con los nuevos cambios
docker-compose build --no-cache

# Iniciar el contenedor
docker-compose up -d
```

### 3. Ejecutar el script de sincronización

```bash
# Ejecutar el script dentro del contenedor Docker
docker exec -it tuvaloracion-app node scripts/sync-all-plans-to-stripe.js
```

**Resultado esperado:**
```
🚀 SINCRONIZACIÓN DE PLANES CON STRIPE
============================================================
✅ Conectado a MongoDB

📦 Procesando plan: Prueba Gratis (trial)
  ⏭️  Plan trial - saltando sincronización con Stripe

📦 Procesando plan: Plan Básico (basic)
  ✓ Producto creado: prod_xxxxx
  ✓ Precio creado: price_xxxxx
  💾 IDs de Stripe guardados en MongoDB

📦 Procesando plan: Plan Premium (premium)
  ✓ Producto creado: prod_xxxxx
  ✓ Precio creado: price_xxxxx
  💾 IDs de Stripe guardados en MongoDB

============================================================
📊 RESUMEN DE SINCRONIZACIÓN
============================================================
✅ Planes sincronizados exitosamente: 3
📦 Total de planes procesados: 3
🎉 ¡Sincronización completada exitosamente!
```

### 4. Verificar en Stripe Dashboard

1. Ir a https://dashboard.stripe.com/products
2. Verificar que existan los productos:
   - Plan Básico (1€/mes)
   - Plan Premium (90€/mes)
3. Cada producto debe tener:
   - Metadata con `planKey`
   - Precio activo configurado

### 5. Configurar las variables de entorno en Easypanel

Asegúrate de que estas variables estén configuradas en Easypanel:

```env
# Stripe - PRODUCCIÓN
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_rgSzr6bhnnjMxMP1abSrTc05qQByTJDW
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Rtlt8DTWk9LmwCqSQjblv1SMIhvNKM23UcVrew1jhvvrU2slmV8ziQZu3uXp8G6r3caegmclHJjOw4SX7mL35vg00xnWKy0Bs

# MongoDB
MONGODB_URI=mongodb://tu-conexion-mongodb

# Base URL
NEXT_PUBLIC_BASE_URL=https://tudominio.com
```

### 6. Configurar el Webhook en Stripe

1. Ir a https://dashboard.stripe.com/webhooks
2. Crear un nuevo endpoint:
   - URL: `https://tudominio.com/api/webhooks/stripe`
   - Eventos a escuchar:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `payment_intent.succeeded`
3. Copiar el Signing Secret y actualizar `STRIPE_WEBHOOK_SECRET`

### 7. Probar el flujo completo

1. **Crear un nuevo negocio** (debería empezar con plan trial)
2. **Actualizar a plan básico**:
   - Click en "Actualizar Plan"
   - Seleccionar "Plan Básico"
   - Completar el pago con tarjeta de prueba: `4242 4242 4242 4242`
3. **Verificar en MongoDB** que se actualizó:
   - `subscription.stripeSubscriptionId`
   - `subscription.stripePriceId`
   - `subscription.status` = "active"

## 🐛 Troubleshooting

### Si los planes no se sincronizan:

1. **Verificar logs del contenedor:**
```bash
docker logs tuvaloracion-app -f
```

2. **Verificar conexión con Stripe:**
```bash
docker exec -it tuvaloracion-app node -e "
const Stripe = require('stripe');
const stripe = new Stripe('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', {
  apiVersion: '2025-07-30.basil'
});
stripe.products.list({ limit: 1 })
  .then(products => console.log('✅ Conexión exitosa:', products.data.length, 'productos'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

3. **Verificar MongoDB:**
```bash
docker exec -it tuvaloracion-app node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017/tuvaloracion');
client.connect()
  .then(async () => {
    const db = client.db();
    const plans = await db.collection('subscriptionplans').find({}).toArray();
    console.log('Planes en DB:', plans.map(p => ({ 
      key: p.key, 
      stripeProductId: p.stripeProductId,
      stripePriceId: p.stripePriceId 
    })));
    client.close();
  })
  .catch(err => console.error('Error:', err.message));
"
```

### Si el pago no funciona:

1. **Verificar que la clave pública esté disponible en el cliente:**
   - Inspeccionar elemento en el navegador
   - Buscar `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en las variables

2. **Verificar logs del webhook:**
   - En Stripe Dashboard > Webhooks > Tu endpoint > Intentos de webhook
   - Verificar que los eventos lleguen correctamente

3. **Verificar el client secret:**
   - En Network del navegador, verificar la respuesta de `/api/admin/subscriptions`
   - Debe incluir `clientSecret`

## 📝 Notas Importantes

1. **NO uses el script `create-checkout-session.ts`** - ha sido eliminado
2. **El plan trial NO se sincroniza con Stripe** - es manejado localmente
3. **Los webhooks son críticos** - sin ellos las suscripciones no se actualizarán
4. **Siempre verifica en MongoDB** después de cada operación

## ✅ Checklist Final

- [ ] Código actualizado en el VPS
- [ ] Docker reconstruido y ejecutándose
- [ ] Script de sincronización ejecutado exitosamente
- [ ] Productos visibles en Stripe Dashboard
- [ ] Variables de entorno configuradas en Easypanel
- [ ] Webhook configurado y recibiendo eventos
- [ ] Flujo de pago probado con tarjeta de prueba
- [ ] Suscripciones actualizándose correctamente en MongoDB

## 🎉 ¡Listo!

Una vez completados todos estos pasos, el sistema de suscripciones debería funcionar correctamente:

- ✅ Los planes se sincronizan automáticamente con Stripe
- ✅ Los usuarios pueden actualizar sus planes usando Payment Elements
- ✅ Los pagos se procesan correctamente
- ✅ Las suscripciones se activan automáticamente tras el pago
- ✅ Los webhooks mantienen el estado sincronizado

Si encuentras algún problema, revisa los logs y la sección de troubleshooting.
