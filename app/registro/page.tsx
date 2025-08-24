'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GooglePlacesUltraSeparated } from '@/components/GooglePlacesUltraSeparated';
import { GooglePlaceData } from '@/lib/types';
import dynamic from 'next/dynamic';

// Importar dinámicamente el componente de Stripe para evitar problemas de SSR
const StripePaymentForm = dynamic(
  () => import('@/components/StripePaymentForm'),
  { ssr: false }
);

export default function RegistroPage() {
  const router = useRouter();
  
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
  const [showBillingForm, setShowBillingForm] = useState(true);
  
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

  useEffect(() => {
    // Cargar planes de suscripción
    const loadSubscriptionPlans = async () => {
      try {
        const params = new URLSearchParams({
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
      const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
      const route = components.find((c: any) => c.types.includes('route'))?.long_name || '';
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
      const postalCode = components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
      setBillingPostalCode(postalCode);
      
      // Extraer ciudad (locality o administrative_area_level_3)
      const city = components.find((c: any) => c.types.includes('locality'))?.long_name || 
                   components.find((c: any) => c.types.includes('administrative_area_level_3'))?.long_name || 
                   components.find((c: any) => c.types.includes('administrative_area_level_4'))?.long_name || '';
      setBillingCity(city);
      
      // Extraer provincia (administrative_area_level_2 o administrative_area_level_1)
      const province = components.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name || 
                      components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '';
      setBillingProvince(province);
      
      // Extraer país
      const country = components.find((c: any) => c.types.includes('country'))?.long_name || 'España';
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
      
      // Avanzar al paso 4 (pago) SIN llamar a preparePayment
      setRegistrationStep(4);
      setRegisterError('');
      
      // NO llamar a preparePayment aquí - se hará cuando el usuario haga clic en pagar
      
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
      // Preparar los datos de facturación para enviar ANTES del SetupIntent
      const billingInfo = {
        customerType: customerType,
        legalName: legalName || (customerType === 'autonomo' ? tempUserData?.name : selectedBusiness?.name) || '',
        taxId: companyNIF,
        email: billingEmail || tempUserData?.email || '',
        phone: billingPhone || tempUserData?.phone || '',
        address: {
          line1: billingAddress,
          line2: '',
          city: billingCity,
          state: billingProvince,
          postal_code: billingPostalCode,
          country: 'ES'
        }
      };

      // Enviar datos de facturación JUNTO con la creación del SetupIntent
      const subscriptionResponse = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          planKey: plan.key,
          userEmail: tempUserData.email,
          action: 'subscribe',
          billingInfo: billingInfo // INCLUIR datos de facturación aquí
        }),
      });

      const subscriptionData = await subscriptionResponse.json();

      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error || 'Error al crear la sesión de pago');
      }

      const { clientSecret: newClientSecret, subscriptionId, customerId, taxId } = subscriptionData;
      
      if (!newClientSecret) {
        throw new Error('No se pudo obtener el client secret para el pago');
      }

      // Guardar datos en localStorage para recuperar después del pago
      localStorage.setItem('pendingSubscription', JSON.stringify({
        businessId,
        planKey: plan.key,
        userEmail: tempUserData.email,
        subscriptionId,
        customerId,
        clientSecret: newClientSecret
      }));

      // Establecer el clientSecret para el formulario de pago
      setClientSecret(newClientSecret);
      
      // Ocultar automáticamente el formulario de facturación cuando se muestra el formulario de pago
      setShowBillingForm(false);
      
    } catch (error: any) {
      console.error('Error preparando el pago:', error);
      setRegisterError(error.message || 'Error al preparar el pago');
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const resetForms = () => {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => {
              if (registrationStep === 1) {
                router.push('/');
              } else {
                setRegistrationStep(registrationStep - 1);
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {registrationStep === 1 
              ? 'Crear Cuenta' 
              : registrationStep === 2
              ? 'Encuentra tu Negocio'
              : registrationStep === 3
              ? 'Elige tu Plan'
              : registrationStep === 4
              ? 'Completar Pago'
              : 'Proceso de registro'
            }
          </h2>
          <p className="text-gray-600 text-sm">
            {registrationStep === 1 
              ? 'Completa tus datos personales' 
              : registrationStep === 2
              ? 'Busca y selecciona tu negocio'
              : registrationStep === 3
              ? 'Todos los planes incluyen prueba gratis'
              : registrationStep === 4
              ? 'Añade tu método de pago'
              : 'Proceso de registro'
            }
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8 px-4">
          <div className="flex items-center justify-between w-full max-w-xs sm:max-w-sm md:max-w-md">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full font-bold transition-all text-xs sm:text-sm md:text-base flex-shrink-0 ${
              registrationStep >= 1 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
            }`}>
              {registrationStep > 1 ? '✓' : '1'}
            </div>
            <div className={`flex-1 h-1 mx-2 sm:mx-3 rounded-full transition-all ${
              registrationStep >= 2 ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full font-bold transition-all text-xs sm:text-sm md:text-base flex-shrink-0 ${
              registrationStep >= 2 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
            }`}>
              {registrationStep > 2 ? '✓' : '2'}
            </div>
            <div className={`flex-1 h-1 mx-2 sm:mx-3 rounded-full transition-all ${
              registrationStep >= 3 ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full font-bold transition-all text-xs sm:text-sm md:text-base flex-shrink-0 ${
              registrationStep >= 3 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
            }`}>
              {registrationStep > 3 ? '✓' : '3'}
            </div>
            <div className={`flex-1 h-1 mx-2 sm:mx-3 rounded-full transition-all ${
              registrationStep >= 4 ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full font-bold transition-all text-xs sm:text-sm md:text-base flex-shrink-0 ${
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

              {/* Step 3: Plan Selection */}
              {registrationStep === 3 && (
                <div className="space-y-6">
                  {/* Mensaje unificado arriba */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-green-800">
                      <span className="text-green-600">✓</span>
                      <span className="font-medium">
                        {subscriptionPlans.length > 0 && subscriptionPlans[0]?.trialDays > 0 
                          ? `${subscriptionPlans[0].trialDays} días gratis en todos los planes`
                          : 'Prueba gratis en todos los planes'
                        } • No se cobra nada hoy • Cancela cuando quieras
                      </span>
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

                        // NUEVO: Calcular ahorros dinámicos comparando con plan mensual
                        const calculateSavings = () => {
                          // Buscar el plan mensual para comparar
                          const monthlyPlan = subscriptionPlans.find(p => p.interval === 'month');
                          if (!monthlyPlan || plan.interval === 'month') {
                            return null; // No mostrar ahorros para el plan mensual o si no hay plan mensual
                          }

                          const monthlyPrice = monthlyPlan.recurringPrice;
                          let months = 1;
                          
                          // Determinar cuántos meses cubre este plan
                          if (plan.interval === 'quarter') months = 3;
                          else if (plan.interval === 'semester') months = 6;
                          else if (plan.interval === 'year') months = 12;
                          
                          const equivalentMonthlyCost = monthlyPrice * months;
                          const savings = equivalentMonthlyCost - plan.recurringPrice;
                          const savingsPercentage = Math.round((savings / equivalentMonthlyCost) * 100);
                          
                          return {
                            savings: savings,
                            percentage: savingsPercentage,
                            equivalentCost: equivalentMonthlyCost,
                            months: months
                          };
                        };

                        const savingsData = calculateSavings();
                        
                        return (
                          <div
                            key={plan.key}
                            className="relative p-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all bg-white"
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  Recomendado
                                </span>
                              </div>
                            )}
                            
                            <div className="text-center">
                      <div className="text-6xl mb-4">{plan.icon || '📦'}</div>
                              <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                              
                              {/* Duración del intervalo de suscripción */}
                              <div className="mb-4">
                                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  {plan.interval === 'month' ? 'Mensual' : 
                                   plan.interval === 'quarter' ? 'Trimestral (3 meses)' :
                                   plan.interval === 'semester' ? 'Semestral (6 meses)' : 
                                   plan.interval === 'year' ? 'Anual (12 meses)' : 
                                   plan.interval}
                                </span>
                              </div>
                              
                              {/* Precio con formato europeo - SIMPLIFICADO Y ALINEADO */}
                              <div className="mb-4">
                                {/* Contenedor con altura fija para mantener alineación */}
                                <div className="h-12 flex flex-col justify-center mb-2">
                                  {plan.trialDays > 0 ? (
                                    <>
                                      <p className="text-gray-500 text-sm">{plan.trialDays} días a 0€</p>
                                      <p className="text-gray-600 text-xs">después</p>
                                    </>
                                  ) : (
                                    <p className="text-gray-600 text-sm">Pago inmediato</p>
                                  )}
                                </div>
                                
                                {/* Precio principal - GRANDE Y CLARO */}
                                <div className={`text-4xl font-bold ${
                                  isGreen ? 'text-green-600' : isBlue ? 'text-blue-600' : isPurple ? 'text-purple-600' : 'text-gray-900'
                                }`}>
                                  {plan.recurringPrice} €
                                  <span className="text-lg font-normal text-gray-600">
                                    /{plan.interval === 'month' ? 'mes' : 
                                     plan.interval === 'quarter' ? '3 meses' :
                                     plan.interval === 'semester' ? '6 meses' : 
                                     'año'}
                                  </span>
                                </div>
                                
                                {/* Contenedor con altura fija para información de ahorro - MANTIENE ALINEACIÓN */}
                                <div className="h-12 flex flex-col justify-center">
                                  {savingsData && savingsData.savings > 0 ? (
                                    <>
                                      <p className="text-sm text-green-600">
                                        Ahorras {savingsData.savings}€ vs. pago mensual
                                      </p>
                                      {plan.originalPrice && plan.originalPrice > plan.recurringPrice && (
                                        <p className="text-xs text-gray-400 line-through">
                                          Antes: {plan.originalPrice}€
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <div className="h-full"></div> // Espacio vacío para mantener alineación
                                  )}
                                </div>
                                
                                {/* Información del primer cobro - ALINEADA */}
                                <div className="h-6 flex items-center">
                                  {plan.trialDays > 0 && (
                                    <p className="text-xs text-gray-500">
                                      Primer cobro: {formattedDate}
                                    </p>
                                  )}
                                </div>
                                
                                {plan.setupPrice > 0 && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    + {plan.setupPrice} € de configuración inicial
                                  </p>
                                )}
                              </div>
                              
                              {/* Botón CTA - ESTILOS CORREGIDOS */}
                              <button
                                type="button"
                                onClick={() => handleSelectPlan(plan)}
                                disabled={isCreatingBusiness}
                                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md mb-6 cursor-pointer ${
                                  plan.popular
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                {plan.trialDays > 0 ? 'Empezar prueba gratis' : 'Seleccionar plan'}
                              </button>
                              
                              {/* Separador visual */}
                              <div className="border-t border-gray-200 mb-4"></div>
                              
                              {/* Features - AHORA DESPUÉS DEL BOTÓN */}
                              <div className="text-left">
                                <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Características:</p>
                                <ul className="text-sm text-gray-600 space-y-2">
                                  {plan.features?.map((feature: string | { name: string; included: boolean }, index: number) => {
                                    // Manejar tanto strings como objetos para compatibilidad
                                    const featureName = typeof feature === 'string' ? feature : feature.name;
                                    const isIncluded = typeof feature === 'string' ? true : feature.included;
                                    
                                    return (
                                      <li key={index} className="flex items-start gap-2">
                                        {isIncluded ? (
                                          <span className="text-green-600 text-lg font-bold flex-shrink-0">✓</span>
                                        ) : (
                                          <span className="text-red-600 text-lg font-bold flex-shrink-0">✗</span>
                                        )}
                                        <span className={isIncluded ? '' : 'text-gray-400'}>{featureName}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
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
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    {/* Layout móvil - vertical alineado a la izquierda */}
                    <div className="flex flex-col gap-2 md:hidden">
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span className="text-lg">🔒</span>
                        <span className="text-sm font-medium">Pago seguro con Stripe</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span className="text-lg">↩️</span>
                        <span className="text-sm font-medium">Garantía de devolución</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span className="text-lg">📧</span>
                        <span className="text-sm font-medium">Te avisamos antes del cobro</span>
                      </div>
                    </div>
                    
                    {/* Layout desktop - horizontal */}
                    <div className="hidden md:flex justify-center gap-6">
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
                </div>
              )}

              {/* Step 4: Payment */}
              {registrationStep === 4 && (
                <div className="space-y-6">
                  {/* Mostrar loading mientras se prepara el pago */}
                  {isLoadingPayment && (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Preparando el formulario de pago...</p>
                    </div>
                  )}
                  
                  {/* Mostrar formulario completo cuando NO está cargando */}
                  {!isLoadingPayment && selectedPlanData && (
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
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { 
                                  (e.target as HTMLImageElement).style.display = 'none'; 
                                }}
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

                      {/* Plan seleccionado - MOVIDO A LA PRIMERA POSICIÓN */}
                      <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="text-2xl">{selectedPlanData?.icon || '📦'}</span>
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
                                /{selectedPlanData?.interval === 'month' ? 'mes' : 
                                 selectedPlanData?.interval === 'quarter' ? '3 meses' :
                                 selectedPlanData?.interval === 'semester' ? '6 meses' : 
                                 selectedPlanData?.interval === 'year' ? 'año' : 
                                 selectedPlanData?.interval}
                              </p>
                            </div>
                          </div>

                          {/* Features del plan */}
                          {selectedPlanData?.features && selectedPlanData.features.length > 0 && (
                            <div className="pt-4 border-t border-gray-200">
                              <p className="text-sm font-semibold text-gray-700 mb-3">Incluye:</p>
                              <ul className="space-y-2">
                                {selectedPlanData.features.map((feature: string | { name: string; included: boolean }, index: number) => {
                                  // Manejar tanto strings como objetos para compatibilidad
                                  const featureName = typeof feature === 'string' ? feature : feature.name;
                                  const isIncluded = typeof feature === 'string' ? true : feature.included;
                                  
                                  // Solo mostrar características incluidas en el paso 4
                                  if (!isIncluded) return null;
                                  
                                  return (
                                    <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                      <span className="leading-relaxed">{featureName}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Columna Derecha - Formulario de pago y facturación */}
                    <div className="space-y-6">
                      {/* Formulario de datos de facturación - MOVIDO AQUÍ */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span>📋</span>
                            <span>Datos de facturación</span>
                          </h4>
                          {clientSecret && (
                              <button
                                onClick={() => setShowBillingForm(!showBillingForm)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                              >
                              {showBillingForm ? (
                                <>
                                  <span>Ocultar</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>Editar</span>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {/* Mostrar resumen cuando está colapsado */}
                        {!showBillingForm && clientSecret ? (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Nombre fiscal:</p>
                                <p className="font-medium text-gray-900">
                                  {legalName || (customerType === 'autonomo' ? tempUserData?.name : selectedBusiness?.name) || 'No especificado'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">{customerType === 'empresa' ? 'CIF:' : 'NIF:'}</p>
                                <p className="font-medium text-gray-900">{companyNIF || 'No especificado'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Email facturas:</p>
                                <p className="font-medium text-gray-900">{billingEmail || tempUserData?.email || 'No especificado'}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Dirección:</p>
                                <p className="font-medium text-gray-900">
                                  {billingAddress ? `${billingAddress}, ${billingPostalCode} ${billingCity}` : 'No especificada'}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                              ✅ Datos guardados correctamente. Haz clic en "Editar" si necesitas modificarlos.
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-600 text-sm mb-6">Información que aparecerá en tus facturas</p>
                            
                            <div className="space-y-4">
                          {/* Tipo de cliente */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Tipo de cliente *
                            </label>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <label className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
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
                                <div className="flex items-center justify-center sm:justify-start">
                                  <div className={`hidden sm:block w-4 h-4 rounded-full border-2 mr-3 ${
                                    customerType === 'autonomo'
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-gray-400'
                                  }`}>
                                    {customerType === 'autonomo' && (
                                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                                    )}
                                  </div>
                                  <span className="font-medium text-sm sm:text-base">Autónomo</span>
                                </div>
                              </label>
                              
                              <label className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
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
                                <div className="flex items-center justify-center sm:justify-start">
                                  <div className={`hidden sm:block w-4 h-4 rounded-full border-2 mr-3 ${
                                    customerType === 'empresa'
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-gray-400'
                                  }`}>
                                    {customerType === 'empresa' && (
                                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                                    )}
                                  </div>
                                  <span className="font-medium text-sm sm:text-base">Empresa</span>
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
                          </>
                        )}
                      </div>

                      {/* Método de pago - AHORA DEBAJO DE DATOS DE FACTURACIÓN */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-6">
                          Método de pago
                        </h4>
                        
                        {/* Si no hay clientSecret, mostrar botón para preparar pago */}
                        {!clientSecret ? (
                          <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-sm text-yellow-800">
                                <span className="font-semibold">⚠️ Importante:</span> Asegúrate de que todos los datos de facturación estén completos antes de continuar.
                              </p>
                            </div>
                            
                            <button
                              onClick={async () => {
                                // Validar NIF/CIF antes de continuar
                                if (!companyNIF) {
                                  setRegisterError('Por favor, introduce tu NIF/CIF');
                                  return;
                                }
                                
                                if (billingFieldsError.companyNIF) {
                                  setRegisterError('Por favor, corrige el NIF/CIF antes de continuar');
                                  return;
                                }
                                
                                if (!legalName && !tempUserData?.name && !selectedBusiness?.name) {
                                  setRegisterError('Por favor, introduce el nombre fiscal');
                                  return;
                                }
                                
                                // Llamar a preparePayment con los datos actuales
                                await preparePayment(pendingBusinessId, selectedPlanData);
                              }}
                              disabled={isLoadingPayment || !companyNIF || !!billingFieldsError.companyNIF}
                              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {isLoadingPayment ? (
                                <span className="flex items-center justify-center gap-2">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                  Preparando pago...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-2">
                                  <span>💳</span>
                                  <span>Continuar al pago</span>
                                </span>
                              )}
                            </button>
                            
                            {registerError && (
                              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-200">
                                <div className="flex items-center gap-2">
                                  <span>❌</span>
                                  <span>{registerError}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Componente de Stripe - solo se muestra cuando hay clientSecret */
                          <div className="animate-fadeIn">
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
                            router.push('/login');
                          }}
                            onCancel={() => {
                              // Volver al paso 3
                              setRegistrationStep(3);
                              setClientSecret('');
                              setIsLoadingPayment(false);
                              setShowBillingForm(true); // Restaurar el formulario de facturación
                            }}
                          />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer con garantías */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    {/* Layout móvil - vertical alineado a la izquierda */}
                    <div className="flex flex-col gap-2 md:hidden">
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span className="text-lg">🔒</span>
                        <span className="text-sm font-medium">Pago seguro con Stripe</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span className="text-lg">↩️</span>
                        <span className="text-sm font-medium">Garantía de devolución</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                        <span className="text-lg">📧</span>
                        <span className="text-sm font-medium">Te avisamos antes del cobro</span>
                      </div>
                    </div>
                    
                    {/* Layout desktop - horizontal */}
                    <div className="hidden md:flex justify-center gap-6">
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
                    </>
                  )}
                </div>
              )}


        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => {
                resetForms();
                router.push('/login');
              }}
              className="text-green-600 hover:text-green-700 font-medium cursor-pointer"
            >
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
