// Configuración global de la aplicación
export const CONFIG = {
  // Configuración de la ruleta
  roulette: {
    spinDuration: 4300, // ms
    minSpins: 5,
    maxSpins: 10,
    easing: 'cubic-bezier(.17,.67,.17,1)'
  },
  
  // Configuración de animaciones
  animations: {
    fadeInDuration: 500,
    transitionDuration: 300
  },
  
  // URL de Google Reviews
  googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes',

  // URL del webhook de n8n para guardar leads
  n8nWebhookUrl: 'https://n8n-n8n.hpv7eo.easypanel.host/webhook/guardar-lead',

  // URL del webhook de n8n para verificar si un email ya existe
  n8nVerifyEmailUrl: 'https://n8n-n8n.hpv7eo.easypanel.host/webhook/verificar-email',

  // URL del webhook de n8n para obtener opiniones
  n8nOpinionesUrl: 'https://n8n-n8n.hpv7eo.easypanel.host/webhook/opiniones',
  
  // Idioma por defecto
  defaultLanguage: 'es'
};

// Colores de la ruleta (en orden)
export const ROULETTE_COLORS = [
  { color: '#e67e22', start: 0,   end: 45 },   // CENA (VALOR 60€)
  { color: '#e74c3c', start: 45,  end: 90 },   // 30€ DESCUENTO
  { color: '#2980b9', start: 90,  end: 135 },  // BOTELLA VINO
  { color: '#8e44ad', start: 135, end: 180 },  // HELADO
  { color: '#27ae60', start: 180, end: 225 },  // CERVEZA
  { color: '#f1c40f', start: 225, end: 270 },  // REFRESCO
  { color: '#3498db', start: 270, end: 315 },  // MOJITO
  { color: '#9b59b6', start: 315, end: 360 }   // CHUPITO
];
