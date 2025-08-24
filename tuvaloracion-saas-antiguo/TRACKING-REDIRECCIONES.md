# 📊 Sistema de Tracking de Redirecciones

## 🎯 Problema Solucionado

Anteriormente, las estadísticas de redirecciones a Google y TripAdvisor se **simulaban** con un algoritmo que no reflejaba los clicks reales de los usuarios. Ahora se registran las redirecciones reales.

## 🔧 Cambios Implementados

### 1. **API increment-counter actualizada**
- **Archivo**: `/api/business/[subdomain]/increment-counter/route.ts`
- **Cambios**:
  - **NUEVO**: Recibe email del usuario en el request
  - **NUEVO**: Busca la opinión de 5⭐ más reciente del usuario
  - **NUEVO**: Actualiza la opinión con datos de redirección real
  - Mantiene lógica de contador para modo alternating

### 2. **API business-stats actualizada**
- **Archivo**: `/api/admin/business-stats/route.ts`
- **Cambios**:
  - **ELIMINADO**: Simulación de redirecciones con bucle
  - **NUEVO**: Consulta datos reales de la colección "opinions"
  - **NUEVO**: Filtra por `externalReview: true` y `redirectionPlatform`

### 3. **Componente BusinessReviewApp actualizado**
- **Archivo**: `/components/BusinessReviewApp.tsx`
- **Cambios**:
  - **NUEVO**: Siempre llama a la API (no solo en modo alternating)
  - **NUEVO**: Envía email del usuario en el request
  - Mantiene fallbacks en caso de error

### 3. **Nuevos campos en colección "opinions"**
```json
{
  "_id": ObjectId,
  "businessId": ObjectId,
  "email": "usuario@email.com",
  "rating": 5,
  "externalReview": true,  // cambiado de false a true
  "redirectionPlatform": "google",  // NUEVO campo
  "redirectedAt": "2025-01-08T12:47:00Z",  // NUEVO campo
  "createdAt": "2025-01-08T12:45:00Z",
  // ... otros campos existentes
}
```

## 🚀 Cómo Funciona Ahora

### **Flujo de Usuario:**
1. Usuario completa reseña de 5⭐ → se crea opinión con `externalReview: false`
2. Hace clic en "COMPLETAR MI RESEÑA"
3. **Sistema registra**:
   - Decide plataforma según configuración:
     - **Google Reviews**: Siempre Google
     - **TripAdvisor Reviews**: Siempre TripAdvisor
     - **Alternado Automático**: impar=Google, par=TripAdvisor
   - Busca la opinión del usuario y la actualiza:
     - `externalReview: true`
     - `redirectionPlatform: "google"` o `"tripadvisor"`
     - `redirectedAt: new Date()`
4. Abre URL correspondiente

### **Estadísticas:**
- **Antes**: Datos simulados con bucle
- **Ahora**: Datos reales consultando opiniones con `externalReview: true`

## 📋 Instalación

### **No requiere migración:**
- Funciona automáticamente con la estructura existente de "opinions"
- Los nuevos campos se añaden cuando el usuario hace su primer click
- Compatible con todas las opiniones existentes

## 🔍 Verificación

### **Comprobar que funciona:**
1. Ir a un negocio con `reviewPlatform: "alternating"`
2. Completar una reseña de 5⭐
3. Hacer clic en "COMPLETAR MI RESEÑA"
4. Verificar en MongoDB que se incrementaron los contadores
5. Comprobar estadísticas en el panel admin

### **Consulta MongoDB para verificar:**
```javascript
// Ver opiniones con redirecciones
db.opinions.find({
  businessId: ObjectId("tu-business-id"),
  rating: 5,
  externalReview: true
}, {
  email: 1,
  redirectionPlatform: 1,
  redirectedAt: 1,
  createdAt: 1
})
```

## 📊 Beneficios

✅ **Datos reales** en lugar de simulaciones
✅ **Tracking preciso** de redirecciones por plataforma
✅ **Compatibilidad total** con sistema existente
✅ **Sin migración** - funciona con datos existentes
✅ **Performance** - consultas directas a la base de datos

## 🛠️ Archivos Modificados

- `app/api/business/[subdomain]/increment-counter/route.ts`
- `app/api/admin/business-stats/route.ts`
- `components/BusinessReviewApp.tsx`
- `TRACKING-REDIRECCIONES.md` (nuevo)

## 🔄 Migración

**No requiere migración** - Funciona automáticamente con la estructura existente

---

*Implementado: Enero 2025*
