// Módulo de la ruleta
import { CONFIG, ROULETTE_COLORS } from './config.js';
import { languageManager } from './language.js';
import { showElement, hideElement, getRandomNumber, formatPrizeCode } from './utils.js';

export class RouletteManager {
  constructor() {
    this.wheel = null;
    this.textLayer = null;
    this.spinButton = null;
    this.container = null;
    this.rouletteScreen = null;
    this.prizes = [];
    this.sliceAngle = 0;
    this.isSpinning = false;
    this.currentRating = 0;
    this.onSpinComplete = null;
  }

  /**
   * Inicializa el gestor de la ruleta
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.createWheel();
  }

  /**
   * Cachea los elementos del DOM
   */
  cacheElements() {
    this.wheel = document.getElementById('rouletteWheel');
    this.textLayer = document.getElementById('rouletteTextLayer');
    this.spinButton = document.getElementById('spinBtn');
    this.container = document.getElementById('rouletteContainer');
    this.rouletteScreen = document.querySelector('.roulette-screen');
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botón de girar
    this.spinButton.addEventListener('click', () => this.spin());

    // Actualizar textos cuando cambie el idioma
    window.addEventListener('languageChanged', () => {
      this.updateTexts();
      this.updateSpinButtonText();
    });

    // Redimensionar la ruleta cuando cambie el tamaño de la ventana
    window.addEventListener('resize', () => {
      if (!this.rouletteScreen.classList.contains('hidden')) {
        this.createWheelTexts();
      }
    });
  }

  /**
   * Crea la ruleta completa
   */
  createWheel() {
    // No crear textos aquí, se crearán cuando se muestre la ruleta
    this.updateSpinButtonText();
  }

  /**
   * Crea los textos de la ruleta
   */
  createWheelTexts() {
    this.prizes = languageManager.getTranslatedPrizes();
    const N = this.prizes.length;
    this.sliceAngle = 360 / N;

    // Limpiar textos anteriores
    this.textLayer.innerHTML = '';

    // Asegurarse de que la ruleta tenga dimensiones antes de calcular
    if (this.wheel.offsetWidth === 0) {
      // Si la ruleta no tiene dimensiones, esperar un poco y reintentar
      setTimeout(() => this.createWheelTexts(), 100);
      return;
    }

    // Calcular posiciones
    const R = this.wheel.offsetWidth / 2;
    const cx = R;
    const cy = R;

    this.prizes.forEach((label, i) => {
      const textDiv = document.createElement('div');
      textDiv.classList.add('roulette-text');
      textDiv.textContent = label;

      // Calcular el ángulo para cada segmento (en grados)
      // Empezamos desde arriba (-90 grados) y vamos en sentido horario
      const angleDeg = -90 + (i * this.sliceAngle) + (this.sliceAngle / 2);
      const angleRad = angleDeg * Math.PI / 180;

      // Posicionar el texto al 55% del radio para un ajuste fino
      const textRadius = 0.55 * R;
      const x = cx + textRadius * Math.cos(angleRad);
      const y = cy + textRadius * Math.sin(angleRad);

      // Rotar el texto 90 grados para que esté alineado con las líneas divisorias
      const textRotation = angleDeg;

      // Aplicar estilos de posición y rotación
      textDiv.style.position = 'absolute';
      textDiv.style.left = `${x}px`;
      textDiv.style.top = `${y}px`;
      textDiv.style.transform = `translate(-50%, -50%) rotate(${textRotation}deg)`;

      this.textLayer.appendChild(textDiv);
    });
  }

  /**
   * Actualiza los textos de la ruleta
   */
  updateTexts() {
    if (!this.rouletteScreen.classList.contains('hidden')) {
      this.createWheelTexts();
    }
  }

  /**
   * Actualiza el texto del botón de girar
   */
  updateSpinButtonText() {
    this.spinButton.textContent = languageManager.getTranslation('spinBtn');
  }

  /**
   * Prepara la ruleta para ser mostrada
   * @param {number} rating - Valoración del usuario
   */
  prepare(rating) {
    this.currentRating = rating;
    // Crear los textos de la ruleta justo antes de mostrarla
    this.createWheelTexts();
  }

  /**
   * Gira la ruleta con probabilidades controladas
   */
  spin() {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.spinButton.disabled = true;

    const N = this.prizes.length;
    const randomSpins = getRandomNumber(CONFIG.roulette.minSpins, CONFIG.roulette.maxSpins);
    
    let prizeIndex;
    const random = Math.random(); // Genera un número aleatorio entre 0 y 1

    // --- INICIO DE LA LÓGICA MODIFICADA ---
    if (this.currentRating >= 1 && this.currentRating <= 4) {
      // LÓGICA PARA 1-4 ESTRELLAS
      const lowTierPrizes = [3, 4, 7]; // Índices para HELADO, CERVEZA, CHUPITO
      
      // Comprobamos las probabilidades fijas del 0.01% cada una
      if (random < 0.0001) {        // 0.01%
        prizeIndex = 0; // CENA
      } else if (random < 0.0002) { // 0.01%
        prizeIndex = 1; // 30€ DESCUENTO
      } else if (random < 0.0003) { // 0.01%
        prizeIndex = 2; // BOTELLA VINO
      } else if (random < 0.0004) { // 0.01%
        prizeIndex = 5; // REFRESCO
      } else if (random < 0.0005) { // 0.01%
        prizeIndex = 6; // MOJITO
      } else {
        // El 99.95% restante se reparte entre los 3 premios menores
        const randomIndex = Math.floor(Math.random() * lowTierPrizes.length);
        prizeIndex = lowTierPrizes[randomIndex];
      }
    } else {
      // LÓGICA PARA 5 ESTRELLAS
      // Comprobamos las probabilidades fijas del 0.1% cada una
      if (random < 0.001) {        // 0.1%
        prizeIndex = 0; // CENA
      } else if (random < 0.002) { // 0.1%
        prizeIndex = 1; // 30€ DESCUENTO
      } else if (random < 0.003) { // 0.1%
        prizeIndex = 2; // BOTELLA VINO
      } else {
        // El 99.7% restante se reparte entre los 5 premios restantes
        const highTierLowPrizes = [3, 4, 5, 6, 7]; // Helado, Cerveza, Refresco, Mojito, Chupito
        const randomIndex = Math.floor(Math.random() * highTierLowPrizes.length);
        prizeIndex = highTierLowPrizes[randomIndex];
      }
    }
    // --- FIN DE LA LÓGICA MODIFICADA ---

    const targetIndex = (prizeIndex - 2 + N) % N;
    const rotation = 270 - (targetIndex * this.sliceAngle) - (this.sliceAngle / 2);
    const totalRotation = (randomSpins * 360) + rotation;

    this.wheel.style.transition = `transform ${CONFIG.roulette.spinDuration}ms ${CONFIG.roulette.easing}`;
    this.wheel.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
      this.isSpinning = false;
      if (this.onSpinComplete) {
        this.onSpinComplete(prizeIndex, this.currentRating);
      }
    }, CONFIG.roulette.spinDuration + 200);
  }

  /**
   * Establece el callback para cuando termine el giro
   * @param {Function} callback - Función a ejecutar
   */
  setOnSpinComplete(callback) {
    this.onSpinComplete = callback;
  }


  /**
   * Resetea el estado de la ruleta
   */
  reset() {
    this.isSpinning = false;
    this.spinButton.disabled = false;
    this.wheel.style.transform = 'rotate(0deg)';
    this.wheel.style.transition = 'none';
  }
}

// Exportar instancia singleton
export const rouletteManager = new RouletteManager();
