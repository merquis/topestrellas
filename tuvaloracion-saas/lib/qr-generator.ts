import QRCode from 'qrcode';

/**
 * Configuración para diferentes tipos de QR
 */
export interface QRConfig {
  width: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Presets de configuración para diferentes usos
 */
export const QR_PRESETS = {
  // Para mostrar en pantalla (120x120px)
  display: {
    width: 120,
    margin: 0,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M' as const
  },
  
  // Para impresión de alta calidad (15x15cm a 300 DPI = 1800px)
  print: {
    width: 1800,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H' as const
  },
  
  // Para uso web responsive (300x300px)
  web: {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M' as const
  },
  
  // Para alta calidad en pantalla (600x600px)
  hd: {
    width: 600,
    margin: 0,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H' as const
  }
} as const;

/**
 * Tipos de QR que podemos generar
 */
export type QRType = 'display' | 'print' | 'web' | 'hd';

/**
 * Información del QR generado
 */
export interface QRResult {
  dataURL: string;
  size: number;
  type: QRType;
  filename: string;
}

/**
 * Clase principal para generar códigos QR
 */
export class QRGenerator {
  /**
   * Genera un código QR con la configuración especificada
   */
  static async generate(
    data: string, 
    type: QRType = 'display',
    customConfig?: Partial<QRConfig>
  ): Promise<QRResult> {
    const config = { ...QR_PRESETS[type], ...customConfig };
    
    try {
      const dataURL = await QRCode.toDataURL(data, config);
      
      return {
        dataURL,
        size: config.width,
        type,
        filename: this.generateFilename(data, type)
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Genera un QR específico para URLs de negocios
   */
  static async generateBusinessQR(
    subdomain: string,
    type: QRType = 'display'
  ): Promise<QRResult> {
    const url = `https://${subdomain}.tuvaloracion.com`;
    return this.generate(url, type);
  }

  /**
   * Genera múltiples QRs para diferentes usos
   */
  static async generateMultiple(
    data: string,
    types: QRType[] = ['display', 'print', 'web']
  ): Promise<Record<QRType, QRResult>> {
    const results = {} as Record<QRType, QRResult>;
    
    for (const type of types) {
      results[type] = await this.generate(data, type);
    }
    
    return results;
  }

  /**
   * Descarga un QR como archivo
   */
  static downloadQR(qrResult: QRResult): void {
    const link = document.createElement('a');
    link.download = qrResult.filename;
    link.href = qrResult.dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Genera nombre de archivo basado en los datos y tipo
   */
  private static generateFilename(data: string, type: QRType): string {
    // Extraer subdomain si es una URL
    let name = 'qr-code';
    
    if (data.includes('.tuvaloracion.com')) {
      const match = data.match(/https?:\/\/([^.]+)\.tuvaloracion\.com/);
      if (match) {
        name = `QR-${match[1]}`;
      }
    }
    
    const suffix = type === 'print' ? '-15x15cm' : type === 'web' ? '-web' : '';
    return `${name}${suffix}.png`;
  }

  /**
   * Valida si una URL es válida para generar QR
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información sobre el tamaño de impresión
   */
  static getPrintInfo(type: QRType): { size: string; dpi: number; dimensions: string } {
    switch (type) {
      case 'print':
        return {
          size: '1800x1800px',
          dpi: 300,
          dimensions: '15x15 cm'
        };
      case 'hd':
        return {
          size: '600x600px',
          dpi: 72,
          dimensions: '21x21 cm'
        };
      case 'web':
        return {
          size: '300x300px',
          dpi: 72,
          dimensions: '10.5x10.5 cm'
        };
      case 'display':
      default:
        return {
          size: '120x120px',
          dpi: 72,
          dimensions: '4.2x4.2 cm'
        };
    }
  }
}

/**
 * Hook personalizado para usar el generador de QR (para uso futuro)
 */
export const useQRGenerator = () => {
  return {
    generate: QRGenerator.generate,
    generateBusinessQR: QRGenerator.generateBusinessQR,
    generateMultiple: QRGenerator.generateMultiple,
    downloadQR: QRGenerator.downloadQR,
    isValidURL: QRGenerator.isValidURL,
    getPrintInfo: QRGenerator.getPrintInfo,
    presets: QR_PRESETS
  };
};
