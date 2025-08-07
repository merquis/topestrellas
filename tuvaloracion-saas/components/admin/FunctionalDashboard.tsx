'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [showPrizesSpotlight, setShowPrizesSpotlight] = useState(false);
  const recentActivityRef = useRef<HTMLDivElement>(null);

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
      loadRecentActivities();
    }
  }, [selectedBusiness]);

  // Cargar actividades recientes cuando se carga el componente
  useEffect(() => {
    loadRecentActivities();
  }, [user]);

  // Verificar si hay actividades de premios no configurados y activar spotlight
  useEffect(() => {
    const prizesActivity = recentActivities.find(activity => 
      activity.type === 'prizes_not_configured' && 
      activity.priority === 'high'
    );
    
    if (prizesActivity && user.role === 'admin') {
      setShowPrizesSpotlight(true);
    } else {
      setShowPrizesSpotlight(false);
    }
  }, [recentActivities, user.role]);

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

  const loadRecentActivities = async () => {
    try {
      const activityParams = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
        ...(selectedBusiness && user.role === 'admin' ? { businessId: selectedBusiness._id } : {}),
        ...(user.businessId && user.role !== 'super_admin' && !selectedBusiness ? { businessId: user.businessId } : {})
      });

      console.log('🔄 Loading recent activities with params:', Object.fromEntries(activityParams));

      const response = await fetch(`/api/admin/recent-activity?${activityParams}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Recent activities loaded:', data);
        setRecentActivities(data.activities || []);
      }
    } catch (error) {
      console.error('❌ Error loading recent activities:', error);
      // En caso de error, mantener actividades vacías
      setRecentActivities([]);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    console.log('🔄 Business selected:', business.name);
    setSelectedBusiness(business);
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* Overlay global que bloquea toda interacción excepto configurar premios */}
      {showPrizesSpotlight && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-60 pointer-events-auto">
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
        <div 
          ref={recentActivityRef}
          className={`lg:col-span-2 bg-white rounded-xl shadow-lg p-6 ${
            showPrizesSpotlight ? 'relative z-50 ring-4 ring-orange-500 ring-opacity-75 shadow-2xl' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Actividad Reciente</h2>
            {recentActivities.length > 8 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {recentActivities.length} actividades
              </span>
            )}
          </div>
          <div 
            className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6'
            }}
          >
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors ${
                    activity.priority === 'high' ? 'border-l-4 border-red-500 bg-red-50' : 
                    activity.priority === 'medium' ? 'border-l-4 border-yellow-500 bg-yellow-50' : ''
                  }`}
                >
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className={`${
                      activity.priority === 'high' ? 'text-red-800 font-semibold' : 
                      activity.priority === 'medium' ? 'text-yellow-800' : 'text-gray-800'
                    }`}>
                      {activity.message}
                    </p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                    
                    {/* Enlace especial para configurar premios */}
                    {activity.type === 'prizes_not_configured' && activity.businessId && (
                      <div className="mt-4">
                        <a
                          href={`/admin/edit-business/${activity.businessId}#premios`}
                          className="relative z-[9999] inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-lg font-bold rounded-2xl hover:from-orange-700 hover:to-orange-800 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-orange-500/50 animate-pulse border-2 border-orange-400"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="text-2xl">🎁</span>
                          <span>Configurar Premios</span>
                          <span className="text-xl">→</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">📊</span>
                <p>No hay actividad reciente</p>
                <p className="text-sm">Las actividades aparecerán aquí cuando ocurran eventos en tu negocio</p>
              </div>
            )}
          </div>
          {recentActivities.length > 8 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <span className="mr-2">⬆️</span>
                Desliza hacia arriba para ver más actividades
                <span className="ml-2">⬆️</span>
              </div>
            </div>
          )}
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
