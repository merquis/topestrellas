'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth } from '@/lib/auth';

export default function AffiliatesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
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
            Gestión de Afiliados
          </h1>
          <p className="text-gray-600">
            Administra tus partners y programa de afiliados
          </p>
        </div>

        {/* Estado de desarrollo */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🚧</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Sección en Desarrollo
              </h3>
              <p className="text-amber-800">
                El módulo de afiliados está siendo desarrollado. Pronto podrás gestionar partners, 
                comisiones y tracking de referidos desde aquí.
              </p>
            </div>
          </div>
        </div>

        {/* Preview de funcionalidades futuras */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Afiliados Activos</h3>
                <p className="text-sm text-gray-500">Próximamente</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Comisiones</h3>
                <p className="text-sm text-gray-500">Próximamente</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Estadísticas</h3>
                <p className="text-sm text-gray-500">Próximamente</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded animate-pulse w-5/6"></div>
            </div>
          </div>
        </div>

        {/* Características futuras */}
        <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            🎯 Funcionalidades que vendrán
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <p className="font-medium text-gray-800">Gestión de Afiliados</p>
                <p className="text-sm text-gray-600">Alta, baja y edición de partners</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <p className="font-medium text-gray-800">Sistema de Comisiones</p>
                <p className="text-sm text-gray-600">Configuración de porcentajes y pagos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <p className="font-medium text-gray-800">Tracking de Referidos</p>
                <p className="text-sm text-gray-600">Enlaces únicos y seguimiento</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <p className="font-medium text-gray-800">Dashboard de Afiliado</p>
                <p className="text-sm text-gray-600">Panel exclusivo para partners</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <p className="font-medium text-gray-800">Reportes y Analytics</p>
                <p className="text-sm text-gray-600">Métricas de conversión y ROI</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <p className="font-medium text-gray-800">Materiales de Marketing</p>
                <p className="text-sm text-gray-600">Recursos para afiliados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to action temporal */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            ¿Necesitas gestionar afiliados ahora mismo?
          </p>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
