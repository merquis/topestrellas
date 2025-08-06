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
  
  // Fondo con gradiente azul-púrpura
  const gradient = ctx.createLinearGradient(0, 0, config.width, config.height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, config.width, config.height);
  
  // Configurar fuente para títulos
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Título principal - "PARTICIPA Y DEJA"
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#FFD700'; // Dorado
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.fillText(texts.participate, config.width / 2, 60);
  ctx.strokeText(texts.participate, config.width / 2, 60);
  
  // Título secundario - "TU OPINIÓN!"
  ctx.font = 'bold 28px Arial';
  ctx.fillText(texts.opinion, config.width / 2, 100);
  ctx.strokeText(texts.opinion, config.width / 2, 100);
  
  // Marco para el QR con sombra
  const qrSize = Math.round(config.width * 0.4);
  const qrX = config.width / 2 - (qrSize + 20) / 2;
  const qrY = config.height / 2 - 20 - (qrSize + 20) / 2;
  
  // Sombra del marco
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(qrX + 5, qrY + 5, qrSize + 20, qrSize + 20);
  
  // Marco blanco
  ctx.fillStyle = 'white';
  ctx.fillRect(qrX, qrY, qrSize + 20, qrSize + 20);
  
  // Generar código QR
  const qrDataURL = await QRCode.toDataURL(config.url, {
    width: qrSize,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  // Cargar y dibujar QR
  const qrImage = await loadImage(qrDataURL);
  ctx.drawImage(qrImage, qrX + 10, qrY + 10, qrSize, qrSize);
  
  // Emoji llamativo
  ctx.font = '40px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('🎁', 50, config.height / 2 + 80);
  
  // Texto "ESCANEA EL CÓDIGO!"
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.fillText(texts.scan, config.width / 2, config.height / 2 + 60);
  ctx.strokeText(texts.scan, config.width / 2, config.height / 2 + 60);
  
  // "PREMIO GARANTIZADO!" - El gancho principal
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#00FF88'; // Verde neón
  ctx.lineWidth = 2;
  ctx.fillText(texts.guaranteed, config.width / 2, config.height / 2 + 90);
  ctx.strokeText(texts.guaranteed, config.width / 2, config.height / 2 + 90);
  
  // Nombre del negocio
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'transparent';
  ctx.fillText(config.businessName, config.width / 2, config.height - 80);
  
  // URL pequeña en la parte inferior
  ctx.font = '10px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(config.url.replace('https://', ''), config.width / 2, config.height - 40);
  
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
