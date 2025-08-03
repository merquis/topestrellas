// Módulo de gestión de valoraciones - LIBRE Y NEUTRAL
import { showElement, hideElement } from './utils.js';
import { languageManager } from './language.js';

export class RatingManager {
  constructor() {
    this.selectedValue = 0;
    this.isLocked = false;
    this.stars = null;
    this.container = null;
    this.confirmButton = null;
    this.confirmButtonContainer = null;
    this.buttonText = null;
    this.errorElement = null;
  }

  /**
   * Inicializa el gestor de valoraciones
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.initializeFaceElement();
    this.updateButtonText(); // Poner el texto inicial del botón
  }

  /**
   * Cachea los elementos del DOM
   */
  cacheElements() {
    this.stars = document.querySelectorAll('.star');
    this.container = document.getElementById('rating');
    this.confirmButton = document.getElementById('valorarBtn');
    this.confirmButtonContainer = document.getElementById('valorarBtnContainer');
    this.buttonText = document.getElementById('btnText');
    this.errorElement = document.getElementById('rating-error');
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Hover sobre las estrellas
    this.container.addEventListener('mouseover', (e) => {
      if (this.isLocked) return;
      if (e.target.classList.contains('star')) {
        const value = parseInt(e.target.dataset.value);
        this.updateStars(value, true); // true indica que es hover
      }
    });

    // Mouse leave del contenedor (mejor que mouseout)
    this.container.addEventListener('mouseleave', () => {
      if (!this.isLocked) {
        this.updateStars(this.selectedValue);
      }
    });

    // Click en las estrellas
    this.container.addEventListener('click', (e) => {
      if (this.isLocked) return;
      if (e.target.classList.contains('star')) {
        const value = parseInt(e.target.dataset.value);
        this.selectRating(value);
      }
    });

    // Confirmar valoración
    this.confirmButton.addEventListener('click', () => {
      this.confirmRating();
    });

    // Escuchar cambios de idioma
    window.addEventListener('languageChanged', () => {
      this.updateButtonText();
    });
  }

  /**
   * Actualiza el estado visual de las estrellas
   * @param {number} value - Valor de la valoración
   * @param {boolean} isHover - Si es un hover temporal
   */
  updateStars(value, isHover = false) {
    this.stars.forEach(star => {
      const starValue = parseInt(star.dataset.value);
      const shouldBeActive = starValue <= value;
      
      if (shouldBeActive) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
    
    // Mostrar cara correspondiente solo si no es hover o si no hay selección
    if (!isHover || this.selectedValue === 0) {
      this.showFaceForRating(value);
    }
  }

  /**
   * Muestra la cara correspondiente a la valoración
   * @param {number} value - Valor de la valoración
   */
  showFaceForRating(value) {
    let face = '';
    switch (value) {
      case 0:
        face = '🤔'; // Cara pensativa/interrogación para estado inicial
        break;
      case 1:
        face = '😞'; // Cara triste/decepcionada
        break;
      case 2:
        face = '😕'; // Cara preocupada/insatisfecha
        break;
      case 3:
        face = '😐'; // Cara neutra/indiferente
        break;
      case 4:
        face = '🙂'; // Cara ligeramente contenta
        break;
      case 5:
        face = '😊'; // Cara feliz
        break;
      default:
        face = '🤔';
    }
    
    // Actualizar el elemento de la cara
    let faceElement = document.getElementById('rating-face');
    if (faceElement) {
      faceElement.textContent = face;
    }
  }

  /**
   * Selecciona una valoración
   * @param {number} value - Valor seleccionado
   */
  selectRating(value) {
    this.selectedValue = value;
    this.updateStars(value);
    this.updateButtonText();
    this.errorElement.classList.add('hidden'); // Ocultar error al seleccionar
    this.stars.forEach(s => s.classList.remove('pulse-error')); // Detener animación de error
  }
  
  /**
   * Inicializa el elemento de la cara
   */
  initializeFaceElement() {
    // Crear el elemento de la cara si no existe
    let faceElement = document.getElementById('rating-face');
    if (!faceElement) {
      faceElement = document.createElement('span');
      faceElement.id = 'rating-face';
      faceElement.className = 'rating-face';
      // Insertar después de las estrellas
      const starsContainer = document.getElementById('rating');
      starsContainer.appendChild(faceElement);
    }
    // Mostrar cara inicial
    this.showFaceForRating(0);
  }

  /**
   * Actualiza el texto del botón de confirmación
   */
  updateButtonText() {
    let text;
    if (this.selectedValue > 0) {
      text = languageManager.getTranslation('rateWithStars', { count: this.selectedValue });
    } else {
      text = languageManager.getTranslation('rateNow');
    }
    // Actualizar el botón original
    this.buttonText.textContent = text;

    // Actualizar también el botón de la barra fija si está visible
    const fixedCtaBtn = document.getElementById('fixed-cta-btn');
    if (fixedCtaBtn && !fixedCtaBtn.parentElement.classList.contains('hidden')) {
      fixedCtaBtn.textContent = text;
    }
  }

  /**
   * Confirma la valoración
   */
  confirmRating() {
    if (this.isLocked) return;

    if (this.selectedValue === 0) {
      const message = languageManager.getTranslation('selectAtLeastOneStar');
      this.errorElement.textContent = message;
      this.errorElement.classList.remove('hidden');
      this.stars.forEach(s => s.classList.add('pulse-error')); // Iniciar animación de error
      
      // Scroll hacia la sección de estrellas si estamos en móvil
      if (window.innerWidth <= 768) {
        this.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }

    this.isLocked = true;
    this.stars.forEach(star => star.classList.add('locked'));
    this.confirmButton.disabled = true;

    // Disparar evento de valoración confirmada
    window.dispatchEvent(new CustomEvent('ratingConfirmed', { 
      detail: { rating: this.selectedValue } 
    }));

    hideElement(this.confirmButtonContainer);
  }

  /**
   * Obtiene la valoración actual
   * @returns {number} Valoración seleccionada
   */
  getRating() {
    return this.selectedValue;
  }

  /**
   * Resetea el estado del rating
   */
  reset() {
    this.selectedValue = 0;
    this.isLocked = false;
    this.updateStars(0);
    this.stars.forEach(star => {
        star.classList.remove('locked');
    });
    this.confirmButton.disabled = false;
    this.updateButtonText();
    this.errorElement.classList.add('hidden');
    showElement(this.confirmButtonContainer); // Asegurarse de que el botón sea visible
  }
}

// Exportar instancia singleton
export const ratingManager = new RatingManager();
