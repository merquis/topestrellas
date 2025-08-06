import { fabric } from 'fabric';
import QRCode from 'qrcode';
import sharp from 'sharp';

/**
 * Configuración para diseños QR DIN A7 vertical
 */
export interface QRDesignConfig {
  // Dimensiones DIN A7 vertical (74×105mm)
  width: number;
  height: number;
  dpi: number;
  
  // Contenido
  businessName: string;
  url: string;
  language: 'es' | 'en';
  
  // Estilo
  template: 'irresistible' | 'professional' | 'modern' | 'elegant';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  
  // QR específico
  qrSize: number;
  qrMargin: number;
}

/**
 * Plantillas predefinidas para diferentes estilos
 */
export const QR_TEMPLATES = {
  irresistible: {
    name: 'Irresistible',
    description: 'Diseño llamativo con premio garantizado',
    colors: {
      primary: '#FFD700',    // Dorado
      secondary: '#FF6B35',  // Naranja vibrante
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Gradiente azul-púrpura
      text: '#FFFFFF',
      accent: '#00FF88'      // Verde neón
    }
  },
  professional: {
    name: 'Profesional',
    description: 'Diseño elegante y corporativo',
    colors: {
      primary: '#2563EB',    // Azul corporativo
      secondary: '#1E40AF',  // Azul oscuro
      background: '#F8FAFC', // Gris muy claro
      text: '#1F2937',       // Gris oscuro
      accent: '#10B981'      // Verde profesional
    }
  },
  modern: {
    name: 'Moderno',
    description: 'Diseño minimalista y contemporáneo',
    colors: {
      primary: '#8B5CF6',    // Púrpura
      secondary: '#A78BFA',  // Púrpura claro
      background: '#FFFFFF', // Blanco
      text: '#111827',       // Negro suave
      accent: '#F59E0B'      // Amarillo moderno
    }
  },
  elegant: {
    name: 'Elegante',
    description: 'Diseño sofisticado con toques dorados',
    colors: {
      primary: '#D97706',    // Dorado oscuro
      secondary: '#92400E',  // Marrón dorado
      background: '#1F2937', // Gris oscuro
      text: '#F9FAFB',       // Blanco suave
      accent: '#EF4444'      // Rojo elegante
    }
  }
} as const;

/**
 * Textos multiidioma para los diseños
 */
export const QR_TEXTS = {
  es: {
    participate: 'PARTICIPA Y DEJA',
    opinion: 'TU OPINIÓN!',
    scan: 'ESCANEA EL CÓDIGO!',
    guaranteed: 'PREMIO GARANTIZADO!',
    review: 'Comparte tu experiencia',
    win: 'GANA PREMIOS',
    instant: 'AL INSTANTE',
    footer: 'Escanéame para participar'
  },
  en: {
    participate: 'PARTICIPATE AND LEAVE',
    opinion: 'YOUR REVIEW!',
    scan: 'SCAN THE CODE!',
    guaranteed: 'GUARANTEED PRIZE!',
    review: 'Share your experience',
    win: 'WIN PRIZES',
    instant: 'INSTANTLY',
    footer: 'Scan me to participate'
  }
} as const;

/**
 * Clase principal para diseñar QR codes con Fabric.js
 */
export class QRDesigner {
  private canvas: fabric.Canvas | null = null;
  private config: QRDesignConfig;
  
  constructor(config: QRDesignConfig) {
    this.config = config;
  }

  /**
   * Crea un canvas de Fabric.js con las dimensiones correctas
   */
  private createCanvas(): fabric.Canvas {
    // Crear elemento canvas HTML
    const canvasElement = document.createElement('canvas');
    canvasElement.width = this.config.width;
    canvasElement.height = this.config.height;
    
    // Inicializar Fabric.js canvas
    this.canvas = new fabric.Canvas(canvasElement, {
      width: this.config.width,
      height: this.config.height,
      backgroundColor: 'white'
    });
    
    return this.canvas;
  }

  /**
   * Genera el código QR como imagen
   */
  private async generateQRImage(): Promise<string> {
    const qrDataURL = await QRCode.toDataURL(this.config.url, {
      width: this.config.qrSize,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
    
    return qrDataURL;
  }

  /**
   * Crea el diseño "Irresistible" - el más llamativo
   */
  private async createIrresistibleDesign(): Promise<void> {
    if (!this.canvas) return;
    
    const template = QR_TEMPLATES.irresistible;
    const texts = QR_TEXTS[this.config.language];
    
    // Fondo con gradiente
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: this.config.width, y2: this.config.height },
      colorStops: [
        { offset: 0, color: '#667eea' },
        { offset: 1, color: '#764ba2' }
      ]
    });
    
    const background = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.config.width,
      height: this.config.height,
      fill: gradient
    });
    this.canvas.add(background);

    // Título principal - "PARTICIPA Y DEJA"
    const titleTop = new fabric.Text(texts.participate, {
      left: this.config.width / 2,
      top: 60,
      fontSize: 32,
      fontFamily: 'Arial Black',
      fontWeight: 'bold',
      fill: template.colors.primary,
      textAlign: 'center',
      originX: 'center',
      stroke: '#000000',
      strokeWidth: 1
    });
    this.canvas.add(titleTop);

    // Título secundario - "TU OPINIÓN!"
    const titleBottom = new fabric.Text(texts.opinion, {
      left: this.config.width / 2,
      top: 100,
      fontSize: 28,
      fontFamily: 'Arial Black',
      fontWeight: 'bold',
      fill: template.colors.primary,
      textAlign: 'center',
      originX: 'center',
      stroke: '#000000',
      strokeWidth: 1
    });
    this.canvas.add(titleBottom);

    // Marco para el QR con sombra
    const qrFrame = new fabric.Rect({
      left: this.config.width / 2,
      top: this.config.height / 2 - 20,
      width: this.config.qrSize + 20,
      height: this.config.qrSize + 20,
      fill: 'white',
      rx: 15,
      ry: 15,
      originX: 'center',
      originY: 'center',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.3)',
        blur: 10,
        offsetX: 5,
        offsetY: 5
      })
    });
    this.canvas.add(qrFrame);

    // Código QR
    const qrDataURL = await this.generateQRImage();
    const qrImage = await new Promise<fabric.Image>((resolve) => {
      fabric.Image.fromURL(qrDataURL, (img) => {
        img.set({
          left: this.config.width / 2,
          top: this.config.height / 2 - 20,
          originX: 'center',
          originY: 'center',
          scaleX: this.config.qrSize / (img.width || 1),
          scaleY: this.config.qrSize / (img.height || 1)
        });
        resolve(img);
      });
    });
    this.canvas.add(qrImage);

    // Emoji llamativo
    const emoji = new fabric.Text('🎁', {
      left: 50,
      top: this.config.height / 2 + 80,
      fontSize: 40,
      originX: 'center'
    });
    this.canvas.add(emoji);

    // Texto "ESCANEA EL CÓDIGO!"
    const scanText = new fabric.Text(texts.scan, {
      left: this.config.width / 2,
      top: this.config.height / 2 + 60,
      fontSize: 20,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: template.colors.primary,
      textAlign: 'center',
      originX: 'center',
      stroke: '#000000',
      strokeWidth: 0.5
    });
    this.canvas.add(scanText);

    // "PREMIO GARANTIZADO!" - El gancho principal
    const prizeText = new fabric.Text(texts.guaranteed, {
      left: this.config.width / 2,
      top: this.config.height / 2 + 90,
      fontSize: 24,
      fontFamily: 'Arial Black',
      fontWeight: 'bold',
      fill: template.colors.accent,
      textAlign: 'center',
      originX: 'center',
      stroke: '#000000',
      strokeWidth: 1
    });
    this.canvas.add(prizeText);

    // Nombre del negocio
    const businessText = new fabric.Text(this.config.businessName, {
      left: this.config.width / 2,
      top: this.config.height - 80,
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: 'white',
      textAlign: 'center',
      originX: 'center'
    });
    this.canvas.add(businessText);

    // URL pequeña en la parte inferior
    const urlText = new fabric.Text(this.config.url.replace('https://', ''), {
      left: this.config.width / 2,
      top: this.config.height - 40,
      fontSize: 10,
      fontFamily: 'Arial',
      fill: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      originX: 'center'
    });
    this.canvas.add(urlText);
  }

  /**
   * Crea el diseño profesional
   */
  private async createProfessionalDesign(): Promise<void> {
    if (!this.canvas) return;
    
    const template = QR_TEMPLATES.professional;
    const texts = QR_TEXTS[this.config.language];
    
    // Fondo blanco limpio
    const background = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.config.width,
      height: this.config.height,
      fill: template.colors.background
    });
    this.canvas.add(background);

    // Header con color corporativo
    const header = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.config.width,
      height: 80,
      fill: template.colors.primary
    });
    this.canvas.add(header);

    // Título en header
    const title = new fabric.Text(texts.participate + ' ' + texts.opinion, {
      left: this.config.width / 2,
      top: 40,
      fontSize: 18,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: 'white',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });
    this.canvas.add(title);

    // QR Code centrado
    const qrDataURL = await this.generateQRImage();
    const qrImage = await new Promise<fabric.Image>((resolve) => {
      fabric.Image.fromURL(qrDataURL, (img) => {
        img.set({
          left: this.config.width / 2,
          top: this.config.height / 2 - 10,
          originX: 'center',
          originY: 'center',
          scaleX: this.config.qrSize / (img.width || 1),
          scaleY: this.config.qrSize / (img.height || 1)
        });
        resolve(img);
      });
    });
    this.canvas.add(qrImage);

    // Texto de instrucción
    const instruction = new fabric.Text(texts.scan, {
      left: this.config.width / 2,
      top: this.config.height / 2 + 80,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: template.colors.text,
      textAlign: 'center',
      originX: 'center'
    });
    this.canvas.add(instruction);

    // Nombre del negocio
    const businessName = new fabric.Text(this.config.businessName, {
      left: this.config.width / 2,
      top: this.config.height - 60,
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: template.colors.primary,
      textAlign: 'center',
      originX: 'center'
    });
    this.canvas.add(businessName);
  }

  /**
   * Genera el diseño completo según la plantilla seleccionada
   */
  async generateDesign(): Promise<fabric.Canvas> {
    this.createCanvas();
    
    switch (this.config.template) {
      case 'irresistible':
        await this.createIrresistibleDesign();
        break;
      case 'professional':
        await this.createProfessionalDesign();
        break;
      default:
        await this.createIrresistibleDesign();
    }
    
    return this.canvas!;
  }

  /**
   * Exporta el diseño como imagen de alta calidad
   */
  async exportAsImage(format: 'png' | 'jpeg' = 'png', quality: number = 1): Promise<Buffer> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call generateDesign() first.');
    }
    
    // Exportar canvas como data URL
    const dataURL = this.canvas.toDataURL({
      format: format,
      quality: quality,
      multiplier: this.config.dpi / 72 // Escalar según DPI
    });
    
    // Convertir data URL a buffer usando Sharp
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Procesar con Sharp para optimizar
    return await sharp(buffer)
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();
  }

  /**
   * Obtiene las dimensiones reales en píxeles según DPI
   */
  static getDimensions(dpi: number = 300): { width: number; height: number } {
    // DIN A7: 74×105mm
    const widthMM = 74;
    const heightMM = 105;
    
    // Convertir mm a pulgadas y luego a píxeles
    const widthInches = widthMM / 25.4;
    const heightInches = heightMM / 25.4;
    
    return {
      width: Math.round(widthInches * dpi),
      height: Math.round(heightInches * dpi)
    };
  }
}

/**
 * Función helper para crear configuración rápida
 */
export function createQRDesignConfig(
  businessName: string,
  url: string,
  template: QRDesignConfig['template'] = 'irresistible',
  language: 'es' | 'en' = 'es',
  dpi: number = 300
): QRDesignConfig {
  const dimensions = QRDesigner.getDimensions(dpi);
  const templateColors = QR_TEMPLATES[template].colors;
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    dpi,
    businessName,
    url,
    language,
    template,
    primaryColor: templateColors.primary,
    secondaryColor: templateColors.secondary,
    backgroundColor: templateColors.background,
    qrSize: Math.round(dimensions.width * 0.4), // QR ocupa 40% del ancho
    qrMargin: 10
  };
}
