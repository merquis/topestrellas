# Migración de admin.tuvaloracion.com a admin.topestrellas.com

## Cambios Realizados

### 1. **Middleware (middleware.ts)**
- Actualizado para soportar ambos dominios durante la transición
- El nuevo dominio principal es `admin.topestrellas.com`
- Se mantiene compatibilidad con `admin.tuvaloracion.com`

### 2. **Configuración de Nginx**
- Actualizado `nginx/conf.d/default.conf` para aceptar ambos dominios
- Ambos dominios funcionarán simultáneamente

### 3. **Variables de Entorno (.env.example)**
- Actualizado `ADMIN_DOMAIN` a `admin.topestrellas.com`

## Pasos de Implementación

### En tu servidor/hosting:

1. **Actualizar archivo .env en producción:**
   ```bash
   ADMIN_DOMAIN=admin.topestrellas.com
   ```

2. **Si usas Docker/Docker Compose:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Si usas PM2:**
   ```bash
   pm2 restart all
   ```

4. **Si usas Nginx externo (fuera de Docker):**
   - Actualizar la configuración de Nginx con los cambios del archivo `nginx/conf.d/default.conf`
   - Recargar Nginx: `nginx -s reload`

5. **Certificado SSL para el nuevo dominio:**
   - Si usas Let's Encrypt:
     ```bash
     certbot --nginx -d admin.topestrellas.com
     ```
   - Si usas otro proveedor, generar certificado para `admin.topestrellas.com`

## Verificación

1. **DNS:** Verificar que `admin.topestrellas.com` resuelve correctamente:
   ```bash
   nslookup admin.topestrellas.com
   dig admin.topestrellas.com
   ```

2. **Acceso:** Probar ambas URLs:
   - https://admin.topestrellas.com (nuevo)
   - https://admin.tuvaloracion.com (legacy, debe seguir funcionando)

3. **Funcionalidad:**
   - Iniciar sesión en el panel
   - Verificar que todas las funciones funcionan correctamente
   - Revisar la consola del navegador para errores

## Período de Transición

Durante el período de transición, ambos dominios funcionarán:
- `admin.topestrellas.com` - Nuevo dominio principal
- `admin.tuvaloracion.com` - Dominio legacy (compatibilidad)

### Recomendaciones:
1. Mantener ambos dominios activos por al menos 30 días
2. Notificar a todos los usuarios del cambio
3. Actualizar bookmarks y documentación
4. Monitorear logs para detectar problemas

## Rollback (si es necesario)

Si necesitas revertir los cambios:

1. En `.env`:
   ```bash
   ADMIN_DOMAIN=admin.tuvaloracion.com
   ```

2. En `middleware.ts`, cambiar línea 10:
   ```typescript
   const adminDomain = process.env.ADMIN_DOMAIN || 'admin.tuvaloracion.com'
   ```

3. Reiniciar la aplicación

## Notas Importantes

- **No hay referencias hardcodeadas** al dominio anterior en el código de la aplicación
- El sistema está diseñado para usar variables de entorno
- Los subdominios de negocios (`*.tuvaloracion.com`) no se ven afectados por este cambio
- La base de datos no requiere cambios

## Checklist de Migración

- [ ] DNS configurado para admin.topestrellas.com
- [ ] Certificado SSL instalado
- [ ] Variable de entorno ADMIN_DOMAIN actualizada
- [ ] Nginx/proxy reverso actualizado
- [ ] Aplicación reiniciada
- [ ] Prueba de acceso exitosa
- [ ] Funcionalidad verificada
- [ ] Usuarios notificados del cambio

## Soporte

Si encuentras algún problema durante la migración:
1. Revisar logs del servidor
2. Verificar configuración DNS
3. Confirmar certificados SSL
4. Revisar variables de entorno
