'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import { BusinessQR } from '@/components/QRCodeGenerator';
import { QuickQRDesigner } from '@/components/QRDesigner';
import { checkAuth } from '@/lib/auth';

export default function MyBusinessPage() {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    // Solo permitir acceso a admin normal (no super_admin)
    if (authUser.role !== 'admin') {
      router.push('/admin/businesses'); // Redirigir super_admin a la página completa
      return;
    }
    setUser(authUser);
  }, []);

  // Efecto separado para cargar negocios cuando el usuario esté disponible
  useEffect(() => {
    if (user) {
      loadMyBusinesses();
    }
  }, [user]);

  const loadMyBusinesses = async () => {
    try {
      // Construir URL con parámetros del usuario para filtrado
      const params = new URLSearchParams();
      params.append('userEmail', user.email);
      params.append('userRole', user.role);
      
      const response = await fetch(`/api/admin/businesses?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error('Error loading my businesses:', error);
      setToast({ message: 'Error al cargar mis negocios', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar negocios por búsqueda
  const filteredBusinesses = businesses.filter((business: any) => {
    return business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           business.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando mis negocios...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🏢 Mis Negocios</h1>
              <p className="text-gray-600 mt-1">
                Gestiona los negocios asignados a tu cuenta ({filteredBusinesses.length} negocio{filteredBusinesses.length !== 1 ? 's' : ''})
              </p>
            </div>
            {businesses.length === 0 && (
              <button
                onClick={() => router.push('/admin/new-business')}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2"
              >
                <span>➕</span> Añadir Nuevo Negocio
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar en mis negocios
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o subdominio..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Business Cards */}
        {filteredBusinesses.length > 0 ? (
          <div className="grid gap-6">
            {filteredBusinesses.map((business: any) => (
              <div key={business._id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex flex-col lg:flex-row">
                  {/* Left Section - Image and Main Info */}
                  <div className="flex-1 flex flex-col md:flex-row">
                    {/* Business Image - Más grande y cuadrada */}
                    <div className="w-full md:w-64 h-64 md:h-auto relative flex-shrink-0 overflow-hidden">
                      {business.googlePlaces?.photoUrl || business.config?.theme?.logoUrl ? (
                        <img
                          src={business.googlePlaces?.photoUrl || business.config?.theme?.logoUrl}
                          alt={business.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=6366F1&color=fff&size=400&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-5xl font-bold drop-shadow-lg">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Business Info - Diseño mejorado */}
                    <div className="flex-1 p-5 lg:p-6">
                      {/* Header con título y URL */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{business.name}</h3>
                          {/* Badge de estado alineado con el título */}
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                            business.active 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {business.active ? '● Activo' : '● Inactivo'}
                          </span>
                        </div>
                        <a 
                          href={`https://${business.subdomain}.tuvaloracion.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors group"
                        >
                          <span className="text-sm font-medium">{business.subdomain}.tuvaloracion.com</span>
                          <svg className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>

                      {/* Stats Cards - Diseño más visual */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Rating</p>
                              <p className="text-xl font-bold text-gray-900 mt-0.5">
                                {business.googlePlaces?.rating || business.stats?.avgRating || '—'}
                              </p>
                            </div>
                            <div className="text-2xl">⭐</div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Opiniones</p>
                              <p className="text-xl font-bold text-gray-900 mt-0.5">
                                {business.googlePlaces?.totalReviews || business.stats?.googleReviews || 0}
                              </p>
                            </div>
                            <div className="text-2xl">💬</div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Plan</p>
                              <p className="text-lg font-bold text-gray-900 mt-0.5 capitalize">
                                {business.subscription?.plan || 'Trial'}
                              </p>
                            </div>
                            <div className="text-2xl">
                              {business.subscription?.plan === 'premium' ? '👑' : 
                               business.subscription?.plan === 'basic' ? '🎯' : '🎁'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info - Diseño más limpio */}
                      {(business.contact?.email || business.contact?.phone) && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-5">
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {business.contact?.email && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                  <span className="text-base">✉️</span>
                                </div>
                                <span className="font-medium">{business.contact.email}</span>
                              </div>
                            )}
                            {business.contact?.phone && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                  <span className="text-base">📱</span>
                                </div>
                                <span className="font-medium">{business.contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons - Diseño más moderno */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/admin/edit-business/${business._id}`)}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => window.open(`https://${business.subdomain}.tuvaloracion.com`, '_blank')}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Ver Sitio</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section - NO MODIFICAR */}
                  <div className="lg:w-80 p-5 lg:p-6 bg-gradient-to-br from-gray-50 to-white border-l border-gray-100">
                    <BusinessQR
                      subdomain={business.subdomain}
                      businessName={business.name}
                      variant="full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {searchTerm ? 'No se encontraron negocios' : 'No tienes negocios asignados'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? `No hay negocios que coincidan con "${searchTerm}"`
                : 'Contacta con el administrador para que te asigne negocios'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}
