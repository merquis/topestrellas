'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

export default function AffiliateCommissionsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    
    // Solo afiliados pueden acceder
    if (authUser.role !== 'affiliate') {
      router.push('/admin');
      return;
    }
    
    setUser(authUser);
    loadCommissions();
    setLoading(false);
  }, [router]);

  const loadCommissions = async () => {
    // TODO: Cargar comisiones reales desde la API
    setCommissions([
      {
        id: '1',
        month: '2025-01',
        businessName: 'Restaurante La Marina',
        plan: 'Premium',
        planAmount: 49,
        commissionAmount: 14.70,
        status: 'paid',
        paymentDate: '2025-01-15',
        paymentMethod: 'PayPal'
      },
      {
        id: '2',
        month: '2025-01',
        businessName: 'Bar El Puerto',
        plan: 'Básico',
        planAmount: 29,
        commissionAmount: 8.70,
        status: 'paid',
        paymentDate: '2025-01-15',
        paymentMethod: 'PayPal'
      },
      {
        id: '3',
        month: '2025-02',
        businessName: 'Restaurante La Marina',
        plan: 'Premium',
        planAmount: 49,
        commissionAmount: 14.70,
        status: 'pending',
        paymentDate: null,
        paymentMethod: null
      },
      {
        id: '4',
        month: '2025-02',
        businessName: 'Bar El Puerto',
        plan: 'Básico',
        planAmount: 29,
        commissionAmount: 8.70,
        status: 'pending',
        paymentDate: null,
        paymentMethod: null
      }
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando comisiones...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredCommissions = filter === 'all' 
    ? commissions 
    : commissions.filter(c => c.status === filter);

  const totalPending = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const totalPaid = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  return (
    <AdminLayout user={user}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Mis Comisiones
          </h1>
          <p className="text-gray-600">
            Historial completo de comisiones ganadas y pendientes
          </p>
        </div>

        {/* Resumen de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-2">Total Pagado</p>
            <p className="text-3xl font-bold text-gray-900">{totalPaid.toFixed(2)}€</p>
            <p className="text-sm text-green-600 mt-2">Comisiones cobradas</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-2">Pendiente de Pago</p>
            <p className="text-3xl font-bold text-gray-900">{totalPending.toFixed(2)}€</p>
            <p className="text-sm text-orange-600 mt-2">Próximo pago: 15 feb</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-2">Total Ganado</p>
            <p className="text-3xl font-bold text-gray-900">{(totalPaid + totalPending).toFixed(2)}€</p>
            <p className="text-sm text-purple-600 mt-2">Histórico total</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'paid'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pagadas
          </button>
        </div>

        {/* Tabla de comisiones */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Historial de Comisiones</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisión (30%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Pago
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(commission.month + '-01').toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {commission.businessName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {commission.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {commission.planAmount.toFixed(2)}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-green-600">
                        {commission.commissionAmount.toFixed(2)}€
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {commission.status === 'paid' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Pagada
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {commission.paymentDate ? (
                        <div>
                          <div>{new Date(commission.paymentDate).toLocaleDateString('es-ES')}</div>
                          <div className="text-xs text-gray-400">{commission.paymentMethod}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información de pagos */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Calendario de pagos:</strong> Las comisiones se pagan el día 15 de cada mes. Los pagos pendientes se acumularán hasta alcanzar un mínimo de 50€.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Comisión del 30%:</strong> Ganas el 30% de cada pago mensual mientras tus referidos mantengan su suscripción activa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de solicitar pago */}
        {totalPending >= 50 && (
          <div className="mt-8 text-center">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg">
              Solicitar Pago de {totalPending.toFixed(2)}€
            </button>
            <p className="text-sm text-gray-500 mt-2">
              El pago se procesará el próximo día 15 del mes
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
