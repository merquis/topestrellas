// Módulo de gestión de idiomas
import { translations, languageFlags, languageCodes } from './translations.js';
import { CONFIG } from './config.js';

export class LanguageManager {
  constructor() {
    this.currentLanguage = CONFIG.defaultLanguage;
    this.container = null;
  }

  /**
   * Inicializa el gestor de idiomas
   */
  init() {
    this.container = document.getElementById('language-selector-container');
    this.createLanguageButtons();
    this.updateLanguage(this.currentLanguage);
  }

  /**
   * Crea los botones de idioma (banderas)
   */
  createLanguageButtons() {
    const languages = ['es', 'en', 'de', 'fr']; // Orden deseado
    languages.forEach(lang => {
      const button = document.createElement('button');
      button.className = 'language-flag-btn';
      button.dataset.lang = lang;
      button.style.backgroundImage = `url('${languageFlags[lang]}')`;
      button.title = languageCodes[lang]; // Tooltip con el nombre del idioma
      
      button.addEventListener('click', () => {
        this.updateLanguage(lang);
      });

      this.container.appendChild(button);
    });
  }

  /**
   * Actualiza el idioma de la aplicación
   * @param {string} lang - Código del idioma
   */
  updateLanguage(lang) {
    this.currentLanguage = lang;
    
    // Actualizar botón activo
    document.querySelectorAll('.language-flag-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Actualizar textos
    this.updateTexts(lang);

    // Actualizar atributo lang del documento
    document.documentElement.lang = lang;

    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }

  /**
   * Actualiza todos los textos de la página
   * @param {string} lang - Código del idioma
   */
  updateTexts(lang) {
    const trans = translations[lang];

    // Actualizar elementos con data-text
    document.querySelectorAll('[data-text]').forEach(el => {
      const key = el.dataset.text;
      if (trans[key]) {
        el.innerHTML = trans[key]; // Usar innerHTML para soportar etiquetas como <a>
      }
    });

    // Actualizar placeholders
    document.querySelectorAll('[data-placeholder]').forEach(el => {
      const key = el.dataset.placeholder;
      if (trans[key]) {
        el.placeholder = trans[key];
      }
    });
  }

  /**
   * Obtiene la traducción actual
   * @param {string} key - Clave de traducción
   * @param {Object} vars - Variables para interpolación
   * @returns {string} Texto traducido
   */
  getTranslation(key, vars = {}) {
    let text = translations[this.currentLanguage][key] || key;
    for (const v in vars) {
      text = text.replace(new RegExp(`{{${v}}}`, 'g'), vars[v]);
    }
    return text;
  }

  /**
   * Obtiene los premios traducidos
   * @returns {Array} Array de premios
   */
  getTranslatedPrizes() {
    return translations[this.currentLanguage].prizes;
  }

  /**
   * Obtiene el idioma actual
   * @returns {string} Código del idioma actual
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }
}

// Exportar instancia singleton
export const languageManager = new LanguageManager();
