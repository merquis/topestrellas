'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CancelSubscriptionModal from './CancelSubscriptionModal';
import ChangePlanModal from './ChangePlanModal';
import UpdatePaymentMethodModal from '../UpdatePaymentMethodModal';

interface GoogleStats {
  rating: number;
  totalReviews: number;
}

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  businessId?: string;
  businessName?: string;
  googlePlaces?: {
    placeId?: string;
    rating?: number;
    totalReviews?: number;
  };
  subscription?: {
    plan: string;
    status: string;
    validUntil?: Date;
    stripeSubscriptionId?: string;
  };
  stats?: {
    googleRating?: number;
    googleReviews?: number;
  };
}

interface Plan {
  _id: string;
  key: string;
  name: string;
  description: string;
  recurringPrice: number;
  currency: string;
  interval: string;
  features: string[];
  icon: string;
  color: string;
  popular?: boolean;
}

interface SubscriptionCardProps {
  business: Business;
  plans: Plan[];
  onUpdate: () => void;
}

export default function SubscriptionCard({ business, plans, onUpdate }: SubscriptionCardProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStats, setCurrentStats] = useState<GoogleStats | null>(null);
  const [initialStats, setInitialStats] = useState<GoogleStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const bizId = business._id || (business as any).businessId;
  const bizName = business.name || (business as any).businessName;

  const currentPlan = plans.find(p => p.key === business.subscription?.plan);
  const isActive = business.subscription?.status === 'active' || business.subscription?.status === 'trialing';
  const isCanceled = business.subscription?.status === 'canceled';
  const isPaused = business.subscription?.status === 'paused' || business.subscription?.status === 'suspended';

  // Cargar estadísticas iniciales
  useEffect(() => {
    if (business.stats) {
      setInitialStats({
        rating: business.stats.googleRating || 0,
        totalReviews: business.stats.googleReviews || 0
      });
    }
  }, [business]);

  // Obtener estadísticas actuales de Google Places
  const fetchCurrentStats = async () => {
    if (!business.googlePlaces?.placeId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/google/places-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessId: bizId,
          placeId: business.googlePlaces.placeId 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentStats({
          rating: data.rating,
          totalReviews: data.totalReviews
        });
      }
    } catch (error) {
      console.error('Error fetching Google stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseClick = async () => {
    // Obtener estadísticas actuales antes de mostrar el modal
    if (business.googlePlaces?.placeId) {
      await fetchCurrentStats();
    }
    setShowCancelModal(true);
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/subscriptions/${bizId}/resume`, {
        method: 'POST'
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error resuming subscription:', error);
    } finally {
      setIsLoading(false);
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

  const getStatusBadge = () => {
    if (isActive) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Activo
        </span>
      );
    }
    if (isPaused) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <span className="text-yellow-600">⏸</span>
          Pausado
        </span>
      );
    }
    if (isCanceled) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
          <span className="text-red-600">✕</span>
          Cancelado
        </span>
      );
    }
    return null;
  };

  const getDaysRemaining = () => {
    if (!business.subscription?.validUntil) return null;
    const now = new Date();
    const validUntil = new Date(business.subscription.validUntil);
    const diffTime = validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Validar si se puede actualizar el método de pago
  const canUpdatePaymentMethod = () => {
    return business.subscription?.stripeSubscriptionId && 
           ['active', 'paused', 'suspended', 'past_due', 'trialing'].includes(business.subscription.status);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
        {/* Header con gradiente */}
        <div className={`h-3 bg-gradient-to-r ${currentPlan ? getPlanGradient(currentPlan.color) : 'from-gray-400 to-gray-500'}`} />
        
        <div className="p-6">
          {/* Información del negocio */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{bizName}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span>🌐</span>
                <a 
                  href={`https://${business.subdomain}.topestrellas.com`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  {business.subdomain}.topestrellas.com
                </a>
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Plan actual con diseño mejorado */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{currentPlan?.icon || '📦'}</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Plan actual</p>
                  <p className="font-bold text-xl text-gray-900">{currentPlan?.name || 'Sin plan'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {currentPlan?.recurringPrice || 0}€
                  <span className="text-sm text-gray-500 font-normal">/{currentPlan?.interval === 'year' ? 'año' : 'mes'}</span>
                </p>
              </div>
            </div>

            {/* Días restantes si está cancelado */}
            {isCanceled && getDaysRemaining() !== null && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  <p className="text-sm text-red-800">
                    <strong>Suscripción cancelada.</strong> Tienes {getDaysRemaining()} días restantes.
                  </p>
                </div>
              </div>
            )}

            {/* Características del plan */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <span className="font-medium">Ver características del plan</span>
                <motion.span
                  animate={{ rotate: showDetails ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.span>
              </div>
            </button>

            <AnimatePresence>
              {showDetails && (
                <div className="overflow-hidden">
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                  <div className="pt-3 space-y-2">
                    {currentPlan?.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
              )}
            </AnimatePresence>
          </div>

          {/* Estadísticas de Google si están disponibles */}
          {business.googlePlaces?.placeId && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Valoración Google</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {business.googlePlaces.rating || business.stats?.googleRating || 0}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({business.googlePlaces.totalReviews || business.stats?.googleReviews || 0} reseñas)
                      </span>
                    </div>
                  </div>
                </div>
                <a
                  href={`https://search.google.com/local/writereview?placeid=${business.googlePlaces.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver en Google →
                </a>
              </div>
            </div>
          )}

          {/* Botones de acción mejorados */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {isActive && (
                <>
                  <button
                    onClick={() => setShowChangePlanModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                      <span>🔄</span>
                      Cambiar Plan
                  </button>
                  <button
                    onClick={handlePauseClick}
                    disabled={isLoading}
                    className="border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-700" />
                      ) : (
                        <>
                          <span>⏸️</span>
                          Pausar Suscripción
                        </>
                      )}
                  </button>
                </>
              )}

              {(isPaused || isCanceled) && (
                <>
                  <button
                    onClick={handleResume}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <>
                          <span>▶️</span>
                          Reanudar Suscripción
                        </>
                      )}
                  </button>
                  <button
                    onClick={() => setShowChangePlanModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                      <span>🚀</span>
                      Cambiar Plan
                  </button>
                </>
              )}
            </div>

            {/* Botón de Método de Pago - Solo si se puede actualizar */}
            {canUpdatePaymentMethod() && (
              <button
                onClick={() => setShowUpdatePaymentModal(true)}
                className="w-full border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>💳</span>
                Cambiar método de pago
              </button>
            )}
          </div>

          {/* Información adicional */}
          {business.subscription?.stripeSubscriptionId && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Método de pago:</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">Stripe</span>
                  <span className="text-xl">💳</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </motion.div>
      </div>

      {/* Modal de cancelación con nombre del negocio */}
      {showCancelModal && (
        <CancelSubscriptionModal
          businessId={bizId}
          businessName={bizName}
          initialStats={initialStats}
          currentStats={currentStats}
          createdAt={business.createdAt || business.stats?.createdAt}
          onClose={() => setShowCancelModal(false)}
          onConfirm={() => {
            setShowCancelModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Modal de cambio de plan */}
      {showChangePlanModal && (
        <ChangePlanModal
          business={business}
          currentPlan={currentPlan}
          plans={plans}
          onClose={() => setShowChangePlanModal(false)}
          onSuccess={() => {
            setShowChangePlanModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Modal de actualización de método de pago */}
      {showUpdatePaymentModal && (
        <UpdatePaymentMethodModal
          businessId={bizId}
          businessName={bizName}
          onClose={() => setShowUpdatePaymentModal(false)}
          onSuccess={() => {
            setShowUpdatePaymentModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
