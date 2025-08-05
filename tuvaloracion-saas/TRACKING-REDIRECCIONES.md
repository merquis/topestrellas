# 📊 Sistema de Tracking de Redirecciones

## 🎯 Problema Solucionado

Anteriormente, las estadísticas de redirecciones a Google y TripAdvisor se **simulaban** con un algoritmo que no reflejaba los clicks reales de los usuarios. Ahora se registran las redirecciones reales.

## 🔧 Cambios Implementados

### 1. **API increment-counter actualizada**
- **Archivo**: `/api/business/[subdomain]/increment-counter/route.ts`
- **Cambios**:
  - Mantiene el contador `reviewClickCounter` (funcionalidad existente)
  - **NUEVO**: Incrementa contadores específicos por plataforma
  - **NUEVO**: Registra historial de redirecciones

### 2. **API business-stats actualizada**
- **Archivo**: `/api/admin/business-stats/route.ts`
- **Cambios**:
  - **ELIMINADO**: Simulación de redirecciones con bucle
  - **NUEVO**: Lee datos reales de `config.redirectionStats`

### 3. **Nueva estructura en MongoDB**
```json
{
  "config": {
    "reviewClickCounter": 5,
    "redirectionStats": {
      "googleRedirections": 3,
      "tripadvisorRedirections": 2,
      "lastRedirections": [
        {
          "platform": "google",
          "timestamp": "2025-01-08T12:47:00Z"
        },
        {
          "platform": "tripadvisor",
          "timestamp": "2025-01-08T12:48:00Z"
        }
      ]
    }
  }
}
```

## 🚀 Cómo Funciona Ahora

### **Flujo de Usuario:**
1. Usuario completa reseña de 5⭐
2. Hace clic en "COMPLETAR MI RESEÑA"
3. **Sistema registra**:
   - Incrementa `reviewClickCounter`
   - Decide plataforma (impar=Google, par=TripAdvisor)
   - Incrementa contador específico (`googleRedirections` o `tripadvisorRedirections`)
   - Guarda registro en `lastRedirections`
4. Abre URL correspondiente

### **Estadísticas:**
- **Antes**: Datos simulados con bucle
- **Ahora**: Datos reales de la base de datos

## 📋 Instalación

### **Para negocios existentes:**
```bash
# Ejecutar una sola vez para inicializar la estructura
node scripts/init-redirection-stats.js

# O usar el archivo batch
init-redirection-stats.bat
```

### **Para negocios nuevos:**
La estructura se crea automáticamente en el primer click.

## 🔍 Verificación

### **Comprobar que funciona:**
1. Ir a un negocio con `reviewPlatform: "alternating"`
2. Completar una reseña de 5⭐
3. Hacer clic en "COMPLETAR MI RESEÑA"
4. Verificar en MongoDB que se incrementaron los contadores
5. Comprobar estadísticas en el panel admin

### **Consulta MongoDB:**
```javascript
db.businesses.findOne(
  { subdomain: "tu-negocio" },
  { "config.redirectionStats": 1, "config.reviewClickCounter": 1 }
)
```

## 📊 Beneficios

✅ **Datos reales** en lugar de simulaciones
✅ **Tracking preciso** de redirecciones por plataforma
✅ **Historial** de últimas 50 redirecciones
✅ **Compatibilidad** con sistema existente
✅ **Performance** - una sola consulta a la base de datos

## 🛠️ Archivos Modificados

- `app/api/business/[subdomain]/increment-counter/route.ts`
- `app/api/admin/business-stats/route.ts`
- `scripts/init-redirection-stats.js` (nuevo)
- `init-redirection-stats.bat` (nuevo)
- `TRACKING-REDIRECCIONES.md` (nuevo)

## 🔄 Migración

**Negocios existentes**: Ejecutar `init-redirection-stats.bat` una vez
**Negocios nuevos**: Funciona automáticamente

---

*Implementado: Enero 2025*
