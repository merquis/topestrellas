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
