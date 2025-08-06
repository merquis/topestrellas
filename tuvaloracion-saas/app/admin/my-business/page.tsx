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
          <div className="space-y-4">
            {filteredBusinesses.map((business: any) => (
              <div key={business._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="flex flex-col md:flex-row">
                  {/* Business Image */}
                  <div className="w-32 overflow-hidden rounded-l-xl relative flex-shrink-0" style={{ aspectRatio: '1 / 1' }}>
                    {business.googlePlaces?.photoUrl || business.config?.theme?.logoUrl ? (
                      <img
                        src={business.googlePlaces?.photoUrl || business.config?.theme?.logoUrl}
                        alt={business.name}
                        className="w-full h-full object-cover object-center block"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=4F46E5&color=fff&size=160`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                          {business.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Business Info + QR Layout */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Main Info (70%) */}
                      <div className="flex-1 lg:w-[70%]">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{business.name}</h3>
                            <a 
                              href={`https://${business.subdomain}.tuvaloracion.com`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              {business.subdomain}.tuvaloracion.com
                              <span className="text-xs">↗</span>
                            </a>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            business.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              business.active ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            {business.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap items-center gap-4 mb-3">
                          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-lg">
                            <span className="text-yellow-500">★</span>
                            <span className="font-bold text-gray-800">
                              {business.googlePlaces?.rating || business.stats?.avgRating || 'N/A'}
                            </span>
                            <span className="text-xs text-gray-600">Rating</span>
                          </div>
                          <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-lg">
                            <span className="text-blue-500">📊</span>
                            <span className="font-bold text-gray-800">
                              {business.googlePlaces?.totalReviews || business.stats?.googleReviews || 0}
                            </span>
                            <span className="text-xs text-gray-600">Opiniones</span>
                          </div>
                          {/* Plan */}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            business.subscription?.plan === 'premium' 
                              ? 'bg-purple-100 text-purple-800'
                              : business.subscription?.plan === 'basic'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Plan {business.subscription?.plan || 'Trial'}
                          </span>
                        </div>

                        {/* Contact Info */}
                        {(business.contact?.email || business.contact?.phone) && (
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            {business.contact?.email && (
                              <span className="flex items-center gap-1">
                                <span>📧</span>
                                {business.contact.email}
                              </span>
                            )}
                            {business.contact?.phone && (
                              <span className="flex items-center gap-1">
                                <span>📞</span>
                                {business.contact.phone}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => router.push(`/admin/edit-business/${business._id}`)}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => window.open(`https://${business.subdomain}.tuvaloracion.com`, '_blank')}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            👁️ Ver Sitio
                          </button>
                        </div>
                      </div>

                      {/* QR Code Section (30%) */}
                      <div className="lg:w-[30%] flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[160px] space-y-3">
                        <BusinessQR
                          subdomain={business.subdomain}
                          businessName={business.name}
                          type="hd"
                          showDownloadButton={true}
                          className="w-full"
                        />
                        
                        {/* Botón QR Irresistible */}
                        <QuickQRDesigner
                          subdomain={business.subdomain}
                          businessName={business.name}
                          className="w-full"
                        />
                      </div>
                    </div>
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
