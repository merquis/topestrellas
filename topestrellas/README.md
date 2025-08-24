# TopEstrellas - Sistema de Gestión de Reseñas y Fidelización

## 📋 Descripción

TopEstrellas es una plataforma SaaS completa para la gestión de reseñas y fidelización de clientes, diseñada para ayudar a los negocios a mejorar su reputación online y aumentar las reseñas positivas en Google y TripAdvisor.

## 🏗️ Arquitectura

El sistema está compuesto por 6 aplicaciones principales:

### 1. **Panel Super Admin** (`/super`)
- Control total del sistema
- Gestión de todos los negocios
- Métricas globales (MRR, churn, etc.)
- Gestión de afiliados
- Solo accesible para rol `super_admin`

### 2. **Panel Admin** (`/admin`)
- Dashboard para propietarios de negocios
- Gestión de opiniones y premios
- Configuración del negocio
- Estadísticas individuales
- Solo accesible para rol `admin`

### 3. **Panel Afiliados** (`/affiliate`)
- Gestión de referidos
- Control de comisiones
- Herramientas de marketing
- Solo accesible para rol `affiliate`

### 4. **Sistema de Autenticación**
- **Login** (`/login`): Punto de entrada único
- **Registro** (`/registro`): Proceso de alta en 4 pasos
  - Paso 1: Datos personales
  - Paso 2: Búsqueda del negocio en Google Places
  - Paso 3: Selección de plan
  - Paso 4: Pago con Stripe

### 5. **App de Valoración** (`/business/[subdomain]`)
- Aplicación para clientes finales
- Sistema de gamificación con ruleta de premios
- Multi-idioma (ES, EN, DE, FR)
- Personalizable por negocio

### 6. **APIs** (`/api`)
- Endpoints para autenticación
- Gestión de negocios
- Procesamiento de opiniones
- Integración con Stripe
- Webhooks

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+
- MongoDB
- Cuenta de Stripe
- API Key de Google Places

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone [url-del-repo]
cd topestrellas
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local` con:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/topestrellas

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Places
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# JWT
JWT_SECRET=tu-secret-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

5. **Build para producción**
```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
topestrellas/
├── app/                    # Aplicaciones Next.js
│   ├── super/             # Panel Super Admin
│   ├── admin/             # Panel Admin
│   ├── affiliate/         # Panel Afiliados
│   ├── login/             # Página de login
│   ├── registro/          # Proceso de registro
│   ├── business/          # App de valoración
│   └── api/               # Endpoints API
├── components/            # Componentes React
│   ├── admin/            # Componentes de administración
│   └── ...               # Componentes compartidos
├── lib/                   # Utilidades y helpers
│   ├── auth.ts           # Sistema de autenticación
│   ├── mongodb.ts        # Conexión a base de datos
│   └── types.ts          # Tipos TypeScript
├── styles/               # Estilos CSS
└── public/               # Assets públicos
```

## 🔐 Roles y Permisos

### Super Admin
- Acceso total al sistema
- Gestión de todos los negocios
- Control de suscripciones
- Gestión de afiliados

### Admin (Propietario de Negocio)
- Gestión de su propio negocio
- Acceso a estadísticas
- Configuración de premios
- Gestión de opiniones

### Affiliate
- Gestión de referidos
- Visualización de comisiones
- Acceso a herramientas de marketing

## 🎯 Características Principales

### Para Negocios
- ✅ Dashboard con métricas en tiempo real
- ✅ Sistema de gamificación con premios
- ✅ Integración con Google Places
- ✅ Multi-idioma
- ✅ Generador de códigos QR personalizados
- ✅ Gestión de suscripciones con Stripe

### Para Clientes
- ✅ Interfaz intuitiva y atractiva
- ✅ Ruleta de premios interactiva
- ✅ Sistema de valoración por estrellas
- ✅ Redirección inteligente a Google/TripAdvisor
- ✅ Experiencia móvil optimizada

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14, React, TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: MongoDB
- **Pagos**: Stripe
- **APIs**: Google Places, Google Maps
- **Autenticación**: JWT
- **Deployment**: Compatible con Vercel, Docker

## 📊 Modelos de Datos

### Business
- Información del negocio
- Configuración de premios
- Personalización de tema
- URLs de reseñas
- Estado de suscripción

### User
- Datos de autenticación
- Rol (super_admin, admin, affiliate)
- Negocios asociados

### Opinion
- Valoración del cliente
- Feedback
- Premio ganado
- Datos de contacto

### Subscription
- Plan seleccionado
- Estado de pago
- Fechas de inicio/fin
- Historial de pagos

## 🔄 Flujo de Usuario

1. **Registro de Negocio**
   - Propietario se registra
   - Busca su negocio en Google Places
   - Selecciona plan de suscripción
   - Completa el pago

2. **Configuración**
   - Personaliza premios
   - Configura colores y textos
   - Genera código QR

3. **Cliente Final**
   - Escanea QR o accede por URL
   - Valora el servicio
   - Gira la ruleta
   - Recibe premio
   - Deja reseña en Google/TripAdvisor

## 📈 Métricas y Analytics

- Total de opiniones
- Rating promedio
- Tasa de conversión
- Premios entregados
- Redirecciones a plataformas
- MRR (Monthly Recurring Revenue)
- Churn rate

## 🚦 Estado del Proyecto

✅ **Completado**
- Sistema de autenticación
- Paneles de administración
- App de valoración
- Integración con Stripe
- Sistema de premios

🔄 **En Desarrollo**
- Optimizaciones de rendimiento
- Nuevas integraciones
- Sistema de notificaciones

## 📝 Licencia

Proyecto privado - Todos los derechos reservados

## 👥 Equipo

Desarrollado por el equipo de TopEstrellas

---

Para más información o soporte, contactar con el equipo de desarrollo.
