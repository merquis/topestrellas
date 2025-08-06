'use client';

import { useState, useEffect } from 'react';
import { QRType } from '@/lib/qr-generator';

interface QRDesignerProps {
  subdomain: string;
  businessName: string;
  className?: string;
}

interface QRTemplate {
  id: string;
  name: string;
  description: string;
  preview?: string;
}

const QR_TEMPLATES: QRTemplate[] = [
  {
    id: 'irresistible',
    name: 'Irresistible',
    description: 'Diseño llamativo con premio garantizado - ¡Perfecto para atraer clientes!'
  },
  {
    id: 'professional',
    name: 'Profesional',
    description: 'Diseño elegante y corporativo'
  },
  {
    id: 'modern',
    name: 'Moderno',
    description: 'Diseño minimalista y contemporáneo'
  },
  {
    id: 'elegant',
    name: 'Elegante',
    description: 'Diseño sofisticado con toques dorados'
  }
];

export default function QRDesigner({ subdomain, businessName, className = '' }: QRDesignerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('irresistible');
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>('es');
  const [selectedDPI, setSelectedDPI] = useState<number>(300);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = `https://${subdomain}.tuvaloracion.com`;

  // Generar preview automáticamente cuando cambien los parámetros
  useEffect(() => {
    generatePreview();
  }, [selectedTemplate, selectedLanguage, businessName, subdomain]);

  const generatePreview = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/qr-designer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName,
          url,
          template: selectedTemplate,
          language: selectedLanguage,
          dpi: 150 // DPI más bajo para preview
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const previewUrl = URL.createObjectURL(blob);
        setPreviewUrl(previewUrl);
      } else {
        throw new Error('Error generating preview');
      }
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Error al generar vista previa');
    }
  };

  const downloadQR = async (dpi: number) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/qr-designer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName,
          url,
          template: selectedTemplate,
          language: selectedLanguage,
          dpi
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `QR-${businessName}-${selectedTemplate}-${dpi}dpi.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL
        URL.revokeObjectURL(downloadUrl);
      } else {
        throw new Error('Error downloading QR');
      }
    } catch (err) {
      console.error('Error downloading QR:', err);
      setError('Error al descargar el QR');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">🎨 Diseñador de QR Profesional</h3>
        <p className="text-gray-600 text-sm">
          Crea QR codes irresistibles en formato DIN A7 vertical (74×105mm) perfectos para impresión
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Configuración */}
        <div className="space-y-6">
          {/* Selección de Plantilla */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Plantilla de Diseño
            </label>
            <div className="space-y-2">
              {QR_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={() => setSelectedTemplate(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      {template.id === 'irresistible' && (
                        <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          ⭐ Recomendado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selección de Idioma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLanguage('es')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLanguage === 'es'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇪🇸 Español
              </button>
              <button
                onClick={() => setSelectedLanguage('en')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLanguage === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          {/* Información del Negocio */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Información del QR</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Negocio:</span>
                <span className="ml-2 font-medium">{businessName}</span>
              </div>
              <div>
                <span className="text-gray-600">URL:</span>
                <span className="ml-2 font-mono text-blue-600">{url}</span>
              </div>
              <div>
                <span className="text-gray-600">Formato:</span>
                <span className="ml-2">DIN A7 vertical (74×105mm)</span>
              </div>
            </div>
          </div>

          {/* Botones de Descarga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Descargar QR
            </label>
            <div className="space-y-2">
              <button
                onClick={() => downloadQR(300)}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isGenerating ? '⏳ Generando...' : '📥 Descargar Calidad Estándar (300 DPI)'}
              </button>
              <button
                onClick={() => downloadQR(600)}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isGenerating ? '⏳ Generando...' : '🔥 Descargar Alta Calidad (600 DPI)'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 300 DPI: Perfecto para impresión normal | 600 DPI: Máxima calidad profesional
            </p>
          </div>
        </div>

        {/* Panel de Vista Previa */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vista Previa
            </label>
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
              {previewUrl ? (
                <div className="text-center">
                  <img
                    src={previewUrl}
                    alt={`Preview QR - ${businessName}`}
                    className="max-w-full max-h-[350px] rounded-lg shadow-md mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Vista previa - La calidad final será superior
                  </p>
                </div>
              ) : error ? (
                <div className="text-center text-red-600">
                  <div className="text-4xl mb-2">❌</div>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={generatePreview}
                    className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Generando vista previa...</p>
                </div>
              )}
            </div>
          </div>

          {/* Información Técnica */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">📐 Especificaciones Técnicas</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <div>• Formato: DIN A7 vertical (74×105mm)</div>
              <div>• Resolución 300 DPI: 874×1240 píxeles</div>
              <div>• Resolución 600 DPI: 1748×2480 píxeles</div>
              <div>• Formato de salida: PNG de alta calidad</div>
              <div>• QR con corrección de errores nivel H</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Componente simplificado para usar en tarjetas de negocio
 */
interface QuickQRDesignerProps {
  subdomain: string;
  businessName: string;
  className?: string;
}

export function QuickQRDesigner({ subdomain, businessName, className = '' }: QuickQRDesignerProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadIrresistibleQR = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/qr-designer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName,
          url: `https://${subdomain}.tuvaloracion.com`,
          template: 'irresistible',
          language: 'es',
          dpi: 300
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `QR-${businessName}-irresistible.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Error downloading QR:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={downloadIrresistibleQR}
      disabled={isGenerating}
      className={`px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium ${className}`}
    >
      {isGenerating ? '⏳' : '🎨'} {isGenerating ? 'Generando...' : 'QR Irresistible'}
    </button>
  );
}
