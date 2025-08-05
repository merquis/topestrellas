'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import { checkAuth } from '@/lib/auth';

function OpinionsContent() {
  const [user, setUser] = useState<any>(null);
  const [opinions, setOpinions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Obtener filtros de los parámetros de URL
  const selectedBusiness = searchParams.get('business') || 'all';
  const dateFilter = searchParams.get('date') || 'todas';
  const ratingFilter = searchParams.get('rating') || 'todas';
  const resultsPerPage = parseInt(searchParams.get('limit') || '100');
  const currentPage = parseInt(searchParams.get('page') || '1');

  // Funciones para actualizar los filtros en la URL
  const updateUrlParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === 'all' || value === 'todas' || value === '100' || value === '1') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/admin/opinions?${params.toString()}`);
  };

  const setSelectedBusiness = (value: string) => updateUrlParams({ business: value });
  const setDateFilter = (value: string) => updateUrlParams({ date: value, page: '1' });
  const setRatingFilter = (value: string) => updateUrlParams({ rating: value, page: '1' });
  const setResultsPerPage = (value: number) => updateUrlParams({ limit: value.toString(), page: '1' });
  const setCurrentPage = (value: number) => updateUrlParams({ page: value.toString() });

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

  // Efecto separado para cargar datos cuando el usuario esté disponible
  useEffect(() => {
    if (user) {
      loadUserBusinesses();
      loadOpinions();
    }
  }, [user]);

  // Escuchar cambios en el selector global de negocios
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBusinessChange = () => {
      try {
        const storedBusiness = localStorage.getItem('selectedBusiness');
        if (storedBusiness) {
          const business = JSON.parse(storedBusiness);
          console.log('📦 Business changed in opinions page:', business);
          // Actualizar el filtro de negocio y recargar opiniones
          setSelectedBusiness(business._id);
        }
      } catch (error) {
        console.error('❌ Error parsing stored business:', error);
      }
    };

    // Cargar negocio inicial desde localStorage
    handleBusinessChange();

    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleBusinessChange);
    window.addEventListener('businessChanged', handleBusinessChange);

    return () => {
      window.removeEventListener('storage', handleBusinessChange);
      window.removeEventListener('businessChanged', handleBusinessChange);
    };
  }, []);

  // Recargar opiniones cuando cambien los filtros
  useEffect(() => {
    if (user) {
      loadOpinions();
    }
  }, [selectedBusiness, dateFilter, ratingFilter, currentPage, resultsPerPage]);

  const loadUserBusinesses = async () => {
    try {
      const params = new URLSearchParams();
      params.append('userEmail', user.email);
      params.append('userRole', user.role);
      
      const response = await fetch(`/api/admin/businesses?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const loadOpinions = async () => {
    try {
      const params = new URLSearchParams();
      params.append('userEmail', user.email);
      params.append('userRole', user.role);
      
      if (selectedBusiness !== 'all') {
        params.append('businessId', selectedBusiness);
      }
      
      params.append('dateFilter', dateFilter);
      params.append('ratingFilter', ratingFilter);
      params.append('page', currentPage.toString());
      params.append('limit', resultsPerPage.toString());
      
      console.log('Loading opinions with params:', params.toString());
      
      const response = await fetch(`/api/admin/opinions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Opinions response:', data);
        setOpinions(data.opinions || []);
        
        // No mostrar toast cuando no hay opiniones, se mostrará en la UI
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setToast({ message: `Error: ${errorData.error || 'Error desconocido'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error loading opinions:', error);
      setToast({ message: 'Error al cargar las opiniones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando opiniones...</p>
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
              <h1 className="text-2xl font-bold text-gray-800">⭐ Opiniones</h1>
              <p className="text-gray-600 mt-1">
                Gestiona las opiniones de tus clientes
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm font-medium text-gray-700">
                Ver opiniones de:
              </div>
              
              {/* Business Filter */}
              {businesses.length > 1 && (
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos mis negocios</option>
                  {businesses.map((business: any) => (
                    <option key={business._id} value={business._id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Filters */}
              <button
                onClick={() => setDateFilter('todas')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'todas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setDateFilter('hoy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'hoy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setDateFilter('ayer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'ayer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ayer
              </button>
              <button
                onClick={() => setDateFilter('semana')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'semana'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Última Semana
              </button>
              <button
                onClick={() => setDateFilter('mes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'mes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Último Mes
              </button>
              <button
                onClick={() => setDateFilter('3meses')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === '3meses'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 3 Meses
              </button>

              {/* Rating Filter */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700">Filtrar por puntuación:</span>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todas">Todas</option>
                  <option value="5">5 estrellas</option>
                  <option value="4">4 estrellas</option>
                  <option value="3">3 estrellas</option>
                  <option value="2">2 estrellas</option>
                  <option value="1">1 estrella</option>
                </select>
              </div>

              {/* Results per page */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700">Resultados por página:</span>
                <select
                  value={resultsPerPage}
                  onChange={(e) => setResultsPerPage(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Opinions List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {opinions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {opinions.map((opinion: any) => (
                <div key={opinion._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${getRatingColor(opinion.rating)}`}>
                            {getRatingStars(opinion.rating)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {opinion.rating}/5
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {opinion.date && opinion.time ? 
                            `${opinion.date.split('/').reverse().join('/')}, ${opinion.time.substring(0, 5)}` :
                            formatDate(opinion.createdAt)
                          }
                        </div>
                        {businesses.length > 1 && (
                          <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {(businesses as any[]).find((b: any) => b._id === opinion.businessId)?.name || 'Negocio'}
                          </div>
                        )}
                      </div>
                      
                      {opinion.comment && (
                        <div className="mb-3">
                          <p className="text-gray-700 leading-relaxed">
                            "{opinion.comment}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>{opinion.customerName || 'Cliente anónimo'}</span>
                        </div>
                        {opinion.customerEmail && (
                          <div className="flex items-center gap-1">
                            <span>📧</span>
                            <span>{opinion.customerEmail}</span>
                          </div>
                        )}
                        {opinion.customerPhone && (
                          <div className="flex items-center gap-1">
                            <span>📞</span>
                            <span>{opinion.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prize Info */}
                    {(opinion.prize || opinion.premio) && (
                      <div className="ml-6 text-right">
                        <div className="bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-lg p-3">
                          <div className="text-sm font-medium text-orange-900 mb-1">
                            🎁 Premio Ganado
                          </div>
                          <div className="text-sm text-orange-800 mb-1">
                            {opinion.premio || 
                             (opinion.prize?.emoji ? `${opinion.prize.emoji} ${opinion.prize.name}` : opinion.prize?.name) || 
                             opinion.prize}
                          </div>
                          {opinion.codigoPremio && (
                            <div className="text-xs text-orange-700 font-mono bg-orange-50 px-2 py-1 rounded border">
                              {opinion.codigoPremio}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No hay opiniones
              </h3>
              <p className="text-gray-600 mb-4">
                No se encontraron opiniones con los filtros aplicados
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 inline-block">
                Usuario: {user.email}, Rol: {user.role}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {opinions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {opinions.length} opiniones
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-2 text-sm font-medium">
                  Página {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={opinions.length < resultsPerPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
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

export default function OpinionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando opiniones...</p>
        </div>
      </div>
    }>
      <OpinionsContent />
    </Suspense>
  );
}
