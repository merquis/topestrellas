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
                    <div className="animate
