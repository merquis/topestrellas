'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

export default function AffiliateReferralsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
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
    loadReferrals();
    setLoading(false);
  }, [router]);

  const loadReferrals = async () => {
    // TODO: Cargar referidos reales desde la API
    setReferrals([
      {
        id: '1',
        businessName: 'Restaurante La Marina',
        email: 'marina@ejemplo.com',
        signupDate: '2025-01-15',
        plan: 'Premium',
        monthlyValue: 49,
        status: 'active',
        totalCommissions: 147
      },
      {
        id: '2',
        businessName: 'Bar El Puerto',
        email: 'puerto@ejemplo.com',
        signupDate: '2025-01-10',
        plan: 'Básico',
        monthlyValue: 29,
        status: 'active',
        totalCommissions: 87
      },
      {
        id: '3',
        businessName: 'Café Central',
        email: 'central@ejemplo.com',
        signupDate: '2024-12-20',
        plan: 'Premium',
        monthlyValue: 49,
        status: 'cancelled',
        totalCommissions: 294,
        cancellationDate: '2025-01-20'
      }
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando referidos...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const activeReferrals = referrals.filter(r => r.status === 'active');
  const monthlyRecurring = activeReferrals.reduce((sum, r) => sum + (r.monthlyValue * 0.3), 0);

  return (
    <AdminLayout user={user}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Mis Referidos
          </h1>
          <p className="text-gray-600">
            Gestiona y monitorea todos tus clientes referidos
          </p>
        </div>

        {/* Resumen de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-2">Referidos Activos</p>
            <p className="text-3xl font-bold text-gray-900">{activeReferrals.length}</p>
            <p className="text-sm text-green-600 mt-2">Generando comisiones</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-2">Comisión Mensual Recurrente</p>
            <p className="text-3xl font-bold text-gray-900">{monthlyRecurring.toFixed(2)}€</p>
            <p className="text-sm text-blue-600 mt-2">30% de cada pago</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-2">Total Referidos</p>
            <p className="text-3xl font-bold text-gray-900">{referrals.length}</p>
            <p className="text-sm text-purple-600 mt-2">Histórico completo</p>
          </div>
        </div>

        {/* Tabla de referidos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Lista de Referidos</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisión/mes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Ganado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Registro
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {referral.businessName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {referral.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {referral.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {referral.status === 'active' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.status === 'active' ? (
                        <span className="font-semibold text-green-600">
                          {(referral.monthlyValue * 0.3).toFixed(2)}€
                        </span>
                      ) : (
                        <span className="text-gray-400">0€</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {referral.totalCommissions.toFixed(2)}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(referral.signupDate).toLocaleDateString('es-ES')}
                      {referral.cancellationDate && (
                        <div className="text-xs text-red-500">
                          Cancelado: {new Date(referral.cancellationDate).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Recuerda:</strong> Ganas el 30% de comisión recurrente de cada pago mensual mientras tus referidos mantengan su suscripción activa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
