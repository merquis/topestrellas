'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import { checkAuth } from '@/lib/auth';

export default function BusinessesPage() {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    // Permitir acceso tanto a super_admin como a admin
    if (!['super_admin', 'admin'].includes(authUser.role)) {
      router.push('/admin');
      return;
    }
    setUser(authUser);
  }, []);

  // Efecto separado para cargar negocios cuando el usuario esté disponible
  useEffect(() => {
    if (user) {
      loadBusinesses();
    }
  }, [user]);

  const loadBusinesses = async () => {
    try {
      // Construir URL con parámetros del usuario para filtrado
      const params = new URLSearchParams();
      if (user?.email) params.append('userEmail', user.email);
      if (user?.role) params.append('userRole', user.role);
      
      const response = await fetch(`/api/admin/businesses?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      setToast({ message: 'Error al cargar los negocios', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar ${name}? Esta acción no se puede deshacer.`)) {
      setDeletingId(id);
      try {
        const response = await fetch(`/api/admin/businesses?id=${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setToast({ message: 'Negocio eliminado exitosamente', type: 'success' });
          loadBusinesses();
        } else {
          const data = await response.json();
          setToast({ message: `Error: ${data.error}`, type: 'error' });
        }
      } catch (error) {
        setToast({ message: 'Error al eliminar el negocio', type: 'error' });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleSuspend = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'suspend' : 'activate';
    const actionText = currentStatus ? 'suspender' : 'activar';
    
    if (confirm(`¿Estás seguro de que quieres ${actionText} ${name}?`)) {
      try {
        const response = await fetch(`/api/admin/businesses/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        });

        if (response.ok) {
          setToast({ 
            message: `Negocio ${currentStatus ? 'suspendido' : 'activado'} exitosamente`, 
            type: 'success' 
          });
          loadBusinesses();
        } else {
          const data = await response.json();
          setToast({ message: `Error: ${data.error}`, type: 'error' });
        }
      } catch (error) {
        setToast({ message: `Error al ${actionText} el negocio`, type: 'error' });
      }
    }
  };

  // Filtrar negocios
  const filteredBusinesses = businesses.filter((business: any) => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && business.active) ||
                         (filterStatus === 'inactive' && !business.active);
    const matchesPlan = filterPlan === 'all' || business.subscription?.plan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
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
              <h1 className="text-2xl font-bold text-gray-800">Gestión de Negocios</h1>
              <p className="text-gray-600 mt-1">
                {filteredBusinesses.length} de {businesses.length} negocios
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/new-business')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2"
            >
              <span>➕</span> Añadir Nuevo Negocio
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o subdominio..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="trial">Prueba</option>
                <option value="basic">Básico</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
        </div>

        {/* Business List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Negocio</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Contacto</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Plan</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Estado</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Estadísticas</th>
                  <th className="text-center py-4 px-6 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBusinesses.map((business: any) => (
                  <tr key={business._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-800">{business.name}</p>
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
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        {business.contact?.email && (
                          <p className="text-gray-600">{business.contact.email}</p>
                        )}
                        {business.contact?.phone && (
                          <p className="text-gray-500">{business.contact.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        business.subscription?.plan === 'premium' 
                          ? 'bg-purple-100 text-purple-800'
                          : business.subscription?.plan === 'basic'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {business.subscription?.plan || 'Trial'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        business.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          business.active ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        {business.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">4.8</span>
                        </div>
                        <div className="text-gray-500">
                          247 opiniones
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/edit-business/${business._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleSuspend(business._id, business.name, business.active)}
                          className={`p-2 ${business.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'} rounded-lg transition-colors`}
                          title={business.active ? 'Suspender' : 'Activar'}
                        >
                          {business.active ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => handleDelete(business._id, business.name)}
                          disabled={deletingId === business._id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingId === business._id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron negocios con los filtros aplicados</p>
            </div>
          )}
        </div>
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
