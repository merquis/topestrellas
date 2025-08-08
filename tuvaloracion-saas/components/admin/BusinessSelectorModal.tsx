'use client';

import { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface BusinessSelectorModalProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onBusinessSelect: (business: Business) => void;
  selectedBusiness: Business | null;
}

export default function BusinessSelectorModal({ 
  user, 
  isOpen, 
  onClose, 
  onBusinessSelect, 
  selectedBusiness 
}: BusinessSelectorModalProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user.role === 'admin') {
      loadBusinesses();
    }
  }, [isOpen, user.email, user.role]);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role
      });

      const response = await fetch(`/api/admin/businesses?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Businesses loaded in modal:', data);
        
        if (Array.isArray(data)) {
          setBusinesses(data);
        } else {
          setError('Respuesta inválida del servidor');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        setError(`Error ${response.status}: ${errorText}`);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    onBusinessSelect(business);
    
    // Guardar en localStorage para persistencia
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBusiness', JSON.stringify(business));
      window.dispatchEvent(new CustomEvent('businessChanged'));
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Seleccionar Negocio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Cargando negocios...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">❌</span>
              <p className="text-red-600 font-medium">Error al cargar negocios</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              <button
                onClick={loadBusinesses}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">⚠️</span>
              <p className="text-yellow-600 font-medium">Sin negocios asignados</p>
              <p className="text-sm text-yellow-500 mt-1">No tienes negocios disponibles</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {businesses.map((business) => (
                <button
                  key={business._id}
                  onClick={() => handleBusinessSelect(business)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover:bg-gray-50 cursor-pointer ${
                    selectedBusiness?._id === business._id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <span className="text-2xl">🏪</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{business.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${
                        business.active ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className="text-xs text-gray-500">
                        {business.active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {business.subdomain}.tuvaloracion.com
                      </span>
                    </div>
                  </div>
                  {selectedBusiness?._id === business._id && (
                    <span className="text-blue-500 text-xl">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
