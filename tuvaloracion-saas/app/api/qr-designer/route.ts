import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';

/**
 * Configuración para diseños QR DIN A7
 */
interface QRDesignConfig {
  businessName: string;
  url: string;
  template?: string;
  dpi?: number;
}

/**
 * Obtiene las dimensiones reales en píxeles según DPI para DIN A7
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
 * POST /api/qr-designer
 * Genera un QR diseñado usando una plantilla y Sharp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      businessName,
      url,
      template = 'restaurantes-01',
      dpi = 300
    } = body as QRDesignConfig;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Ruta de la plantilla
    const templatePath = path.join(process.cwd(), 'public', 'qr-templates', `${template}.png`);
    
    // Verificar que la plantilla existe
    try {
      await fs.access(templatePath);
    } catch {
      return NextResponse.json(
        { error: `Template ${template} not found` },
        { status: 404 }
      );
    }
    
    // Generar el código QR al máximo tamaño para el área blanca
    const qrSize = 500; // Tamaño máximo para llenar completamente el área blanca
    const qrBuffer = await QRCode.toBuffer(url, {
      width: qrSize,
      margin: 0, // Sin margen para aprovechar todo el espacio
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
    
    // Cargar la plantilla
    const templateBuffer = await fs.readFile(templatePath);
    
    // Obtener información de la plantilla
    const templateMetadata = await sharp(templateBuffer).metadata();
    const templateWidth = templateMetadata.width || 874;
    const templateHeight = templateMetadata.height || 1240;
    
    // Calcular la posición central para el QR
    // Bajado ligeramente para centrar perfectamente en el área blanca
    const qrX = Math.round((templateWidth - qrSize) / 2);
    const qrY = Math.round((templateHeight - qrSize) / 2) - 75; // Bajado un poco desde -90 a -75
    
    // Componer la imagen: plantilla + QR
    const compositeImage = await sharp(templateBuffer)
      .composite([
        {
          input: qrBuffer,
          top: qrY,
          left: qrX
        }
      ])
      .png({
        quality: 100,
        compressionLevel: 0 // Sin compresión para máxima calidad
      })
      .toBuffer();
    
    // Si se solicita un DPI diferente, redimensionar
    let finalImage = compositeImage;
    if (dpi !== 300) {
      const dimensions = getDimensions(dpi);
      finalImage = await sharp(compositeImage)
        .resize(dimensions.width, dimensions.height, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3
        })
        .png({
          quality: 100,
          compressionLevel: 0
        })
        .toBuffer();
    }
    
    // Convertir a Uint8Array para NextResponse
    const imageArray = new Uint8Array(finalImage);
    
    // Retornar imagen
    return new NextResponse(imageArray, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="QR-${businessName || 'design'}-A7.png"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('Error generating QR design:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR design', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/qr-designer
 * Obtiene información sobre plantillas disponibles
 */
export async function GET() {
  try {
    // Listar plantillas disponibles
    const templatesDir = path.join(process.cwd(), 'public', 'qr-templates');
    let availableTemplates: string[] = [];
    
    try {
      const files = await fs.readdir(templatesDir);
      availableTemplates = files
        .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
        .map(file => file.replace(/\.(png|jpg|jpeg)$/i, ''));
    } catch {
      // Si no existe la carpeta o está vacía
      availableTemplates = [];
    }
    
    const dimensions300 = getDimensions(300);
    const dimensions600 = getDimensions(600);
    
    return NextResponse.json({
      templates: {
        available: availableTemplates,
        default: 'restaurantes-01',
        info: {
          'restaurantes-01': {
            name: 'Restaurantes Irresistible',
            description: 'Diseño con gradiente púrpura, texto dorado y premio garantizado',
            qrArea: {
              width: 350,
              height: 350,
              position: 'center'
            }
          }
        }
      },
      dimensions: {
        dinA7: {
          mm: { width: 74, height: 105 },
          px300dpi: dimensions300,
          px600dpi: dimensions600
        }
      },
      supportedFormats: ['png'],
      dpiOptions: [300, 600],
      technology: 'Sharp image composition',
      features: [
        'Plantilla profesional pre-diseñada',
        'QR dinámico generado automáticamente',
        'Composición de alta calidad',
        'Tamaño DIN A7 para impresión',
        'Sin necesidad de renderizado HTML',
        'Proceso rápido y eficiente'
      ]
    });
  } catch (error) {
    console.error('Error getting QR designer info:', error);
    return NextResponse.json(
      { error: 'Failed to get QR designer info' },
      { status: 500 }
    );
  }
}
