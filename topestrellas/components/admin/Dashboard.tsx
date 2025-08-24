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
  subscription?: {
    plan: string;
  };
}

interface DashboardProps {
  user: AuthUser;
}

export default function Dashboard({ user }: DashboardProps) {
  const router = useRouter();
  const selectedBusiness: Business | null = null; // Temporalmente sin selector
  const [businesses, setBusinesses] = useState<Business[]>([]);
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

  useEffect(() => {
    loadDashboardData();
  }, [user, selectedBusiness]);

  const loadDashboardData = async () => {
    try {
      // Cargar negocios según el rol
      const businessesResponse = await fetch('/api/admin/businesses');
      if (businessesResponse.ok) {
        const data = await businessesResponse.json();
        
        // Filtrar según el rol
        const filteredBusinesses = user.role === 'super_admin' 
          ? data 
          : data.filter((b: any) => b._id === user.businessId);
        
        setBusinesses(filteredBusinesses);
      }

      // Cargar estadísticas reales
      const statsParams = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
        ...(user.businessId && user.role !== 'super_admin' ? { businessId: user.businessId } : {})
      });

      const statsResponse = await fetch(`/api/admin/stats?${statsParams}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
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
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <>
      {/* Stats Grid - Responsive para móvil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
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

      {/* Recent Activity & Quick Actions - Stack en móvil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h2>
          <div className="space-y-3 sm:space-y-4">
            {[
              { icon: '⭐', text: 'Nueva opinión 5 estrellas en Restaurante La Plaza', time: 'Hace 5 min' },
              { icon: '🎁', text: 'Premio "Cena para 2" canjeado en Café Central', time: 'Hace 15 min' },
              { icon: '🏢', text: 'Nuevo negocio registrado: Peluquería Style', time: 'Hace 1 hora' },
              { icon: '📊', text: 'Informe mensual generado automáticamente', time: 'Hace 2 horas' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start sm:items-center gap-3 sm:gap-4 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <span className="text-xl sm:text-2xl flex-shrink-0">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base text-gray-800 break-words">{activity.text}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
            {user.role === 'super_admin' && (
              <button
                onClick={() => router.push('/admin/new-business')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>➕</span> 
                <span className="hidden sm:inline">Añadir Negocio</span>
                <span className="sm:hidden">Añadir</span>
              </button>
            )}
            <button
              onClick={() => router.push('/admin/opinions')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              <span>📝</span> 
              <span className="hidden sm:inline">Ver Opiniones</span>
              <span className="sm:hidden">Opiniones</span>
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              <span>📊</span> 
              <span className="hidden sm:inline">Estadísticas</span>
              <span className="sm:hidden">Stats</span>
            </button>
            <button
              onClick={() => router.push('/admin/settings')}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              <span>⚙️</span> 
              <span className="hidden sm:inline">Configuración</span>
              <span className="sm:hidden">Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business Overview - Tabla responsive con scroll horizontal en móvil */}
      {user.role === 'super_admin' && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Vista General de Negocios</h2>
            <button
              onClick={() => router.push('/admin/businesses')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
            >
              Ver todos →
            </button>
          </div>
          
          {/* Versión móvil - Cards */}
          <div className="block sm:hidden space-y-3">
            {businesses.slice(0, 5).map((business: Business) => (
              <div key={business._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{business.name}</p>
                    <p className="text-xs text-gray-500">{business.subdomain}.tuvaloracion.com</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    business.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {business.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex gap-4">
                    <span className="text-gray-600">
                      Plan: <span className="font-medium">{business.subscription?.plan || 'Trial'}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-medium">4.8</span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/admin/edit-business/${business._id}`)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Versión desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Negocio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Opiniones</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {businesses.slice(0, 5).map((business: Business) => (
                  <tr key={business._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-800">{business.name}</p>
                        <p className="text-sm text-gray-500">{business.subdomain}.tuvaloracion.com</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {business.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-700">
                        {business.subscription?.plan || 'Trial'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">247</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">4.8</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => router.push(`/admin/edit-business/${business._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
