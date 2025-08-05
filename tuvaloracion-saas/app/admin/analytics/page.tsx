'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import BusinessStatsPanel from '@/components/admin/BusinessStatsPanel';
import { checkAuth, AuthUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/');
      return;
    }
    setUser(authUser);
    
    // Cargar negocios si es admin normal
    if (authUser.role === 'admin') {
      loadBusinesses(authUser);
    }
    
    setLoading(false);
  }, [router]);

  // Escuchar cambios en localStorage para el negocio seleccionado
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      try {
        const storedBusiness = localStorage.getItem('selectedBusiness');
        if (storedBusiness) {
          const business = JSON.parse(storedBusiness);
          setSelectedBusiness(business);
        }
      } catch (error) {
        console.error('❌ Error parsing stored business:', error);
      }
    };

    // Cargar negocio inicial desde localStorage
    handleStorageChange();

    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('businessChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('businessChanged', handleStorageChange);
    };
  }, []);

  const loadBusinesses = async (authUser: AuthUser) => {
    try {
      const params = new URLSearchParams({
        userEmail: authUser.email,
        userRole: authUser.role
      });

      const response = await fetch(`/api/admin/businesses?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setBusinesses(data);
          // Si no hay negocio seleccionado, seleccionar el primero
          if (!selectedBusiness) {
            setSelectedBusiness(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error loading businesses:', err);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Determinar qué negocio mostrar
  const businessToShow = selectedBusiness || (user.businessId ? { _id: user.businessId, name: 'Mi Negocio' } : null);

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold">Estadísticas Avanzadas</h1>
              <p className="text-purple-100 mt-1">
                Panel completo de análisis empresarial y métricas de rendimiento
              </p>
            </div>
          </div>
        </div>

        {/* Selector de negocio para super admin */}
        {user.role === 'super_admin' && businesses.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🏢 Seleccionar Negocio</h3>
            <select
              value={selectedBusiness?._id || ''}
              onChange={(e) => {
                const business = businesses.find(b => b._id === e.target.value);
                if (business) {
                  setSelectedBusiness(business);
                  localStorage.setItem('selectedBusiness', JSON.stringify(business));
                  window.dispatchEvent(new Event('businessChanged'));
                }
              }}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar negocio...</option>
              {businesses.map(business => (
                <option key={business._id} value={business._id}>
                  {business.name} ({business.subdomain})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Panel Empresarial */}
        {businessToShow ? (
          <BusinessStatsPanel 
            businessId={businessToShow._id} 
            businessName={businessToShow.name}
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Selecciona un Negocio
            </h3>
            <p className="text-gray-600">
              Para ver las estadísticas detalladas, selecciona un negocio de la lista superior.
            </p>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                ¿Qué puedes ver en este panel?
              </h3>
              <ul className="text-blue-700 space-y-1">
                <li>• <strong>Análisis de costes:</strong> Cuánto te cuesta cada reseña de 5 estrellas</li>
                <li>• <strong>Comparación con competencia:</strong> Cuánto ahorras vs otros servicios</li>
                <li>• <strong>Distribución de ratings:</strong> Porcentaje de cada tipo de reseña</li>
                <li>• <strong>Tendencias temporales:</strong> Crecimiento en diferentes períodos</li>
                <li>• <strong>Métricas de rendimiento:</strong> Tasa de conversión y eficiencia</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
