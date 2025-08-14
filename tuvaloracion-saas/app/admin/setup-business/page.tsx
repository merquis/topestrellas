'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/Toast';
import LoadingOverlay from '@/components/LoadingOverlay';
import { saveAuth } from '@/lib/auth';
import StripePaymentForm from '@/components/StripePaymentForm';

function SetupBusinessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('trial');
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<{ [key: string]: boolean }>({});
  
  // Datos del usuario desde los parámetros
  const userName = searchParams.get('name') || '';
  const userEmail = searchParams.get('email') || '';
  const userPassword = searchParams.get('password') || '';
  const businessType = searchParams.get('type') || 'restaurante';
  
  // Lista de provincias españolas con sus zonas horarias
  const spanishProvinces = [
    // Provincias peninsulares (mainland) - Europe/Madrid
    { name: 'Álava', timezone: 'Europe/Madrid' },
    { name: 'Albacete', timezone: 'Europe/Madrid' },
    { name: 'Alicante', timezone: 'Europe/Madrid' },
    { name: 'Almería', timezone: 'Europe/Madrid' },
    { name: 'Asturias', timezone: 'Europe/Madrid' },
    { name: 'Ávila', timezone: 'Europe/Madrid' },
    { name: 'Badajoz', timezone: 'Europe/Madrid' },
    { name: 'Barcelona', timezone: 'Europe/Madrid' },
    { name: 'Burgos', timezone: 'Europe/Madrid' },
    { name: 'Cáceres', timezone: 'Europe/Madrid' },
    { name: 'Cádiz', timezone: 'Europe/Madrid' },
    { name: 'Cantabria', timezone: 'Europe/Madrid' },
    { name: 'Castellón', timezone: 'Europe/Madrid' },
    { name: 'Ciudad Real', timezone: 'Europe/Madrid' },
    { name: 'Córdoba', timezone: 'Europe/Madrid' },
    { name: 'Cuenca', timezone: 'Europe/Madrid' },
    { name: 'Girona', timezone: 'Europe/Madrid' },
    { name: 'Granada', timezone: 'Europe/Madrid' },
    { name: 'Guadalajara', timezone: 'Europe/Madrid' },
    { name: 'Guipúzcoa', timezone: 'Europe/Madrid' },
    { name: 'Huelva', timezone: 'Europe/Madrid' },
    { name: 'Huesca', timezone: 'Europe/Madrid' },
    { name: 'Jaén', timezone: 'Europe/Madrid' },
    { name: 'La Coruña (A Coruña)', timezone: 'Europe/Madrid' },
    { name: 'La Rioja', timezone: 'Europe/Madrid' },
    { name: 'León', timezone: 'Europe/Madrid' },
    { name: 'Lleida', timezone: 'Europe/Madrid' },
    { name: 'Lugo', timezone: 'Europe/Madrid' },
    { name: 'Madrid', timezone: 'Europe/Madrid' },
    { name: 'Málaga', timezone: 'Europe/Madrid' },
    { name: 'Murcia', timezone: 'Europe/Madrid' },
    { name: 'Navarra', timezone: 'Europe/Madrid' },
    { name: 'Ourense', timezone: 'Europe/Madrid' },
    { name: 'Palencia', timezone: 'Europe/Madrid' },
    { name: 'Pontevedra', timezone: 'Europe/Madrid' },
    { name: 'Salamanca', timezone: 'Europe/Madrid' },
    { name: 'Segovia', timezone: 'Europe/Madrid' },
    { name: 'Sevilla', timezone: 'Europe/Madrid' },
    { name: 'Soria', timezone: 'Europe/Madrid' },
    { name: 'Tarragona', timezone: 'Europe/Madrid' },
    { name: 'Teruel', timezone: 'Europe/Madrid' },
    { name: 'Toledo', timezone: 'Europe/Madrid' },
    { name: 'Valencia', timezone: 'Europe/Madrid' },
    { name: 'Valladolid', timezone: 'Europe/Madrid' },
    { name: 'Zamora', timezone: 'Europe/Madrid' },
    { name: 'Zaragoza', timezone: 'Europe/Madrid' },
    
    // Islas Canarias - Atlantic/Canary
    { name: 'Tenerife', timezone: 'Atlantic/Canary' },
    { name: 'Gran Canaria', timezone: 'Atlantic/Canary' },
    { name: 'Lanzarote', timezone: 'Atlantic/Canary' },
    { name: 'Fuerteventura', timezone: 'Atlantic/Canary' },
    { name: 'La Palma', timezone: 'Atlantic/Canary' },
    { name: 'La Gomera', timezone: 'Atlantic/Canary' },
    { name: 'El Hierro', timezone: 'Atlantic/Canary' },
    
    // Islas Baleares - Europe/Madrid
    { name: 'Mallorca', timezone: 'Europe/Madrid' },
    { name: 'Menorca', timezone: 'Europe/Madrid' },
    { name: 'Ibiza (Eivissa)', timezone: 'Europe/Madrid' },
    { name: 'Formentera', timezone: 'Europe/Madrid' },
    
    // Ciudades autónomas - Europe/Madrid
    { name: 'Ceuta', timezone: 'Europe/Madrid' },
    { name: 'Melilla', timezone: 'Europe/Madrid' }
  ].sort((a, b) => a.name.localeCompare(b.name));

  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    country: 'España',
    city: '',
    postalCode: '',
    address: '',
    googleReviewUrl: '',
    tripadvisorReviewUrl: '',
    reviewPlatform: 'google',
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
  });

  // Estados para el paso 4 - Stripe
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [loadingStripe, setLoadingStripe] = useState(false);

  // Estado para el autocompletado de provincias
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [filteredProvinces, setFilteredProvinces] = useState(spanishProvinces);

  // Función para filtrar provincias
  const handleProvinceSearch = (searchTerm: string) => {
    setProvinceSearch(searchTerm);
    const filtered = spanishProvinces.filter(province =>
      province.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProvinces(filtered);
    setShowProvinceDropdown(searchTerm.length > 0);
  };

  // Función para seleccionar provincia
  const handleProvinceSelect = (provinceName: string) => {
    setFormData({
      ...formData,
      city: provinceName
    });
    setProvinceSearch(provinceName);
    setShowProvinceDropdown(false);
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.province-dropdown-container')) {
        setShowProvinceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cargar planes desde la base de datos
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/admin/subscription-plans');
        if (response.ok) {
          const data = await response.json();
          // Formatear los planes para el componente
          const formattedPlans = data.map((plan: any) => ({
            id: plan.key,
            name: plan.name,
            price: plan.recurringPrice === 0 ? '0€' : `${plan.recurringPrice / 100}€`,
            duration: plan.trialDays > 0 ? `${plan.trialDays} días` : plan.interval === 'month' ? '/mes' : '/año',
            features: plan.features || [],
            recommended: plan.popular || false,
            icon: plan.icon || '📦',
            color: plan.color || 'blue'
          }));
          setPlans(formattedPlans);
          // Seleccionar el plan trial por defecto si existe
          const trialPlan = formattedPlans.find((p: any) => p.id === 'trial');
          if (trialPlan) {
            setSelectedPlan('trial');
          } else if (formattedPlans.length > 0) {
            setSelectedPlan(formattedPlans[0].id);
          }
        }
      } catch (error) {
        console.error('Error al cargar los planes:', error);
        setToast({ message: 'Error al cargar los planes de suscripción', type: 'error' });
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const togglePlanExpanded = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se seleccione el plan al hacer clic en "Ver más"
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedPlan) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.businessName || !formData.phone || !formData.city || !formData.postalCode || !formData.address) {
        setToast({ message: 'Por favor completa todos los campos requeridos', type: 'error' });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Paso 3: Configuración adicional (premios, etc.)
      // Crear el SetupIntent antes de ir al paso 4
      handleCreateSetupIntent();
    } else if (currentStep === 4) {
      // Paso 4: Datos de facturación
      if (!formData.billingName || !formData.billingEmail || !formData.billingPhone) {
        setToast({ message: 'Por favor completa todos los datos de facturación', type: 'error' });
        return;
      }
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateSetupIntent = async () => {
    setLoadingStripe(true);
    try {
      // Primero crear un ID temporal para el negocio
      const tempBusinessId = `temp_${Date.now()}`;
      setBusinessId(tempBusinessId);

      // Crear el SetupIntent en Stripe
      const response = await fetch('/api/admin/subscriptions/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          businessId: tempBusinessId,
          planKey: selectedPlan,
          isNewUser: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStripeClientSecret(data.clientSecret);
        setCurrentStep(4);
      } else {
        const error = await response.json();
        setToast({ message: `Error: ${error.error}`, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al preparar el pago', type: 'error' });
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Aquí se crearía el usuario y el negocio
      // Por ahora simulamos el proceso
      const businessData = {
        ...formData,
        type: businessType,
        plan: selectedPlan,
        email: userEmail,
        ownerName: userName,
        password: userPassword
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
        }
        
        setToast({ 
          message: '¡Negocio creado exitosamente! Redirigiendo a tu panel...', 
          type: 'success' 
        });
        
        // Redirigir al panel de administración con sesión iniciada
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        const data = await response.json();
        setToast({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al crear el negocio', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <LoadingOverlay isLoading={loading} text="Creando tu negocio..." />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Logo */}
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              {/* Pequeñas estrellas decorativas */}
              <div className="absolute -top-1 -right-1 w-3 h-3">
                <svg className="w-full h-full text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2">
                <svg className="w-full h-full text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
            {/* Nombre de la empresa */}
            <div className="flex flex-col items-start">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                TopEstrellas
              </h2>
              <span className="text-xs text-gray-500 -mt-1">.com</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Crear Cuenta</h1>
          <p className="text-gray-600 mt-2">Elige tu plan de suscripción</p>
        </div>

        {/* Progress Bar - Pasos 1 al 4 */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {/* Paso 1 */}
            <div className={`flex items-center ${currentStep >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-green-600 text-white' : 'bg-gray-300'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
            </div>
            
            {/* Línea entre 1 y 2 */}
            <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            {/* Paso 2 */}
            <div className={`flex items-center ${currentStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-green-600 text-white' : 'bg-gray-300'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
            </div>
            
            {/* Línea entre 2 y 3 */}
            <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            {/* Paso 3 */}
            <div className={`flex items-center ${currentStep >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-300'
              }`}>
                {currentStep > 3 ? '✓' : '3'}
              </div>
            </div>
            
            {/* Línea entre 3 y 4 */}
            <div className={`flex-1 h-1 mx-2 ${currentStep >= 4 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            
            {/* Paso 4 */}
            <div className={`flex items-center ${currentStep >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 4 ? 'bg-green-600 text-white' : 'bg-gray-300'
              }`}>
                4
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Choose Plan */}
        {currentStep === 1 && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Elige el plan perfecto para tu negocio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan: any) => {
                const isExpanded = expandedPlans[plan.id];
                const visibleFeatures = isExpanded ? plan.features : plan.features.slice(0, 5);
                const hasMoreFeatures = plan.features.length > 5;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 ${
                      selectedPlan === plan.id 
                        ? 'border-blue-500 ring-4 ring-blue-200 bg-gradient-to-br from-blue-50 to-white' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {/* Badge de seleccionado */}
                    {selectedPlan === plan.id && (
                      <div className="absolute -top-3 -right-3">
                        <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Badge de recomendado */}
                    {plan.recommended && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg animate-pulse">
                          ⭐ Recomendado
                        </span>
                      </div>
                    )}
                    
                    {/* Header del plan */}
                    <div className="text-center mb-6 pt-2">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-3">
                        <span className="text-2xl">{plan.icon || '📦'}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {plan.price}
                        </span>
                        <span className="text-gray-600 ml-1 font-medium">{plan.duration}</span>
                      </div>
                      {plan.id === 'trial' && (
                        <div className="mt-2 inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Sin compromiso
                        </div>
                      )}
                    </div>
                    
                    {/* Lista de características */}
                    <div className="mb-6">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Incluye:
                      </div>
                      <ul className="space-y-2">
                        {visibleFeatures.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start group">
                            <span className="text-green-500 mr-2 mt-0.5 flex-shrink-0">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Botón Ver más/menos */}
                      {hasMoreFeatures && (
                        <button
                          onClick={(e) => togglePlanExpanded(plan.id, e)}
                          className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center group"
                        >
                          <span>{isExpanded ? 'Ver menos' : `Ver más (${plan.features.length - 5} más)`}</span>
                          <svg 
                            className={`w-4 h-4 ml-1 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Botón de selección */}
                    <button
                      className={`w-full py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                        selectedPlan === plan.id
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {selectedPlan === plan.id ? (
                        <span className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Plan Seleccionado
                        </span>
                      ) : (
                        'Seleccionar este plan'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Basic Information */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Información básica de tu negocio</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Negocio *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Mi Negocio"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono del negocio *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+34 900 000 000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Ubicación del negocio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    País *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="España">España</option>
                  </select>
                </div>

                <div className="relative province-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provincia *
                  </label>
                  <input
                    type="text"
                    name="provinceSearch"
                    value={provinceSearch}
                    onChange={(e) => handleProvinceSearch(e.target.value)}
                    onFocus={() => setShowProvinceDropdown(true)}
                    placeholder="Busca tu provincia (ej: Tenerife, Madrid...)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  
                  {/* Dropdown de provincias filtradas */}
                  {showProvinceDropdown && filteredProvinces.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredProvinces.map((province) => (
                        <div
                          key={province.name}
                          onClick={() => handleProvinceSelect(province.name)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-gray-800">{province.name}</span>
                            <span className="text-xs text-gray-500">
                              {province.timezone === 'Atlantic/Canary' ? 'Canarias' : 'Península'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Mensaje cuando no hay resultados */}
                  {showProvinceDropdown && provinceSearch && filteredProvinces.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <div className="px-4 py-3 text-gray-500">
                        No se encontraron provincias que coincidan con "{provinceSearch}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="28001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección completa *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Calle Principal 123, 2º A"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Configuración adicional */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Configuración de premios</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plataforma de reseñas principal
                </label>
                <select
                  name="reviewPlatform"
                  value={formData.reviewPlatform}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="google">Google Reviews</option>
                  <option value="tripadvisor">TripAdvisor</option>
                  <option value="both">Ambas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de Google Reviews (opcional)
                </label>
                <input
                  type="url"
                  name="googleReviewUrl"
                  value={formData.googleReviewUrl}
                  onChange={handleChange}
                  placeholder="https://g.page/r/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Premios disponibles en la ruleta
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {formData.prizes.map((prize, index) => (
                    <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <span className="text-sm font-medium text-gray-700">{prize}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Los premios se pueden personalizar más adelante desde el panel de administración
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Datos de facturación y pago con Stripe */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto">
            {loadingStripe ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Preparando el formulario de pago...</p>
              </div>
            ) : stripeClientSecret ? (
              <StripePaymentForm
                businessId={businessId}
                businessName={formData.businessName}
                planData={{
                  key: selectedPlan,
                  name: plans.find(p => p.id === selectedPlan)?.name || 'Plan básico',
                  recurringPrice: parseFloat(plans.find(p => p.id === selectedPlan)?.price?.replace('€', '') || '0') * 100,
                  trialDays: selectedPlan === 'trial' ? 7 : 0,
                  interval: 'month'
                }}
                clientSecret={stripeClientSecret}
                userData={{
                  name: userName,
                  email: userEmail,
                  phone: formData.phone
                }}
                onSuccess={async () => {
                  // Crear el negocio después del pago exitoso
                  await handleSubmit();
                }}
                onCancel={() => {
                  setCurrentStep(3);
                  setStripeClientSecret('');
                }}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-red-600">Error al cargar el formulario de pago. Por favor, intenta de nuevo.</p>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Volver
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="max-w-2xl mx-auto mt-8 flex justify-between">
          {currentStep > 1 && (
            <button
              onClick={handlePreviousStep}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </button>
          )}
          <div className="flex-1"></div>
          {currentStep === 1 ? (
            <button
              onClick={handleNextStep}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Siguiente →
            </button>
          ) : currentStep === 4 ? (
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 font-semibold text-lg"
            >
              {loading ? 'Procesando...' : selectedPlan === 'trial' ? 'Iniciar prueba de 7 días GRATIS' : 'Finalizar y Pagar'}
            </button>
          ) : (
            <button
              onClick={handleNextStep}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Siguiente →
            </button>
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
    </div>
  );
}

export default function SetupBusinessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <SetupBusinessContent />
    </Suspense>
  );
}
