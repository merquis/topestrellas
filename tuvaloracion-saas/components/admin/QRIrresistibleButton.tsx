'use client';

import React, { useState } from 'react';
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

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const businessToUse = businesses.find(b => b._id === activity.businessId) || selectedBusiness;

      if (!businessToUse) {
        setError('No se ha seleccionado ningún negocio.');
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
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

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
        
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        console.log('✅ Download initiated successfully');

        // Marcar que el QR ha sido solicitado/descargado
        try {
          await fetch('/api/admin/mark-qr-prompted', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId: businessToUse._id })
          });
          console.log('✅ QR download marked in database');
        } catch (markError) {
          console.warn('⚠️ Failed to mark QR as downloaded:', markError);
        }

        // Refrescar actividades
        onDownloadComplete();

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
      }
    } catch (err) {
      console.error('❌ Error downloading QR:', err);
      setError(`Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="relative z-[9999] inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-400 to-yellow-500 text-white text-lg font-bold rounded-2xl hover:from-orange-500 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-yellow-500/50 border-2 border-orange-300"
        style={{ pointerEvents: 'auto' }}
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
  );
}
