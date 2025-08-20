'use client';

import React, { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface QRIrresistibleButtonProps {
  activity: any;
  user: AuthUser;
  selectedBusiness: Business | null;
  businesses: Business[];
  onDownloadComplete: () => void;
}

export default function QRIrresistibleButton({
  activity,
  user,
  selectedBusiness,
  businesses,
  onDownloadComplete,
}: QRIrresistibleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setShowOverlay(true);
    setProgress(0);
    setProgressText('Generando código QR...');

    // Simular progreso con animación suave
    const progressSteps = [
      { time: 0, value: 0, text: 'Generando código QR...' },
      { time: 500, value: 25, text: 'Generando código QR...' },
      { time: 1000, value: 40, text: 'Aplicando diseño irresistible...' },
      { time: 1500, value: 55, text: 'Aplicando diseño irresistible...' },
      { time: 2000, value: 70, text: 'Optimizando para impresión...' },
      { time: 2500, value: 85, text: 'Optimizando para impresión...' },
      { time: 3000, value: 95, text: 'Preparando descarga...' },
      { time: 3500, value: 100, text: '¡Listo!' }
    ];

    progressSteps.forEach(step => {
      setTimeout(() => {
        if (showOverlay || step.time === 0) {
          setProgress(step.value);
          setProgressText(step.text);
        }
      }, step.time);
    });

    try {
      const businessToUse = businesses.find(b => b._id === activity.businessId) || selectedBusiness;

      if (!businessToUse) {
        setError('No se ha seleccionado ningún negocio.');
        setShowOverlay(false);
        return;
      }

      const businessUrl = `${window.location.protocol}//${businessToUse.subdomain}.${window.location.host.replace('admin.', '')}`;
      
      console.log('🎨 Generating QR for business:', {
        businessName: businessToUse.name,
        businessUrl,
        businessId: businessToUse._id
      });

      const requestBody = {
        businessName: businessToUse.name,
        url: businessUrl,
        template: 'restaurantes-01',
      };

      console.log('📤 Sending request to /api/qr-designer:', requestBody);

      const response = await fetch('/api/qr-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        console.log('✅ QR generation successful, creating download...');
        
        const blob = await response.blob();
        console.log('📦 Blob size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          throw new Error('El archivo generado está vacío');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-${businessToUse.name.replace(/[^a-zA-Z0-9]/g, '-')}-Irresistible.png`;
        document.body.appendChild(a);
        
        console.log('🔗 Download link created:', a.download);
        
        // Iniciar descarga
        a.click();
        
        // Limpiar
        a.remove();
        window.URL.revokeObjectURL(url);

        console.log('✅ Download initiated successfully');

        // Esperar 4 segundos con el overlay antes de marcar como descargado
        setTimeout(async () => {
          setShowOverlay(false);
          
          // Marcar que el QR ha sido descargado
          try {
            await fetch('/api/admin/mark-qr-prompted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: user.email })
            });
            console.log('✅ QR download marked in database');
          } catch (markError) {
            console.warn('⚠️ Failed to mark QR as downloaded:', markError);
          }

          // Refrescar actividades para mostrar el popup de instrucciones
          setTimeout(() => {
            onDownloadComplete();
          }, 100);
        }, 4000);

      } else {
        console.error('❌ QR generation failed with status:', response.status);
        
        let errorMessage = 'Error al generar el QR';
        try {
          const errorData = await response.json();
          console.error('❌ Error details:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          const errorText = await response.text();
          console.error('❌ Raw error response:', errorText);
          errorMessage = `Error ${response.status}: ${errorText}`;
        }
        
        setError(errorMessage);
        setShowOverlay(false);
      }
    } catch (err) {
      console.error('❌ Error downloading QR:', err);
      setError(`Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setShowOverlay(false);
    } finally {
      // Quitar el loading después de un breve delay
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <>
      {/* Overlay con barra de progreso */}
      {showOverlay && (
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 transform scale-100 opacity-100 transition-all duration-300">
            {/* Icono QR animado */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-5xl filter drop-shadow-md">📱</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce shadow-md">
                  <span className="text-sm">✨</span>
                </div>
              </div>
            </div>
            
            {/* Texto con estados */}
            <h3 className="text-xl font-bold text-gray-800 text-center mb-3">
              {progressText}
            </h3>
            
            {/* Barra de progreso */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Efecto shimmer */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite linear',
                    transform: 'translateX(-100%)'
                  }}
                />
              </div>
            </div>
            
            {/* Porcentaje */}
            <p className="text-center text-base font-semibold text-gray-700">
              {progress}% completado
            </p>
            
            {/* Mensaje motivacional */}
            <p className="text-center text-sm text-gray-500 mt-3 animate-pulse">
              Tu QR Irresistible está casi listo... 🎨
            </p>
          </div>
        </div>
      )}

      {/* Botón de descarga */}
      <div className="mt-4">
        <button
          onClick={handleDownload}
          disabled={loading || showOverlay}
          className="relative z-[9999] inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-400 to-yellow-500 text-white text-lg font-bold rounded-2xl hover:from-orange-500 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-yellow-500/50 border-2 border-orange-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ pointerEvents: loading || showOverlay ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generando...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">🎨</span>
              <span>Descargar QR Irresistible</span>
              <span className="text-xl">↓</span>
            </>
          )}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    </>
  );
}
