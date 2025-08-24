# Arquitectura del Sistema TopEstrellas

## 🎯 Principios de Diseño

### 1. **Aislamiento Total de Paneles**
Cada panel administrativo funciona de manera completamente independiente:
- Sin dependencias cruzadas entre paneles
- Cada panel tiene sus propios componentes
- No hay lógica condicional basada en roles cruzados
- Actualizaciones aisladas sin efectos colaterales

### 2. **Separación de Responsabilidades**
```
/super → Solo gestión global del sistema
/admin → Solo gestión de negocio individual
/affiliate → Solo programa de afiliados
/login → Autenticación unificada
/registro → Proceso de alta
/business/[subdomain] → App cliente final
```

## 📊 Flujo de Datos

### Autenticación
```mermaid
Usuario → /login → JWT Token → Redirección por rol
         ↓
    checkAuth() → Validación → Panel correspondiente
```

### Flujo de Registro
```
1. /registro → Datos personales
2. Google Places API → Búsqueda negocio
3. Selección plan → Stripe Setup
4. Pago completado → Activación cuenta
```

## 🗄️ Base de Datos

### Colecciones MongoDB

#### `users`
```javascript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  name: string,
  role: 'super_admin' | 'admin' | 'affiliate',
  businessId?: ObjectId,
  createdAt: Date,
  lastLogin: Date
}
```

#### `businesses`
```javascript
{
  _id: ObjectId,
  subdomain: string,
  name: string,
  placeId: string (Google Places),
  address: string,
  phone: string,
  email: string,
  active: boolean,
  plan: string,
  config: {
    theme: {...},
    prizes: [...],
    languages: [...],
    googleReviewUrl: string,
    tripadvisorReviewUrl: string,
    reviewPlatform: 'google' | 'tripadvisor' | 'alternating'
  },
  subscription: {
    status: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodEnd: Date
  },
  stats: {
    totalOpinions: number,
    avgRating: number,
    prizesGiven: number
  }
}
```

#### `opinions`
```javascript
{
  _id: ObjectId,
  businessId: ObjectId,
  name: string,
  email: string,
  rating: number,
  feedback: string,
  prize: {
    name: string,
    value: string,
    code: string
  },
  language: string,
  createdAt: Date
}
```

#### `subscriptions`
```javascript
{
  _id: ObjectId,
  businessId: ObjectId,
  planKey: string,
  status: 'active' | 'paused' | 'cancelled',
  stripeSubscriptionId: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: boolean
}
```

## 🔌 Integraciones Externas

### Stripe
- **Setup Intent**: Para registro inicial
- **Payment Intent**: Para pagos únicos
- **Subscriptions**: Para pagos recurrentes
- **Webhooks**: Para sincronización de estados
- **Customer Portal**: Para gestión de métodos de pago

### Google Places API
- **Autocomplete**: Búsqueda de negocios
- **Place Details**: Información completa
- **Photos**: Imágenes del negocio
- **Reviews**: Estadísticas de reseñas

## 🛡️ Seguridad

### Autenticación
- JWT tokens con expiración
- Refresh tokens para sesiones largas
- Validación en middleware
- Roles y permisos estrictos

### Protección de Rutas
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const path = request.nextUrl.pathname
  
  // Rutas protegidas por rol
  if (path.startsWith('/super')) {
    // Solo super_admin
  }
  if (path.startsWith('/admin')) {
    // Solo admin
  }
  if (path.startsWith('/affiliate')) {
    // Solo affiliate
  }
}
```

### Validación de Datos
- Schemas con Zod/Joi
- Sanitización de inputs
- Prevención de XSS
- Rate limiting en APIs

## 🚀 Optimizaciones

### Performance
- **Code Splitting**: Cada panel carga solo su código
- **Lazy Loading**: Componentes bajo demanda
- **Image Optimization**: Next.js Image component
- **API Caching**: SWR para datos frecuentes
- **Database Indexing**: Índices en MongoDB

### SEO (App de Valoración)
- Metadata dinámica por negocio
- Open Graph tags
- Schema.org markup
- Sitemap automático

## 📦 Estructura de Componentes

### Componentes Compartidos (Mínimos)
```
/components
  ├── ui/              # Botones, Cards, Modals básicos
  ├── GooglePlacesInput.tsx  # Solo uno, el optimizado
  ├── StripePaymentForm.tsx  # Para registro
  └── BusinessReviewApp.tsx  # App de valoración
```

### Componentes por Panel
```
/app/super/components/
  ├── SuperDashboard.tsx
  ├── SuperMetricsCards.tsx
  └── SuperBusinessTable.tsx

/app/admin/components/
  ├── AdminDashboard.tsx
  ├── AdminMetricsCards.tsx
  └── AdminOpinionsTable.tsx

/app/affiliate/components/
  ├── AffiliateDashboard.tsx
  ├── AffiliateMetricsCards.tsx
  └── AffiliateReferralTable.tsx
```

## 🔄 CI/CD Pipeline

### Development
```bash
npm run dev        # Desarrollo local
npm run lint       # Linting
npm run type-check # TypeScript check
```

### Testing
```bash
npm run test       # Unit tests
npm run test:e2e   # End-to-end tests
npm run test:api   # API tests
```

### Deployment
```bash
npm run build      # Build production
npm run start      # Start production server
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Monitoreo

### Métricas Clave
- **Uptime**: 99.9% SLA
- **Response Time**: < 200ms p95
- **Error Rate**: < 0.1%
- **Database Performance**: Query time < 100ms

### Logging
- **Application Logs**: Winston/Pino
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics / Mixpanel
- **Performance**: Web Vitals

## 🔮 Escalabilidad

### Horizontal Scaling
- Stateless application design
- Session storage en Redis
- Load balancing con Nginx/HAProxy

### Database Scaling
- MongoDB replica sets
- Read/Write splitting
- Sharding por businessId

### Caching Strategy
- **CDN**: Assets estáticos
- **Redis**: Sessions y cache de API
- **Browser Cache**: Assets con hash
- **API Cache**: SWR con revalidación

## 🎨 Temas y Personalización

### Sistema de Temas
```typescript
interface Theme {
  bgPrimary: string
  bgSecondary: string
  primaryColor: string
  secondaryColor: string
  buttonPrimary: string
  buttonSecondary: string
  rouletteColors: string[]
}
```

### Personalización por Negocio
- Colores corporativos
- Logos y branding
- Textos personalizados
- Premios configurables
- Multi-idioma

## 🔐 Backup y Recuperación

### Estrategia de Backup
- **Database**: Snapshots diarios
- **Files**: Backup incremental
- **Code**: Git con tags de versión
- **Configs**: Vault/Secrets Manager

### Disaster Recovery
- RPO (Recovery Point Objective): 1 hora
- RTO (Recovery Time Objective): 4 horas
- Backups en múltiples regiones
- Procedimientos documentados

---

Esta arquitectura está diseñada para ser:
- **Mantenible**: Código limpio y organizado
- **Escalable**: Preparada para crecimiento
- **Segura**: Mejores prácticas de seguridad
- **Performante**: Optimizada para velocidad
- **Resiliente**: Tolerante a fallos
