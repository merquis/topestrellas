import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';
import QRCode from 'qrcode';
import sharp from 'sharp';

/**
 * Configuración para diseños QR DIN A7 vertical
 */
interface QRDesignConfig {
  width: number;
  height: number;
  dpi: number;
  businessName: string;
  url: string;
  language: 'es' | 'en';
  template: 'irresistible' | 'professional' | 'modern' | 'elegant';
}

/**
 * Textos multiidioma para los diseños
 */
const QR_TEXTS = {
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
 * Obtiene las dimensiones reales en píxeles según DPI
 */
function getDimensions(dpi: number = 300): { width: number; height: number } {
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

/**
 * Crea el diseño "Irresistible" usando Canvas nativo
 */
async function createIrresistibleDesign(config: QRDesignConfig): Promise<Buffer> {
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  
  const texts = QR_TEXTS[config.language];
  
  // Fondo con gradiente azul-púrpura (igual que la imagen de ejemplo)
  const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, config.width, config.height);
  
  // Configurar fuente para títulos
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Título principal - "PARTICIPA Y DEJA" (más grande y prominente)
  const fontSize1 = Math.round(config.width * 0.055); // Más grande
  ctx.font = `bold ${fontSize1}px Arial`;
  ctx.fillStyle = '#FFD700'; // Dorado brillante
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.fillText(texts.participate, config.width / 2, config.height * 0.12);
  ctx.strokeText(texts.participate, config.width / 2, config.height * 0.12);
  
  // Título secundario - "TU OPINIÓN!" (más grande)
  const fontSize2 = Math.round(config.width * 0.048);
  ctx.font = `bold ${fontSize2}px Arial`;
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.fillText(texts.opinion, config.width / 2, config.height * 0.19);
  ctx.strokeText(texts.opinion, config.width / 2, config.height * 0.19);
  
  // Subtítulo en inglés (más pequeño y blanco)
  if (config.language === 'es') {
    const fontSize3 = Math.round(config.width * 0.025);
    ctx.font = `${fontSize3}px Arial`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'transparent';
    ctx.fillText('PARTICIPATE AND LEAVE YOUR REVIEW!', config.width / 2, config.height * 0.24);
  }
  
  // Marco para el QR con bordes redondeados (más grande)
  const qrSize = Math.round(config.width * 0.45); // Más grande
  const qrX = config.width / 2 - (qrSize + 30) / 2;
  const qrY = config.height / 2 - 30 - (qrSize + 30) / 2;
  
  // Marco blanco con bordes redondeados
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(qrX, qrY, qrSize + 30, qrSize + 30, 15);
  ctx.fill();
  
  // Generar código QR
  const qrDataURL = await QRCode.toDataURL(config.url, {
    width: qrSize,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  // Cargar y dibujar QR
  const qrImage = await loadImage(qrDataURL);
  ctx.drawImage(qrImage, qrX + 15, qrY + 15, qrSize, qrSize);
  
  // URL debajo del QR
  const fontSize4 = Math.round(config.width * 0.018);
  ctx.font = `${fontSize4}px Arial`;
  ctx.fillStyle = 'white';
  ctx.fillText(config.url.replace('https://', ''), config.width / 2, config.height * 0.72);
  
  // Emoji grande y llamativo
  const emojiSize = Math.round(config.width * 0.08);
  ctx.font = `${emojiSize}px Arial`;
  ctx.fillText('😊', config.width * 0.15, config.height * 0.78);
  
  // Texto "ESCANEA EL CÓDIGO!" (más grande y prominente)
  const fontSize5 = Math.round(config.width * 0.032);
  ctx.font = `bold ${fontSize5}px Arial`;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.fillText(texts.scan, config.width / 2, config.height * 0.78);
  ctx.strokeText(texts.scan, config.width / 2, config.height * 0.78);
  
  // Subtítulo en inglés para scan
  if (config.language === 'es') {
    const fontSize6 = Math.round(config.width * 0.025);
    ctx.font = `bold ${fontSize6}px Arial`;
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.fillText('SCAN THE CODE!', config.width / 2, config.height * 0.83);
    ctx.strokeText('SCAN THE CODE!', config.width / 2, config.height * 0.83);
  }
  
  // "PREMIO GARANTIZADO!" (más grande y prominente)
  const fontSize7 = Math.round(config.width * 0.042);
  ctx.font = `bold ${fontSize7}px Arial`;
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.fillText(texts.guaranteed, config.width / 2, config.height * 0.90);
  ctx.strokeText(texts.guaranteed, config.width / 2, config.height * 0.90);
  
  // Subtítulo en inglés para premio
  if (config.language === 'es') {
    const fontSize8 = Math.round(config.width * 0.028);
    ctx.font = `bold ${fontSize8}px Arial`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'transparent';
    ctx.fillText('GUARANTEED PRIZE!', config.width / 2, config.height * 0.95);
  }
  
  // Convertir canvas a buffer
  return canvas.toBuffer('image/png');
}

/**
 * Crea el diseño profesional usando Canvas nativo
 */
async function createProfessionalDesign(config: QRDesignConfig): Promise<Buffer> {
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  
  const texts = QR_TEXTS[config.language];
  
  // Fondo blanco limpio
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, config.width, config.height);
  
  // Header con color corporativo
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(0, 0, config.width, 80);
  
  // Título en header
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(texts.participate + ' ' + texts.opinion, config.width / 2, 40);
  
  // Generar y dibujar QR Code centrado
  const qrSize = Math.round(config.width * 0.4);
  const qrDataURL = await QRCode.toDataURL(config.url, {
    width: qrSize,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  const qrImage = await loadImage(qrDataURL);
  ctx.drawImage(qrImage, config.width / 2 - qrSize / 2, config.height / 2 - 10 - qrSize / 2, qrSize, qrSize);
  
  // Texto de instrucción
  ctx.font = '14px Arial';
  ctx.fillStyle = '#1F2937';
  ctx.fillText(texts.scan, config.width / 2, config.height / 2 + 80);
  
  // Nombre del negocio
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#2563EB';
  ctx.fillText(config.businessName, config.width / 2, config.height - 60);
  
  return canvas.toBuffer('image/png');
}

/**
 * Helper para cargar imagen desde data URL
 */
async function loadImage(dataURL: string): Promise<any> {
  const { Image } = await import('canvas');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * POST /api/qr-designer
 * Genera un QR diseñado según los parámetros
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      businessName,
      url,
      template = 'irresistible',
      language = 'es',
      dpi = 300
    } = body;
    
    if (!businessName || !url) {
      return NextResponse.json(
        { error: 'businessName and url are required' },
        { status: 400 }
      );
    }
    
    // Configurar dimensiones
    const dimensions = getDimensions(dpi);
    
    const config: QRDesignConfig = {
      width: dimensions.width,
      height: dimensions.height,
      dpi,
      businessName,
      url,
      language,
      template
    };
    
    // Generar diseño según plantilla
    let imageBuffer: Buffer;
    
    switch (template) {
      case 'irresistible':
        imageBuffer = await createIrresistibleDesign(config);
        break;
      case 'professional':
        imageBuffer = await createProfessionalDesign(config);
        break;
      default:
        imageBuffer = await createIrresistibleDesign(config);
    }
    
    // Optimizar con Sharp
    const optimizedBuffer = await sharp(imageBuffer)
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();
    
    // Retornar imagen
    return new NextResponse(new Uint8Array(optimizedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="QR-${businessName}-${template}.png"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('Error generating QR design:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR design' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/qr-designer
 * Obtiene información sobre plantillas disponibles
 */
export async function GET() {
  const templates = {
    irresistible: {
      name: 'Irresistible',
      description: 'Diseño llamativo con premio garantizado',
      preview: '/api/qr-designer/preview/irresistible.png'
    },
    professional: {
      name: 'Profesional',
      description: 'Diseño elegante y corporativo',
      preview: '/api/qr-designer/preview/professional.png'
    },
    modern: {
      name: 'Moderno',
      description: 'Diseño minimalista y contemporáneo',
      preview: '/api/qr-designer/preview/modern.png'
    },
    elegant: {
      name: 'Elegante',
      description: 'Diseño sofisticado con toques dorados',
      preview: '/api/qr-designer/preview/elegant.png'
    }
  };
  
  const dimensions = getDimensions(300);
  
  return NextResponse.json({
    templates,
    dimensions: {
      dinA7: {
        mm: { width: 74, height: 105 },
        px300dpi: dimensions,
        px600dpi: getDimensions(600)
      }
    },
    languages: ['es', 'en'],
    formats: ['png', 'jpeg'],
    maxDpi: 600
  });
}
