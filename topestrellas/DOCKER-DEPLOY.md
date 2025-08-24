# 🐳 Despliegue con Docker

## Configuración para VPS Remoto

### 1. Requisitos Previos
- Docker y Docker Compose instalados en el VPS
- Variables de entorno configuradas en EasyPanel o tu gestor de contenedores

### 2. Build y Despliegue

#### Opción A: Build Local y Push a Registry
```bash
# Build de la imagen
docker build -t topestrellas:latest .

# Tag para tu registry
docker tag topestrellas:latest tu-registry.com/topestrellas:latest

# Push al registry
docker push tu-registry.com/topestrellas:latest
```

#### Opción B: Build Directo en el VPS
```bash
# Clonar el repositorio en el VPS
git clone https://github.com/tu-usuario/topestrellas.git
cd topestrellas

# Build y ejecutar con docker-compose
docker-compose up -d --build
```

### 3. Configuración de Puertos

La aplicación está configurada para ejecutarse en el **puerto 3001** por defecto:
- Dockerfile: `EXPOSE 3001`
- docker-compose.yml: `ports: "3001:3001"`

### 4. Variables de Entorno

Las variables de entorno deben configurarse en tu panel de gestión (EasyPanel o similar):

```env
MONGODB_URI=tu_mongodb_uri
NEXTAUTH_URL=https://panel.topestrellas.com
NEXTAUTH_SECRET=tu_secret
JWT_SECRET=tu_jwt_secret
STRIPE_SECRET_KEY=tu_stripe_key
STRIPE_PUBLISHABLE_KEY=tu_stripe_public_key
GOOGLE_PLACES_API_KEY=tu_google_key
# ... etc
```

### 5. Comandos Útiles

```bash
# Ver logs
docker-compose logs -f app

# Reiniciar la aplicación
docker-compose restart app

# Detener todo
docker-compose down

# Actualizar la aplicación
git pull
docker-compose up -d --build

# Limpiar imágenes antiguas
docker system prune -a
```

### 6. Healthcheck

El contenedor incluye un healthcheck que verifica que la aplicación esté respondiendo:
- Endpoint: `http://localhost:3001/api/health`
- Intervalo: cada 30 segundos
- Timeout: 10 segundos

### 7. Servicios Opcionales

El `docker-compose.yml` incluye servicios opcionales que puedes comentar/descomentar según necesites:

- **MongoDB**: Si usas MongoDB Atlas, puedes comentar este servicio
- **Nginx**: Para proxy reverso y SSL (opcional si EasyPanel maneja esto)

### 8. Optimizaciones de Producción

- La imagen usa Node 24 Alpine (ligera)
- Multi-stage build para reducir tamaño
- Output standalone de Next.js activado
- Usuario no-root para seguridad
- `.dockerignore` configurado para excluir archivos innecesarios

### 9. Notas Importantes

- El proyecto NO requiere archivo `.env` local si usas EasyPanel
- El `next.config.js` ya tiene `output: 'standalone'` configurado
- La telemetría de Next.js está deshabilitada por defecto
