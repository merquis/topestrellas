import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

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
    footer: 'Escanéame para participar',
    subtitle: 'PARTICIPATE AND LEAVE YOUR REVIEW!',
    scanEn: 'SCAN THE CODE!',
    prizeEn: 'GUARANTEED PRIZE!'
  },
  en: {
    participate: 'PARTICIPATE AND LEAVE',
    opinion: 'YOUR REVIEW!',
    scan: 'SCAN THE CODE!',
    guaranteed: 'GUARANTEED PRIZE!',
    review: 'Share your experience',
    win: 'WIN PRIZES',
    instant: 'INSTANTLY',
    footer: 'Scan me to participate',
    subtitle: '',
    scanEn: '',
    prizeEn: ''
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
 * Genera el HTML para el diseño "Irresistible"
 */
async function generateIrresistibleHTML(config: QRDesignConfig): Promise<string> {
  const texts = QR_TEXTS[config.language];
  
  // Generar QR code como data URL
  const qrDataURL = await QRCode.toDataURL(config.url, {
    width: Math.round(config.width * 0.4),
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          width: ${config.width}px;
          height: ${config.height}px;
          font-family: 'Montserrat', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: ${config.width * 0.05}px;
          position: relative;
          overflow: hidden;
        }
        
        /* Decorative elements */
        .decoration {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
        }
        
        .decoration-1 {
          width: ${config.width * 0.3}px;
          height: ${config.width * 0.3}px;
          background: white;
          top: -${config.width * 0.1}px;
          right: -${config.width * 0.1}px;
        }
        
        .decoration-2 {
          width: ${config.width * 0.2}px;
          height: ${config.width * 0.2}px;
          background: #FFD700;
          bottom: ${config.width * 0.05}px;
          left: -${config.width * 0.05}px;
        }
        
        .header {
          text-align: center;
          z-index: 10;
        }
        
        .title-main {
          font-family: 'Bebas Neue', cursive;
          font-size: ${config.width * 0.065}px;
          color: #FFD700;
          text-shadow: 
            3px 3px 0px #000,
            -1px -1px 0px #000,
            1px -1px 0px #000,
            -1px 1px 0px #000,
            1px 1px 0px #000,
            0 0 20px rgba(255, 215, 0, 0.5);
          letter-spacing: 2px;
          margin-bottom: ${config.width * 0.02}px;
          animation: pulse 2s infinite;
        }
        
        .title-secondary {
          font-family: 'Bebas Neue', cursive;
          font-size: ${config.width * 0.055}px;
          color: #FFD700;
          text-shadow: 
            3px 3px 0px #000,
            -1px -1px 0px #000,
            1px -1px 0px #000,
            -1px 1px 0px #000,
            1px 1px 0px #000,
            0 0 20px rgba(255, 215, 0, 0.5);
          letter-spacing: 2px;
          margin-bottom: ${config.width * 0.03}px;
        }
        
        .subtitle {
          font-size: ${config.width * 0.025}px;
          color: white;
          font-weight: 500;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        
        .qr-container {
          background: white;
          padding: ${config.width * 0.04}px;
          border-radius: ${config.width * 0.04}px;
          box-shadow: 
            0 10px 40px rgba(0,0,0,0.3),
            0 0 60px rgba(255, 215, 0, 0.3);
          z-index: 10;
          position: relative;
        }
        
        .qr-container::before {
          content: '';
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          background: linear-gradient(45deg, #FFD700, #FFA500, #FFD700);
          border-radius: ${config.width * 0.04}px;
          z-index: -1;
          animation: rotate 3s linear infinite;
        }
        
        .qr-code {
          width: ${config.width * 0.4}px;
          height: ${config.width * 0.4}px;
          display: block;
        }
        
        .url {
          margin-top: ${config.width * 0.02}px;
          font-size: ${config.width * 0.018}px;
          color: white;
          text-align: center;
          font-weight: 500;
        }
        
        .footer {
          text-align: center;
          z-index: 10;
        }
        
        .emoji {
          font-size: ${config.width * 0.08}px;
          margin-bottom: ${config.width * 0.02}px;
          animation: bounce 1s infinite;
        }
        
        .scan-text {
          font-family: 'Bebas Neue', cursive;
          font-size: ${config.width * 0.035}px;
          color: white;
          text-shadow: 
            2px 2px 0px #FFD700,
            -1px -1px 0px #FFD700,
            1px -1px 0px #FFD700,
            -1px 1px 0px #FFD700;
          letter-spacing: 1px;
          margin-bottom: ${config.width * 0.01}px;
        }
        
        .scan-text-en {
          font-size: ${config.width * 0.025}px;
          color: #FFD700;
          font-weight: bold;
          text-shadow: 1px 1px 0px #000;
          margin-bottom: ${config.width * 0.03}px;
        }
        
        .prize-text {
          font-family: 'Bebas Neue', cursive;
          font-size: ${config.width * 0.045}px;
          color: #FFD700;
          text-shadow: 
            3px 3px 0px #000,
            -1px -1px 0px #000,
            1px -1px 0px #000,
            -1px 1px 0px #000,
            1px 1px 0px #000,
            0 0 30px rgba(255, 215, 0, 0.8);
          letter-spacing: 2px;
          animation: glow 1.5s ease-in-out infinite alternate;
        }
        
        .prize-text-en {
          font-size: ${config.width * 0.028}px;
          color: white;
          font-weight: bold;
          margin-top: ${config.width * 0.01}px;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
          from { text-shadow: 
            3px 3px 0px #000,
            -1px -1px 0px #000,
            1px -1px 0px #000,
            -1px 1px 0px #000,
            1px 1px 0px #000,
            0 0 30px rgba(255, 215, 0, 0.8);
          }
          to { text-shadow: 
            3px 3px 0px #000,
            -1px -1px 0px #000,
            1px -1px 0px #000,
            -1px 1px 0px #000,
            1px 1px 0px #000,
            0 0 50px rgba(255, 215, 0, 1),
            0 0 70px rgba(255, 215, 0, 0.8);
          }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Sparkles effect */
        .sparkle {
          position: absolute;
          color: #FFD700;
          animation: sparkle 3s linear infinite;
        }
        
        .sparkle-1 { top: 20%; left: 10%; animation-delay: 0s; }
        .sparkle-2 { top: 30%; right: 15%; animation-delay: 1s; }
        .sparkle-3 { bottom: 25%; left: 20%; animation-delay: 2s; }
        .sparkle-4 { bottom: 35%; right: 10%; animation-delay: 1.5s; }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      </style>
    </head>
    <body>
      <!-- Decorative elements -->
      <div class="decoration decoration-1"></div>
      <div class="decoration decoration-2"></div>
      
      <!-- Sparkles -->
      <div class="sparkle sparkle-1">✨</div>
      <div class="sparkle sparkle-2">⭐</div>
      <div class="sparkle sparkle-3">✨</div>
      <div class="sparkle sparkle-4">⭐</div>
      
      <!-- Header -->
      <div class="header">
        <div class="title-main">${texts.participate}</div>
        <div class="title-secondary">${texts.opinion}</div>
        ${config.language === 'es' ? `<div class="subtitle">${texts.subtitle}</div>` : ''}
      </div>
      
      <!-- QR Code -->
      <div class="qr-container">
        <img src="${qrDataURL}" class="qr-code" alt="QR Code">
      </div>
      
      <!-- URL -->
      <div class="url">${config.url.replace('https://', '')}</div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="emoji">😊</div>
        <div class="scan-text">${texts.scan}</div>
        ${config.language === 'es' ? `<div class="scan-text-en">${texts.scanEn}</div>` : ''}
        <div class="prize-text">${texts.guaranteed}</div>
        ${config.language === 'es' ? `<div class="prize-text-en">${texts.prizeEn}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera el HTML para el diseño "Professional"
 */
async function generateProfessionalHTML(config: QRDesignConfig): Promise<string> {
  const texts = QR_TEXTS[config.language];
  
  const qrDataURL = await QRCode.toDataURL(config.url, {
    width: Math.round(config.width * 0.4),
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          width: ${config.width}px;
          height: ${config.height}px;
          font-family: 'Inter', sans-serif;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .header {
          width: 100%;
          background: #2563EB;
          padding: ${config.width * 0.08}px ${config.width * 0.05}px;
          text-align: center;
        }
        
        .header-text {
          color: white;
          font-size: ${config.width * 0.04}px;
          font-weight: 700;
        }
        
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: ${config.width * 0.05}px;
        }
        
        .qr-container {
          background: white;
          padding: ${config.width * 0.04}px;
          border-radius: ${config.width * 0.02}px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .qr-code {
          width: ${config.width * 0.4}px;
          height: ${config.width * 0.4}px;
          display: block;
        }
        
        .instruction {
          margin-top: ${config.width * 0.04}px;
          font-size: ${config.width * 0.025}px;
          color: #1F2937;
          text-align: center;
        }
        
        .footer {
          padding: ${config.width * 0.05}px;
          text-align: center;
        }
        
        .business-name {
          font-size: ${config.width * 0.03}px;
          font-weight: 600;
          color: #2563EB;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-text">${texts.participate} ${texts.opinion}</div>
      </div>
      
      <div class="main">
        <div class="qr-container">
          <img src="${qrDataURL}" class="qr-code" alt="QR Code">
        </div>
        <div class="instruction">${texts.scan}</div>
      </div>
      
      <div class="footer">
        <div class="business-name">${config.businessName}</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * POST /api/qr-designer
 * Genera un QR diseñado usando Puppeteer
 */
export async function POST(request: NextRequest) {
  let browser;
  
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
    
    // Generar HTML según plantilla
    let html: string;
    
    switch (template) {
      case 'irresistible':
        html = await generateIrresistibleHTML(config);
        break;
      case 'professional':
        html = await generateProfessionalHTML(config);
        break;
      default:
        html = await generateIrresistibleHTML(config);
    }
    
    // Lanzar Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
    });
    
    const page = await browser.newPage();
    
    // Configurar viewport exacto
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: 1
    });
    
    // Cargar HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });
    
    // Esperar un momento para que las animaciones CSS se carguen
    await page.waitForTimeout(1000);
    
    // Capturar screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: config.width,
        height: config.height
      }
    });
    
    await browser.close();
    
    // Convertir Buffer a Uint8Array para NextResponse
    const imageBuffer = new Uint8Array(screenshot);
    
    // Retornar imagen
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="QR-${businessName}-${template}.png"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('Error generating QR design:', error);
    if (browser) {
      await browser.close();
    }
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
      description: 'Diseño llamativo con premio garantizado - Animaciones y efectos visuales',
      features: ['Gradiente vibrante', 'Animaciones CSS', 'Efectos de brillo', 'Emojis animados']
    },
    professional: {
      name: 'Profesional',
      description: 'Diseño elegante y corporativo',
      features: ['Diseño limpio', 'Colores corporativos', 'Minimalista']
    },
    modern: {
      name: 'Moderno',
      description: 'Diseño minimalista y contemporáneo',
      features: ['Diseño flat', 'Colores suaves', 'Tipografía moderna']
    },
    elegant: {
      name: 'Elegante',
      description: 'Diseño sofisticado con toques dorados',
      features: ['Detalles dorados', 'Tipografía elegante', 'Diseño premium']
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
    formats: ['png'],
    maxDpi: 600,
    technology: 'Puppeteer (Chrome Headless)',
    features: [
      'Renderizado HTML/CSS real',
      'Fuentes Google Fonts',
      'Animaciones CSS',
      'Gradientes complejos',
      'Efectos visuales avanzados',
      'Alta calidad de imagen'
    ]
  });
}
