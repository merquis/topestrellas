# Migración de admin.topestrellas.com a panel.topestrellas.com

## Resumen
Este documento describe la migración del dominio de administración de `admin.topestrellas.com` a `panel.topestrellas.com`.

## Cambios Realizados

### 1. **Middleware (middleware.ts)**
- Actualizado para soportar el nuevo dominio `panel.topestrellas.com`
- El nuevo dominio principal es `panel.topestrellas.com`

### 2. **API Routes**
- Actualizada la redirección en `/api/admin/businesses/[id]/route.ts`
- Nueva URL de redirección: `https://panel.topestrellas.com/admin`

### 3. **Variables de Entorno (.env.example)**
- Actualizado `ADMIN_DOMAIN` a `panel.topestrellas.com`
   ```bash
   ADMIN_DOMAIN=panel.topestrellas.com
   ```

### 4. **Configuración Nginx**
- Actualizado `server_name` en `/nginx/conf.d/default.conf`
- Nuevo server_name: `panel.topestrellas.com`

## Configuración del Servidor

### SSL/TLS
1. **Let's Encrypt (Certbot):**
   ```bash
   certbot --nginx -d panel.topestrellas.com
   ```

2. **Si usas otro proveedor, generar certificado para `panel.topestrellas.com`**

## Verificación Post-Migración

1. **DNS:** Verificar que `panel.topestrellas.com` resuelve correctamente:
   ```bash
   nslookup panel.topestrellas.com
   dig panel.topestrellas.com
   ```

2. **Acceso:** Probar la nueva URL:
   - https://panel.topestrellas.com (nuevo dominio principal)

## URLs Actualizadas

- **Login:** https://panel.topestrellas.com/login
- **Registro:** https://panel.topestrellas.com/registro
- **Panel Super Admin:** https://panel.topestrellas.com/super/...
- **Panel Admin:** https://panel.topestrellas.com/admin/...
- **Panel Afiliados:** https://panel.topestrellas.com/affiliate/...

## Checklist de Migración

- [x] DNS configurado para panel.topestrellas.com
- [x] Middleware actualizado
- [x] API routes actualizadas
- [x] Nginx configurado
- [x] Variables de entorno actualizadas
- [ ] Certificado SSL instalado
- [ ] Pruebas de acceso completadas

## Notas
- El dominio `admin.topestrellas.com` ha sido completamente reemplazado por `panel.topestrellas.com`
- Todos los usuarios deben actualizar sus bookmarks al nuevo dominio
