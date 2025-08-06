# 📍 Módulo Google Places API

Módulo completo y reutilizable para integrar Google Places API en el proyecto TuValoración. Permite obtener información de negocios, ratings, reseñas y más datos directamente desde Google.

## 🚀 Características

- ✅ **Extracción automática** de Place ID desde URLs de Google Reviews y Google Maps
- ✅ **Datos básicos**: nombre, rating, número de reseñas
- ✅ **Reseñas completas**: texto, autor, fecha, rating individual
- ✅ **Información adicional**: dirección, teléfono, sitio web, horarios
- ✅ **Componentes React** listos para usar
- ✅ **Hook personalizado** para manejo de estado
- ✅ **API endpoints** flexibles
- ✅ **TypeScript** completo
- ✅ **Manejo de errores** robusto
- ✅ **Validación** de URLs y Place IDs

## 📁 Estructura del módulo

```
tuvaloracion-saas/
├── lib/
│   ├── google-places.ts              # Servicio principal
│   ├── types.ts                      # Tipos TypeScript (actualizado)
│   └── hooks/
│       └── useGooglePlaces.ts        # Hook React
├── app/api/
│   └── google-places/
│       └── route.ts                  # API endpoints
├── components/
│   ├── GooglePlacesInput.tsx         # Componente principal
│   └── examples/
│       └── GooglePlacesExample.tsx   # Ejemplos de uso
└── GOOGLE-PLACES-MODULE.md           # Esta documentación
```

## ⚙️ Configuración

### 1. Variable de entorno

Añade a tu archivo `.env`:

```bash
GOOGLE_PLACES_API_KEY=tu_api_key_aqui
```

### 2. Obtener API Key

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la **Places API**
4. Crea credenciales (API Key)
5. Configura restricciones (recomendado):
   - Restricción por dominio: `tuvaloracion.com`
   - APIs permitidas: solo Places API

## 🎯 Uso básico

### Componente simple

```tsx
import { GooglePlacesBasicInput } from '@/components/GooglePlacesInput';

function MyForm() {
  const handleData = (data) => {
    console.log('Datos obtenidos:', data);
    // data.name, data.rating, data.user_ratings_total
  };

  return (
    <GooglePlacesBasicInput
      onDataFetched={handleData}
      placeholder="URL de Google Reviews"
    />
  );
}
```

### Hook personalizado

```tsx
import { useGooglePlaces } from '@/lib/hooks/useGooglePlaces';

function MyComponent() {
  const { data, loading, error, fetchBasicData } = useGooglePlaces();

  const handleFetch = () => {
    fetchBasicData('ChIJ5ctEMDCYagwR9QBWYQaQdes');
  };

  return (
    <div>
      <button onClick={handleFetch} disabled={loading}>
        {loading ? 'Cargando...' : 'Obtener datos'}
      </button>
      {data && <div>Rating: {data.rating}</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### API directa

```javascript
// GET request
fetch('/api/google-places?placeId=ChIJ5ctEMDCYagwR9QBWYQaQdes&fields=basic')
  .then(res => res.json())
  .then(data => console.log(data));

// POST request
fetch('/api/google-places', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes',
    fields: ['name', 'rating', 'user_ratings_total', 'reviews']
  })
});
```

## 🌐 URLs soportadas

El módulo puede extraer Place IDs de diferentes tipos de URLs de Google:

### 1. URLs de Google Reviews (escribir reseña)
```
https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes
```

### 2. URLs de Google Maps (formato completo)
```
https://www.google.es/maps/place/Restaurante+Euro/@28.0064487,-16.6590947,17z/data=!3m1!4b1!4m6!3m5!1s0xc6a98303044cbe5:0xeb759006615600f5!8m2!3d28.006444!4d-16.6565144!16s%2Fg%2F1tgxvt2z?hl=es&entry=ttu
```

### 3. URLs con Place ID directo
```
https://maps.google.com/maps?place_id=ChIJ5ctEMDCYagwR9QBWYQaQdes
```

### 4. URLs con CID (Customer ID)
```
https://maps.google.com/maps?cid=17053776102322020597
```

### 5. URLs con FTID (Feature ID)
```
https://maps.google.com/maps?ftid=0xc6a98303044cbe5:0xeb759006615600f5
```

**✅ Todos estos formatos funcionan automáticamente** - solo pega la URL y el módulo extraerá el Place ID correspondiente.

## 📊 Tipos de datos disponibles

### Campos básicos
- `name` - Nombre del negocio
- `rating` - Puntuación media (1-5)
- `user_ratings_total` - Número total de reseñas

### Campos de contacto
- `formatted_address` - Dirección completa
- `international_phone_number` - Teléfono internacional
- `website` - Sitio web

### Reseñas
- `reviews` - Array de hasta 5 reseñas más relevantes
  - `author_name` - Nombre del autor
  - `rating` - Puntuación individual (1-5)
  - `text` - Texto de la reseña
  - `time` - Timestamp
  - `relative_time_description` - "hace 2 meses"
  - `profile_photo_url` - Foto del perfil

### Otros datos
- `opening_hours` - Horarios de apertura
- `photos` - Fotos del lugar

## 🔧 API Endpoints

### GET `/api/google-places`

**Parámetros de query:**
- `placeId` - Place ID directo
- `url` - URL de Google Reviews (se extrae el Place ID automáticamente)
- `fields` - Campos a obtener: `basic`, `reviews`, `all`, o lista personalizada
- `language` - Idioma (por defecto: `es`)

**Ejemplos:**
```
GET /api/google-places?placeId=ChIJ5ctEMDCYagwR9QBWYQaQdes
GET /api/google-places?url=https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes&fields=reviews
GET /api/google-places?placeId=ChIJ5ctEMDCYagwR9QBWYQaQdes&fields=name,rating,reviews&language=en
```

### POST `/api/google-places`

**Body JSON:**
```json
{
  "placeId": "ChIJ5ctEMDCYagwR9QBWYQaQdes",
  "fields": ["name", "rating", "user_ratings_total", "reviews"],
  "language": "es"
}
```

### PUT `/api/google-places`

Endpoint optimizado para obtener solo estadísticas básicas.

## 🎨 Componentes disponibles

### GooglePlacesInput
Componente principal con todas las opciones.

```tsx
<GooglePlacesInput
  onDataFetched={(data) => console.log(data)}
  onError={(error) => console.error(error)}
  fields={['name', 'rating', 'user_ratings_total']}
  showButton={true}
  autoFetch={false}
  placeholder="URL de Google Reviews"
  language="es"
  showResults={true}
  buttonText="🔄 Obtener datos"
/>
```

### GooglePlacesBasicInput
Solo datos básicos (nombre, rating, total reseñas).

```tsx
<GooglePlacesBasicInput
  onDataFetched={handleData}
  placeholder="URL de Google Reviews"
/>
```

### GooglePlacesWithReviewsInput
Datos básicos + reseñas completas.

```tsx
<GooglePlacesWithReviewsInput
  onDataFetched={handleData}
  buttonText="📝 Obtener reseñas"
/>
```

## 🔍 Servicio GooglePlacesService

### Métodos principales

```typescript
// Extraer Place ID de URL
const placeId = GooglePlacesService.extractPlaceId(url);

// Validar Place ID
const isValid = GooglePlacesService.validatePlaceId(placeId);

// Obtener datos básicos
const data = await GooglePlacesService.getBasicData(placeId);

// Obtener datos con reseñas
const dataWithReviews = await GooglePlacesService.getDataWithReviews(placeId);

// Obtener todos los datos
const allData = await GooglePlacesService.getAllData(placeId);

// Procesar URL directamente
const data = await GooglePlacesService.getDataFromUrl(url);

// Obtener estadísticas resumidas
const stats = await GooglePlacesService.getPlaceStats(placeId);
```

## 💰 Costes y límites

### Google Places API - Place Details
- **10.000 llamadas gratuitas** por mes
- Después: **$5 USD por cada 1.000 llamadas**
- Límite de **5 reseñas máximo** por llamada

### Estimaciones para tu proyecto
- **100 usuarios, actualización diaria:** 3.000 llamadas/mes = **GRATIS**
- **1.000 usuarios, cada 3 días:** 10.000 llamadas/mes = **GRATIS**
- **1.000 usuarios, diario:** 30.000 llamadas/mes = **~$100/mes**

## 🛠️ Casos de uso

### 1. Formulario de crear/editar negocio
```tsx
const handleGoogleData = (data) => {
  setFormData(prev => ({
    ...prev,
    name: data.name,
    rating: data.rating,
    totalReviews: data.user_ratings_total,
    address: data.formatted_address,
    phone: data.international_phone_number,
    website: data.website
  }));
};

<GooglePlacesBasicInput onDataFetched={handleGoogleData} />
```

### 2. Obtener reseñas para análisis
```tsx
const handleReviews = (data) => {
  if (data.reviews) {
    data.reviews.forEach(review => {
      console.log(`${review.author_name}: ${review.text} (${review.rating}⭐)`);
    });
  }
};

<GooglePlacesWithReviewsInput onDataFetched={handleReviews} />
```

### 3. Validación rápida
```tsx
const { fetchBasicData, data, loading } = useGooglePlaces();

const validateBusiness = async (url) => {
  await fetchBasicData(url);
  return data?.rating > 4.0; // Solo negocios con buena puntuación
};
```

### 4. Actualización masiva
```typescript
const updateAllBusinesses = async (businesses) => {
  for (const business of businesses) {
    if (business.googleReviewUrl) {
      try {
        const data = await GooglePlacesService.getDataFromUrl(business.googleReviewUrl);
        // Actualizar base de datos
        await updateBusiness(business.id, {
          currentRating: data.rating,
          totalReviews: data.user_ratings_total
        });
      } catch (error) {
        console.error(`Error updating ${business.name}:`, error);
      }
    }
  }
};
```

## 🚨 Manejo de errores

El módulo maneja automáticamente:

- ✅ **Place ID inválido**
- ✅ **URL malformada**
- ✅ **Límite de API excedido**
- ✅ **Lugar no encontrado**
- ✅ **Errores de red**
- ✅ **API key inválida**

```typescript
const { error } = useGooglePlaces({
  onError: (error) => {
    switch (error) {
      case 'Place ID no válido':
        // Mostrar mensaje específico
        break;
      case 'Se ha excedido el límite de consultas de la API':
        // Implementar retry o notificar admin
        break;
      default:
        // Error genérico
    }
  }
});
```

## 🔒 Seguridad

- ✅ **API Key** solo en servidor (variables de entorno)
- ✅ **Validación** de entrada en cliente y servidor
- ✅ **Rate limiting** recomendado
- ✅ **Restricciones** de dominio en Google Cloud Console

## 🚀 Próximas mejoras

- [ ] **Cache** de resultados para evitar llamadas duplicadas
- [ ] **Queue system** para procesar lotes grandes
- [ ] **Webhook** para actualizaciones automáticas
- [ ] **Dashboard** de estadísticas de uso de API
- [ ] **Integración** con otras APIs (TripAdvisor, Yelp)

## 📞 Soporte

Para dudas o problemas con el módulo:

1. Revisa esta documentación
2. Consulta los ejemplos en `/components/examples/`
3. Verifica la configuración de la API key
4. Revisa los logs de error en la consola

---

**¡El módulo está listo para usar! 🎉**
