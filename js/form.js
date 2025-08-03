// Módulo de gestión del formulario
import { showElement, hideElement, isValidEmail } from './utils.js';
import { languageManager } from './language.js';
import { CONFIG } from './config.js';

export class FormManager {
  constructor() {
    this.form = null;
    this.formSection = null;
    this.feedbackGroup = null;
    this.feedbackTextarea = null;
    this.submitButton = null;
    this.nameInput = null;
    this.emailInput = null;
    this.privacyPolicyCheckbox = null;
    this.privacyPolicyLabel = null;
    this.privacyLink = null;
    
    // Contenedores de error
    this.nameError = null;
    this.emailError = null;
    this.feedbackError = null;
    this.privacyError = null;

    this.onSubmitCallback = null;
  }

  /**
   * Inicializa el gestor del formulario
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
  }

  /**
   * Cachea los elementos del DOM
   */
  cacheElements() {
    this.form = document.getElementById('feedbackForm');
    this.formSection = document.getElementById('formulario');
    this.feedbackGroup = document.getElementById('feedback-group');
    this.feedbackTextarea = this.feedbackGroup.querySelector('textarea');
    this.submitButton = document.getElementById('submitText');
    this.privacyPolicyCheckbox = document.getElementById('privacyPolicy');
    this.privacyPolicyLabel = document.getElementById('privacyPolicyLabel');
    this.privacyLink = document.getElementById('openPrivacyPopup');
    
    const inputs = this.form.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.dataset.placeholder === 'namePlaceholder') {
        this.nameInput = input;
      } else if (input.dataset.placeholder === 'emailPlaceholder') {
        this.emailInput = input;
      }
    });

    // Cachear contenedores de error
    this.nameError = document.getElementById('name-error');
    this.emailError = document.getElementById('email-error');
    this.feedbackError = document.getElementById('feedback-error');
    this.privacyError = document.getElementById('privacy-error');
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Ocultar errores al empezar a escribir
    this.nameInput.addEventListener('input', () => this.hideError(this.nameError));
    this.emailInput.addEventListener('input', () => this.hideError(this.emailError));
    this.feedbackTextarea.addEventListener('input', () => this.hideError(this.feedbackError));
    this.privacyPolicyCheckbox.addEventListener('change', () => this.hideError(this.privacyError));

    window.addEventListener('languageChanged', () => {
      this.updateButtonText();
      this.updatePrivacyPolicyLabel();
      this.revalidateVisibleErrors();
    });
  }

  /**
   * Prepara el formulario según la valoración
   * @param {number} rating - Valoración del usuario
   */
  prepare(rating) {
    this.updatePrivacyPolicyLabel();
    if (rating < 5) {
      showElement(this.feedbackGroup);
      this.feedbackTextarea.required = true;
      this.submitButton.textContent = languageManager.getTranslation('submitBtn');
    } else {
      hideElement(this.feedbackGroup);
      this.feedbackTextarea.required = false;
      this.submitButton.textContent = languageManager.getTranslation('continueBtn');
    }
  }

  /**
   * Actualiza el texto del label de la política de privacidad
   */
  updatePrivacyPolicyLabel() {
    const labelText = languageManager.getTranslation('privacyPolicy');
    const linkText = languageManager.getTranslation('privacyLinkText');
    this.privacyPolicyLabel.textContent = labelText;
    this.privacyLink.textContent = linkText;
  }

  /**
   * Actualiza el texto del botón
   */
  updateButtonText() {
    if (!this.formSection.classList.contains('hidden')) {
      const key = this.feedbackTextarea.required ? 'submitBtn' : 'continueBtn';
      this.submitButton.textContent = languageManager.getTranslation(key);
    }
  }

  /**
   * Muestra un error en un campo
   * @param {HTMLElement} errorElement - El div de error
   * @param {string} messageKey - La clave de traducción para el mensaje
   */
  showError(errorElement, messageKey) {
    errorElement.textContent = languageManager.getTranslation(messageKey);
    errorElement.style.display = 'block';
  }

  /**
   * Oculta el error de un campo
   * @param {HTMLElement} errorElement - El div de error
   */
  hideError(errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }

  /**
   * Vuelve a validar el formulario si hay errores visibles para actualizar las traducciones.
   */
  revalidateVisibleErrors() {
    // Si el formulario no está visible, no hacer nada
    if (this.formSection.classList.contains('hidden')) {
      return;
    }

    const hasVisibleErrors = this.nameError.style.display === 'block' ||
                             this.emailError.style.display === 'block' ||
                             this.feedbackError.style.display === 'block' ||
                             this.privacyError.style.display === 'block';

    if (hasVisibleErrors) {
      this.validateForm();
    }
  }

  /**
   * Maneja el envío del formulario
   */
  async handleSubmit() {
    if (!this.validateForm()) {
      return;
    }

    // Verificación de email duplicado
    try {
      const email = this.emailInput.value.trim().toLowerCase();
      const response = await fetch(CONFIG.n8nVerifyEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor de verificación');
      }

      const result = await response.json();

      if (result && result.existe === true) {
        this.showError(this.emailError, 'emailAlreadyUsed');
        return;
      }
      if (result && result.valid === false) {
        this.showError(this.emailError, 'invalidEmailNew');
        return;
      }
    } catch (error) {
      console.error('Error al verificar el email:', error);
      this.showError(this.emailError, 'emailVerificationError');
      return;
    }

    if (this.onSubmitCallback) {
      this.onSubmitCallback(this.getFormData());
    }
  }

  /**
   * Valida todo el formulario
   * @returns {boolean} True si es válido
   */
  validateForm() {
    let isValid = true;

    // Validar nombre
    if (this.nameInput.value.trim() === '') {
      this.showError(this.nameError, 'requiredField');
      isValid = false;
    } else {
      this.hideError(this.nameError);
    }

    // Validar email
    if (this.emailInput.value.trim() === '') {
      this.showError(this.emailError, 'requiredField');
      isValid = false;
    } else if (!isValidEmail(this.emailInput.value.trim())) {
      this.showError(this.emailError, 'invalidEmail');
      isValid = false;
    } else {
      this.hideError(this.emailError);
    }

    // Validar feedback si es requerido
    if (this.feedbackTextarea.required && this.feedbackTextarea.value.trim() === '') {
      this.showError(this.feedbackError, 'requiredField');
      isValid = false;
    } else {
      this.hideError(this.feedbackError);
    }

    // Validar checkbox de privacidad
    if (!this.privacyPolicyCheckbox.checked) {
      this.showError(this.privacyError, 'requiredField');
      isValid = false;
    } else {
      this.hideError(this.privacyError);
    }

    return isValid;
  }

  /**
   * Establece el callback para el submit
   * @param {Function} callback - Función a ejecutar
   */
  setOnSubmit(callback) {
    this.onSubmitCallback = callback;
  }

  /**
   * Resetea el formulario
   */
  reset() {
    this.form.reset();
    this.hideError(this.nameError);
    this.hideError(this.emailError);
    this.hideError(this.feedbackError);
    this.hideError(this.privacyError);
  }

  /**
   * Obtiene los datos del formulario
   * @returns {Object} Datos del formulario
   */
  getFormData() {
    return {
      name: this.nameInput.value.trim(),
      email: this.emailInput.value.trim().toLowerCase(),
      feedback: this.feedbackTextarea.value.trim()
    };
  }
}

export const formManager = new FormManager();
