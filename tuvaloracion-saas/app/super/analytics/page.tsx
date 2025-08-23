'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

export default function SuperAnalyticsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/login');
      return;
    }
    
    // Solo super_admin puede acceder
    if (authUser.role !== 'super_admin') {
      router.push('/login');
      return;
    }
    
    setUser(authUser);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout user={user}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Analytics Detallado
          </h1>
          <p className="text-gray-600">
            Análisis completo del rendimiento del negocio
          </p>
        </div>

        {/* Selector de rango de fechas */}
        <div className="mb-6">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Ingresos Totales</span>
              <span className="text-green-500 text-sm font-semibold">+15.3%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">14,850€</p>
            <div className="mt-4 h-16 bg-gradient-to-r from-green-100 to-green-50 rounded"></div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Nuevos Clientes</span>
              <span className="text-blue-500 text-sm font-semibold">+23.1%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">127</p>
            <div className="mt-4 h-16 bg-gradient-to-r from-blue-100 to-blue-50 rounded"></div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tasa de Conversión</span>
              <span className="text-purple-500 text-sm font-semibold">+5.2%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">68.5%</p>
            <div className="mt-4 h-16 bg-gradient-to-r from-purple-100 to-purple-50 rounded"></div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">LTV Promedio</span>
              <span className="text-orange-500 text-sm font-semibold">+8.7%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">1,450€</p>
            <div className="mt-4 h-16 bg-gradient-to-r from-orange-100 to-orange-50 rounded"></div>
          </div>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de ingresos */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Evolución de Ingresos</h3>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">📊 Gráfico de líneas aquí</span>
            </div>
          </div>

          {/* Gráfico de suscripciones */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución de Planes</h3>
            <div className="h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">🥧 Gráfico circular aquí</span>
            </div>
          </div>
        </div>

        {/* Métricas por categoría */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Adquisición */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Adquisición</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Visitantes únicos</span>
                <span className="font-semibold">12,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Registros</span>
                <span className="font-semibold">847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasa de registro</span>
                <span className="font-semibold text-green-600">6.8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CAC</span>
                <span className="font-semibold">45€</span>
              </div>
            </div>
          </div>

          {/* Activación */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🚀 Activación</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Trials iniciados</span>
                <span className="font-semibold">523</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Conversión a pago</span>
                <span className="font-semibold text-green-600">68.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tiempo promedio</span>
                <span className="font-semibold">3.2 días</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Onboarding completado</span>
                <span className="font-semibold">89%</span>
              </div>
            </div>
          </div>

          {/* Retención */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💎 Retención</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Churn mensual</span>
                <span className="font-semibold text-red-600">3.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Retención 6 meses</span>
                <span className="font-semibold text-green-600">82%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">NPS Score</span>
                <span className="font-semibold">72</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Upgrades</span>
                <span className="font-semibold">15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de top negocios */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Top Negocios por Ingresos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MRR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lifetime Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meses Activo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Restaurante Premium
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Enterprise
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    99€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    2,376€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    24
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Hotel Costa Azul
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Enterprise
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    99€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    1,881€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    19
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Café Deluxe
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Premium
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    49€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    1,470€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    30
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
