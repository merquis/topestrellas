'use client';

import { useState, useEffect } from 'react';
import { QRGenerator, QRResult, QRType } from '@/lib/qr-generator';

interface QRCodeGeneratorProps {
  data: string;
  type?: QRType;
  className?: string;
  showDownloadButton?: boolean;
  downloadButtonText?: string;
  onGenerated?: (qrResult: QRResult) => void;
  onError?: (error: string) => void;
}

export default function QRCodeGenerator({
  data,
  type = 'display',
  className = '',
  showDownloadButton = true,
  downloadButtonText = '📥 Descargar QR',
  onGenerated,
  onError
}: QRCodeGeneratorProps) {
  const [qrResult, setQrResult] = useState<QRResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateQR();
  }, [data, type]);

  const generateQR = async () => {
    if (!data) {
      setError('No data provided for QR generation');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await QRGenerator.generate(data, type);
      setQrResult(result);
      onGenerated?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (qrResult) {
      QRGenerator.downloadQR(qrResult);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg ${className}`}>
        <div className="text-red-600 text-sm mb-2">❌ Error</div>
        <div className="text-red-500 text-xs text-center">{error}</div>
        <button
          onClick={generateQR}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!qrResult) {
    return null;
  }

  const printInfo = QRGenerator.getPrintInfo(type);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* QR Code Image */}
      <div className="relative group">
        <img
          src={qrResult.dataURL}
          alt={`QR Code for ${data}`}
          className="rounded-lg shadow-sm border border-gray-200"
          style={{
            width: type === 'display' ? '120px' : type === 'web' ? '150px' : '120px',
            height: type === 'display' ? '120px' : type === 'web' ? '150px' : '120px'
          }}
        />
        
        {/* Hover tooltip with info */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {printInfo.dimensions} • {printInfo.size}
        </div>
      </div>

      {/* Download Button */}
      {showDownloadButton && (
        <button
          onClick={handleDownload}
          className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          title={`Descargar QR de ${printInfo.dimensions} para impresión`}
        >
          {downloadButtonText}
        </button>
      )}

      {/* Info text */}
      <div className="mt-1 text-xs text-gray-500 text-center">
        {type === 'print' && '📄 Calidad impresión 15×15cm'}
        {type === 'web' && '🌐 Calidad web'}
        {type === 'display' && '📱 Vista previa'}
      </div>
    </div>
  );
}

/**
 * Componente específico para QR de negocios
 */
interface BusinessQRProps {
  subdomain: string;
  businessName?: string;
  type?: QRType;
  className?: string;
  showDownloadButton?: boolean;
}

export function BusinessQR({
  subdomain,
  businessName,
  type = 'display',
  className = '',
  showDownloadButton = true
}: BusinessQRProps) {
  const url = `https://${subdomain}.tuvaloracion.com`;
  
  return (
    <QRCodeGenerator
      data={url}
      type={type}
      className={className}
      showDownloadButton={showDownloadButton}
      downloadButtonText={`📥 Descargar QR${businessName ? ` - ${businessName}` : ''}`}
    />
  );
}

/**
 * Componente con múltiples opciones de descarga
 */
interface MultiQRDownloadProps {
  data: string;
  filename?: string;
  className?: string;
}

export function MultiQRDownload({
  data,
  filename,
  className = ''
}: MultiQRDownloadProps) {
  const [generating, setGenerating] = useState(false);

  const downloadQR = async (type: QRType) => {
    setGenerating(true);
    try {
      const result = await QRGenerator.generate(data, type);
      QRGenerator.downloadQR(result);
    } catch (error) {
      console.error('Error downloading QR:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">Descargar QR:</div>
      
      <div className="flex flex-col gap-1">
        <button
          onClick={() => downloadQR('display')}
          disabled={generating}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 text-left"
        >
          📱 Vista previa (120×120px)
        </button>
        
        <button
          onClick={() => downloadQR('web')}
          disabled={generating}
          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 text-left"
        >
          🌐 Web (300×300px)
        </button>
        
        <button
          onClick={() => downloadQR('print')}
          disabled={generating}
          className="px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 text-left"
        >
          📄 Impresión 15×15cm (1800×1800px)
        </button>
      </div>
      
      {generating && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
          Generando...
        </div>
      )}
    </div>
  );
}
