# Configuración de Variables de Entorno en Easypanel

## Variables Requeridas para Stripe

Para que el sistema de pagos funcione correctamente, necesitas configurar las siguientes variables de entorno en tu servicio de Easypanel:

### 1. Variables de Stripe (OBLIGATORIAS)

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (opcional, para webhooks)
```

### 2. Otras Variables Importantes

```
MONGODB_URI=mongodb://xxxxx
JWT_SECRET=tu_clave_secreta_jwt
GOOGLE_PLACES_API_KEY=tu_api_key_google
```

## Cómo Configurar en Easypanel

1. **Accede a tu servicio en Easypanel**
2. **Ve a la sección "Environment"** o "Variables de Entorno"
3. **Añade cada variable** con su nombre y valor correspondiente
4. **Guarda los cambios**
5. **Reinicia el servicio** para que tome las nuevas variables

## Obtener las Claves de Stripe

1. Ve a [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copia la **Publishable key** (empieza con `pk_test_` o `pk_live_`)
3. Copia la **Secret key** (empieza con `sk_test_` o `sk_live_`)

## Verificación

Para verificar que las variables están configuradas correctamente:

1. Abre la consola del navegador (F12)
2. Si ves el mensaje: `⚠️ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada`
   - La variable no está configurada en Easypanel
3. Si el formulario de pago muestra "Cargando formulario de pago..." indefinidamente:
   - Verifica que la clave pública sea correcta
   - Asegúrate de que empiece con `pk_test_` o `pk_live_`

## Importante para Easypanel

- Las variables que empiezan con `NEXT_PUBLIC_` son accesibles desde el cliente (navegador)
- Las demás variables solo son accesibles desde el servidor
- Después de añadir o cambiar variables, **siempre reinicia el servicio**
- Easypanel NO usa archivos `.env` locales, todo se configura desde el panel

## Troubleshooting

Si el formulario de pago no aparece:

1. **Verifica en Easypanel** que `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` esté configurada
2. **Reinicia el servicio** después de añadir la variable
3. **Limpia la caché del navegador** (Ctrl+F5)
4. **Verifica la consola** del navegador para mensajes de error
5. **Asegúrate** de que la clave empiece con `pk_` y no con `sk_`

## Ejemplo de Configuración Completa

```
# Stripe (Producción)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51ABC...xyz
STRIPE_SECRET_KEY=sk_live_51ABC...xyz

# Stripe (Desarrollo/Test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...xyz
STRIPE_SECRET_KEY=sk_test_51ABC...xyz

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Seguridad
JWT_SECRET=una_clave_muy_segura_y_aleatoria

# APIs
GOOGLE_PLACES_API_KEY=AIzaSy...
