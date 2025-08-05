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
}

export default function SimpleBusinessSelector({ user }: SimpleBusinessSelectorProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, [user]);

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

      const response = await fetch(url);
      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Data received:', data);

        if (Array.isArray(data)) {
          setBusinesses(data);
          if (data.length > 0) {
            setSelectedBusiness(data[0]);
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
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
      <span className="text-2xl">🏪</span>
      <div>
        <p className="font-medium text-gray-900">
          {selectedBusiness?.name || 'Múltiples negocios'}
        </p>
        <span className="text-xs text-gray-500">
          {businesses.length} negocios disponibles
        </span>
      </div>
    </div>
  );
}
