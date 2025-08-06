'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import FunctionalDashboard from '@/components/admin/FunctionalDashboard';
import StatsCard from '@/components/admin/StatsCard';
import Toast from '@/components/Toast';
import { AuthUser, authenticateUser, checkAuth, saveAuth } from '@/lib/auth';
import { GooglePlacesUltraSeparated } from '@/components/GooglePlacesUltraSeparated';
import { GooglePlaceData } from '@/lib/types';

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
  const [selectedBusiness, setSelectedBusiness] = useState<GooglePlaceData | null>(null);
  const [businessPlaceId, setBusinessPlaceId] = useState('');
  const [businessPhotoUrl, setBusinessPhotoUrl] = useState('');
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1); // 1: Datos personales, 2: Búsqueda de negocio
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
    totalOpinions: 0,
    totalPrizes: 0,
    avgRating: 0,
    monthlyGrowth: 0,
    opinionsGrowth: 0,
    inactiveGrowth: 0,
    activePercentage: 0,
    inactivePercentage: 0
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
          inactiveBusinesses: statsData.inactiveBusinesses,
          totalOpinions: statsData.totalOpinions,
          totalPrizes: statsData.totalPrizes,
          avgRating: statsData.avgRating,
          monthlyGrowth: statsData.monthlyGrowth,
          opinionsGrowth: statsData.opinionsGrowth,
          inactiveGrowth: statsData.inactiveGrowth,
          activePercentage: statsData.activePercentage,
          inactivePercentage: statsData.inactivePercentage
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

  const handleBusinessSelected = (place: GooglePlaceData, placeId: string, photoUrl?: string) => {
    setSelectedBusiness(place);
    setBusinessPlaceId(placeId);
    setBusinessPhotoUrl(photoUrl || '');
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (password !== confirmPassword) {
      setLoginError('Las contraseñas no coinciden');
      return;
    }

    if (!name || !email || !phone) {
      setLoginError('Por favor completa todos los campos personales');
      return;
    }

    // Guardar datos temporalmente y pasar al paso 2
    setTempUserData({
      name,
      email,
      phone,
      password,
      businessType
    });
    setRegistrationStep(2);
  };

  const handleStep2Submit = async () => {
    if (!selectedBusiness || !tempUserData) {
      setLoginError('Por favor busca y selecciona tu negocio');
      return;
    }

    setIsCreatingBusiness(true);
    
    try {
      // Crear el negocio con todos los datos
      const businessData = {
        // Datos del usuario del paso 1
        ownerName: tempUserData.name,
        email: tempUserData.email,
        phone: tempUserData.phone,
        password: tempUserData.password,
        
        // Datos del negocio desde Google Places
        businessName: selectedBusiness.name,
        placeId: businessPlaceId,
        address: selectedBusiness.formatted_address || '',
        businessPhone: selectedBusiness.international_phone_number || tempUserData.phone,
        website: selectedBusiness.website || '',
        rating: selectedBusiness.rating || 0,
        totalReviews: selectedBusiness.user_ratings_total || 0,
        photoUrl: businessPhotoUrl,
        
        // Configuración por defecto
        plan: 'trial', // Siempre empezar con prueba gratis
        type: tempUserData.businessType,
        country: 'España',
        
        // Premios por defecto
        prizes: [
          'CENA Max 60€',
          'DESCUENTO 30€', 
          'BOTELLA VINO',
          'HELADO',
          'CERVEZA',
          'REFRESCO',
          'MOJITO',
          'CHUPITO'
        ]
      };
      
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Guardar automáticamente la sesión del usuario
        if (data.user) {
          saveAuth(data.user);
          setUser(data.user);
          loadDashboardData(data.user);
        }
        
        setLoginError('');
        // No necesitamos toast, simplemente cargamos el dashboard
      } else {
        const data = await response.json();
        setLoginError(`Error: ${data.error}`);
      }
    } catch (error) {
      setLoginError('Error al crear el negocio. Inténtalo de nuevo.');
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const handleBackToStep1 = () => {
    setRegistrationStep(1);
    setSelectedBusiness(null);
    setBusinessPlaceId('');
    setBusinessPhotoUrl('');
    setLoginError('');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl">
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
            <div className="space-y-8">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    registrationStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div className={`w-16 h-1 ${registrationStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                    registrationStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    2
                  </div>
                </div>
              </div>

              {/* Step 1: Personal Information */}
              {registrationStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center gap-2">
                      📋 Información Personal
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Primera fila: Nombre y Teléfono */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre completo
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                            placeholder="Juan Pérez"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                            placeholder="+34 900 000 000"
                            required
                          />
                        </div>
                      </div>

                      {/* Segunda fila: Email y Contraseña */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                            placeholder="tu@email.com"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                            placeholder="••••••••"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>

                      {/* Tercera fila: Tipo de negocio y Confirmar contraseña */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de negocio
                          </label>
                          <select
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
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
                            Confirmar contraseña
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                            placeholder="••••••••"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 text-red-600 px-6 py-4 rounded-lg text-sm border border-red-200">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">❌</span>
                        <span>{loginError}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>Continuar</span>
                        <span>→</span>
                      </div>
                    </button>
                    
                    <div className="text-center space-y-2 mt-6">
                      <p className="text-sm text-gray-600">
                        Paso 1 de 2: Información personal
                      </p>
                      <p className="text-xs text-gray-500">
                        En el siguiente paso buscarás tu negocio
                      </p>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 2: Business Search */}
              {registrationStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center gap-2">
                      🔍 Busca tu Negocio
                    </h3>
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 mb-4 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">💡</span>
                        <span>
                          Busca tu negocio en Google Places. Todos los datos se completarán automáticamente: 
                          dirección, teléfono, rating, reseñas y foto.
                        </span>
                      </p>
                      
                      <GooglePlacesUltraSeparated
                        placeholder="Busca tu negocio (ej: Restaurante Euro, Las Galletas)"
                        onPlaceSelected={handleBusinessSelected}
                        onError={(error) => setLoginError(error)}
                        showPhoto={true}
                        photoSize={120}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 text-red-600 px-6 py-4 rounded-lg text-sm border border-red-200">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">❌</span>
                        <span>{loginError}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={handleBackToStep1}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-all"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>←</span>
                        <span>Atrás</span>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleStep2Submit}
                      disabled={isCreatingBusiness || !selectedBusiness}
                      className="flex-2 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                    >
                      {isCreatingBusiness ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span>Creando tu cuenta...</span>
                        </div>
                      ) : selectedBusiness ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>✅</span>
                          <span>Crear cuenta para {selectedBusiness.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>🔍</span>
                          <span>Primero busca tu negocio</span>
                        </div>
                      )}
                    </button>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Al crear una cuenta, obtienes <strong className="text-green-600">7 días de prueba gratis</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      Sin tarjeta de crédito • Cancela cuando quieras • Soporte incluido
                    </p>
                  </div>
                </div>
              )}
            </div>
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
      <FunctionalDashboard user={user} />
    </AdminLayout>
  );
}
