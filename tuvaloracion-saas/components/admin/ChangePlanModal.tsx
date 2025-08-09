'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Importar dinámicamente el componente de Stripe para evitar problemas de SSR
const StripePaymentForm = dynamic(
  () => import('../StripePaymentForm'),
  { ssr: false }
);

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  businessId: string;
  businessName: string;
  onPlanChanged: () => void;
  userRole: string;
  userEmail: string;
}

export default function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan,
  businessId,
  businessName,
  onPlanChanged,
  userRole,
  userEmail
}: ChangePlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  if (!isOpen) return null;

  const plans = [
    {
      id: 'trial',
      name: 'Prueba',
      description: '7 días gratis para probar el servicio',
      icon: '🎁',
      features: ['Funciones básicas', '7 días de prueba', 'Soporte por email']
    },
    {
      id: 'basic',
      name: 'Básico',
      description: 'Plan ideal para negocios pequeños',
      icon: '⭐',
      features: ['Todas las funciones', 'Soporte prioritario', 'Estadísticas básicas']
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Plan completo para negocios en crecimiento',
      icon: '💎',
      features: ['Funciones avanzadas', 'Soporte 24/7', 'Estadísticas completas', 'API access']
    },
    {
      id: 'lifetime',
      name: 'Vitalicio',
      description: 'Acceso de por vida sin pagos recurrentes',
      icon: '👑',
      features: ['Todas las funciones Premium', 'Sin fecha de expiración', 'Soporte VIP', 'Acceso a futuras funciones'],
      special: true
    }
  ];

  const handleChangePlan = async () => {
    if (!showCustomDate && selectedPlan === currentPlan) {
      setError('Selecciona un plan diferente al actual');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (showCustomDate && customDate) {
        // Establecer fecha personalizada
        const response = await fetch(`/api/admin/subscriptions/${businessId}/set-custom-date`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endDate: customDate,
            userRole,
            userEmail
          }),
        });

        const data = await response.json();

        if (response.ok) {
          onPlanChanged();
          onClose();
        } else {
          setError(data.error || 'Error al establecer fecha personalizada');
        }
      } else {
        // Cambiar plan normal usando Payment Elements
        const response = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId,
            planKey: selectedPlan,
            userEmail,
            action: currentPlan === 'trial' ? 'subscribe' : 'change'
          }),
        });

        const data = await response.json();

        if (response.ok && data.clientSecret) {
          // Si es un plan de pago, mostrar el formulario de pago
          if (selectedPlan !== 'trial') {
            setClientSecret(data.clientSecret);
            setShowPaymentForm(true);
          } else {
            // Si es trial, no necesita pago
            onPlanChanged();
            onClose();
          }
        } else {
          setError(data.error || 'Error al procesar el cambio de plan');
        }
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Obtener fecha mínima (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Si estamos mostrando el formulario de pago
  if (showPaymentForm && clientSecret) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <StripePaymentForm
          businessId={businessId}
          businessName={businessName}
          plan={selectedPlan as 'basic' | 'premium'}
          clientSecret={clientSecret}
          onSuccess={() => {
            setShowPaymentForm(false);
            onPlanChanged();
            onClose();
          }}
          onCancel={() => {
            setShowPaymentForm(false);
            setClientSecret('');
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Cambiar Plan de Suscripción</h2>
              <p className="text-gray-600 mt-1">Negocio: {businessName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id);
                  setShowCustomDate(false);
                }}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.id && !showCustomDate
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${currentPlan === plan.id ? 'ring-2 ring-green-500' : ''} ${
                  plan.special ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : ''
                }`}
              >
                <div className="text-center mb-3">
                  <span className="text-3xl">{plan.icon}</span>
                  <h3 className="text-lg font-semibold mt-2">{plan.name}</h3>
                  {currentPlan === plan.id && (
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Plan Actual
                    </span>
                  )}
                  {plan.special && (
                    <span className="inline-block mt-1 ml-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                      Especial
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                <ul className="space-y-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="text-xs text-gray-500 flex items-start">
                      <span className="text-green-500 mr-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Opción de fecha personalizada */}
          <div className="mt-4 p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="customDate"
                  checked={showCustomDate}
                  onChange={(e) => {
                    setShowCustomDate(e.target.checked);
                    if (e.target.checked) {
                      setSelectedPlan('');
                    }
                  }}
                  className="mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="customDate" className="cursor-pointer">
                  <span className="text-2xl mr-2">📅</span>
                  <span className="font-medium text-purple-900">Establecer fecha personalizada</span>
                </label>
              </div>
            </div>
            
            {showCustomDate && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-purple-700 mb-2">
                  Fecha de finalización de suscripción:
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={minDate}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required={showCustomDate}
                />
                <p className="text-xs text-purple-600 mt-1">
                  La suscripción estará activa hasta esta fecha específica
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Nota:</strong> Como Super Admin, puedes cambiar planes sin restricciones. 
              El cambio será inmediato y se registrará en el historial del negocio.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleChangePlan}
            disabled={loading || (!showCustomDate && selectedPlan === currentPlan) || (showCustomDate && !customDate)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : showCustomDate ? 'Establecer Fecha' : 'Cambiar Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
