'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

type ActivityItem = {
  id: string;
  type: string;
  severity: 'danger' | 'warning' | 'info' | 'success';
  createdAt: string;
  occurredAt: string;
  business: {
    id: string;
    name: string;
    email: string;
    subdomain: string;
  };
  summary: string;
  description: string;
  metadata: any;
  cta?: { label: string; url: string };
};

const severityStyles: Record<string, string> = {
  danger: 'bg-red-50 border-l-4 border-red-500',
  warning: 'bg-yellow-50 border-l-4 border-yellow-500',
  info: 'bg-blue-50 border-l-4 border-blue-500',
  success: 'bg-green-50 border-l-4 border-green-500',
};

function formatDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Atlantic/Canary',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return dateStr;
  }
}

const typeLabels: Record<string, string> = {
  subscription_paused: 'Cancelaciones',
  payment_failed: 'Pagos fallidos',
  subscription_started: 'Nuevas suscripciones',
  invoice_paid: 'Pagos realizados',
};

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

  // Feed de eventos (activity_logs)
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState<boolean>(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

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

  // Helpers de filtros
  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };
  const buildTypesQuery = () => (selectedTypes.length ? `&types=${selectedTypes.join(',')}` : '');

  // Cargar eventos recientes con filtros
  const loadActivities = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`/api/super/recent-activity?limit=12${buildTypesQuery()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.items || []);
      } else {
        setActivities([]);
      }
    } catch (e) {
      console.error('Error cargando eventos recientes:', e);
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  };

  // Refrescar eventos cuando cambie el usuario o los filtros
  useEffect(() => {
    if (user) loadActivities();
  }, [user, selectedTypes]);

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
          {/* Eventos de negocio (dinámico) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Eventos de Negocio</h2>
              {/* Filtros rápidos */}
              <div className="flex flex-wrap gap-2">
                {(['subscription_paused', 'payment_failed', 'subscription_started', 'invoice_paid'] as const).map((t) => {
                  const active = selectedTypes.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={typeLabels[t]}
                    >
                      {typeLabels[t]}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedTypes([])}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 border cursor-pointer"
                  title="Quitar filtros"
                >
                  Todos
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {activityLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-500">Cargando eventos...</span>
                </div>
              )}

              {!activityLoading && activities.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No hay eventos para los filtros seleccionados.</p>
                </div>
              )}

              {!activityLoading &&
                activities.map((ev) => (
                  <div
                    key={ev.id}
                    className={`flex items-start gap-4 p-4 rounded-lg ${severityStyles[ev.severity] || 'bg-gray-50 border-l-4 border-gray-300'}`}
                  >
                    <div className="text-2xl">
                      {ev.severity === 'danger' ? '🚨' : ev.severity === 'warning' ? '⚠️' : ev.severity === 'success' ? '✅' : 'ℹ️'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{ev.summary}</p>
                      {ev.description && <p className="text-sm text-gray-600 mt-1">{ev.description}</p>}
                      <p className="text-xs text-gray-500 mt-2" title={new Date(ev.occurredAt).toISOString()}>
                        {formatDateTime(ev.occurredAt)}
                      </p>
                    </div>
                    {ev.cta?.url && ev.cta?.label && (
                      <a
                        href={ev.cta.url}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm cursor-pointer"
                      >
                        {ev.cta.label}
                      </a>
                    )}
                  </div>
                ))}
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
