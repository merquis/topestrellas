'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import BusinessMultiSelector from '@/components/BusinessMultiSelector';
import { AuthUser, checkAuth } from '@/lib/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  businessId?: string;
  businessName?: string;
  businessIds?: string[];
  businesses?: { id: string; name: string }[];
  createdAt: string;
  active: boolean;
}

interface Business {
  _id: string;
  name: string;
}

export default function UsersPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
    businessId: '',
    selectedBusinesses: [] as { id: string; name: string }[]
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'admin' as 'admin' | 'super_admin',
    selectedBusinesses: [] as { id: string; name: string }[]
  });

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser || authUser.role !== 'super_admin') {
      router.push('/admin');
      return;
    }
    setUser(authUser);
    loadUsers();
    loadBusinesses();
  }, [router]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setToast({ message: 'Error al cargar usuarios', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al cargar usuarios', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses');
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          businessIds: createForm.selectedBusinesses.map(b => b.id)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: 'Usuario creado exitosamente', type: 'success' });
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'admin',
          businessId: '',
          selectedBusinesses: []
        });
        loadUsers();
      } else {
        setToast({ message: data.error || 'Error al crear usuario', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al crear usuario', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'super_admin') => {
    if (!confirm(`¿Estás seguro de cambiar el rol de este usuario a ${newRole === 'super_admin' ? 'Super Admin' : 'Admin'}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: 'Rol actualizado exitosamente', type: 'success' });
        loadUsers();
      } else {
        setToast({ message: data.error || 'Error al cambiar rol', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al cambiar rol', type: 'error' });
    }
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    const action = active ? 'suspender' : 'reactivar';
    const actionPast = active ? 'suspendido' : 'reactivado';
    const businessAction = active ? 'suspenderán' : 'reactivarán';
    
    // Obtener información del usuario para mostrar cuántos negocios tiene
    const userData = users.find(u => u.id === userId);
    const businessCount = userData?.businesses?.length || 0;
    
    let confirmMessage = `¿Estás seguro de ${action} este usuario?`;
    if (businessCount > 0) {
      confirmMessage += `\n\nEsto también ${businessAction} automáticamente ${businessCount} negocio${businessCount > 1 ? 's' : ''} asociado${businessCount > 1 ? 's' : ''}.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !active }),
      });

      const data = await response.json();

      if (response.ok) {
        let successMessage = `Usuario ${actionPast} exitosamente`;
        if (businessCount > 0) {
          successMessage += ` junto con ${businessCount} negocio${businessCount > 1 ? 's' : ''}`;
        }
        setToast({ message: successMessage, type: 'success' });
        loadUsers();
      } else {
        setToast({ message: data.error || 'Error al cambiar estado', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al cambiar estado', type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: 'Usuario eliminado exitosamente', type: 'success' });
        loadUsers();
      } else {
        setToast({ message: data.error || 'Error al eliminar usuario', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al eliminar usuario', type: 'error' });
    }
  };

  const handleEditUser = (userData: User) => {
    setSelectedUser(userData);
    setEditForm({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      selectedBusinesses: userData.businesses || []
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          businessIds: editForm.selectedBusinesses.map(b => b.id)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ message: 'Usuario actualizado exitosamente', type: 'success' });
        setShowEditModal(false);
        setSelectedUser(null);
        setEditForm({
          name: '',
          email: '',
          role: 'admin',
          selectedBusinesses: []
        });
        loadUsers();
      } else {
        setToast({ message: data.error || 'Error al actualizar usuario', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al actualizar usuario', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👥 Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">Administra usuarios y sus roles en la plataforma</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2"
          >
            <span>➕</span> Crear Usuario
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar usuarios por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Usuario</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Email</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Rol</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Negocio</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Estado</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userData) => (
                  <tr key={userData.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {getInitials(userData.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{userData.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(userData.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-700">{userData.email}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userData.role === 'super_admin' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userData.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-700">
                        {userData.businesses && userData.businesses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {userData.businesses.map((business, index) => (
                              <a
                                key={business.id}
                                href={`/admin/edit-business/${business.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-colors cursor-pointer"
                                title={`Editar negocio: ${business.name}`}
                              >
                                {business.name}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin negocios</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userData.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userData.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditUser(userData)}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleChangeRole(
                            userData.id, 
                            userData.role === 'admin' ? 'super_admin' : 'admin'
                          )}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {userData.role === 'admin' ? '↗️ Promover' : '↘️ Degradar'}
                        </button>
                        <button
                          onClick={() => handleToggleActive(userData.id, userData.active)}
                          className={`text-sm font-medium ${
                            userData.active 
                              ? 'text-red-600 hover:text-red-700' 
                              : 'text-green-600 hover:text-green-700'
                          }`}
                          title={userData.active ? 'Suspender usuario y todos sus negocios' : 'Reactivar usuario y todos sus negocios'}
                        >
                          {userData.active ? '⏸️ Suspender' : '▶️ Reactivar'}
                        </button>
                        {userData.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Crear Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value as 'admin' | 'super_admin'})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="admin">Admin (Negocio específico)</option>
                    <option value="super_admin">Super Admin (Acceso completo)</option>
                  </select>
                </div>
                {createForm.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Negocios asociados {user?.role === 'super_admin' ? '(opcional)' : '*'}
                    </label>
                    <BusinessMultiSelector
                      selectedBusinesses={createForm.selectedBusinesses}
                      onSelectionChange={(businesses) => setCreateForm({...createForm, selectedBusinesses: businesses})}
                      placeholder="Buscar y seleccionar negocios..."
                      required={createForm.role === 'admin' && user?.role !== 'super_admin'}
                    />
                    {user?.role === 'super_admin' && (
                      <p className="text-sm text-gray-500 mt-1">
                        Como super admin, puedes asignar negocios más tarde desde la edición del usuario.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value as 'admin' | 'super_admin'})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="admin">Admin (Negocio específico)</option>
                    <option value="super_admin">Super Admin (Acceso completo)</option>
                  </select>
                </div>
                {editForm.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Negocios asociados *
                    </label>
                    <BusinessMultiSelector
                      selectedBusinesses={editForm.selectedBusinesses}
                      onSelectionChange={(businesses) => setEditForm({...editForm, selectedBusinesses: businesses})}
                      placeholder="Buscar y seleccionar negocios..."
                      required={editForm.role === 'admin'}
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      setEditForm({
                        name: '',
                        email: '',
                        role: 'admin',
                        selectedBusinesses: []
                      });
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar Usuario'}
                  </button>
                </div>
              </form>
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
