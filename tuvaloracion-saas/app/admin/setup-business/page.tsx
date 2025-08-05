'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/Toast';
import LoadingOverlay from '@/components/LoadingOverlay';
import { saveAuth } from '@/lib/auth';

function SetupBusinessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('trial');
  
  // Datos del usuario desde los parámetros
  const userName = searchParams.get('name') || '';
  const userEmail = searchParams.get('email') || '';
  const userPassword = searchParams.get('password') || '';
  const businessType = searchParams.get('type') || 'restaurante';
  
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
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

  const plans = [
    {
      id: 'trial',
      name: 'Prueba Gratis',
      price: '0€',
      duration: '7 días',
      features: [
        'Todas las funciones',
        'Sin límite de opiniones',
        'Personalización completa',
        'Soporte por email',
        'Sin tarjeta de crédito'
      ],
      recommended: false
    },
    {
      id: 'basic',
      name: 'Básico',
      price: '29€',
      duration: '/mes',
      features: [
        'Todas las funciones',
        'Hasta 500 opiniones/mes',
        'Personalización básica',
        'Soporte por email',
        'Estadísticas básicas'
      ],
      recommended: false
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '59€',
      duration: '/mes',
      features: [
        'Todas las funciones',
        'Opiniones ilimitadas',
        'Personalización avanzada',
        'Soporte prioritario 24/7',
        'Estadísticas avanzadas',
        'API access',
        'Multi-idioma avanzado'
      ],
      recommended: true
    }
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedPlan) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.businessName || !formData.phone) {
        setToast({ message: 'Por favor completa los campos requeridos', type: 'error' });
        return;
      }
      // En lugar de ir al paso 3, crear el negocio directamente
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white font-bold">TV</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Configura tu Negocio</h1>
          <p className="text-gray-600 mt-2">Hola {userName}, vamos a configurar tu negocio</p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                1
              </div>
              <span className="ml-2 hidden sm:inline">Elige tu plan</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2 hidden sm:inline">Información básica</span>
            </div>
          </div>
        </div>

        {/* Step 1: Choose Plan */}
        {currentStep === 1 && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Elige el plan perfecto para tu negocio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all transform hover:scale-105 ${
                    selectedPlan === plan.id ? 'ring-4 ring-blue-500' : ''
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Recomendado
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-800">{plan.price}</span>
                      <span className="text-gray-600 ml-1">{plan.duration}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      selectedPlan === plan.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedPlan === plan.id ? 'Seleccionado' : 'Seleccionar'}
                  </button>
                </div>
              ))}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección del negocio
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Calle Principal 123, Ciudad"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
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
          ) : (
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear mi Negocio'}
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
