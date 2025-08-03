// Utilidades generales

/**
 * Muestra un elemento con animación fade-in
 * @param {HTMLElement} element - Elemento a mostrar
 */
export function showElement(element) {
  if (!element) return;
  element.classList.remove('hidden');
  element.classList.add('fade-in');
}

/**
 * Oculta un elemento
 * @param {HTMLElement} element - Elemento a ocultar
 */
export function hideElement(element) {
  if (!element) return;
  element.classList.add('hidden');
  element.classList.remove('fade-in');
}

/**
 * Genera un código aleatorio
 * @param {number} length - Longitud del código
 * @returns {string} Código generado
 */
export function generateRandomCode(length = 3) {
  return Math.random().toString().slice(2, 2 + length);
}

/**
 * Obtiene un número aleatorio entre min y max (inclusive)
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} Número aleatorio
 */
export function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Debounce para optimizar eventos
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formatea el código de premio
 * @param {string} prize - Premio ganado
 * @param {number} rating - Valoración del usuario
 * @returns {string} Código formateado
 */
export function formatPrizeCode(prize, rating) {
  const code = generateRandomCode();
  return `${prize}<br>EURO-${code}${rating}`;
}
