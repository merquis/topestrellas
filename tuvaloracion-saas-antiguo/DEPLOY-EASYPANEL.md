# 🚀 Desplegar en Easypanel

## ✅ El proyecto está listo para Docker

Ya tienes todo lo necesario:
- **Dockerfile** optimizado para producción
- **docker-compose.yml** con todos los servicios
- **Configuración de Nginx** incluida

## 📋 Pasos para desplegar en Easypanel

### 1. Crear nuevo proyecto en Easypanel

1. Accede a tu panel de Easypanel
2. Click en "Create Project"
3. Nombre: `tuvaloracion-saas`

### 2. Configurar la aplicación principal

#### Opción A: Desde GitHub (Recomendado)
1. Sube el código a GitHub
2. En Easypanel: "Deploy from GitHub"
3. Selecciona el repositorio
4. Dockerfile path: `/Dockerfile`

#### Opción B: Build local y push
```bash
# Construir imagen
docker build -t tuvaloracion-app .

# Tag para tu registry
docker tag tuvaloracion-app registry.easypanel.io/tuvaloracion-app

# Push
docker push registry.easypanel.io/tuvaloracion-app
```

### 3. Variables de entorno en Easypanel

En la configuración del servicio, añade estas variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb://serpy:TU_PASSWORD@serpy_mongodb:27017/tuvaloracion?tls=false
NEXTAUTH_URL=https://tuvaloracion.com
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
SMTP_HOST=mail.tuvaloracion.com
SMTP_PORT=587
SMTP_USER=info@tuvaloracion.com
SMTP_PASS=tu-password-email
ADMIN_DOMAIN=admin.tuvaloracion.com
APP_DOMAIN=tuvaloracion.com
```

### 4. Configurar MongoDB (ya lo tienes)

Como ya tienes MongoDB en Easypanel:
- Usa la conexión interna: `mongodb://serpy:PASSWORD@serpy_mongodb:27017/tuvaloracion?tls=false`
- No necesitas exponer el puerto externamente

### 5. Configurar dominios en Easypanel

#### Dominio principal:
- Domain: `tuvaloracion.com`
- Port: `3000`
- HTTPS: Activar

#### Subdominio comodín:
- Domain: `*.tuvaloracion.com`
- Port: `3000`
- HTTPS: Activar

#### Admin:
- Domain: `admin.tuvaloracion.com`
- Port: `3000`
- HTTPS: Activar

### 6. Configuración DNS

En tu proveedor de DNS, añade:

```
# Registro A principal
tuvaloracion.com → IP_DE_EASYPANEL

# Subdominio comodín
*.tuvaloracion.com → IP_DE_EASYPANEL

# Admin específico
admin.tuvaloracion.com → IP_DE_EASYPANEL
```

## 🐳 Docker Compose para Easypanel

Si prefieres usar el docker-compose.yml:

1. En Easypanel, crea un "Stack"
2. Pega el contenido de `docker-compose.yml`
3. Ajusta las variables de entorno
4. Deploy

## 🔧 Configuración específica para Easypanel

### Dockerfile ya optimizado:
- ✅ Multi-stage build
- ✅ Usuario no-root
- ✅ Tamaño mínimo
- ✅ Next.js standalone

### Health Check
El proyecto incluye endpoint `/health` para monitoreo

### Persistencia
- MongoDB: Ya tienes volumen persistente
- Uploads: Añadir volumen si necesitas subir archivos

## 📝 Script de inicialización

Una vez desplegado, ejecuta en la consola de Easypanel:

```bash
# Entrar al contenedor
docker exec -it tuvaloracion-app sh

# Inicializar DB
npm run init-db
```

## 🎯 Verificación

1. Accede a `https://tuvaloracion.com` - Página principal
2. Accede a `https://demo.tuvaloracion.com` - Negocio demo
3. Accede a `https://admin.tuvaloracion.com` - Panel admin

## 💡 Tips para Easypanel

1. **Recursos**: Asigna al menos 512MB RAM
2. **Replicas**: Puedes escalar horizontalmente
3. **Logs**: Revisa logs en tiempo real desde Easypanel
4. **Backups**: Configura backups automáticos de MongoDB

## 🚨 Troubleshooting

### Error de conexión MongoDB
- Verifica que uses el hostname interno: `serpy_mongodb`
- No uses `localhost` o `127.0.0.1`

### Subdominios no funcionan
- Verifica DNS wildcard: `*.tuvaloracion.com`
- Revisa el middleware en `middleware.ts`

### Emails no se envían
- Verifica credenciales SMTP
- Prueba con puerto 587 o 465

## ✅ Ventajas en Easypanel

- **Auto-SSL**: Certificados automáticos
- **Escalado fácil**: Un click para más replicas
- **Monitoreo**: Métricas incluidas
- **CI/CD**: Deploy automático desde GitHub
- **Rollback**: Fácil volver a versión anterior

¡Tu proyecto está 100% listo para Easypanel! 🎉
