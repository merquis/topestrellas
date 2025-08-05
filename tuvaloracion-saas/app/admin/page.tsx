'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import StatsCard from '@/components/admin/StatsCard';
import Toast from '@/components/Toast';
import { AuthUser, authenticateUser, checkAuth, saveAuth } from '@/lib/auth';

export default function AdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('restaurante');
  const [loginError, setLoginError] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalOpinions: 0,
    totalPrizes: 0,
    avgRating: 0,
    monthlyGrowth: 0,
    opinionsGrowth: 0
  });
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (authUser) {
      setUser(authUser);
      loadDashboardData(authUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    
    try {
      const authUser = await authenticateUser(email, password);
      if (authUser) {
        saveAuth(authUser);
        setUser(authUser);
        loadDashboardData(authUser);
      } else {
        setLoginError('Credenciales incorrectas');
      }
    } catch (error) {
      setLoginError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (authUser: AuthUser) => {
    try {
      // Cargar negocios según el rol
      const businessesResponse = await fetch('/api/admin/businesses');
      if (businessesResponse.ok) {
        const data = await businessesResponse.json();
        
        // Filtrar según el rol
        const filteredBusinesses = authUser.role === 'super_admin' 
          ? data 
          : data.filter((b: any) => b._id === authUser.businessId);
        
        setBusinesses(filteredBusinesses);
      }

      // Cargar estadísticas reales
      const statsParams = new URLSearchParams({
        userEmail: authUser.email,
        userRole: authUser.role,
        ...(authUser.businessId && authUser.role !== 'super_admin' ? { businessId: authUser.businessId } : {})
      });

      const statsResponse = await fetch(`/api/admin/stats?${statsParams}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalBusinesses: statsData.totalBusinesses,
          activeBusinesses: statsData.activeBusinesses,
          totalOpinions: statsData.totalOpinions,
          totalPrizes: statsData.totalPrizes,
          avgRating: statsData.avgRating,
          monthlyGrowth: statsData.monthlyGrowth,
          opinionsGrowth: statsData.opinionsGrowth
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (password !== confirmPassword) {
      setLoginError('Las contraseñas no coinciden');
      return;
    }
    
    // Redirigir a la página de selección de plan con la contraseña
    router.push(`/admin/setup-business?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&type=${businessType}&password=${encodeURIComponent(password)}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-white font-bold">TV</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">TuValoración</h1>
            <p className="text-gray-600 mt-2">
              {activeTab === 'login' ? 'Panel de Administración' : 'Crea tu negocio'}
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Crear Negocio
            </button>
          </div>
          
          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="admin@tuvaloracion.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {loginError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02]"
              >
                Iniciar Sesión
              </button>
            </form>
          )}
          
          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+34 900 000 000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de negocio
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="restaurante">🍽️ Restaurante</option>
                  <option value="cafeteria">☕ Cafetería</option>
                  <option value="peluqueria">✂️ Peluquería</option>
                  <option value="hotel">🏨 Hotel</option>
                  <option value="tienda">🛍️ Tienda</option>
                  <option value="otro">📦 Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              
              {loginError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02]"
              >
                Continuar →
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Al crear una cuenta, obtienes 7 días de prueba gratis
              </p>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ¿Necesitas ayuda? Contacta con soporte
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Negocios Totales"
          value={stats.totalBusinesses}
          icon="🏢"
          trend={{ value: stats.monthlyGrowth, isPositive: true }}
          bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
          iconBgColor="bg-blue-500"
        />
        <StatsCard
          title="Negocios Activos"
          value={stats.activeBusinesses}
          icon="✅"
          bgColor="bg-gradient-to-br from-green-50 to-green-100"
          iconBgColor="bg-green-500"
        />
        <StatsCard
          title="Opiniones Totales"
          value={stats.totalOpinions.toLocaleString()}
          icon="⭐"
          trend={{ value: stats.opinionsGrowth, isPositive: stats.opinionsGrowth >= 0 }}
          bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
          iconBgColor="bg-yellow-500"
        />
        <StatsCard
          title="Premios Entregados"
          value={stats.totalPrizes}
          icon="🎁"
          bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
          iconBgColor="bg-purple-500"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {[
              { icon: '⭐', text: 'Nueva opinión 5 estrellas en Restaurante La Plaza', time: 'Hace 5 min' },
              { icon: '🎁', text: 'Premio "Cena para 2" canjeado en Café Central', time: 'Hace 15 min' },
              { icon: '🏢', text: 'Nuevo negocio registrado: Peluquería Style', time: 'Hace 1 hora' },
              { icon: '📊', text: 'Informe mensual generado automáticamente', time: 'Hace 2 horas' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <span className="text-2xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-gray-800">{activity.text}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
          <div className="space-y-3">
            {user.role === 'super_admin' && (
              <button
                onClick={() => router.push('/admin/new-business')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
              >
                <span>➕</span> Añadir Negocio
              </button>
            )}
            <button
              onClick={() => router.push('/admin/opinions')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <span>📝</span> Ver Opiniones
            </button>
            <button
              onClick={() => router.push('/admin/analytics')}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <span>📊</span> Estadísticas
            </button>
            <button
              onClick={() => router.push('/admin/settings')}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <span>⚙️</span> Configuración
            </button>
          </div>
        </div>
      </div>

      {/* Business Overview */}
      {user.role === 'super_admin' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Vista General de Negocios</h2>
            <button
              onClick={() => router.push('/admin/businesses')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos →
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Negocio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Opiniones</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {businesses.slice(0, 5).map((business: any) => (
                  <tr key={business._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-800">{business.name}</p>
                        <p className="text-sm text-gray-500">{business.subdomain}.tuvaloracion.com</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {business.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-700">
                        {business.subscription?.plan || 'Trial'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">247</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">4.8</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => router.push(`/admin/edit-business/${business._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
