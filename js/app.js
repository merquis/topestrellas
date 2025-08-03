// Aplicación principal - REFACTORIZADA CON VIEW MANAGER
import { CONFIG } from './config.js';
import { languageManager } from './language.js';
import { ratingManager } from './rating.js';
import { formManager } from './form.js';
import { rouletteManager } from './roulette.js';
import { viewManager } from './viewManager.js';
import { formatPrizeCode, showElement, hideElement } from './utils.js';

class App {
  constructor() {
    this.codigoRecompensa = null;
    this.resenaBtn = null;
    this.googleTimerInterval = null;
    this.currentFormData = null; // Para guardar temporalmente los datos del formulario
    this.lastPrizeData = null; // Para guardar los datos del último premio mostrado
    this.privacyPopup = null;
    this.closePrivacyPopupBtn = null;
    this.closePrivacyTextBtn = null;
    this.privacyPopupContent = null;
  }

  /**
   * Envía el payload guardado para valoración externa (5 estrellas) al webhook
   */
  async sendExternalReviewToN8N() {
    if (this.pendingExternalReviewPayload) {
      const payload = {
        ...this.pendingExternalReviewPayload,
        valoracion_externa: true
      };
      // await this.sendDataToN8N(payload); // <--- llamada al webhook comentada temporalmente
      this.pendingExternalReviewPayload = null;
    }
  }

  /**
   * Inicializa la aplicación
   */
  init() {
    this.cacheElements();
    this.initializeModules();
    this.setupEventListeners();
    this.startWatchingCounter();
    
    // Mostrar la vista inicial
    viewManager.showView('initial');
  }

  /**
   * Cachea los elementos principales del DOM
   */
  cacheElements() {
    this.codigoRecompensa = document.getElementById('codigoRecompensa');
    this.resenaBtn = document.getElementById('resenaBtn');
    this.privacyPopup = document.getElementById('privacyPopup');
    this.closePrivacyPopupBtn = document.getElementById('closePrivacyPopup');
    this.closePrivacyTextBtn = document.getElementById('closePrivacyTextBtn');
    this.privacyPopupContent = document.getElementById('privacyPopupContent');
  }

  /**
   * Inicializa todos los módulos
   */
  initializeModules() {
    languageManager.init();
    ratingManager.init();
    formManager.init();
    rouletteManager.init();
    viewManager.init();

    // Configurar callbacks
    formManager.setOnSubmit((formData) => this.handleFormSubmit(formData));
    rouletteManager.setOnSpinComplete((prizeIndex, rating) => this.handleSpinComplete(prizeIndex, rating));
  }

  /**
   * Configura los event listeners principales
   */
  setupEventListeners() {
    window.addEventListener('ratingConfirmed', (e) => {
      this.handleRatingConfirmed(e.detail.rating);
    });

    window.goToReview = () => {
      window.open(CONFIG.googleReviewUrl, '_blank');
      this.showSuccessMessage();
    };

    // Listeners para el popup de privacidad
    document.body.addEventListener('click', (e) => {
      if (e.target.id === 'openPrivacyPopup') {
        e.preventDefault();
        e.stopPropagation(); // Evita que el clic se propague al label
        this.showPrivacyPopup();
      }
    });
    this.closePrivacyPopupBtn.addEventListener('click', () => this.hidePrivacyPopup());
    this.closePrivacyTextBtn.addEventListener('click', () => this.hidePrivacyPopup());
    this.privacyPopup.addEventListener('click', (e) => {
      if (e.target === this.privacyPopup) {
        this.hidePrivacyPopup();
      }
    });
  }

  /**
   * Contador de personas viendo
   */
  startWatchingCounter() {
    const watchingEl = document.getElementById('watchingCount');
    if (!watchingEl) return;

    let watchingCount = Math.floor(Math.random() * 5) + 1;
    watchingEl.textContent = watchingCount;

    this.watchingInterval = setInterval(() => {
      // Variar entre 1 y 5
      const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      watchingCount = Math.max(1, Math.min(5, watchingCount + change));
      watchingEl.textContent = watchingCount;
    }, 3000);
  }

  /**
   * Maneja la confirmación de la valoración
   * @param {number} rating - Valoración seleccionada
   */
  handleRatingConfirmed(rating) {
    formManager.prepare(rating); // Prepara el formulario (lógica interna)
    viewManager.showView('form'); // Cambia a la vista del formulario
  }

  /**
   * Envía los datos del formulario a n8n en segundo plano
   * @param {object} payload - Datos completos a enviar
   */
  async sendDataToN8N(payload) {
    try {
      await fetch(CONFIG.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error al enviar los datos a n8n:', error);
    }
  }

  /**
   * Maneja el envío del formulario
   * @param {object} formData - Datos básicos del formulario
   */
  handleFormSubmit(formData) {
    const rating = ratingManager.getRating();
    
    // Guardamos los datos del formulario y la valoración para usarlos después
    this.currentFormData = {
      ...formData,
      rating: rating,
      lang: languageManager.getCurrentLanguage(),
      // Guardar SIEMPRE en UTC. El backend debe almacenar este valor tal cual, sin modificar la zona horaria.
      timestamp: new Date().toISOString()
    };
    
    rouletteManager.prepare(rating);
    viewManager.showOverlay('roulette');
  }

  /**
   * Maneja la finalización del giro de la ruleta
   * @param {number} prizeIndex - Índice del premio ganado
   * @param {number} rating - Valoración del usuario
   */
  handleSpinComplete(prizeIndex, rating) {
    // Pausa de 1 segundo para que el usuario vea el premio en la ruleta
    setTimeout(() => {
      viewManager.hideOverlay('roulette');

      // Generamos el código interno
      const randomPart = Math.random().toString().slice(2, 5);
      const justTheCode = `EURO-${randomPart}${rating}`;

      // Guardamos los datos necesarios para poder refrescar el mensaje si cambia el idioma
      this.lastPrizeData = {
        prizeIndex: prizeIndex,
        name: this.currentFormData.name,
        email: this.currentFormData.email,
      };

      // Mostramos el mensaje del premio por primera vez
      this.updatePrizeMessage();

      // Ocultamos la sección de validez
      const expiryWarning = document.querySelector('.expiry-warning');
      if (expiryWarning) {
        hideElement(expiryWarning);
      }

      // Construimos el payload base
      const prizeName = languageManager.getTranslatedPrizes()[prizeIndex];
      const payload = {
        ...this.currentFormData,
        review: this.currentFormData.feedback,
        premio: prizeName,
        codigoPremio: justTheCode,
        prizeIndex: prizeIndex,
      };
      delete payload.feedback;

      // Siempre enviar valoracion_externa = false en la primera llamada al webhook
      payload.valoracion_externa = false;

      if (rating <= 4) {
        this.currentFormData = null;
        viewManager.showView('prize');
      } else if (rating === 5) {
        // Guardar el payload para el siguiente paso (botón completar reseña)
        this.pendingExternalReviewPayload = { ...payload };
        this.startGoogleTimer();
        // Mostrar tanto el mensaje de premio como el bloque de reseña
        showElement(document.getElementById('codigoContainer'));
        showElement(document.getElementById('resenaBtn'));
        // No ocultar ninguna de las dos vistas, solo las demás
        Object.values(viewManager.mainViews).forEach(view => {
          if (view && view.id !== 'codigoContainer' && view.id !== 'resenaBtn') {
            hideElement(view);
          }
        });
        // Asegurar que ambas vistas siguen visibles
        showElement(document.getElementById('codigoContainer'));
        showElement(document.getElementById('resenaBtn'));
        viewManager.updateFixedCta('review');

        // Hacemos scroll hacia la nueva sección en móviles
        if (window.innerWidth <= 768) {
          this.resenaBtn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      // Llamada al webhook SIEMPRE, con valoracion_externa = false
      this.sendDataToN8N(payload);
    }, 1000);
  }

  /**
   * Muestra el popup de política de privacidad
   */
  showPrivacyPopup() {
    const privacyText = languageManager.getTranslation('privacyPolicyFullText');
    const closeBtnText = languageManager.getTranslation('closePrivacyPopupBtn');
    this.privacyPopupContent.innerHTML = privacyText;
    this.closePrivacyTextBtn.textContent = closeBtnText;
    this.privacyPopup.classList.remove('hidden');
  }

  /**
   * Oculta el popup de política de privacidad
   */
  hidePrivacyPopup() {
    this.privacyPopup.classList.add('hidden');
  }

  /**
   * Actualiza el mensaje del premio en la vista de recompensa.
   * Se usa para la renderización inicial y para la actualización en cambio de idioma.
   */
  updatePrizeMessage() {
    if (!this.lastPrizeData) return;

    const { prizeIndex, email } = this.lastPrizeData;

    // Obtener el nombre del premio traducido
    const translatedPrizes = languageManager.getTranslatedPrizes();
    const prizeName = translatedPrizes[prizeIndex];

    // Obtener el mensaje de email traducido
    let prizeByEmailMessage = languageManager.getTranslation('prizeByEmail');
    const formattedEmail = email.replace('@', '@<wbr>');
    const highlightedEmail = `<span class="highlight-email">${formattedEmail}</span>`;
    
    prizeByEmailMessage = prizeByEmailMessage
      .replace('{{email}}', highlightedEmail)
      .replace('{{premio}}', `<strong>${prizeName}</strong>`)
      .replace(/\n/g, '<br>');

    const displayCode = `<div class="premio-grande" style="font-size:2rem;font-weight:bold;margin-bottom:10px;">${prizeName}</div><span class="email-message">${prizeByEmailMessage}</span>`;
    this.codigoRecompensa.innerHTML = displayCode;
  }

  /**
   * Inicia el timer de Google
   */
  startGoogleTimer() {
    const googleTimerEl = document.getElementById('googleTimer');
    let timeLeft = 5 * 60; // 5 minutos en segundos

    this.googleTimerInterval = setInterval(() => {
      if (googleTimerEl) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        googleTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 60) { // Resaltar en el último minuto
          googleTimerEl.style.color = '#ff0000';
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
          clearInterval(this.googleTimerInterval);
          googleTimerEl.textContent = languageManager.getTranslation('expired');
        }
      }
    }, 1000);
  }

  /**
   * Muestra mensaje de éxito
   */
  showSuccessMessage() {
    if (this.googleTimerInterval) {
      clearInterval(this.googleTimerInterval);
    }
    if (this.watchingInterval) {
      clearInterval(this.watchingInterval);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.app = app;

  // Añadir event listener al botón "COMPLETAR MI RESEÑA" (principal)
  const resenaBtn = document.querySelector('#resenaBtn .google-btn');
  if (resenaBtn) {
    resenaBtn.addEventListener('click', async () => {
      if (app.pendingExternalReviewPayload) {
        await app.sendExternalReviewToN8N();
      }
    });
  }

  // Traducción dinámica del título de la ruleta
  function updateWhichPrizeTitle() {
    const el = document.getElementById('whichPrizeTitle');
    if (el) {
      el.textContent = languageManager.getTranslation('whichPrize');
    }
  }
  updateWhichPrizeTitle();
  window.addEventListener('languageChanged', updateWhichPrizeTitle);

  // Traducción dinámica del mensaje del premio
  window.addEventListener('languageChanged', () => {
    if (window.app) {
      window.app.updatePrizeMessage();
    }
  });
});
