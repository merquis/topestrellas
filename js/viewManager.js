// Módulo de gestión de vistas
import { showElement, hideElement } from './utils.js';

class ViewManager {
  constructor() {
    this.mainViews = {};
    this.overlays = {};
    this.currentView = null; // Para saber qué vista restaurar
    this.fixedCta = {
      bar: null,
      btn: null,
      action: null
    };
    this.originalCtas = {};
  }

  /**
   * Inicializa el gestor de vistas
   */
  init() {
    // Vistas que se intercambian en el contenedor principal
    this.mainViews = {
      initial: document.querySelector('#initial-view'),
      form: document.querySelector('#formulario'),
      prize: document.querySelector('#codigoContainer'),
      review: document.querySelector('#resenaBtn') // Añadimos la vista de reseña
    };

    // Vistas que se superponen a todo
    this.overlays = {
      roulette: document.querySelector('.roulette-screen')
    };

    // Barra CTA fija
    this.fixedCta.bar = document.querySelector('#fixed-cta-bar');
    this.fixedCta.btn = document.querySelector('#fixed-cta-btn');
    this.fixedCta.btnForm = document.querySelector('#fixed-cta-btn-form');
    this.fixedCta.btnReview = document.querySelector('#fixed-cta-btn-review');

    // Botones de acción originales
    this.originalCtas = {
      initial: document.querySelector('#valorarBtn'),
      form: document.querySelector('#feedbackForm button[type="submit"]'),
      review: document.querySelector('#resenaBtn .google-btn')
    };

    // Ocultar todas las vistas al inicio para un estado limpio
    Object.values(this.mainViews).forEach(view => view && hideElement(view));
    Object.values(this.overlays).forEach(view => view && hideElement(view));

    // Event listener para el botón fijo
    if (this.fixedCta.btn) {
      this.fixedCta.btn.addEventListener('click', () => {
        if (typeof this.fixedCta.action === 'function') {
          this.fixedCta.action();
        }
    // Event listener para el botón fijo de review
    if (this.fixedCta.btnReview) {
      this.fixedCta.btnReview.addEventListener('click', () => {
        // Importar la URL de config.js de forma segura
        try {
          const config = require('./config.js');
          if (config && config.CONFIG && config.CONFIG.googleReviewUrl) {
            window.open(config.CONFIG.googleReviewUrl, '_blank');
          } else {
            // Fallback si no se puede importar
            window.open('https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes', '_blank');
          }
        } catch (e) {
          // Fallback si no se puede importar
          window.open('https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes', '_blank');
        }
      });
    }
      });
    }
    // Event listener para el botón fijo de formulario
    if (this.fixedCta.btnForm && this.originalCtas.form) {
      this.fixedCta.btnForm.addEventListener('click', () => {
        this.originalCtas.form.click();
      });
    }
  }

  /**
   * Muestra una vista principal, ocultando las demás
   * @param {string} viewName - Nombre de la vista a mostrar
   */
  showView(viewName) {
    if (!this.mainViews[viewName]) {
      console.error(`La vista principal "${viewName}" no existe.`);
      return;
    }

    // Ocultar todas las vistas principales
    for (const key in this.mainViews) {
      if (this.mainViews[key]) {
        hideElement(this.mainViews[key]);
      }
    }

    // Mostrar la vista solicitada
    this.currentView = viewName;
    showElement(this.mainViews[viewName]);
    this.updateFixedCta(viewName);

    // Si es la vista del premio, mostrar la fecha actual para Canarias
    if (viewName === 'prize') {
      const today = new Date();
      const options = {
        timeZone: 'Atlantic/Canary',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
      const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(today);

      const dateElement = document.getElementById('currentDate');
      if (dateElement) {
        dateElement.textContent = formattedDate;
      }
    }
  }

  /**
   * Actualiza el estado y contenido de la barra CTA fija
   * @param {string} currentView - El nombre de la vista actual
   */
  updateFixedCta(currentView) {
    if (!this.fixedCta.bar || !this.fixedCta.btn) return;

    // Ocultar todos los botones originales primero
    Object.values(this.originalCtas).forEach(btn => btn && btn.parentElement.classList.remove('visually-hidden'));

    const ctaConfig = {
      initial: {
        text: document.querySelector('#valorarBtn span').textContent,
        action: () => this.originalCtas.initial.click(),
        originalBtnContainer: this.originalCtas.initial.parentElement
      },
      form: {
        text: document.querySelector('#submitText').textContent,
        action: () => this.originalCtas.form.click(),
        originalBtnContainer: this.originalCtas.form
      },
      review: {
        text: document.querySelector('#resenaBtn .google-btn span').textContent,
        action: () => this.originalCtas.review.click(),
        originalBtnContainer: document.getElementById('googleBtnContainer')
      }
    };

    if (ctaConfig[currentView] && window.innerWidth <= 768) {
      // Mostrar solo el botón correspondiente
      if (currentView === 'initial') {
        showElement(this.fixedCta.bar);
        const mainBtnText = document.querySelector('#valorarBtn #btnText');
        if (mainBtnText) {
          this.fixedCta.btn.textContent = mainBtnText.textContent;
        }
        this.fixedCta.btn.style.display = 'block';
      } else {
        this.fixedCta.btn.style.display = 'none';
      }
      if (currentView === 'form' && this.fixedCta.btnForm) {
        showElement(this.fixedCta.bar);
        this.fixedCta.btnForm.style.display = 'block';
        if (this.originalCtas.form) {
          this.originalCtas.form.classList.add('visually-hidden');
        }
      } else if (this.fixedCta.btnForm) {
        this.fixedCta.btnForm.style.display = 'none';
      }
      if (currentView === 'review' && this.fixedCta.btnReview) {
        this.fixedCta.btnReview.style.display = 'block';
      } else if (this.fixedCta.btnReview) {
        this.fixedCta.btnReview.style.display = 'none';
      }
      this.fixedCta.action = ctaConfig[currentView].action;
      // Ocultar el botón original correspondiente
      if(ctaConfig[currentView].originalBtnContainer) {
        ctaConfig[currentView].originalBtnContainer.classList.add('visually-hidden');
      }
    } else {
      hideElement(this.fixedCta.bar);
      this.fixedCta.btn.style.display = 'none';
      if (this.fixedCta.btnForm) this.fixedCta.btnForm.style.display = 'none';
      if (this.fixedCta.btnReview) this.fixedCta.btnReview.style.display = 'none';
      this.fixedCta.action = null;
      // Asegurarse de que todos los botones originales son visibles en escritorio
      for (const key in ctaConfig) {
        if (ctaConfig[key].originalBtnContainer) {
          ctaConfig[key].originalBtnContainer.classList.remove('visually-hidden');
        }
      }
    }
  }

  /**
   * Muestra un overlay
   * @param {string} overlayName - Nombre del overlay a mostrar
   */
  showOverlay(overlayName) {
    if (this.overlays[overlayName]) {
      showElement(this.overlays[overlayName]);
      // Ocultar la barra CTA si se muestra la ruleta en móvil
      if (overlayName === 'roulette' && window.innerWidth <= 768) {
        hideElement(this.fixedCta.bar);
      }

      // --- NUEVA LÓGICA PARA REESTRUCTURAR EL DOM EN VISTA RULETA ---
      if (overlayName === 'roulette') {
        this.restructureRouletteDOM();
      }
    }
  }

  /**
   * Reestructura el DOM de la ruleta para el layout horizontal, si es necesario.
   */
  restructureRouletteDOM() {
    const rouletteContent = document.querySelector('.roulette-content');
    if (!rouletteContent) return;

    const header = rouletteContent.querySelector('.roulette-header');
    const spinBtn = rouletteContent.querySelector('#spinBtn');
    
    // Si ya existe el wrapper, no hacer nada
    if (rouletteContent.querySelector('.roulette-right-column')) {
      return;
    }

    if (header && spinBtn) {
      const rightColumn = document.createElement('div');
      rightColumn.className = 'roulette-right-column';
      
      // Mover el header y el botón dentro de la nueva columna
      rightColumn.appendChild(header);
      rightColumn.appendChild(spinBtn);
      
      // Añadir la nueva columna al contenido de la ruleta
      rouletteContent.appendChild(rightColumn);
    }
  }

  /**
   * Oculta un overlay
   * @param {string} overlayName - Nombre del overlay a ocultar
   */
  hideOverlay(overlayName) {
    if (this.overlays[overlayName]) {
      hideElement(this.overlays[overlayName]);
      // Al ocultar la ruleta, restaurar el estado del CTA fijo
      if (overlayName === 'roulette' && this.currentView) {
        this.updateFixedCta(this.currentView);
      }
    }
  }
}

export const viewManager = new ViewManager();
