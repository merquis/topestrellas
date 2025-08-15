'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import FunctionalDashboard from '@/components/admin/FunctionalDashboard';
import { AuthUser, authenticateUser, checkAuth, saveAuth } from '@/lib/auth';
import { GooglePlacesUltraSeparated } from '@/components/GooglePlacesUltraSeparated';
import { GooglePlaceData } from '@/lib/types';
import PlanCard from '@/components/PlanCard';
import dynamic from 'next/dynamic';

// Importar dinámicamente el componente de Stripe para evitar problemas de SSR
const StripePaymentForm = dynamic(
  () => import('@/components/StripePaymentForm'),
  { ssr: false }
);

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
  const [businessAddressComponents, setBusinessAddressComponents] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('trial');
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [registerError, setRegisterError] = useState('');
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [tempUserData, setTempUserData] = useState<any>(null);
  
  // Payment states - Refactorizado para el Paso 4
  const [selectedPlanData, setSelectedPlanData] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [pendingBusinessId, setPendingBusinessId] = useState('');
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  
  // Billing fields
  const [companyName, setCompanyName] = useState('');
  const [companyNIF, setCompanyNIF] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingProvince, setBillingProvince] = useState('');
  const [billingCountry, setBillingCountry] = useState('España');
  const [billingFieldsError, setBillingFieldsError] = useState<{companyName?: string; companyNIF?: string}>({});
  
  // Nuevos estados para el formulario de facturación
  const [customerType, setCustomerType] = useState<'autonomo' | 'empresa'>('autonomo');
  const [legalName, setLegalName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  
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

  // Verificar si hay mensaje de éxito del pago cuando se muestra el login
  useEffect(() => {
    if (currentView === 'login') {
      const paymentSuccess = localStorage.getItem('paymentSuccess');
      if (paymentSuccess === 'true') {
        const message = localStorage.getItem('successMessage');
        // Mostrar el mensaje como información positiva, no como error
        setLoginError(''); // Limpiar errores previos
        // Crear un mensaje temporal de éxito
        const successDiv = document.createElement('div');
        successDiv.className = 'bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm border border-green-200 mb-4';
        successDiv.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-green-500">✅</span>
            <span>${message || '¡Registro completado! Inicia sesión para acceder.'}</span>
          </div>
        `;
        
        // Insertar el mensaje antes del formulario
        setTimeout(() => {
          const loginForm = document.querySelector('form');
          if (loginForm && loginForm.parentNode) {
            loginForm.parentNode.insertBefore(successDiv, loginForm);
            
            // Eliminar el mensaje después de 10 segundos
            setTimeout(() => {
              if (successDiv.parentNode) {
                successDiv.remove();
              }
            }, 10000);
          }
        }, 100);
        
        // Limpiar localStorage
        localStorage.removeItem('paymentSuccess');
        localStorage.removeItem('successMessage');
      }
    }
  }, [currentView]);

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
    // Capturar los datos esenciales del negocio de Google Places
    console.log('Datos del negocio seleccionado:', {
      nombre: place?.name,
      puntuacion: place?.rating,
      numeroReseñas: place?.user_ratings_total,
      direccion: place?.formatted_address,
      addressComponents: place?.address_components
    });
    setSelectedBusiness(place);
    setBusinessPlaceId(placeId);
    setBusinessPhotoUrl(photoUrl || '');
    setBusinessAddressComponents(place?.address_components || []);
    
    // Extraer componentes de dirección para facturación
    if (place?.address_components) {
      const components = place.address_components;
      
      // Debug: Ver todos los componentes
      console.log('Address Components:', components);
      
      // Extraer dirección (calle y número)
      const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name || '';
      const route = components.find(c => c.types.includes('route'))?.long_name || '';
      const address = streetNumber ? `${route} ${streetNumber}` : route;
      
      // Si no hay calle específica, intentar usar la dirección formateada
      if (address) {
        setBillingAddress(address);
      } else if (place.formatted_address) {
        // Extraer la primera parte de la dirección formateada (antes de la primera coma)
        const addressParts = place.formatted_address.split(',');
        if (addressParts.length > 0) {
          setBillingAddress(addressParts[0].trim());
        }
      }
      
      // Extraer código postal
      const postalCode = components.find(c => c.types.includes('postal_code'))?.long_name || '';
      setBillingPostalCode(postalCode);
      
      // Extraer ciudad (locality o administrative_area_level_3)
      const city = components.find(c => c.types.includes('locality'))?.long_name || 
                   components.find(c => c.types.includes('administrative_area_level_3'))?.long_name || 
                   components.find(c => c.types.includes('administrative_area_level_4'))?.long_name || '';
      setBillingCity(city);
      
      // Extraer provincia (administrative_area_level_2 o administrative_area_level_1)
      const province = components.find(c => c.types.includes('administrative_area_level_2'))?.long_name || 
                      components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '';
      setBillingProvince(province);
      
      // Extraer país
      const country = components.find(c => c.types.includes('country'))?.long_name || 'España';
      setBillingCountry(country);
      
      // Log para debug
      console.log('Datos extraídos:', {
        address,
        postalCode,
        city,
        province,
        country
      });
    }
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
        addressComponents: businessAddressComponents,
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

  // Nueva función para seleccionar plan (Paso 3)
  const handleSelectPlan = async (plan: any) => {
    if (!selectedBusiness || !tempUserData) {
      setRegisterError('Error: Datos incompletos');
      return;
    }

    // Guardar el plan seleccionado
    setSelectedPlanData(plan);
    setIsCreatingBusiness(true);
    setRegisterError('');
    
    try {
      // Si ya tenemos un businessId del paso 2, usarlo
      let businessId = tempUserData.businessId;
      
      // Si no tenemos businessId (por si el guardado parcial falló), crear el negocio ahora
      if (!businessId) {
        const businessData = {
          ownerName: tempUserData.name,
          email: tempUserData.email,
          phone: tempUserData.phone,
          password: tempUserData.password,
          businessName: selectedBusiness.name,
          placeId: businessPlaceId,
          address: selectedBusiness.formatted_address || '',
          addressComponents: businessAddressComponents, // Añadido para mantener consistencia
          businessPhone: selectedBusiness.international_phone_number || tempUserData.phone,
          website: selectedBusiness.website || '',
          rating: selectedBusiness.rating || 0,
          totalReviews: selectedBusiness.user_ratings_total || 0,
          photoUrl: businessPhotoUrl,
          plan: plan.key,
          type: tempUserData.businessType,
          country: 'España',
          registrationStatus: 'plan_selected', // Plan seleccionado pero no pagado
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
          if (errorData.error && errorData.error.includes('ya existe')) {
            throw new Error('El email ya está registrado. Por favor, inicia sesión.');
          }
          throw new Error(errorData.error || 'Error al crear el negocio');
        }

        const responseData = await businessResponse.json();
        businessId = responseData.businessId;
        
        // Actualizar tempUserData con el businessId
        setTempUserData({
          ...tempUserData,
          businessId
        });
      }

      // Guardar el businessId para el paso 4
      setPendingBusinessId(businessId);
      
      // Avanzar al paso 4 (pago)
      setRegistrationStep(4);
      setRegisterError('');
      
      // Preparar el pago
      await preparePayment(businessId, plan);
      
    } catch (error: any) {
      console.error('Error al seleccionar plan:', error);
      setRegisterError(error.message || 'Error al procesar la selección del plan');
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  // Nueva función para preparar el pago (Paso 4)
  const preparePayment = async (businessId: string, plan: any) => {
    setIsLoadingPayment(true);
    
    try {
      // NO enviar datos de facturación en este momento
      // Solo crear el SetupIntent para validar el método de pago
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
          // NO incluir billingInfo aquí - se enviará después de validar el pago
        }),
      });

      const subscriptionData = await subscriptionResponse.json();

      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error || 'Error al crear la sesión de pago');
      }

      const { clientSecret, subscriptionId, customerId } = subscriptionData;
      
      if (!clientSecret) {
        throw new Error('No se pudo obtener el client secret para el pago');
      }

      // Guardar datos en localStorage para recuperar después del pago
      localStorage.setItem('pendingSubscription', JSON.stringify({
        businessId,
        planKey: plan.key,
        userEmail: tempUserData.email,
        subscriptionId,
        customerId,
        clientSecret
      }));

      // Establecer el clientSecret para el formulario de pago
      setClientSecret(clientSecret);
      
    } catch (error: any) {
      console.error('Error preparando el pago:', error);
      setRegisterError(error.message || 'Error al preparar el pago');
    } finally {
      setIsLoadingPayment(false);
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
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">TopEstrellas</h1>
                    <span className="text-xs text-gray-500 -mt-1">.com</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">Sistema de reseñas y fidelización para negocios</p>
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
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">TopEstrellas.com</span>
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
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">TopEstrellas.com</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Crear Cuenta</h2>
                <p className="text-gray-600 text-sm">
                  {registrationStep === 1 
                    ? 'Completa tus datos personales' 
                    : registrationStep === 2
                    ? 'Busca y selecciona tu negocio'
                    : registrationStep === 4
                    ? 'Completa tu pago'
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
                  <div className={`w-12 h-1 rounded-full transition-all ${
                    registrationStep >= 2 ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    registrationStep >= 2 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {registrationStep > 2 ? '✓' : '2'}
                  </div>
                  <div className={`w-12 h-1 rounded-full transition-all ${
                    registrationStep >= 3 ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    registrationStep >= 3 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {registrationStep > 3 ? '✓' : '3'}
                  </div>
                  <div className={`w-12 h-1 rounded-full transition-all ${
                    registrationStep >= 4 ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    registrationStep >= 4 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
                  }`}>
                    4
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
                      Paso 1 de 4: Información personal
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

              {/* Step 4: Payment */}
              {registrationStep === 4 && (
                <div className="space-y-6">
                  {console.log("Hola - Estoy en el paso 4")}
                  {console.log("clientSecret:", clientSecret)}
                  {console.log("selectedPlanData:", selectedPlanData)}
                  {console.log("isLoadingPayment:", isLoadingPayment)}
                  
                  {/* Mostrar loading mientras se prepara el pago */}
                  {isLoadingPayment && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Preparando el formulario de pago...</p>
                    </div>
                  )}
                  
                  {/* Mostrar error si no hay clientSecret */}
                  {!isLoadingPayment && !clientSecret && (
                    <div className="text-center py-12">
                      <div className="text-red-500 text-4xl mb-4">⚠️</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Error al preparar el pago
                      </h3>
                      <p className="text-gray-600 mb-4">
                        No se pudo conectar con el sistema de pagos.
                      </p>
                      {registerError && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200 max-w-md mx-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-red-500">❌</span>
                            <span>{registerError}</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setRegistrationStep(3);
                          setClientSecret('');
                          setRegisterError('');
                        }}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Volver a intentar
                      </button>
                    </div>
                  )}
                  
                  {/* Mostrar formulario de pago cuando esté listo */}
                  {!isLoadingPayment && clientSecret && selectedPlanData && (
                    <>
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Completa tu suscripción
                        </h3>
                        <p className="text-lg text-gray-600">
                          Último paso: Añade tu método de pago
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Columna Izquierda - Resumen del pedido */}
                    <div className="space-y-6">
                      {/* Información del negocio */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span>🏢</span>
                          <span>Tu Negocio</span>
                        </h4>
                        
                        <div className="flex gap-4">
                          {/* Columna izquierda - Imagen (25%) */}
                          {businessPhotoUrl && (
                            <div className="w-1/4 flex-shrink-0">
                              <img
                                src={businessPhotoUrl}
                                alt={selectedBusiness?.name || 'Foto del negocio'}
                                className="aspect-square w-full object-cover rounded-lg border"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}
                          
                          {/* Columna derecha - Datos (75%) */}
                          <div className={`${businessPhotoUrl ? 'w-3/4' : 'w-full'} space-y-3`}>
                            <div>
                              <p className="text-sm text-gray-600">Nombre</p>
                              <p className="font-semibold text-gray-900">{selectedBusiness?.name || 'Tu Negocio'}</p>
                            </div>
                            {selectedBusiness?.rating && (
                              <div>
                                <p className="text-sm text-gray-600">Rating actual</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-500">⭐</span>
                                  <span className="font-semibold">{selectedBusiness.rating}</span>
                                  <span className="text-gray-500">({selectedBusiness.user_ratings_total || 0} reseñas)</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Plan seleccionado */}
                      <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span>📦</span>
                          <span>Plan Seleccionado</span>
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{selectedPlanData?.name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {selectedPlanData?.trialDays > 0 
                                  ? `${selectedPlanData.trialDays} días de prueba gratis`
                                  : 'Sin periodo de prueba'
                                }
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold text-green-600">
                                {selectedPlanData?.recurringPrice} €
                              </p>
                              <p className="text-sm text-gray-600">
                                /{selectedPlanData?.interval === 'month' ? 'mes' : 'año'}
                              </p>
                            </div>
                          </div>

                          {/* Features del plan */}
                          {selectedPlanData?.features && selectedPlanData.features.length > 0 && (
                            <div className="pt-4 border-t border-gray-200">
                              <p className="text-sm font-semibold text-gray-700 mb-3">Incluye:</p>
                              <div className="space-y-3">
                                <ul className="space-y-2">
                                  {(showAllFeatures 
                                    ? selectedPlanData.features 
                                    : selectedPlanData.features.slice(0, 3)
                                  ).map((feature: string, index: number) => (
                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                      <span className="leading-relaxed">{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                                
                                {/* Botón Ver más/menos */}
                                {selectedPlanData.features.length > 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setShowAllFeatures(!showAllFeatures);
                                    }}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-all duration-200 hover:gap-3 group mt-3"
                                  >
                                    <span>
                                      {showAllFeatures 
                                        ? 'Ver menos características' 
                                        : `Ver todas las ventajas (+${selectedPlanData.features.length - 3} más)`
                                      }
                                    </span>
                                    <svg 
                                      className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                                        showAllFeatures ? 'rotate-180' : ''
                                      }`} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Formulario de datos de facturación */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <span>📋</span>
                          <span>Datos de facturación</span>
                        </h4>
                        <p className="text-gray-600 text-sm mb-6">Información que aparecerá en tus facturas</p>
                        
                        <div className="space-y-4">
                          {/* Tipo de cliente */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Tipo de cliente *
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                customerType === 'autonomo' 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-300 hover:border-blue-300'
                              }`}>
                                <input
                                  type="radio"
                                  name="customerType"
                                  value="autonomo"
                                  checked={customerType === 'autonomo'}
                                  onChange={(e) => setCustomerType(e.target.value as 'autonomo' | 'empresa')}
                                  className="sr-only"
                                />
                                <div className="flex items-center">
                                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                    customerType === 'autonomo'
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-gray-400'
                                  }`}>
                                    {customerType === 'autonomo' && (
                                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                                    )}
                                  </div>
                                  <span className="font-medium">Autónomo</span>
                                </div>
                              </label>
                              
                              <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                customerType === 'empresa' 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-300 hover:border-blue-300'
                              }`}>
                                <input
                                  type="radio"
                                  name="customerType"
                                  value="empresa"
                                  checked={customerType === 'empresa'}
                                  onChange={(e) => setCustomerType(e.target.value as 'autonomo' | 'empresa')}
                                  className="sr-only"
                                />
                                <div className="flex items-center">
                                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                    customerType === 'empresa'
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-gray-400'
                                  }`}>
                                    {customerType === 'empresa' && (
                                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                                    )}
                                  </div>
                                  <span className="font-medium">Empresa</span>
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* Nombre fiscal */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {customerType === 'empresa' ? 'Razón Social *' : 'Nombre y apellidos *'}
                            </label>
                            <input
                              type="text"
                              value={legalName || (customerType === 'autonomo' ? tempUserData?.name : selectedBusiness?.name) || ''}
                              onChange={(e) => setLegalName(e.target.value)}
                              placeholder={customerType === 'empresa' 
                                ? "Ej: Restaurante El Buen Sabor S.L." 
                                : "Ej: Juan García López"}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                            <p className="text-xs text-orange-500 mt-1">
                              ⚠️ Este campo es obligatorio para la facturación
                            </p>
                          </div>

                          {/* NIF/CIF */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {customerType === 'empresa' ? 'CIF *' : 'NIF *'}
                            </label>
                            <input
                              type="text"
                              value={companyNIF}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                setCompanyNIF(value);
                                // Validación en tiempo real
                                if (value.length > 0) {
                                  const isValid = customerType === 'empresa' 
                                    ? /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(value)
                                    : /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(value);
                                  
                                  if (!isValid && value.length >= 9) {
                                    setBillingFieldsError(prev => ({
                                      ...prev,
                                      companyNIF: customerType === 'empresa' 
                                        ? 'CIF inválido. Formato: letra + 7 números + dígito control'
                                        : 'NIF inválido. Formato: 8 números + letra'
                                    }));
                                  } else {
                                    setBillingFieldsError(prev => ({
                                      ...prev,
                                      companyNIF: undefined
                                    }));
                                  }
                                }
                              }}
                              placeholder={customerType === 'empresa' ? "Ej: B12345678" : "Ej: 12345678Z"}
                              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                billingFieldsError.companyNIF ? 'border-red-500' : 'border-gray-300'
                              }`}
                              required
                            />
                            {billingFieldsError.companyNIF ? (
                              <p className="text-xs text-red-500 mt-1">
                                ❌ {billingFieldsError.companyNIF}
                              </p>
                            ) : (
                              <p className="text-xs text-orange-500 mt-1">
                                ⚠️ Este campo es obligatorio para la facturación
                              </p>
                            )}
                          </div>

                          {/* Email para facturas */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email para facturas *
                            </label>
                            <input
                              type="email"
                              value={billingEmail || tempUserData?.email || ''}
                              onChange={(e) => setBillingEmail(e.target.value)}
                              placeholder="juan@gmail.com"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          {/* Teléfono */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Teléfono
                            </label>
                            <input
                              type="tel"
                              value={billingPhone || tempUserData?.phone || ''}
                              onChange={(e) => setBillingPhone(e.target.value)}
                              placeholder="666666666"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Dirección fiscal */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Dirección fiscal *
                            </label>
                            <input
                              type="text"
                              value={billingAddress}
                              onChange={(e) => setBillingAddress(e.target.value)}
                              placeholder="Calle y número"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          {/* Código Postal */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Código Postal *
                            </label>
                            <input
                              type="text"
                              value={billingPostalCode}
                              onChange={(e) => setBillingPostalCode(e.target.value)}
                              placeholder="38001"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          {/* Ciudad */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ciudad *
                            </label>
                            <input
                              type="text"
                              value={billingCity}
                              onChange={(e) => setBillingCity(e.target.value)}
                              placeholder="Santa Cruz de Tenerife"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          {/* Provincia */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Provincia
                            </label>
                            <input
                              type="text"
                              value={billingProvince}
                              onChange={(e) => setBillingProvince(e.target.value)}
                              placeholder="Santa Cruz de Tenerife"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* País */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              País
                            </label>
                            <input
                              type="text"
                              value="España"
                              disabled
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                            />
                          </div>

                          {/* Mensaje informativo */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              <span className="font-semibold">ℹ️ Importante:</span> Estos datos aparecerán en todas tus facturas. 
                              Asegúrate de que coinciden exactamente con tu información fiscal oficial.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Columna Derecha - Formulario de pago */}
                    <div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-6">
                          Método de pago
                        </h4>
                        
                        {/* Componente de Stripe */}
                        <StripePaymentForm
                          businessId={pendingBusinessId}
                          businessName={selectedBusiness?.name || 'Tu Negocio'}
                          businessPhotoUrl={businessPhotoUrl}
                          planData={selectedPlanData}
                          clientSecret={clientSecret}
                          userData={{
                            name: tempUserData?.name || '',
                            email: tempUserData?.email || '',
                            phone: tempUserData?.phone || ''
                          }}
                          addressComponents={businessAddressComponents}
                          billingInfo={{
                            customerType: customerType,
                            legalName: legalName || (customerType === 'autonomo' ? tempUserData?.name : selectedBusiness?.name) || '',
                            taxId: companyNIF,
                            email: billingEmail || tempUserData?.email || '',
                            phone: billingPhone || tempUserData?.phone || '',
                            address: {
                              line1: billingAddress,
                              city: billingCity,
                              postal_code: billingPostalCode,
                              country: 'ES'
                            }
                          }}
                          onSuccess={() => {
                            // Guardar mensaje de éxito
                            localStorage.setItem('paymentSuccess', 'true');
                            localStorage.setItem('successMessage', '¡Pago procesado con éxito! Tu cuenta ha sido creada.');
                            // Resetear formularios
                            resetForms();
                            // Redirigir al login
                            setCurrentView('login');
                          }}
                          onCancel={() => {
                            // Volver al paso 3
                            setRegistrationStep(3);
                            setClientSecret('');
                            setIsLoadingPayment(false);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer con garantías */}
                  <div className="flex justify-center gap-6 mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>🛡️</span>
                      <span className="text-sm">Garantía de satisfacción</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>🔒</span>
                      <span className="text-sm">Pago 100% seguro</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>📧</span>
                      <span className="text-sm">Soporte 24/7</span>
                    </div>
                  </div>
                    </>
                  )}
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
                                onClick={() => handleSelectPlan(plan)}
                                disabled={isCreatingBusiness}
                                className={`w-full py-3.5 px-6 rounded-full font-semibold text-white transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg ${
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
                                  <div className="text-center">
                                    <div className="text-base font-semibold">Prueba gratuita</div>
                                    <div className="text-xs font-normal opacity-90 mt-0.5">
                                      {plan.trialDays} días gratis, luego {plan.recurringPrice} € al {plan.interval === 'month' ? 'mes' : 'año'}.
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-base font-semibold">Suscribirse</div>
                                    <div className="text-xs font-normal opacity-90 mt-0.5">
                                      {plan.recurringPrice} € al {plan.interval === 'month' ? 'mes' : 'año'}
                                    </div>
                                  </div>
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
