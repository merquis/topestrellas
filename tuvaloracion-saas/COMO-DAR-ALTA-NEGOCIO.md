# Cómo Dar de Alta un Nuevo Local/Negocio

Actualmente el sistema no tiene una interfaz de administración implementada. Para dar de alta un nuevo negocio, debes hacerlo directamente en MongoDB.

## Métodos para Dar de Alta un Negocio

### Método 1: Script de MongoDB (Recomendado)

1. **Conectar a MongoDB**:
```bash
# Si usas Docker
docker exec -it tuvaloracion-mongodb mongosh

# O con MongoDB Compass
mongodb://localhost:27017/tuvaloracion
```

2. **Insertar nuevo negocio**:
```javascript
use tuvaloracion

db.businesses.insertOne({
  subdomain: "pizzeria-mario",  // Subdominio único (pizzeria-mario.tuvaloracion.com)
  name: "Pizzería Mario",
  type: "restaurante",
  category: "Italiana",
  config: {
    languages: ["es", "en"],
    defaultLanguage: "es",
    googleReviewUrl: "https://g.page/r/tu-url-google",  // URL de Google Reviews
    theme: {
      primaryColor: "#dc2626",    // Color principal (rojo)
      secondaryColor: "#991b1b"   // Color secundario
    },
    prizes: [
      {
        index: 0,
        value: "50€",
        translations: {
          es: { name: "Pizza familiar gratis", emoji: "🍕" },
          en: { name: "Free family pizza", emoji: "🍕" }
        }
      },
      {
        index: 1,
        value: "25€",
        translations: {
          es: { name: "2x1 en pizzas", emoji: "🍕" },
          en: { name: "2x1 pizzas", emoji: "🍕" }
        }
      },
      {
        index: 2,
        value: "15€",
        translations: {
          es: { name: "Postre + Café gratis", emoji: "☕" },
          en: { name: "Free dessert + Coffee", emoji: "☕" }
        }
      },
      {
        index: 3,
        value: "10€",
        translations: {
          es: { name: "Bebidas gratis", emoji: "🥤" },
          en: { name: "Free drinks", emoji: "🥤" }
        }
      },
      {
        index: 4,
        value: "5€",
        translations: {
          es: { name: "Descuento 5€", emoji: "💰" },
          en: { name: "€5 Discount", emoji: "💰" }
        }
      },
      {
        index: 5,
        value: "3€",
        translations: {
          es: { name: "Café gratis", emoji: "☕" },
          en: { name: "Free coffee", emoji: "☕" }
        }
      },
      {
        index: 6,
        value: "8€",
        translations: {
          es: { name: "Entrante gratis", emoji: "🥗" },
          en: { name: "Free starter", emoji: "🥗" }
        }
      },
      {
        index: 7,
        value: "2€",
        translations: {
          es: { name: "Chupito limoncello", emoji: "🍋" },
          en: { name: "Limoncello shot", emoji: "🍋" }
        }
      }
    ],
    features: {
      showScarcityIndicators: true,
      requireGoogleReview: true
    }
  },
  contact: {
    phone: "+34 600 123 456",
    email: "info@pizzeriamario.com",
    address: "Calle Principal 123, Madrid"
  },
  subscription: {
    plan: "premium",  // trial, basic, premium
    validUntil: new Date("2025-12-31"),
    status: "active"
  },
  stats: {
    totalOpinions: 0,
    totalPrizesGiven: 0,
    avgRating: 0
  },
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Método 2: Script Node.js

Crear archivo `add-business.js`:

```javascript
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function addBusiness() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('tuvaloracion');
    
    const newBusiness = {
      subdomain: "tu-negocio",  // Cambiar esto
      name: "Tu Negocio",
      // ... resto de la configuración
    };
    
    await db.collection('businesses').insertOne(newBusiness);
    console.log('✅ Negocio creado exitosamente');
    
  } finally {
    await client.close();
  }
}

addBusiness();
```

### Método 3: MongoDB Compass (GUI)

1. Abrir MongoDB Compass
2. Conectar a: `mongodb://localhost:27017`
3. Seleccionar base de datos: `tuvaloracion`
4. Seleccionar colección: `businesses`
5. Click en "ADD DATA" > "Insert Document"
6. Pegar la estructura JSON del negocio

## Campos Importantes

### Subdomain (Obligatorio)
- Debe ser único
- Solo letras minúsculas, números y guiones
- Ejemplo: `pizzeria-mario` → `pizzeria-mario.tuvaloracion.com`

### Configuración de Premios
- Debe tener exactamente 8 premios (índices 0-7)
- Cada premio necesita traducciones para todos los idiomas configurados

### Google Review URL
- Obtener desde Google My Business
- Formato: `https://g.page/r/[tu-codigo]`

### Planes de Suscripción
- `trial`: 30 días gratis
- `basic`: Plan básico
- `premium`: Plan premium

## Verificar el Alta

1. **Verificar en MongoDB**:
```javascript
db.businesses.findOne({ subdomain: "tu-negocio" })
```

2. **Acceder al sitio**:
- Local: `http://tu-negocio.localhost:3001`
- Producción: `https://tu-negocio.tuvaloracion.com`

## Próximos Pasos

Para facilitar este proceso, se recomienda desarrollar:

1. **Panel de Administración** en `/admin` con:
   - Lista de negocios
   - Formulario para crear/editar negocios
   - Gestión de suscripciones
   - Estadísticas

2. **API REST** para gestión:
   - `POST /api/businesses` - Crear negocio
   - `GET /api/businesses` - Listar negocios
   - `PUT /api/businesses/:id` - Actualizar
   - `DELETE /api/businesses/:id` - Eliminar

3. **CLI Tool**:
   ```bash
   npm run add-business -- --name "Pizzería Mario" --subdomain "pizzeria-mario"
   ```

## Ejemplo Completo para Copiar/Pegar

```javascript
// Para MongoDB Shell o Compass
{
  "subdomain": "mi-restaurante",
  "name": "Mi Restaurante",
  "type": "restaurante",
  "category": "Mediterráneo",
  "config": {
    "languages": ["es", "en"],
    "defaultLanguage": "es",
    "googleReviewUrl": "https://g.page/r/example",
    "theme": {
      "primaryColor": "#f97316",
      "secondaryColor": "#ea580c"
    },
    "prizes": [
      {"index": 0, "value": "60€", "translations": {"es": {"name": "Cena para 2", "emoji": "🍽️"}, "en": {"name": "Dinner for 2", "emoji": "🍽️"}}},
      {"index": 1, "value": "30€", "translations": {"es": {"name": "Descuento 30€", "emoji": "💰"}, "en": {"name": "€30 Discount", "emoji": "💰"}}},
      {"index": 2, "value": "25€", "translations": {"es": {"name": "Botella de vino", "emoji": "🍾"}, "en": {"name": "Wine bottle", "emoji": "🍾"}}},
      {"index": 3, "value": "10€", "translations": {"es": {"name": "Postre gratis", "emoji": "🍦"}, "en": {"name": "Free dessert", "emoji": "🍦"}}},
      {"index": 4, "value": "5€", "translations": {"es": {"name": "Bebida gratis", "emoji": "🍺"}, "en": {"name": "Free drink", "emoji": "🍺"}}},
      {"index": 5, "value": "3€", "translations": {"es": {"name": "Café gratis", "emoji": "☕"}, "en": {"name": "Free coffee", "emoji": "☕"}}},
      {"index": 6, "value": "8€", "translations": {"es": {"name": "Cóctel gratis", "emoji": "🍹"}, "en": {"name": "Free cocktail", "emoji": "🍹"}}},
      {"index": 7, "value": "2€", "translations": {"es": {"name": "Chupito gratis", "emoji": "🥃"}, "en": {"name": "Free shot", "emoji": "🥃"}}}
    ],
    "features": {
      "showScarcityIndicators": true,
      "requireGoogleReview": true
    }
  },
  "contact": {
    "phone": "+34 900 000 000",
    "email": "info@mirestaurante.com",
    "address": "Calle Principal 123, Ciudad"
  },
  "subscription": {
    "plan": "trial",
    "validUntil": {"$date": "2025-12-31T00:00:00Z"},
    "status": "active"
  },
  "stats": {
    "totalOpinions": 0,
    "totalPrizesGiven": 0,
    "avgRating": 0
  },
  "active": true,
  "createdAt": {"$date": {"$numberLong": "1735825200000"}},
  "updatedAt": {"$date": {"$numberLong": "1735825200000"}}
}
