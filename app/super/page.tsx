'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

type SuperMetrics = {
  mrr: number;
  totalBusinesses: number;
  activeBusinesses: number;
  newThisMonth: number;
  cancellationsCount: number;
  avgLifetimeValue: number;
  pendingPayments: number;
  totalAffiliates: number;
};

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Estados para métricas
  const [metrics, setMetrics] = useState<SuperMetrics>({
    mrr: 0,
    totalBusinesses: 0,
    activeBusinesses: 0,
    newThisMonth: 0,
    cancellationsCount: 0,
    avgLifetimeValue: 0,
    pendingPayments: 0,
    totalAffiliates: 0
  });

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/login');
      return;
    }
    
    // Solo super_admin puede acceder - VERIFICACIÓN ESTRICTA
    if (authUser.role !== 'super_admin') {
      console.error(`🚫 Acceso denegado a panel super admin: ${authUser.email} (rol: ${authUser.role})`);
      router.push('/login');
      return;
    }
    
    setUser(authUser);
    loadMetrics();
    setLoading(false);
  }, [router]);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/super/metrics', { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Error cargando métricas: ${res.status}`);
      }
      const data = await res.json();
      setMetrics((prev: SuperMetrics) => ({
        ...prev,
        mrr: Math.round(((data?.mrr ?? 0) + Number.EPSILON) * 100) / 100,
        totalBusinesses: data?.totalBusinesses ?? 0,
        activeBusinesses: data?.activeBusinesses ?? 0,
        newThisMonth: data?.newThisMonth ?? 0,
        cancellationsCount: data?.cancellationsCount ?? 0,
      }));
    } catch (err) {
      console.error('Error cargando métricas del super admin:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
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
            Panel de Super Administrador
          </h1>
          <p className="text-gray-600">
            Bienvenido de nuevo, {user.name}
          </p>
        </div>

        {/* Métricas principales - Grid responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* MRR */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">💰</span>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                MRR
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{metrics.mrr.toLocaleString()}€</p>
              <p className="text-sm text-gray-600 mt-1">Ingresos recurrentes mensuales</p>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-green-600 font-semibold">↑ 12%</span>
                <span className="text-gray-500 ml-2">vs mes anterior</span>
              </div>
            </div>
          </div>

          {/* Negocios Activos */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">🏢</span>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Activos
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeBusinesses}</p>
              <p className="text-sm text-gray-600 mt-1">De {metrics.totalBusinesses} totales</p>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                    style={{ width: `${(metrics.activeBusinesses / metrics.totalBusinesses) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Nuevos este mes */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">🆕</span>
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                Nuevos
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{metrics.newThisMonth}</p>
              <p className="text-sm text-gray-600 mt-1">Clientes este mes</p>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-purple-600 font-semibold">↑ 25%</span>
                <span className="text-gray-500 ml-2">crecimiento</span>
              </div>
            </div>
          </div>

          {/* Cancelaciones (pausas del mes) */}
          <div className="bg-gradient-to-br from-red-50 to-orange-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">📉</span>
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                Cancelaciones
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{metrics.cancellationsCount}</p>
              <p className="text-sm text-gray-600 mt-1">Pausas de suscripción este mes</p>
            </div>
          </div>
        </div>

        {/* Sección de actividades y acciones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Eventos de negocio */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Eventos de Negocio</h2>
            <div className="space-y-4">
              {/* Evento 1 */}
              <div className="flex items-start gap-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <span className="text-2xl">💔</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    Cancelación: restaurante@ejemplo.com
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Plan Premium (49€/mes) - Motivo: "Precio elevado"
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Hace 2 horas</p>
                </div>
                <button className="text-red-600 hover:text-red-700 font-medium text-sm cursor-pointer">
                  Ver detalles
                </button>
              </div>

              {/* Evento 2 */}
              <div className="flex items-start gap-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    Pago fallido: bar@ejemplo.com
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    3er intento fallido - Tarjeta expirada
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Hace 5 horas</p>
                </div>
                <button className="text-yellow-600 hover:text-yellow-700 font-medium text-sm cursor-pointer">
                  Contactar
                </button>
              </div>

              {/* Evento 3 */}
              <div className="flex items-start gap-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    Nueva suscripción: cafe@ejemplo.com
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Plan Básico (29€/mes) - Conversión desde trial
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Hace 1 día</p>
                </div>
                <button className="text-green-600 hover:text-green-700 font-medium text-sm cursor-pointer">
                  Ver perfil
                </button>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/super/businesses')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🏢</span> Ver Todos los Negocios
              </button>
              <button
                onClick={() => router.push('/super/affiliates')}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🤝</span> Gestionar Afiliados
              </button>
              <button
                onClick={() => router.push('/super/subscriptions')}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💳</span> Planes y Facturación
              </button>
              <button
                onClick={() => router.push('/super/analytics')}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 px-4 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📊</span> Analytics Detallado
              </button>
            </div>
          </div>
        </div>

        {/* Métricas adicionales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Valor promedio por cliente</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgLifetimeValue}€</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Pagos pendientes</p>
            <p className="text-2xl font-bold text-orange-600">{metrics.pendingPayments}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Afiliados activos</p>
            <p className="text-2xl font-bold text-purple-600">{metrics.totalAffiliates}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Tasa de conversión</p>
            <p className="text-2xl font-bold text-green-600">65%</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
