# Solución Error Bad Gateway (502)

## Diagnóstico del Problema

El error "Bad Gateway" indica que nginx no puede conectar con la aplicación Next.js en el puerto 3001.

## Pasos para Solucionar

### 1. Verificar que la aplicación esté ejecutándose

```bash
# Verificar contenedores en ejecución
docker ps

# Ver logs de la aplicación
docker logs tuvaloracion-app

# Ver logs de nginx
docker logs tuvaloracion-nginx
```

### 2. Verificar conectividad entre contenedores

```bash
# Entrar al contenedor de nginx
docker exec -it tuvaloracion-nginx sh

# Probar conexión con la app
wget -O- http://app:3001/health
# o
curl http://app:3001/health
```

### 3. Reiniciar los servicios

```bash
# Detener todos los servicios
docker-compose down

# Reconstruir y levantar
docker-compose up -d --build

# Ver logs en tiempo real
docker-compose logs -f
```

### 4. Verificar configuración de red

Los contenedores deben estar en la misma red Docker:

```bash
# Ver redes
docker network ls

# Inspeccionar la red
docker network inspect tuvaloracion-saas_tuvaloracion-network
```

### 5. Verificar variables de entorno

Asegúrate de tener el archivo `.env` con todas las variables necesarias:

```env
MONGODB_URI=mongodb://admin:password@mongodb:27017/tuvaloracion?authSource=admin
NEXTAUTH_URL=https://admin.tuvaloracion.com
NEXTAUTH_SECRET=tu-secret-generado
SMTP_HOST=mail.tuvaloracion.com
SMTP_PORT=587
SMTP_USER=info@tuvaloracion.com
SMTP_PASS=tu-password
ADMIN_DOMAIN=admin.tuvaloracion.com
APP_DOMAIN=tuvaloracion.com
```

### 6. Solución Temporal - Acceso Directo

Si necesitas acceder mientras solucionas el problema con nginx:

```bash
# Hacer port forward del contenedor de la app
docker port tuvaloracion-app

# O acceder directamente
# http://localhost:3001
```

### 7. Debug Avanzado

```bash
# Ver estado detallado de los contenedores
docker-compose ps -a

# Inspeccionar contenedor de la app
docker inspect tuvaloracion-app

# Ver si el puerto está escuchando
docker exec tuvaloracion-app netstat -tlnp | grep 3001
```

### 8. Reconstruir desde cero

Si nada funciona:

```bash
# Limpiar todo
docker-compose down -v
docker system prune -a

# Reconstruir
docker-compose build --no-cache
docker-compose up -d
```

## Configuración para Easypanel

Si estás usando Easypanel, verifica:

1. **Health Check**: La app debe responder en `/health`
2. **Puerto interno**: Debe ser 3001
3. **Variables de entorno**: Todas configuradas correctamente
4. **Recursos**: Al menos 512MB de RAM

## Logs Importantes a Revisar

1. **Error en Next.js**: 
   - "ECONNREFUSED" - La app no está escuchando
   - "Module not found" - Falta alguna dependencia

2. **Error en MongoDB**:
   - "Authentication failed" - Credenciales incorrectas
   - "Connection refused" - MongoDB no está ejecutándose

3. **Error en Nginx**:
   - "upstream timed out" - La app tarda mucho en responder
   - "no resolver defined" - Problema de DNS interno

## Solución Rápida

```bash
# Script de reinicio completo
#!/bin/bash
cd tuvaloracion-saas
docker-compose down
docker-compose up -d --build
sleep 10
docker-compose logs --tail=50
```

## Contacto

Si el problema persiste, revisa:
- Los logs completos: `docker-compose logs > debug.log`
- El estado de los contenedores: `docker ps -a`
- La configuración de red: `docker network ls`
