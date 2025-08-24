# Verificar Deployment en Easypanel

## 1. Verificar el Build

En Easypanel, revisa:
- ¿El último build fue exitoso?
- ¿Hay errores en los logs del build?

## 2. Verificar la Aplicación

### Logs de la aplicación
Busca errores como:
- "Cannot connect to MongoDB"
- "Port already in use"
- "Module not found"

### Estado del contenedor
- ¿El contenedor está corriendo?
- ¿Se reinicia constantemente?

## 3. Verificar Configuración de Dominio

En la sección de dominios de Easypanel:
- El dominio debe apuntar al puerto **3001**
- Ejemplo: `admin.tuvaloracion.com → http://top-estrellas_top-estrellas-backend:3001`

## 4. Verificar Variables de Entorno

Asegúrate de que todas estén configuradas:
```
MONGODB_URI=mongodb://serpy:esperanza85@serpy_mongodb:27017/tuvaloracion?authSource=admin
NEXTAUTH_URL=https://admin.tuvaloracion.com
NEXTAUTH_SECRET=prueba
ADMIN_DOMAIN=admin.tuvaloracion.com
APP_DOMAIN=tuvaloracion.com
```

## 5. Probar Acceso Directo

Si Easypanel te da una URL directa del servicio (sin dominio personalizado), prueba acceder a ella para ver si el problema es del dominio o de la aplicación.

## 6. Verificar Salud del Servicio

La aplicación debería responder en:
- `/` - Página principal
- `/api/admin/businesses` - API endpoint

## Solución Rápida

Si todo lo demás falla:
1. Reinicia el servicio en Easypanel
2. Reconstruye desde cero (Rebuild)
3. Verifica que MongoDB esté accesible desde el contenedor
