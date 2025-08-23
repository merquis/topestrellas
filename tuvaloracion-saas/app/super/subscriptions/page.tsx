'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth, AuthUser } from '@/lib/auth';

interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  features: string[];
  activeSubscriptions: number;
  mrr: number;
  status: string;
}

export default function SuperSubscriptionsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    
    // Solo super_admin puede acceder
    if (authUser.role !== 'super_admin') {
      router.push('/admin');
      return;
    }
    
    setUser(authUser);
    loadPlans();
    setLoading(false);
  }, [router]);

  const loadPlans = async () => {
    // TODO: Implementar carga real de planes
    setPlans([
      {
        _id: '1',
        name: 'Plan Básico',
        price: 29,
        features: ['100 reseñas/mes', 'QR personalizado', 'Soporte básico'],
        activeSubscriptions: 45,
        mrr: 1305,
        status: 'active'
      },
      {
        _id: '2',
        name: 'Plan Premium',
        price: 49,
        features: ['Reseñas ilimitadas', 'QR premium', 'Soporte prioritario', 'Analytics avanzado'],
        activeSubscriptions: 32,
        mrr: 1568,
        status: 'active'
      },
      {
        _id: '3',
        name: 'Plan Enterprise',
        price: 99,
        features: ['Todo incluido', 'API access', 'Soporte dedicado', 'Personalización completa'],
        activeSubscriptions: 21,
        mrr: 2079,
        status: 'active'
      }
    ]);
  };

  const totalMRR = plans.reduce((sum, plan) => sum + plan.mrr, 0);
  const totalSubscriptions = plans.reduce((sum, plan) => sum + plan.activeSubscriptions, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando planes...</p>
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
            Planes de Suscripción
          </h1>
          <p className="text-gray-600">
            Gestiona los planes y precios de la plataforma
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MRR Total</p>
                <p className="text-2xl font-bold text-gray-900">{totalMRR.toLocaleString()}€</p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suscripciones Activas</p>
                <p className="text-2xl font-bold text-gray-900">{totalSubscriptions}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ARPU</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalSubscriptions > 0 ? Math.round(totalMRR / totalSubscriptions) : 0}€
                </p>
              </div>
              <span className="text-3xl">📈</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planes Activos</p>
                <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
              </div>
              <span className="text-3xl">🎯</span>
            </div>
          </div>
        </div>

        {/* Botón para crear nuevo plan */}
        <div className="mb-6">
          <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2">
            <span>➕</span> Crear Nuevo Plan
          </button>
        </div>

        {/* Lista de planes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan._id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {plan.price}€<span className="text-sm text-gray-500">/mes</span>
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Características:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-green-500">✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Suscripciones:</span>
                  <span className="font-semibold text-gray-900">{plan.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">MRR:</span>
                  <span className="font-semibold text-green-600">{plan.mrr.toLocaleString()}€</span>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium">
                    Editar
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium">
                    Estadísticas
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla de suscripciones recientes */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actividad Reciente</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Restaurante El Sol
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Plan Premium
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Nueva
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Hace 2 horas
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Café Central
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Plan Básico
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Renovación
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Hace 5 horas
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
