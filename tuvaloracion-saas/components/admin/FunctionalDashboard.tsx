'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatsCard from '@/components/admin/StatsCard';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface FunctionalDashboardProps {
  user: AuthUser;
}

export default function FunctionalDashboard({ user }: FunctionalDashboardProps) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
    totalOpinions: 0,
    totalPrizes: 0,
    avgRating: 0,
    monthlyGrowth: 0,
    opinionsGrowth: 0,
    inactiveGrowth: 0,
    activePercentage: 0,
    inactivePercentage: 0
  });

  // Cargar estadísticas cuando cambia el negocio seleccionado o el usuario
  useEffect(() => {
    loadStats();
  }, [user]);

  // Cargar negocios para admins normales
  useEffect(() => {
    if (user.role === 'admin') {
      loadBusinesses();
    }
  }, [user.email, user.role]);

  // Escuchar cambios en localStorage para el negocio seleccionado
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      try {
        const storedBusiness = localStorage.getItem('selectedBusiness');
        if (storedBusiness) {
          const business = JSON.parse(storedBusiness);
          console.log('📦 Business from localStorage:', business);
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
    
    // También escuchar cambios personalizados (para cambios en la misma pestaña)
    window.addEventListener('businessChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('businessChanged', handleStorageChange);
    };
  }, []);

  // Recargar estadísticas cuando cambia el negocio seleccionado
  useEffect(() => {
    if (selectedBusiness) {
      console.log('🔄 Business changed, reloading stats for:', selectedBusiness.name);
      loadStats();
    }
  }, [selectedBusiness]);

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
        console.log('✅ Businesses loaded:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          setBusinesses(data);
          setSelectedBusiness(data[0]); // Seleccionar el primero automáticamente
        }
      } else {
        setError(`Error ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      console.error('❌ Error loading businesses:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsParams = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
        ...(selectedBusiness && user.role === 'admin' ? { businessId: selectedBusiness._id } : {}),
        ...(user.businessId && user.role !== 'super_admin' && !selectedBusiness ? { businessId: user.businessId } : {})
      });

      console.log('📊 Loading stats with params:', Object.fromEntries(statsParams));

      const response = await fetch(`/api/admin/stats?${statsParams}`);
      if (response.ok) {
        const statsData = await response.json();
        console.log('✅ Stats loaded:', statsData);
        setStats({
          totalBusinesses: statsData.totalBusinesses,
          activeBusinesses: statsData.activeBusinesses,
          inactiveBusinesses: statsData.inactiveBusinesses,
          totalOpinions: statsData.totalOpinions,
          totalPrizes: statsData.totalPrizes,
          avgRating: statsData.avgRating,
          monthlyGrowth: statsData.monthlyGrowth,
          opinionsGrowth: statsData.opinionsGrowth,
          inactiveGrowth: statsData.inactiveGrowth,
          activePercentage: statsData.activePercentage,
          inactivePercentage: statsData.inactivePercentage
        });
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    console.log('🔄 Business selected:', business.name);
    setSelectedBusiness(business);
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* Business Selector for admin users */}
      {user.role === 'admin' && (
        <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Negocio Seleccionado</h2>
            <div className="flex-1 max-w-md ml-4">
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <p className="font-medium text-gray-900">Cargando negocios...</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-xs text-gray-500">Conectando...</span>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <span className="text-xs text-red-700">{error}</span>
                  </div>
                </div>
              ) : businesses.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-medium text-yellow-900">Sin negocios</p>
                    <span className="text-xs text-yellow-700">No hay negocios asignados</span>
                  </div>
                </div>
              ) : businesses.length === 1 ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <p className="font-medium text-gray-900">{businesses[0].name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        businesses[0].active ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className="text-xs text-gray-500">
                        {businesses[0].active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between gap-2 px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors min-w-[200px] w-full"
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
                    <span className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsDropdownOpen(false)}
                      ></div>
                      
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {businesses.map((business) => (
                          <button
                            key={business._id}
                            onClick={() => handleBusinessSelect(business)}
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {user.role === 'super_admin' && (
          <StatsCard
            title="Negocios Totales"
            value={stats.totalBusinesses}
            icon="🏢"
            trend={{ value: stats.monthlyGrowth, isPositive: true }}
            bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
            iconBgColor="bg-blue-500"
          />
        )}
        {user.role === 'super_admin' && (
          <StatsCard
            title="Negocios Activos"
            value={stats.activeBusinesses}
            icon="✅"
            trend={{ value: stats.activePercentage, isPositive: true }}
            bgColor="bg-gradient-to-br from-green-50 to-green-100"
            iconBgColor="bg-green-500"
          />
        )}
        {user.role === 'super_admin' && (
          <StatsCard
            title="Negocios Inactivos"
            value={stats.inactiveBusinesses}
            icon="❌"
            trend={{ value: stats.inactivePercentage, isPositive: false }}
            bgColor="bg-gradient-to-br from-red-50 to-red-100"
            iconBgColor="bg-red-500"
          />
        )}
        <StatsCard
          title="Opiniones Totales"
          value={stats.totalOpinions.toLocaleString()}
          icon="⭐"
          trend={{ value: stats.opinionsGrowth, isPositive: stats.opinionsGrowth >= 0 }}
          bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
          iconBgColor="bg-yellow-500"
        />
        <StatsCard
          title="Premios Entregados"
          value={stats.totalPrizes}
          icon="🎁"
          bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
          iconBgColor="bg-purple-500"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {[
              { icon: '⭐', text: 'Nueva opinión 5 estrellas en Restaurante La Plaza', time: 'Hace 5 min' },
              { icon: '🎁', text: 'Premio "Cena para 2" canjeado en Café Central', time: 'Hace 15 min' },
              { icon: '🏢', text: 'Nuevo negocio registrado: Peluquería Style', time: 'Hace 1 hora' },
              { icon: '📊', text: 'Informe mensual generado automáticamente', time: 'Hace 2 horas' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <span className="text-2xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-gray-800">{activity.text}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
          <div className="space-y-3">
            {user.role === 'super_admin' && (
              <button
                onClick={() => router.push('/admin/new-business')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
              >
                <span>➕</span> Añadir Negocio
              </button>
            )}
            <button
              onClick={() => router.push('/admin/opinions')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <span>📝</span> Ver Opiniones
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <span>📊</span> Estadísticas
            </button>
            <button
              onClick={() => router.push('/admin/settings')}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <span>⚙️</span> Configuración
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
