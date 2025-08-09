'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import FunctionalDashboard from '@/components/admin/FunctionalDashboard';
import { AuthUser, authenticateUser, checkAuth, saveAuth } from '@/lib/auth';
import { GooglePlacesUltraSeparated } from '@/components/GooglePlacesUltraSeparated';
import { GooglePlaceData } from '@/lib/types';
import PlanCard from '@/components/PlanCard';

export default function AdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'welcome' | 'login' | 'register'>('welcome');
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Register states
  const [registrationStep, setRegistrationStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessType, setBusinessType] = useState('restaurante');
  const [selectedBusiness, setSelectedBusiness] = useState<GooglePlaceData | null>(null);
  const [businessPlaceId, setBusinessPlaceId] = useState('');
  const [businessPhotoUrl, setBusinessPhotoUrl] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('trial');
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [registerError, setRegisterError] = useState('');
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [tempUserData, setTempUserData] = useState<any>(null);
  
  // Dashboard states
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
    // Cargar planes de suscripción
    const loadSubscriptionPlans = async () => {
      try {
        // Si hay un usuario autenticado, enviar sus datos
        const authUser = checkAuth();
        const params = authUser 
          ? new URLSearchParams({
              userEmail: authUser.email,
              userRole: authUser.role,
            })
          : new URLSearchParams({
              public: 'true' // Indicar que es una solicitud pública
            });

        const response = await fetch(`/api/admin/subscription-plans?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setSubscriptionPlans(data.plans || []);
        }
      } catch (err) {
        console.error('Error al cargar los planes:', err);
      }
    };

    loadSubscriptionPlans();
  }, []);

  useEffect(() => {
    const authUser = checkAuth();
    if (authUser) {
      setUser(authUser);
      loadDashboardData(authUser);
    }
    setLoading(false);
  }, []);

  const loadDashboardData = async (authUser: AuthUser) => {
    try {
      const businessesResponse = await fetch('/api/admin/businesses');
      if (businessesResponse.ok) {
        const data = await businessesResponse.json();
        const filteredBusinesses = authUser.role === 'super_admin' 
          ? data 
          : data.filter((b: any) => b._id === authUser.businessId);
        setBusinesses(filteredBusinesses);
      }

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    
    try {
      const authUser = await authenticateUser(loginEmail, loginPassword);
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

  const handleBusinessSelected = (place: GooglePlaceData, placeId: string, photoUrl?: string) => {
    setSelectedBusiness(place);
    setBusinessPlaceId(placeId);
    setBusinessPhotoUrl(photoUrl || '');
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    
    if (password !== confirmPassword) {
      setRegisterError('Las contraseñas no coinciden');
      return;
    }

    if (!name || !email || !phone) {
      setRegisterError('Por favor completa todos los campos');
      return;
    }

    setTempUserData({
      name,
      email,
      phone,
      password,
      businessType
    });
    setRegistrationStep(2);
  };

  const handleStep2Continue = async () => {
    if (!selectedBusiness || !tempUserData) {
      setRegisterError('Por favor busca y selecciona tu negocio');
      return;
    }

    setIsCreatingBusiness(true);
    setRegisterError('');
    
    try {
      // Guardar datos parciales en la base de datos (lead/registro incompleto)
      const partialBusinessData = {
        ownerName: tempUserData.name,
        email: tempUserData.email,
        phone: tempUserData.phone,
        password: tempUserData.password,
        businessName: selectedBusiness.name,
        placeId: businessPlaceId,
        address: selectedBusiness.formatted_address || '',
        businessPhone: selectedBusiness.international_phone_number || tempUserData.phone,
        website: selectedBusiness.website || '',
        rating: selectedBusiness.rating || 0,
        totalReviews: selectedBusiness.user_ratings_total || 0,
        photoUrl: businessPhotoUrl,
        type: tempUserData.businessType,
        country: 'España',
        // Marcar como registro parcial/lead
        registrationStatus: 'partial',
        registrationStep: 2,
        plan: 'pending', // Plan pendiente de selección
        active: false // No activo hasta completar registro
      };
      
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialBusinessData),
      });

      if (response.ok) {
        const data = await response.json();
        // Guardar el businessId para usar en el paso 3
        setTempUserData({
          ...tempUserData,
          businessId: data.businessId
        });
        setRegistrationStep(3);
        setRegisterError('');
      } else {
        const errorData = await response.json();
        // Si el error es porque el email ya existe, continuar al paso 3
        if (errorData.error && errorData.error.includes('ya existe')) {
          setRegistrationStep(3);
        } else {
          setRegisterError(`Error: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error('Error guardando datos parciales:', error);
      // Continuar al paso 3 aunque falle el guardado parcial
      setRegistrationStep(3);
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!selectedBusiness || !tempUserData) {
      setRegisterError('Por favor busca y selecciona tu negocio');
      return;
    }

    setIsCreatingBusiness(true);
    
    try {
      const businessData = {
        ownerName: tempUserData.name,
        email: tempUserData.email,
        phone: tempUserData.phone,
        password: tempUserData.password,
        businessName: selectedBusiness.name,
        placeId: businessPlaceId,
        address: selectedBusiness.formatted_address || '',
        businessPhone: selectedBusiness.international_phone_number || tempUserData.phone,
        website: selectedBusiness.website || '',
        rating: selectedBusiness.rating || 0,
        totalReviews: selectedBusiness.user_ratings_total || 0,
        photoUrl: businessPhotoUrl,
        plan: 'trial',
        type: tempUserData.businessType,
        country: 'España'
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
        if (data.user) {
          saveAuth(data.user);
          setUser(data.user);
          loadDashboardData(data.user);
        }
        setRegisterError('');
      } else {
        const data = await response.json();
        setRegisterError(`Error: ${data.error}`);
      }
    } catch (error) {
      setRegisterError('Error al crear el negocio. Inténtalo de nuevo.');
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const handleSelectPlanAndPay = async (plan: any) => {
    if (!selectedBusiness || !tempUserData) {
      setRegisterError('Error: Datos incompletos');
      return;
    }

    setIsCreatingBusiness(true);
    setRegisterError('');
    
    try {
      // Primero crear el negocio sin suscripción
      const businessData = {
        ownerName: tempUserData.name,
        email: tempUserData.email,
        phone: tempUserData.phone,
        password: tempUserData.password,
        businessName: selectedBusiness.name,
        placeId: businessPlaceId,
        address: selectedBusiness.formatted_address || '',
        businessPhone: selectedBusiness.international_phone_number || tempUserData.phone,
        website: selectedBusiness.website || '',
        rating: selectedBusiness.rating || 0,
        totalReviews: selectedBusiness.user_ratings_total || 0,
        photoUrl: businessPhotoUrl,
        plan: plan.key, // Usar el plan seleccionado
        type: tempUserData.businessType,
        country: 'España',
        skipSubscription: true // No crear suscripción aún
      };
      
      const businessResponse = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      });

      if (!businessResponse.ok) {
        const errorData = await businessResponse.json();
        throw new Error(errorData.error || 'Error al crear el negocio');
      }

      const { businessId, user: newUser } = await businessResponse.json();
      
      // Guardar el usuario temporalmente
      if (newUser) {
        saveAuth(newUser);
      }

      // Crear sesión de pago con Stripe
      const subscriptionResponse = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          planKey: plan.key,
          userEmail: tempUserData.email,
          action: 'subscribe'
        }),
      });

      if (!subscriptionResponse.ok) {
        const errorData = await subscriptionResponse.json();
        throw new Error(errorData.error || 'Error al crear la sesión de pago');
      }

      const { clientSecret } = await subscriptionResponse.json();
      
      // Guardar datos en localStorage para recuperar después del pago
      localStorage.setItem('pendingSubscription', JSON.stringify({
        businessId,
        planKey: plan.key,
        userEmail: tempUserData.email
      }));

      // Redirigir al componente de pago de Stripe
      // Por ahora, mostrar el componente de pago inline
      // En producción, podrías usar Stripe Checkout redirect
      
      // Aquí deberías mostrar el modal de pago o redirigir a Stripe
      setRegisterError('Redirigiendo al pago...');
      
      // Simular redirección (en producción usar Stripe Checkout)
      setTimeout(() => {
        if (newUser) {
          setUser(newUser);
          loadDashboardData(newUser);
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Error en el proceso de registro:', error);
      setRegisterError(error.message || 'Error al procesar el registro');
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setBusinessType('restaurante');
    setSelectedBusiness(null);
    setBusinessPlaceId('');
    setBusinessPhotoUrl('');
    setRegisterError('');
    setRegistrationStep(1);
    setTempUserData(null);
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Welcome Screen */}
        {currentView === 'welcome' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
              {/* Logo */}
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl text-white font-bold">TV</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">TuValoración</h1>
                <p className="text-gray-600">Sistema de reseñas y fidelización para negocios</p>
              </div>

              {/* Main Question */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">¿Eres un negocio?</h2>
                <p className="text-gray-600 mb-6">Aumenta tus reseñas positivas y fideliza a tus clientes con nuestro sistema de premios</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={() => {
                    resetForms();
                    setCurrentView('login');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span>🔑</span>
                    <span>Ya tengo cuenta</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    resetForms();
                    setCurrentView('register');
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span>✨</span>
                    <span>Crear cuenta nueva</span>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  ¿Buscas dejar una reseña?
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Accede usando el enlace proporcionado por el establecimiento
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login Screen */}
        {currentView === 'login' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              {/* Header */}
              <div className="text-center mb-8">
                <button
                  onClick={() => setCurrentView('welcome')}
                  className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white font-bold">TV</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
                <p className="text-gray-600">Accede a tu panel de administración</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
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
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                {loginError && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">❌</span>
                      <span>{loginError}</span>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Iniciando sesión...</span>
                    </div>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  ¿No tienes cuenta?{' '}
                  <button
                    onClick={() => {
                      resetForms();
                      setCurrentView('register');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Crear cuenta nueva
                  </button>
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  ¿Necesitas ayuda? Contacta con soporte
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Register Screen */}
        {currentView === 'register' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-6xl">
              {/* Header */}
              <div className="text-center mb-8">
                <button
                  onClick={() => {
                    if (registrationStep === 1) {
                      setCurrentView('welcome');
                    } else {
                      setRegistrationStep(1);
                      setRegisterError('');
                    }
                  }}
                  className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white font-bold">TV</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Crear Cuenta</h2>
                <p className="text-gray-600">
                  {registrationStep === 1 
                    ? 'Completa tus datos personales' 
                    : registrationStep === 2
                    ? 'Busca y selecciona tu negocio'
                    : 'Elige tu plan de suscripción'
                  }
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    registrationStep >= 1 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {registrationStep > 1 ? '✓' : '1'}
                  </div>
                  <div className={`w-16 h-1 rounded-full transition-all ${
                    registrationStep >= 2 ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    registrationStep >= 2 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {registrationStep > 2 ? '✓' : '2'}
                  </div>
                  <div className={`w-16 h-1 rounded-full transition-all ${
                    registrationStep >= 3 ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    registrationStep >= 3 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                  }`}>
                    3
                  </div>
                </div>
              </div>

              {/* Step 1: Personal Information */}
              {registrationStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                        placeholder="tu@email.com"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-base"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {registerError && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        <span>{registerError}</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] shadow-lg cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Continuar</span>
                      <span>→</span>
                    </div>
                  </button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Paso 1 de 3: Información personal
                    </p>
                  </div>
                </form>
              )}

              {/* Step 2: Business Search */}
              {registrationStep === 2 && (
                <div className="space-y-6">
                  {/* Cargar planes cuando se llega al paso 2 */}
                  {subscriptionPlans.length === 0 && (
                    <div style={{ display: 'none' }}>
                      {(() => {
                        // Cargar planes si aún no están cargados
                        fetch('/api/admin/subscription-plans?active=true')
                          .then(res => res.json())
                          .then(data => setSubscriptionPlans(data.plans || []))
                          .catch(err => console.error('Error al cargar planes:', err));
                        return null;
                      })()}
                    </div>
                  )}
                  <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <p className="text-sm text-green-700 mb-4 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">💡</span>
                      <span>
                        Busca tu negocio en Google Places. Todos los datos se completarán automáticamente: 
                        dirección, teléfono, rating, reseñas y foto.
                      </span>
                    </p>
                    
                    <GooglePlacesUltraSeparated
                      placeholder="Busca tu negocio (ej: Restaurante Euro, Las Galletas)"
                      onPlaceSelected={handleBusinessSelected}
                      onError={(error) => setRegisterError(error)}
                      showPhoto={true}
                      photoSize={120}
                      className="w-full"
                      hidePromotionalMessages={true}
                    />
                  </div>

                  {registerError && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        <span>{registerError}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleStep2Continue}
                      disabled={!selectedBusiness || isCreatingBusiness}
                      className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg cursor-pointer"
                    >
                      {isCreatingBusiness ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Guardando datos...</span>
                        </div>
                      ) : selectedBusiness ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>Continuar</span>
                          <span>→</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>🔍</span>
                          <span>Primero busca tu negocio</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Plan Selection */}
              {registrationStep === 3 && (
                <div className="space-y-6">
                  {/* Header con mensaje claro */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Elige tu plan de suscripción
                    </h3>
                    <p className="text-lg text-gray-600 mb-3">
                      Todos los planes incluyen prueba gratis
                    </p>
                    <div className="bg-green-100 text-green-800 px-6 py-3 rounded-lg inline-block">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>✅</span>
                        <span>No se cobra nada hoy • Cancela cuando quieras</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de planes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {subscriptionPlans.length > 0 ? (
                      subscriptionPlans.map((plan) => {
                        const isGreen = plan.color === 'green';
                        const isBlue = plan.color === 'blue';
                        const isPurple = plan.color === 'purple';
                        
                        // Calcular fecha del primer cobro
                        const firstChargeDate = new Date();
                        firstChargeDate.setDate(firstChargeDate.getDate() + (plan.trialDays || 0));
                        const formattedDate = firstChargeDate.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        });
                        
                        return (
                          <div
                            key={plan.key}
                            className="relative p-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all bg-white"
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase">
                                  Más Popular
                                </span>
                              </div>
                            )}
                            
                            {/* Badge de días gratis */}
                            {plan.trialDays > 0 && (
                              <div className="text-center mb-4">
                                <div className="bg-green-500 text-white px-4 py-2 rounded-full inline-block">
                                  <span className="font-bold text-lg">
                                    {plan.trialDays} {plan.trialDays === 1 ? 'DÍA' : 'DÍAS'} GRATIS
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-center">
                              <div className="text-4xl mb-3">{plan.icon || '📦'}</div>
                              <h4 className="text-xl font-bold text-gray-900 mb-4">{plan.name}</h4>
                              
                              {/* Precio con formato europeo */}
                              <div className="mb-6">
                                {plan.trialDays > 0 && (
                                  <p className="text-gray-600 text-sm mb-1">después</p>
                                )}
                                <div className={`text-4xl font-bold ${
                                  isGreen ? 'text-green-600' : isBlue ? 'text-blue-600' : isPurple ? 'text-purple-600' : 'text-gray-900'
                                }`}>
                                  {plan.recurringPrice} €
                                  <span className="text-lg font-normal text-gray-600">
                                    /{plan.interval === 'month' ? 'mes' : 'año'}
                                  </span>
                                </div>
                                {plan.setupPrice > 0 && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    + {plan.setupPrice} € de configuración inicial
                                  </p>
                                )}
                              </div>
                              
                              {/* Features */}
                              <ul className="text-sm text-gray-600 space-y-2 text-left mb-6">
                                {plan.features?.map((feature: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className={`mt-0.5 ${
                                      isGreen ? 'text-green-500' : isBlue ? 'text-blue-500' : isPurple ? 'text-purple-500' : 'text-gray-500'
                                    }`}>✓</span>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                              
                              {/* Información sobre el cobro */}
                              {plan.trialDays > 0 && (
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-left">
                                  <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-2 text-blue-800">
                                      <span>📅</span>
                                      <span className="font-semibold">
                                        Primer cobro: {formattedDate}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-700">
                                      <span>💳</span>
                                      <span>Tarjeta requerida (no se cobra hoy)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-700">
                                      <span>❌</span>
                                      <span>Cancela gratis cuando quieras</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Botón CTA individual para cada plan */}
                              <button
                                type="button"
                                onClick={() => handleSelectPlanAndPay(plan)}
                                disabled={isCreatingBusiness}
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                                  isGreen 
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                                    : isBlue
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                                    : isPurple
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                                    : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800'
                                }`}
                              >
                                {plan.trialDays > 0 ? (
                                  <>
                                    Empezar {plan.trialDays} {plan.trialDays === 1 ? 'día' : 'días'} gratis
                                    <span className="block text-xs font-normal mt-0.5 opacity-90">
                                      Sin compromiso • 0 € hoy
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    Suscribirse por {plan.recurringPrice} €/{plan.interval === 'month' ? 'mes' : 'año'}
                                    <span className="block text-xs font-normal mt-0.5 opacity-90">
                                      Pago inmediato
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-3 text-center py-8">
                        <div className="text-4xl mb-4">⏳</div>
                        <p className="text-gray-600">Cargando planes disponibles...</p>
                      </div>
                    )}
                  </div>

                  {registerError && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        <span>{registerError}</span>
                      </div>
                    </div>
                  )}

                  {/* Trust badges */}
                  <div className="flex justify-center gap-6 mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>🔒</span>
                      <span className="text-sm">Pago seguro con Stripe</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>↩️</span>
                      <span className="text-sm">Garantía de devolución</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>📧</span>
                      <span className="text-sm">Te avisamos antes del cobro</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => {
                      resetForms();
                      setCurrentView('login');
                    }}
                    className="text-green-600 hover:text-green-700 font-medium cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <FunctionalDashboard user={user} />
    </AdminLayout>
  );
}
