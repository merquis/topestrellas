# Configuración de Google Places API

## Error Actual
El error "Solicitud denegada. Verifica la API key y las restricciones" indica que la API key de Google Places no está configurada o tiene restricciones.

## Pasos para Configurar Google Places API

### 1. Obtener API Key de Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "APIs & Services" > "Library"
4. Busca y habilita las siguientes APIs:
   - **Places API (New)**
   - **Places API**
   - **Geocoding API** (opcional, para funcionalidades avanzadas)

### 2. Crear API Key

1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "API Key"
3. Copia la API key generada

### 3. Configurar Restricciones (Recomendado)

#### Restricciones de API:
- Places API (New)
- Places API
- Geocoding API

#### Restricciones de Aplicación:
**Para Desarrollo:**
- HTTP referrers (web sites)
- Añadir: `localhost:3000/*`, `127.0.0.1:3000/*`

**Para Producción:**
- HTTP referrers (web sites)
- Añadir: `panel.topestrellas.com/*`, `*.tuvaloracion.com/*`

### 4. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Google Places API
GOOGLE_PLACES_API_KEY=tu-api-key-aqui
```

### 5. Verificar Configuración

Una vez configurada la API key, la funcionalidad de autocompletado debería funcionar correctamente.

## Funcionalidades que Requieren Google Places API

- ✅ Autocompletado de negocios en "Editar Negocio"
- ✅ Obtención automática de datos (nombre, rating, reseñas, dirección, teléfono)
- ✅ Generación automática de URL de Google Reviews
- ✅ Estadísticas actualizadas de Google

## Costos Estimados

Google Places API tiene los siguientes costos aproximados:
- **Autocomplete**: $2.83 por 1,000 requests
- **Place Details**: $17 por 1,000 requests
- **Place Photos**: $7 por 1,000 requests

Para un uso moderado (< 100 búsquedas/día), el costo mensual sería mínimo.

## Alternativa Sin API Key

Si no quieres configurar Google Places API, puedes:
1. Introducir manualmente todos los datos del negocio
2. Copiar y pegar la URL de Google Reviews manualmente
3. La funcionalidad principal del sistema seguirá funcionando

## Solución de Problemas

### Error: "REQUEST_DENIED"
- Verifica que la API key esté correctamente configurada
- Asegúrate de que las APIs estén habilitadas
- Revisa las restricciones de dominio

### Error: "OVER_QUERY_LIMIT"
- Has excedido el límite de consultas gratuitas
- Configura facturación en Google Cloud Console

### Error: "INVALID_REQUEST"
- Verifica que los parámetros de la solicitud sean correctos
- Asegúrate de que el Place ID sea válido
