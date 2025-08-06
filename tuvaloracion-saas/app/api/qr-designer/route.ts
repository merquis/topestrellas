import { NextRequest, NextResponse } from 'next/server';
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
 * Crea el diseño "Irresistible" usando Sharp (sin Canvas)
 */
async function createIrresistibleDesign(config: QRDesignConfig): Promise<Buffer> {
  const texts = QR_TEXTS[config.language];
  
  // Generar código QR primero
  const qrSize = Math.round(config.width * 0.4);
  const qrBuffer = await QRCode.toBuffer(config.url, {
    width: qrSize,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  // Crear fondo con gradiente usando Sharp
  const gradientSvg = `
    <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      
      <!-- Título principal -->
      <text x="${config.width/2}" y="${config.height * 0.12}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="${Math.round(config.width * 0.055)}" 
            fill="#FFD700" 
            stroke="#000000" 
            stroke-width="2">${texts.participate}</text>
      
      <!-- Título secundario -->
      <text x="${config.width/2}" y="${config.height * 0.19}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="${Math.round(config.width * 0.048)}" 
            fill="#FFD700" 
            stroke="#000000" 
            stroke-width="2">${texts.opinion}</text>
      
      <!-- Subtítulo en inglés -->
      ${config.language === 'es' ? `
      <text x="${config.width/2}" y="${config.height * 0.24}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-size="${Math.round(config.width * 0.025)}" 
            fill="white">PARTICIPATE AND LEAVE YOUR REVIEW!</text>
      ` : ''}
      
      <!-- Marco blanco para QR -->
      <rect x="${config.width/2 - (qrSize + 30)/2}" 
            y="${config.height/2 - 30 - (qrSize + 30)/2}" 
            width="${qrSize + 30}" 
            height="${qrSize + 30}" 
            fill="white" 
            rx="15" />
      
      <!-- URL debajo del QR -->
      <text x="${config.width/2}" y="${config.height * 0.72}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-size="${Math.round(config.width * 0.018)}" 
            fill="white">${config.url.replace('https://', '')}</text>
      
      <!-- Texto ESCANEA EL CÓDIGO -->
      <text x="${config.width/2}" y="${config.height * 0.78}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="${Math.round(config.width * 0.032)}" 
            fill="white" 
            stroke="#FFD700" 
            stroke-width="1">${texts.scan}</text>
      
      <!-- Subtítulo en inglés para scan -->
      ${config.language === 'es' ? `
      <text x="${config.width/2}" y="${config.height * 0.83}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="${Math.round(config.width * 0.025)}" 
            fill="#FFD700" 
            stroke="#000000" 
            stroke-width="1">SCAN THE CODE!</text>
      ` : ''}
      
      <!-- PREMIO GARANTIZADO -->
      <text x="${config.width/2}" y="${config.height * 0.90}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="${Math.round(config.width * 0.042)}" 
            fill="#FFD700" 
            stroke="#000000" 
            stroke-width="2">${texts.guaranteed}</text>
      
      <!-- Subtítulo en inglés para premio -->
      ${config.language === 'es' ? `
      <text x="${config.width/2}" y="${config.height * 0.95}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="${Math.round(config.width * 0.028)}" 
            fill="white">GUARANTEED PRIZE!</text>
      ` : ''}
    </svg>
  `;
  
  // Crear imagen base con Sharp
  const baseImage = await sharp(Buffer.from(gradientSvg))
    .png()
    .toBuffer();
  
  // Superponer el QR en el centro
  const qrX = Math.round(config.width/2 - qrSize/2);
  const qrY = Math.round(config.height/2 - 30 - qrSize/2);
  
  const finalImage = await sharp(baseImage)
    .composite([
      {
        input: qrBuffer,
        left: qrX,
        top: qrY
      }
    ])
    .png()
    .toBuffer();
  
  return finalImage;
}

/**
 * Crea el diseño profesional usando Sharp
 */
async function createProfessionalDesign(config: QRDesignConfig): Promise<Buffer> {
  const texts = QR_TEXTS[config.language];
  
  // Generar código QR
  const qrSize = Math.round(config.width * 0.4);
  const qrBuffer = await QRCode.toBuffer(config.url, {
    width: qrSize,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  // Crear diseño profesional con SVG
  const professionalSvg = `
    <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Fondo blanco -->
      <rect width="100%" height="100%" fill="#F8FAFC" />
      
      <!-- Header azul -->
      <rect width="100%" height="80" fill="#2563EB" />
      
      <!-- Título en header -->
      <text x="${config.width/2}" y="40" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="18" 
            fill="white">${texts.participate} ${texts.opinion}</text>
      
      <!-- Texto de instrucción -->
      <text x="${config.width/2}" y="${config.height/2 + 80}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-size="14" 
            fill="#1F2937">${texts.scan}</text>
      
      <!-- Nombre del negocio -->
      <text x="${config.width/2}" y="${config.height - 60}" 
            text-anchor="middle" 
            font-family="Arial" 
            font-weight="bold" 
            font-size="16" 
            fill="#2563EB">${config.businessName}</text>
    </svg>
  `;
  
  // Crear imagen base
  const baseImage = await sharp(Buffer.from(professionalSvg))
    .png()
    .toBuffer();
  
  // Superponer el QR
  const qrX = Math.round(config.width/2 - qrSize/2);
  const qrY = Math.round(config.height/2 - 10 - qrSize/2);
  
  const finalImage = await sharp(baseImage)
    .composite([
      {
        input: qrBuffer,
        left: qrX,
        top: qrY
      }
    ])
    .png()
    .toBuffer();
  
  return finalImage;
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
