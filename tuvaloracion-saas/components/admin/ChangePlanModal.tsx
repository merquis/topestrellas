'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Importar dinámicamente el componente de Stripe para evitar problemas de SSR
const StripePaymentForm = dynamic(() => import('../StripePaymentForm'), { ssr: false });

// Alias seguros para evitar conflictos de typings con React 19 en framer-motion
const MotionButton = motion.button as any;

interface Plan {
  _id: string;
  key: string;
  name: string;
  description: string;
  recurringPrice: number;
  currency: string;
  interval: string; // 'month' | 'year' esperado, pero puede venir como string
  features: (string | { name: string; included: boolean })[];
  icon: string;
  color: string;
  popular?: boolean;
  trialDays?: number;
}

interface ChangePlanModalProps {
  business: any;
  currentPlan?: Plan;
  plans: Plan[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePlanModal({
  business,
  currentPlan,
  plans,
  onClose,
  onSuccess
}: ChangePlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const availablePlans = plans.filter(p => p.key !== currentPlan?.key);

  const handleChangePlan = async () => {
    if (!selectedPlan) {
      setError('Por favor selecciona un plan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/subscriptions/${business.businessId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.businessId,
          newPlanKey: selectedPlan.key,
          currentPlanKey: currentPlan?.key
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.clientSecret) {
          // Necesita pago
          setClientSecret(data.clientSecret);
          setShowPaymentForm(true);
        } else {
          // Cambio exitoso sin pago
          onSuccess();
        }
      } else {
        setError(data.error || 'Error al cambiar el plan');
      }
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const getPlanGradient = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-indigo-600';
      case 'purple':
        return 'from-purple-500 to-pink-600';
      case 'green':
        return 'from-green-500 to-emerald-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const calculateSavings = (plan: Plan) => {
    if (!currentPlan) return null;
    const diff = currentPlan.recurringPrice - plan.recurringPrice;
    if (diff > 0) {
      return {
        amount: diff,
        percentage: Math.round((diff / currentPlan.recurringPrice) * 100)
      };
    }
    return null;
  };

  // Si estamos mostrando el formulario de pago
  if (showPaymentForm && clientSecret && selectedPlan) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
        <StripePaymentForm
          businessId={business.businessId}
          businessName={business.businessName}
          planData={{
            key: selectedPlan.key,
            name: selectedPlan.name,
            recurringPrice: selectedPlan.recurringPrice,
            trialDays: selectedPlan.trialDays,
            interval: selectedPlan.interval === 'year' ? 'year' : 'month'
          }}
          clientSecret={clientSecret}
          onSuccess={() => {
            setShowPaymentForm(false);
            onSuccess();
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden relative"
        style={{ 
          maxHeight: 'calc(100vh - 16px)',
          height: 'auto'
        }}
      >
        {/* Botón de cierre fijo */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Contenido con scroll interno */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 16px)' }}>
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="pr-8 sm:pr-12">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                🔄 Cambiar Plan de Suscripción
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Selecciona el plan que mejor se adapte a {business.businessName}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  {error}
                </motion.div>
              </div>
            )}

            {/* Plan actual */}
            {currentPlan && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-2xl sm:text-3xl">{currentPlan.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Plan actual</p>
                      <p className="font-bold text-base sm:text-lg text-gray-900">{currentPlan.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">
                      {currentPlan.recurringPrice}€
                      <span className="text-xs sm:text-sm text-gray-500 font-normal">/{currentPlan.interval === 'year' ? 'año' : 'mes'}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Toggle comparación */}
            <div className="mb-4 sm:mb-6 flex justify-end">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
              >
                <span>{showComparison ? '📋' : '📊'}</span>
                {showComparison ? 'Ver tarjetas' : 'Comparar planes'}
              </button>
            </div>

            {/* Vista de comparación o tarjetas */}
            {showComparison ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="text-left p-2 sm:p-3 border-b-2 border-gray-200 text-sm sm:text-base">Característica</th>
                      {currentPlan && (
                        <th className="text-center p-2 sm:p-3 border-b-2 border-gray-200 bg-gray-50">
                          <div className="flex flex-col items-center">
                            <span className="text-lg sm:text-2xl mb-1">{currentPlan.icon}</span>
                            <span className="text-xs sm:text-sm font-medium">{currentPlan.name}</span>
                            <span className="text-xs text-gray-500">(Actual)</span>
                          </div>
                        </th>
                      )}
                      {availablePlans.map(plan => (
                        <th key={plan._id} className="text-center p-2 sm:p-3 border-b-2 border-gray-200">
                          <div className="flex flex-col items-center">
                            <span className="text-lg sm:text-2xl mb-1">{plan.icon}</span>
                            <span className="text-xs sm:text-sm font-medium">{plan.name}</span>
                            {plan.popular && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full mt-1">
                                Popular
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 sm:p-3 border-b font-medium text-sm sm:text-base">Precio</td>
                      {currentPlan && (
                        <td className="text-center p-2 sm:p-3 border-b bg-gray-50">
                          <span className="text-sm sm:text-lg font-bold">{currentPlan.recurringPrice}€</span>
                          <span className="text-xs sm:text-sm text-gray-500">/{currentPlan.interval === 'year' ? 'año' : 'mes'}</span>
                        </td>
                      )}
                      {availablePlans.map(plan => {
                        const savings = calculateSavings(plan);
                        return (
                          <td key={plan._id} className="text-center p-2 sm:p-3 border-b">
                            <span className="text-sm sm:text-lg font-bold">{plan.recurringPrice}€</span>
                            <span className="text-xs sm:text-sm text-gray-500">/{plan.interval === 'year' ? 'año' : 'mes'}</span>
                            {savings && (
                              <div className="text-xs text-green-600 mt-1">
                                Ahorras {savings.amount}€ ({savings.percentage}%)
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Características */}
                    {(() => {
                      const allFeatures = new Set<string>();
                      [currentPlan, ...availablePlans].forEach(plan => {
                        if (plan) {
                          plan.features.forEach(f => {
                            const featureName = typeof f === 'string' ? f : f.name;
                            allFeatures.add(featureName);
                          });
                        }
                      });
                      return Array.from(allFeatures).slice(0, 8).map(feature => (
                        <tr key={feature}>
                          <td className="p-2 sm:p-3 border-b text-xs sm:text-sm">{feature}</td>
                          {currentPlan && (
                            <td className="text-center p-2 sm:p-3 border-b bg-gray-50">
                              {currentPlan.features.some(f => {
                                const fname = typeof f === 'string' ? f : f.name;
                                const included = typeof f === 'string' ? true : f.included;
                                return fname === feature && included;
                              }) ? (
                                <span className="text-green-500">✓</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          )}
                          {availablePlans.map(plan => (
                            <td key={plan._id} className="text-center p-2 sm:p-3 border-b">
                              {plan.features.some(f => {
                                const fname = typeof f === 'string' ? f : f.name;
                                const included = typeof f === 'string' ? true : f.included;
                                return fname === feature && included;
                              }) ? (
                                <span className="text-green-500">✓</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlan?._id === plan._id;
                  const savings = calculateSavings(plan);

                  return (
                    <div
                      key={plan._id}
                      className={`relative border-2 rounded-xl p-4 sm:p-6 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Badge popular */}
                        {plan.popular && (
                          <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full">
                              ⭐ <span className="hidden sm:inline">MÁS </span>POPULAR
                            </span>
                          </div>
                        )}

                        {/* Badge de ahorro */}
                        {savings && (
                          <div className="absolute -top-2 sm:-top-3 right-3 sm:right-4">
                            <span className="bg-green-500 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full">
                              -{savings.percentage}%
                            </span>
                          </div>
                        )}

                        <div className="text-center mb-3 sm:mb-4">
                          <span className="text-3xl sm:text-4xl">{plan.icon}</span>
                          <h3 className="text-lg sm:text-xl font-bold mt-2 text-gray-900">{plan.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">{plan.description}</p>
                        </div>

                        <div className="text-center mb-4 sm:mb-6">
                          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {plan.recurringPrice}€
                            <span className="text-xs sm:text-sm text-gray-500 font-normal">/{plan.interval === 'year' ? 'año' : 'mes'}</span>
                          </p>
                          {savings && (
                            <p className="text-xs sm:text-sm text-green-600 mt-1">
                              Ahorras {savings.amount}€/mes
                            </p>
                          )}
                          {plan.trialDays && plan.trialDays > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              🎁 {plan.trialDays} días de prueba gratis
                            </p>
                          )}
                        </div>

                        <ul className="space-y-1 sm:space-y-2 mb-4 sm:mb-6">
                          {plan.features.slice(0, 5).map((feature, index) => {
                            const featureName = typeof feature === 'string' ? feature : feature.name;
                            const isIncluded = typeof feature === 'string' ? true : feature.included;
                            
                            return (
                              <li key={index} className="flex items-start gap-2">
                                {isIncluded ? (
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span className={`text-xs sm:text-sm ${isIncluded ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                                  {featureName}
                                </span>
                              </li>
                            );
                          })}
                          {plan.features.length > 5 && (
                            <li className="text-xs sm:text-sm text-gray-500 pl-6 sm:pl-7">
                              +{plan.features.length - 5} más...
                            </li>
                          )}
                        </ul>

                        {isSelected && (
                          <div className="absolute inset-0 border-2 border-blue-500 rounded-xl pointer-events-none">
                            <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                              <div className="bg-blue-500 text-white rounded-full p-1">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mensaje informativo */}
            {selectedPlan && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-xs sm:text-sm text-blue-800">
                    <strong>📌 Has seleccionado:</strong> {selectedPlan.name} - {selectedPlan.recurringPrice}€/{selectedPlan.interval === 'year' ? 'año' : 'mes'}
                  </p>
                  {currentPlan && selectedPlan.recurringPrice < currentPlan.recurringPrice && (
                    <p className="text-xs sm:text-sm text-green-600 mt-1">
                      ¡Excelente elección! Ahorrarás {currentPlan.recurringPrice - selectedPlan.recurringPrice}€ cada {selectedPlan.interval === 'year' ? 'año' : 'mes'}.
                    </p>
                  )}
                </motion.div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base"
            >
              Cancelar
            </button>
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleChangePlan}
              disabled={!selectedPlan || loading}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold shadow-lg transition-all text-sm sm:text-base ${
                selectedPlan && !loading
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white" />
                  Procesando...
                </div>
              ) : (
                `Cambiar a ${selectedPlan?.name || 'plan'}`
              )}
            </MotionButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
