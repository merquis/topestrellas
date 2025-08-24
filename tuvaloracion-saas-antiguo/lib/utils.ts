import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Obtener el subdominio de la URL
export function getSubdomain(headers: Headers): string | null {
  const host = headers.get('host') || headers.get('x-forwarded-host') || '';
  
  // Para desarrollo local
  if (host.includes('localhost')) {
    // Puedes usar un query param para simular subdominios en desarrollo
    return null;
  }
  
  // Extraer subdominio
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return null;
}

// Generar código de premio
export function generatePrizeCode(businessSubdomain: string, rating: number): string {
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  const code = `${businessSubdomain.toUpperCase().slice(0, 4)}-${randomPart}${rating}`;
  return code;
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Formatear fecha
export function formatDate(date: Date, locale: string = 'es'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Calcular porcentaje
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Obtener idioma del navegador
export function getBrowserLanguage(availableLanguages: string[]): string {
  if (typeof window === 'undefined') return availableLanguages[0];
  
  const browserLang = navigator.language.slice(0, 2);
  return availableLanguages.includes(browserLang) ? browserLang : availableLanguages[0];
}

// Sanitizar input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 500); // Limitar longitud
}

// Colores de la ruleta
export const ROULETTE_COLORS = [
  '#e67e22', // Naranja
  '#e74c3c', // Rojo
  '#2980b9', // Azul
  '#8e44ad', // Púrpura
  '#27ae60', // Verde
  '#f1c40f', // Amarillo
  '#3498db', // Azul claro
  '#9b59b6'  // Violeta
];

// Calcular ángulo de rotación para la ruleta
export function calculateRouletteRotation(targetIndex: number, totalPrizes: number = 8): number {
  const segmentAngle = 360 / totalPrizes;
  const targetAngle = targetIndex * segmentAngle;
  const randomOffset = Math.random() * segmentAngle * 0.8 - segmentAngle * 0.4;
  const spins = 5 + Math.floor(Math.random() * 3);
  const totalRotation = spins * 360 + targetAngle + randomOffset;
  
  return totalRotation;
}

// Detectar dispositivo móvil
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Validar subdominio
export function isValidSubdomain(subdomain: string): boolean {
  // Solo letras, números y guiones
  // No puede empezar o terminar con guión
  // Mínimo 3 caracteres, máximo 63
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
  return subdomainRegex.test(subdomain);
}

// Obtener iniciales para avatar
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
