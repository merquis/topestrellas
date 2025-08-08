// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import { checkAuth } from '@/lib/auth';

interface Subscription {
  businessId: string;
  businessName: string;
  subdomain: string;
  plan: 'trial' | 'basic' | 'premium';
  status: 'active' | 'inactive' | 'suspended';
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  paymentMethod?: 'paypal' | 'stripe' | null;
  lastPayment?: {
    date: Date;
    amount: number;
    method: string;
  };
}

const PLANS = {
  trial: {
    name: 'Prueba Gratis',
    price: 0,
    duration: '7 días',
    color: 'from-green-400 to-emerald-500',
    icon: '🎁',
    features: [
      'Hasta 100 reseñas',
      'Sistema de premios básico',
      'Soporte por email',
      'Sin tarjeta de crédito'
    ],
    popular: false
  },
  basic: {
    name: 'Plan Básico',
    price: 29,
    duration: 'mes',
    color: 'from-blue-400 to-indigo-500',
    icon: '🚀',
    features: [
      'Hasta 500 reseñas',
      'Sistema de premios completo',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Personalización básica'
    ],
    popular: false
  },
  premium: {
    name: 'Plan Premium',
    price: 59,
    duration: 'mes',
    color: 'from-purple-400 to-pink-500',
    icon: '👑',
    features: [
      'Reseñas ilimitadas',
      'Múltiples ubicaciones',
      'API personalizada',
      'Soporte 24/7',
      'Personalización completa',
      'Análisis avanzado',
      'Integración con CRM'
    ],
    popular: true
  }
};

export default function SubscriptionsPage() {
  const [user, setUser] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    setUser(authUser);
  }, []);

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    }
  }, [user]);

  const loadSubscriptions = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
      });
      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setToast({ message: 'Error al cargar las suscripciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (subscription: Subscription, plan: 'basic' | 'premium') => {
    setSelectedSubscription(subscription);
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta suscripción?')) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        setToast({ message: 'Suscripción cancelada correctamente', type: 'success' });
        loadSubscriptions();
      } else {
        throw new Error('Error al cancelar la suscripción');
      }
    } catch (error) {
      setToast({ message: 'Error al cancelar la suscripción', type: 'error' });
    }
  };

  const processPayment = async () => {
    if (!selectedSubscription || !selectedPlan || !paymentMethod) return;

    setProcessingPayment(true);
    try {
      const response = await fetch('/api/admin/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedSubscription.businessId,
          plan: selectedPlan,
          paymentMethod
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Redirigir a la pasarela de pago correspondiente
        if (paymentMethod === 'paypal' && data.paypalUrl) {
          window.location.href = data.paypalUrl;
        } else if (paymentMethod === 'stripe' && data.stripeUrl) {
          window.location.href = data.stripeUrl;
        } else {
          setToast({ message: 'Suscripción actualizada correctamente', type: 'success' });
          setShowPaymentModal(false);
          loadSubscriptions();
        }
      } else {
        throw new Error('Error al procesar el pago');
      }
    } catch (error) {
      setToast({ message: 'Error al procesar el pago', type: 'error' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          <div className="bg-gray-100 rounded-xl p-4 mt-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-full mt-3"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
          </div>
          <div className="flex gap-3 mt-4">
            <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
            <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          <div className="bg-gray-100 rounded-xl p-4 mt-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-full mt-3"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
          </div>
          <div className="flex gap-3 mt-4">
            <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading || !user) {
    return (
      <AdminLayout user={user}>
        {renderSkeleton()}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">💳 Mis Suscripciones</h1>
              <p className="text-gray-600 mt-2">
                Gestiona los planes de suscripción de tus negocios
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total mensual</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{subscriptions.reduce((acc: number, sub: Subscription) => {
                    if (sub.status === 'active' && sub.plan !== 'trial') {
                      return acc + PLANS[sub.plan].price;
                    }
                    return acc;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {subscriptions.map((subscription: Subscription) => (
            <div key={subscription.businessId} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              {/* Header con gradiente según el plan */}
              <div className={`h-2 bg-gradient-to-r ${PLANS[subscription.plan].color}`}></div>
              
              <div className="p-6">
                {/* Business Info */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{subscription.businessName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{subscription.subdomain}.topestrellas.com</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    subscription.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : subscription.status === 'suspended'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {subscription.status === 'active' ? '● Activo' : 
                     subscription.status === 'suspended' ? '⚠ Suspendido' : '○ Inactivo'}
                  </span>
                </div>

                {/* Plan Details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{PLANS[subscription.plan].icon}</span>
                      <div>
                        <p className="font-bold text-lg text-gray-900">{PLANS[subscription.plan].name}</p>
                        {subscription.plan !== 'trial' && (
                          <p className="text-2xl font-bold text-gray-900">
                            €{PLANS[subscription.plan].price}
                            <span className="text-sm text-gray-500 font-normal">/{PLANS[subscription.plan].duration}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trial Warning */}
                  {subscription.plan === 'trial' && subscription.trialEndsAt && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">⏰</span>
                        <p className="text-sm text-yellow-800">
                          <strong>Periodo de prueba termina en {getDaysRemaining(subscription.trialEndsAt)} días</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {PLANS[subscription.plan].features.slice(0, 3).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Info */}
                  {subscription.paymentMethod && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Método de pago:</span>
                        <div className="flex items-center gap-2">
                          {subscription.paymentMethod === 'paypal' ? (
                            <>
                              <span className="text-blue-600 font-bold">PayPal</span>
                              <span className="text-xl">💳</span>
                            </>
                          ) : (
                            <>
                              <span className="text-purple-600 font-bold">Stripe</span>
                              <span className="text-xl">💳</span>
                            </>
                          )}
                        </div>
                      </div>
                      {subscription.autoRenew && (
                        <div className="flex items-center gap-1 mt-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-600">Renovación automática activa</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {subscription.plan === 'trial' ? (
                    <>
                      <button
                        onClick={() => handleCancelSubscription(subscription.businessId)}
                        className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                      >
                        Cancelar Suscripción
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowUpgradeModal(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Actualizar Plan
                      </button>
                    </>
                  ) : subscription.plan === 'basic' ? (
                    <>
                      <button
                        onClick={() => handleUpgrade(subscription, 'premium')}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-3 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Actualizar a Premium
                      </button>
                      <button
                        onClick={() => handleCancelSubscription(subscription.businessId)}
                        className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleCancelSubscription(subscription.businessId)}
                      className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                    >
                      Cancelar Suscripción
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && subscriptions.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Aún no tienes suscripciones activas
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Parece que no tienes ningún negocio con un plan de suscripción. ¡Elige un plan para empezar a disfrutar de todas las ventajas!
            </p>
            <p className="text-gray-500 text-sm">
              Si ya tienes una suscripción y no aparece, contacta con soporte.
            </p>
          </div>
        )}

      </div>

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Elige tu nuevo plan
            </h3>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {Object.entries(PLANS).map(([key, plan]: [string, any]) => {
                const isCurrentPlan = selectedSubscription.plan === key;
                return (
                  <div key={key} className={`relative rounded-2xl border-2 ${isCurrentPlan ? 'border-green-500' : (plan.popular ? 'border-purple-500' : 'border-gray-200')} p-6 flex flex-col`}>
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          TU PLAN ACTUAL
                        </span>
                      </div>
                    )}
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          MÁS POPULAR
                        </span>
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="text-center mb-4">
                        <span className="text-4xl">{plan.icon}</span>
                        <h3 className="text-xl font-bold text-gray-900 mt-2">{plan.name}</h3>
                        <div className="mt-4">
                          <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                          {plan.price > 0 && <span className="text-gray-500">/{plan.duration}</span>}
                        </div>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-auto">
                      {isCurrentPlan ? (
                        <button
                          disabled
                          className="w-full px-4 py-3 rounded-xl font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
                        >
                          Plan Actual
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowUpgradeModal(false);
                            handleUpgrade(selectedSubscription, key as 'basic' | 'premium');
                          }}
                          className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                            key === 'basic' 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                              : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                          }`}
                        >
                          Elegir {plan.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-600 hover:text-gray-800 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSubscription && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Selecciona método de pago
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Actualizando <strong>{selectedSubscription.businessName}</strong> a:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{PLANS[selectedPlan].name}</p>
                    <p className="text-sm text-gray-500">Facturación mensual</p>
                  </div>
                  <p className="text-2xl font-bold">€{PLANS[selectedPlan].price}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'paypal' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">PayPal</p>
                      <p className="text-xs text-gray-500">Pago seguro con PayPal</p>
                    </div>
                  </div>
                  {paymentMethod === 'paypal' && (
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === 'stripe' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Stripe</p>
                      <p className="text-xs text-gray-500">Tarjeta de crédito/débito</p>
                    </div>
                  </div>
                  {paymentMethod === 'stripe' && (
                    <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMethod(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                disabled={processingPayment}
              >
                Cancelar
              </button>
              <button
                onClick={processPayment}
                disabled={!paymentMethod || processingPayment}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                  paymentMethod && !processingPayment
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {processingPayment ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </span>
                ) : (
                  'Continuar al pago'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}
