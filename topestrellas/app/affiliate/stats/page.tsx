'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

export default function AffiliateStatsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    conversionRate: 0,
    avgCustomerValue: 0,
    monthlyGrowth: 0,
    topPerformingPlan: '',
    churnRate: 0,
    lifetimeValue: 0
  });
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/login');
      return;
    }
    
    // Solo afiliados pueden acceder
    if (authUser.role !== 'affiliate') {
      router.push('/login');
      return;
    }
    
    setUser(authUser);
    loadStats();
    setLoading(false);
  }, [router]);

  const loadStats = async () => {
    // TODO: Cargar estadísticas reales desde la API
    setStats({
      totalReferrals: 15,
      activeReferrals: 12,
      conversionRate: 68,
      avgCustomerValue: 42.50,
      monthlyGrowth: 15,
      topPerformingPlan: 'Premium',
      churnRate: 8,
      lifetimeValue: 5400
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Datos para el gráfico de tendencia (mock)
  const monthlyData = [
    { month: 'Sep', referrals: 2, commission: 58 },
    { month: 'Oct', referrals: 3, commission: 87 },
    { month: 'Nov', referrals: 5, commission: 145 },
    { month: 'Dic', referrals: 4, commission: 116 },
    { month: 'Ene', referrals: 6, commission: 174 },
    { month: 'Feb', referrals: 7, commission: 203 }
  ];

  return (
    <AdminLayout user={user}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Estadísticas de Rendimiento
          </h1>
          <p className="text-gray-600">
            Análisis detallado de tu desempeño como afiliado
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">📊</span>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                +{stats.monthlyGrowth}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Referidos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
            <p className="text-xs text-gray-500 mt-2">{stats.activeReferrals} activos</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🎯</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Alto
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Tasa de Conversión</p>
            <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
            <p className="text-xs text-gray-500 mt-2">De visitas a clientes</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">💰</span>
              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                30%
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Valor Promedio</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgCustomerValue}€</p>
            <p className="text-xs text-gray-500 mt-2">Por cliente/mes</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🏆</span>
              <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                Top
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Plan Estrella</p>
            <p className="text-2xl font-bold text-gray-900">{stats.topPerformingPlan}</p>
            <p className="text-xs text-gray-500 mt-2">Más vendido</p>
          </div>
        </div>

        {/* Gráfico de tendencia */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Tendencia de Crecimiento</h2>
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 w-12">{data.month}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{data.referrals} referidos</span>
                        <span>{data.commission}€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(data.commission / 250) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estadísticas adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rendimiento por plan */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Rendimiento por Plan</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Plan Premium</p>
                  <p className="text-sm text-gray-500">8 clientes activos</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">117.60€/mes</p>
                  <p className="text-xs text-gray-500">14.70€ por cliente</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Plan Básico</p>
                  <p className="text-sm text-gray-500">4 clientes activos</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">34.80€/mes</p>
                  <p className="text-xs text-gray-500">8.70€ por cliente</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Plan Enterprise</p>
                  <p className="text-sm text-gray-500">0 clientes activos</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-400">0€/mes</p>
                  <p className="text-xs text-gray-500">29.70€ por cliente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas de retención */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Métricas de Retención</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Tasa de Retención</span>
                  <span className="text-sm font-bold text-gray-900">{100 - stats.churnRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${100 - stats.churnRate}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Tasa de Cancelación</span>
                  <span className="text-sm font-bold text-gray-900">{stats.churnRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${stats.churnRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valor de Vida del Cliente</span>
                  <span className="text-xl font-bold text-purple-600">{stats.lifetimeValue}€</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Promedio por cliente referido</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consejos para mejorar */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">💡 Consejos para Mejorar</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Enfócate en promocionar el Plan Premium, tiene la mejor comisión recurrente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Tu tasa de conversión del 68% es excelente, mantén esa estrategia</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Considera crear contenido educativo para atraer más restaurantes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600">•</span>
              <span>Contacta a tus referidos inactivos para entender por qué cancelaron</span>
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
