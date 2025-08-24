# Guía de Migración: Sistema Actual → SaaS Multi-tenant

## 📋 Resumen de Cambios

### Arquitectura Anterior (Monolítico)
- **Frontend**: HTML/JS vanilla con jQuery
- **Backend**: Webhooks n8n + Google Sheets
- **Base de datos**: Google Sheets
- **Hosting**: Nginx estático
- **Multi-idioma**: Implementado en cliente
- **Un solo negocio**: Euromania Café & Tapas

### Nueva Arquitectura (SaaS)
- **Frontend**: Next.js 14 con React y TypeScript
- **Backend**: API Routes de Next.js
- **Base de datos**: MongoDB
- **Hosting**: Docker/Vercel/VPS
- **Multi-idioma**: Server-side + Client-side
- **Multi-tenant**: Subdominios por negocio

## 🔄 Proceso de Migración

### 1. Preparación del Entorno

```bash
# Clonar el nuevo proyecto
cd tuvaloracion-saas

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales
```

### 2. Migración de Base de Datos

Si tienes datos en Google Sheets que quieres migrar:

```javascript
// scripts/migrate-from-sheets.js
const { google } = require('googleapis');
const { MongoClient } = require('mongodb');

async function migrateData() {
  // 1. Conectar a Google Sheets
  // 2. Leer datos existentes
  // 3. Transformar al nuevo formato
  // 4. Insertar en MongoDB
}
```

### 3. Configuración del Primer Negocio

```bash
# Inicializar la base de datos
npm run init-db

# Esto creará:
# - Las colecciones necesarias
# - Los índices
# - Un negocio de demo
```

Para crear el negocio de Euromania:

```javascript
{
  subdomain: 'euromania',
  name: 'Euromania Café & Tapas',
  type: 'restaurante',
  config: {
    languages: ['es', 'en', 'de', 'fr'],
    defaultLanguage: 'es',
    googleReviewUrl: 'https://g.page/r/CRLLlgC0hMYDEBM/review',
    theme: {
    },
    prizes: [
      // Copiar la configuración actual de premios
    ]
  }
}
```

### 4. Actualización de DNS

Para usar subdominios, configurar DNS:

```
# Registro A
*.tuvaloracion.com → IP_DEL_SERVIDOR

# O usar CNAME
euromania.tuvaloracion.com → tuvaloracion.com
```

### 5. Configuración de Nginx

```nginx
server {
    listen 80;
    server_name *.tuvaloracion.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔌 Compatibilidad con Sistema Actual

### Webhooks n8n

El nuevo sistema mantiene compatibilidad con los webhooks existentes:

```typescript
// En app/api/opinions/route.ts
if (process.env.N8N_WEBHOOK_URL) {
  await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

### Verificación de Emails

Compatible con el endpoint actual de n8n:

```typescript
// En app/api/verify-email/route.ts
if (process.env.N8N_VERIFY_EMAIL_URL) {
  // Verificar con n8n primero
}
```

## 📊 Mapeo de Funcionalidades

| Funcionalidad | Sistema Actual | Sistema Nuevo |
|--------------|----------------|---------------|
| Calificación | ✅ JS vanilla | ✅ React Component |
| Formulario | ✅ HTML/JS | ✅ React con validación |
| Ruleta | ✅ Canvas JS | ✅ Canvas React |
| Multi-idioma | ✅ Cliente | ✅ Servidor + Cliente |
| Emails | ✅ n8n | ✅ Nodemailer + n8n |
| Verificación | ✅ n8n | ✅ MongoDB + n8n |
| Analytics | ❌ | ✅ MongoDB agregaciones |
| Multi-tenant | ❌ | ✅ Subdominios |
| Admin Panel | ❌ | ✅ Next.js admin |

## 🚀 Plan de Despliegue

### Fase 1: Pruebas (1 semana)
1. Desplegar en staging
2. Crear negocio Euromania
3. Probar todas las funcionalidades
4. Verificar emails y webhooks

### Fase 2: Migración Gradual (1 semana)
1. Configurar DNS para nuevo subdominio
2. Redirigir tráfico gradualmente
3. Monitorear errores
4. Mantener sistema antiguo como backup

### Fase 3: Migración Completa
1. Mover todo el tráfico al nuevo sistema
2. Desactivar sistema antiguo
3. Actualizar documentación

## 🔍 Verificación Post-Migración

- [ ] Formularios funcionan correctamente
- [ ] Emails se envían
- [ ] Premios se generan
- [ ] Multi-idioma funciona
- [ ] Google Reviews redirect funciona
- [ ] Webhooks n8n (si se usan)
- [ ] Base de datos registra todo

## 📝 Notas Importantes

1. **Códigos de Premio**: El formato cambia de `EURO-XXXX` a `[SUBDOMAIN]-XXXN`
2. **URLs**: Cambian de `/` a `subdomain.tuvaloracion.com`
3. **Emails**: Ahora se envían directamente, no solo a n8n
4. **Validación**: Más estricta en el nuevo sistema

## 🆘 Rollback

Si algo sale mal:

1. Cambiar DNS de vuelta al servidor antiguo
2. Los datos en MongoDB permanecen intactos
3. Webhooks n8n siguen funcionando
4. Investigar y corregir el problema

## 📞 Soporte

Durante la migración:
- Logs en tiempo real: `npm run dev`
- Base de datos: MongoDB Compass
- Errores: Revisar `/app/api/` logs
