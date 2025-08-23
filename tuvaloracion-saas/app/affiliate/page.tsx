'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

export default function AffiliateDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Estados para métricas del afiliado
  const [affiliateStats, setAffiliateStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    monthlyCommission: 0,
    lifetimeEarnings: 0,
    conversionRate: 0,
    pendingCommission: 0,
    lastPayout: null as Date | null,
    referralCode: 'AFFILIATE2024'
  });

  // Estados para referidos
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    
    // Solo afiliados pueden acceder - SIN EXCEPCIONES
    if (authUser.role !== 'affiliate') {
      console.error(`🚫 Acceso denegado a panel afiliados: ${authUser.email} (rol: ${authUser.role})`);
      router.push('/admin');
      return;
    }
    
    setUser(authUser);
    loadAffiliateData();
    setLoading(false);
  }, [router]);

  const loadAffiliateData = async () => {
    // TODO: Cargar datos reales desde la API
    setAffiliateStats({
      totalReferrals: 12,
      activeReferrals: 8,
      monthlyCommission: 450,
      lifetimeEarnings: 5400,
      conversionRate: 66.7,
      pendingCommission: 150,
      lastPayout: new Date('2024-01-15'),
      referralCode: 'AFFILIATE2024'
    });

    setReferrals([
      {
        id: 1,
        businessName: 'Restaurante Euro',
        status: 'active',
        plan: 'Premium',
        monthlyValue: 49,
        commission: 10,
        joinedDate: new Date('2024-01-10')
      },
      {
        id: 2,
        businessName: 'Bar Central',
        status: 'trial',
        plan: 'Trial',
        monthlyValue: 0,
        commission: 0,
        joinedDate: new Date('2024-01-20')
      },
      {
        id: 3,
        businessName: 'Café París',
        status: 'active',
        plan: 'Básico',
        monthlyValue: 29,
        commission: 6,
        joinedDate: new Date('2023-12-15')
      }
    ]);
  };

  const copyReferralLink = () => {
    const link = `https://topestrellas.com/register?ref=${affiliateStats.referralCode}`;
    navigator.clipboard.writeText(link);
    // TODO: Mostrar toast de confirmación
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de afiliado...</p>
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
            Panel de Afiliado
          </h1>
          <p className="text-gray-600">
            Bienvenido, {user.name} - Gestiona tus referidos y comisiones
          </p>
        </div>

        {/* Link de referido - Destacado */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Tu Link de Referido</h3>
              <p className="text-purple-100 text-sm mb-3">
                Comparte este enlace para ganar comisiones por cada cliente que se registre
              </p>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                <span className="text-sm font-mono">
                  topestrellas.com/register?ref={affiliateStats.referralCode}
                </span>
              </div>
            </div>
            <button
              onClick={copyReferralLink}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <span>📋</span>
              <span>Copiar Link</span>
            </button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Total Referidos */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{affiliateStats.totalReferrals}</p>
              <p className="text-sm text-gray-600 mt-1">Total Referidos</p>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-green-600 font-semibold">{affiliateStats.activeReferrals} activos</span>
              </div>
            </div>
          </div>

          {/* Comisión Mensual */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{affiliateStats.monthlyCommission}€</p>
              <p className="text-sm text-gray-600 mt-1">Comisión este mes</p>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-orange-600 font-semibold">{affiliateStats.pendingCommission}€ pendiente</span>
              </div>
            </div>
          </div>

          {/* Ganancias Totales */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{affiliateStats.lifetimeEarnings}€</p>
              <p className="text-sm text-gray-600 mt-1">Ganancias totales</p>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-gray-500">Desde el inicio</span>
              </div>
            </div>
          </div>

          {/* Tasa de Conversión */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{affiliateStats.conversionRate}%</p>
              <p className="text-sm text-gray-600 mt-1">Tasa de conversión</p>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                    style={{ width: `${affiliateStats.conversionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de referidos y herramientas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de referidos */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Mis Clientes Referidos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Negocio</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800">{referral.businessName}</p>
                        <p className="text-xs text-gray-500">
                          Desde {referral.joinedDate.toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          referral.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : referral.status === 'trial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {referral.status === 'active' ? 'Activo' : 
                           referral.status === 'trial' ? 'Prueba' : 'Pausado'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-700">
                          {referral.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-bold text-green-600">
                          {referral.commission}€/mes
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total comisiones mensuales:</span>
                <span className="text-xl font-bold text-green-600">
                  {referrals.reduce((sum, r) => sum + r.commission, 0)}€
                </span>
              </div>
            </div>
          </div>

          {/* Herramientas y recursos */}
          <div className="space-y-6">
            {/* Herramientas de marketing */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Herramientas</h2>
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2">
                  <span>📊</span> Ver Estadísticas
                </button>
                <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2">
                  <span>📥</span> Descargar Materiales
                </button>
                <button className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2">
                  <span>💳</span> Solicitar Pago
                </button>
              </div>
            </div>

            {/* Próximo pago */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Próximo Pago</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Comisión pendiente:</span>
                  <span className="font-bold text-gray-900">{affiliateStats.pendingCommission}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fecha estimada:</span>
                  <span className="font-medium text-gray-900">15 Feb 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Método:</span>
                  <span className="font-medium text-gray-900">Transferencia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
