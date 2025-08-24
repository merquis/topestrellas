# Tu Valoración - Sistema SaaS de Reseñas

Sistema multi-tenant para gestión de reseñas y fidelización de clientes con gamificación.

## 🚀 Características Principales

- **Multi-tenant con subdominios**: Cada negocio tiene su propio subdominio (ej: restaurante.tuvaloracion.com)
- **Sistema de gamificación**: Ruleta de premios para incentivar reseñas
- **Multi-idioma**: Soporte para ES, EN, DE, FR, IT, PT
- **Gestión de premios personalizable**: Cada negocio puede configurar sus propios premios
- **Integración con Google Reviews**: Redirección automática para reseñas de 5 estrellas
- **Panel de administración**: Para gestionar negocios y ver estadísticas
- **Envío de emails automático**: Con códigos de premio únicos
- **Base de datos MongoDB**: Para escalabilidad

## 📋 Requisitos

- Node.js 18+ 
- MongoDB 5+
- Cuenta de email SMTP (configurada en Banahosting)

## 🛠️ Instalación

1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/tuvaloracion-saas.git
cd tuvaloracion-saas
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales:
```env
# MongoDB
MONGODB_URI=mongodb://usuario:password@host:27017/tuvaloracion?tls=false

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32

# Email
SMTP_HOST=mail.tuvaloracion.com
SMTP_PORT=587
SMTP_USER=info@tuvaloracion.com
SMTP_PASS=tu-password

# Dominios
ADMIN_DOMAIN=admin.tuvaloracion.com
APP_DOMAIN=tuvaloracion.com
```

4. Ejecutar en desarrollo
```bash
npm run dev
```

## 🏗️ Estructura del Proyecto

```
tuvaloracion-saas/
├── app/
│   ├── api/              # Endpoints API
│   ├── business/         # App de reseñas (subdominios)
│   ├── admin/           # Panel de administración
│   ├── layout.tsx       # Layout principal
│   └── page.tsx         # Página de inicio
├── components/          # Componentes React
├── lib/                 # Utilidades y conexiones
│   ├── mongodb.ts       # Conexión a MongoDB
│   ├── types.ts         # Tipos TypeScript
│   └── utils.ts         # Funciones auxiliares
├── public/              # Archivos estáticos
└── styles/              # Estilos CSS
```

## 📊 Modelo de Datos

### Business (Negocio)
```typescript
{
  subdomain: string        // Subdominio único
  name: string            // Nombre del negocio
  type: string            // Tipo (restaurante, peluquería, etc)
  config: {
    languages: string[]   // Idiomas disponibles
    theme: {...}         // Personalización visual
    prizes: Prize[]      // Premios configurados
  }
  subscription: {...}    // Plan y estado
  stats: {...}          // Estadísticas
}
```

### Opinion (Reseña)
```typescript
{
  businessId: ObjectId    // ID del negocio
  customer: {
    name: string
    email: string
  }
  rating: number         // 1-5 estrellas
  review: string         // Comentario
  prize: {...}          // Premio ganado
  createdAt: Date
}
```

## 🔧 Configuración de Producción

### Docker
```bash
docker build -t tuvaloracion-saas .
docker run -p 3000:3000 --env-file .env tuvaloracion-saas
```

### Nginx (para subdominios)
```nginx
server {
    server_name *.tuvaloracion.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

## 📱 Flujo de Usuario

1. Cliente accede a `negocio.tuvaloracion.com`
2. Selecciona calificación (1-5 estrellas)
3. Completa formulario con nombre y email
4. Gira la ruleta y gana un premio
5. Si dio 5 estrellas, se le pide dejar reseña en Google
6. Recibe código de premio por email

## 🔐 Seguridad

- Validación de emails únicos por negocio
- Sanitización de inputs
- Rate limiting en endpoints
- HTTPS obligatorio en producción
- Tokens JWT para autenticación admin

## 📈 Próximas Mejoras

- [ ] Dashboard analytics avanzado
- [ ] Integración con más plataformas de reseñas
- [ ] App móvil para gestión
- [ ] Webhooks para integraciones
- [ ] Sistema de notificaciones push
- [ ] Exportación de datos

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 📞 Soporte

Para soporte técnico: soporte@tuvaloracion.com
