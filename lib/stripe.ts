import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Obtiene una instancia de Stripe de forma lazy.
 * Solo crea la instancia cuando se necesita y si la API key está configurada.
 */
export function getStripe(): Stripe | null {
  // Si ya tenemos una instancia, la devolvemos
  if (stripeInstance) {
    return stripeInstance;
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  // Si no hay API key, devolvemos null
  if (!apiKey || apiKey === '') {
    console.warn('⚠️ STRIPE_SECRET_KEY no está configurada');
    return null;
  }
  
  // Crear y cachear la instancia
  try {
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-07-30.basil' as any,
    });
    return stripeInstance;
  } catch (error) {
    console.error('❌ Error inicializando Stripe:', error);
    return null;
  }
}

/**
 * Verifica si Stripe está configurado y disponible
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Obtiene una instancia de Stripe o lanza un error si no está configurada.
 * Útil para endpoints que requieren Stripe obligatoriamente.
 */
export function getStripeOrThrow(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe no está configurado. Por favor, configure STRIPE_SECRET_KEY en las variables de entorno.');
  }
  return stripe;
}
