'use client';

import { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface SimpleBusinessSelectorProps {
  user: AuthUser;
  onBusinessChange?: (business: Business | null) => void;
}

export default function SimpleBusinessSelector({ user, onBusinessChange }: SimpleBusinessSelectorProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadBusinesses = async () => {
      if (user.role !== 'admin') return;

      console.log('🔍 SimpleBusinessSelector loading businesses for:', user.email);
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          userEmail: user.email,
          userRole: user.role
        });

        const url = `/api/admin/businesses?${params}`;
        console.log('📡 Fetching:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Response status:', response.status);

        if (!isMounted) return; // Evitar actualizar estado si el componente se desmontó

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Data received:', data);

          if (Array.isArray(data)) {
            setBusinesses(data);
            if (data.length > 0) {
              setSelectedBusiness(data[0]);
              // Solo acceder a localStorage en el cliente
              if (typeof window !== 'undefined') {
                // Guardar en localStorage para comunicación con dashboard
                localStorage.setItem('selectedBusiness', JSON.stringify(data[0]));
                // Disparar evento personalizado para notificar cambios en la misma pestaña
                window.dispatchEvent(new CustomEvent('businessChanged'));
              }
              // Notificar al componente padre sobre el negocio seleccionado
              onBusinessChange?.(data[0]);
            }
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
        if (isMounted) {
          setError('Error de conexión');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBusinesses();

    return () => {
      isMounted = false;
    };
  }, [user.email, user.role]); // Solo depender de email y role, no del objeto user completo

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
        <span className="text-2xl">🏪</span>
        <div>
          <p className="font-medium text-gray-900">Cargando negocios...</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs text-gray-500">Conectando con servidor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-medium text-red-900">Error</p>
          <span className="text-xs text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-medium text-yellow-900">Sin negocios</p>
          <span className="text-xs text-yellow-700">No hay negocios asignados</span>
        </div>
      </div>
    );
  }

  if (businesses.length === 1) {
    const business = selectedBusiness || businesses[0];
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
        <span className="text-2xl">🏪</span>
        <div>
          <p className="font-medium text-gray-900">{business.name}</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              business.active ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className="text-xs text-gray-500">
              {business.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors min-w-[200px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏪</span>
          <div className="text-left">
            <p className="font-medium text-gray-900">
              {selectedBusiness?.name || 'Seleccionar negocio'}
            </p>
            {selectedBusiness && (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  selectedBusiness.active ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="text-xs text-gray-500">
                  {selectedBusiness.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            )}
          </div>
        </div>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar el dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {businesses.map((business) => (
              <button
                key={business._id}
                onClick={() => {
                  setSelectedBusiness(business);
                  setIsOpen(false);
                  // Solo acceder a localStorage en el cliente
                  if (typeof window !== 'undefined') {
                    // Guardar en localStorage para comunicación con dashboard
                    localStorage.setItem('selectedBusiness', JSON.stringify(business));
                    // Disparar evento personalizado para notificar cambios en la misma pestaña
                    window.dispatchEvent(new CustomEvent('businessChanged'));
                  }
                  // Notificar al componente padre sobre el cambio
                  onBusinessChange?.(business);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedBusiness?._id === business._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <span className="text-xl">🏪</span>
                <div className="flex-1">
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
                  <span className="text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
