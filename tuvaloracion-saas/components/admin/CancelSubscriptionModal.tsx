'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Tipos de framer-motion con cast seguro para evitar conflictos de typings con React 19
const MotionButton = motion.button as any;
const MotionDiv = motion.div as any;

interface CancelSubscriptionModalProps {
  businessId: string;
  businessName?: string;
  initialStats: { rating: number; totalReviews: number } | null;
  currentStats: { rating: number; totalReviews: number } | null;
  createdAt?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelSubscriptionModal({
  businessId,
  businessName = 'Tu negocio',
  initialStats,
  currentStats,
  createdAt,
  onClose,
  onConfirm
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAccepted, setOfferAccepted] = useState(false);

  const reasons = [
    { 
      id: 'expensive', 
      label: 'El precio no se ajusta a mi presupuesto actual', 
      icon: '💰',
      color: 'from-yellow-400 to-orange-500'
    },
    { 
      id: 'not_using', 
      label: 'No estoy aprovechando todas las funcionalidades', 
      icon: '📊',
      color: 'from-blue-400 to-indigo-500'
    },
    { 
      id: 'missing_features', 
      label: 'Necesito características que no están disponibles', 
      icon: '🔧',
      color: 'from-purple-400 to-pink-500'
    },
    { 
      id: 'technical_issues', 
      label: 'He experimentado problemas técnicos', 
      icon: '⚠️',
      color: 'from-red-400 to-rose-500'
    },
    { 
      id: 'other', 
      label: 'Otro motivo', 
      icon: '💭',
      color: 'from-gray-400 to-gray-500'
    }
  ];

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/subscriptions/${businessId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          feedback,
          offerShown: showOffer,
          offerAccepted
        })
      });

      if (response.ok) {
        onConfirm();
      }
    } catch (error) {
      console.error('Error pausing subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateImprovement = () => {
    if (!initialStats || !currentStats) return null;
    
    const ratingDiff = (currentStats.rating - initialStats.rating).toFixed(1);
    const reviewsDiff = currentStats.totalReviews - initialStats.totalReviews;
    
    return {
      ratingDiff: parseFloat(ratingDiff),
      reviewsDiff,
      ratingPercentage: initialStats.rating > 0 
        ? Math.round(((currentStats.rating - initialStats.rating) / initialStats.rating) * 100)
        : 0,
      reviewsPercentage: initialStats.totalReviews > 0
        ? Math.round(((currentStats.totalReviews - initialStats.totalReviews) / initialStats.totalReviews) * 100)
        : 0
    };
  };

  const improvement = calculateImprovement();

  // Calcular días desde el inicio
  const calculateDaysSinceStart = () => {
    if (!createdAt) return 0;
    const start = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysSinceStart = calculateDaysSinceStart();

  // Calcular el valor monetario estimado
  const calculateMonetaryValue = () => {
    if (!improvement) return 0;
    // Estimación: cada nueva reseña vale ~12€ en marketing
    // Cada 0.1 de rating aumenta conversión ~2.5%
    const reviewValue = improvement.reviewsDiff * 12;
    const ratingValue = improvement.ratingDiff * 10 * 250; // 0.1 rating = 250€ valor estimado
    return Math.round(reviewValue + ratingValue);
  };

  const monetaryValue = calculateMonetaryValue();

  // Animación de números creciendo
  const AnimatedNumber = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
      const duration = 1500;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }, [value]);
    
    return <span>{prefix}{displayValue.toLocaleString('es-ES')}{suffix}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <MotionDiv
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              {/* Header elegante */}
              <div className="text-center mb-8">
                <MotionDiv
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4"
                >
                  <span className="text-4xl">📊</span>
                </MotionDiv>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                  {businessName}
                </h2>
                <p className="text-gray-600 text-lg">
                  Análisis de rendimiento y progreso
                </p>
              </div>

              {/* Estadísticas de mejora con diseño premium */}
              {(currentStats || initialStats) && (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl p-6 mb-6 border border-indigo-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    Tu evolución con TopEstrellas.com
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Valoración */}
                    <MotionDiv
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-600">Valoración media</span>
                        {improvement && improvement.ratingDiff > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                            +{improvement.ratingPercentage}%
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">⭐</span>
                            <div>
                              <p className="text-xs text-gray-500">Inicio</p>
                              <p className="text-2xl font-bold text-gray-700">{initialStats?.rating || 0}</p>
                            </div>
                          </div>
                          
                          <div className="flex-1 px-4">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <MotionDiv
                                initial={{ width: 0 }}
                                animate={{ width: `${(currentStats?.rating || 0) * 20}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Actual</p>
                              <p className="text-2xl font-bold text-green-600">
                                <AnimatedNumber value={currentStats?.rating || 0} />
                              </p>
                            </div>
                            <span className="text-3xl">🌟</span>
                          </div>
                        </div>
                        
                        {improvement && improvement.ratingDiff > 0 && (
                          <p className="text-center text-sm text-green-600 font-medium">
                            ¡Has mejorado {improvement.ratingDiff} puntos!
                          </p>
                        )}
                        {(!improvement || improvement.ratingDiff === 0) && daysSinceStart < 7 && (
                          <p className="text-center text-sm text-amber-600">
                            Solo han pasado {daysSinceStart} {daysSinceStart === 1 ? 'día' : 'días'} - es muy pronto para ver cambios
                          </p>
                        )}
                        {(!improvement || improvement.ratingDiff === 0) && daysSinceStart >= 7 && (
                          <p className="text-center text-sm text-blue-600">
                            Valoración estable tras {daysSinceStart} días - ¡sigue trabajando!
                          </p>
                        )}
                      </div>
                    </MotionDiv>

                    {/* Reseñas */}
                    <MotionDiv
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-600">Total de reseñas</span>
                        {improvement && improvement.reviewsDiff > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                            +{improvement.reviewsPercentage}%
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">💬</span>
                            <div>
                              <p className="text-xs text-gray-500">Inicio</p>
                              <p className="text-2xl font-bold text-gray-700">
                                {initialStats?.totalReviews.toLocaleString('es-ES') || 0}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex-1 px-4 flex items-center justify-center">
                            <MotionDiv
                              animate={{ x: [0, 5, 0] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="text-3xl text-green-500"
                            >
                              →
                            </MotionDiv>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Actual</p>
                              <p className="text-2xl font-bold text-green-600">
                                <AnimatedNumber value={currentStats?.totalReviews || 0} />
                              </p>
                            </div>
                            <span className="text-3xl">🎯</span>
                          </div>
                        </div>
                        
                        {improvement && improvement.reviewsDiff > 0 && (
                          <p className="text-center text-sm text-green-600 font-medium">
                            ¡{improvement.reviewsDiff} nuevas reseñas en {daysSinceStart} {daysSinceStart === 1 ? 'día' : 'días'}!
                          </p>
                        )}
                        {(!improvement || improvement.reviewsDiff === 0) && daysSinceStart < 7 && (
                          <p className="text-center text-sm text-amber-600">
                            Solo {daysSinceStart} {daysSinceStart === 1 ? 'día' : 'días'} activo - las reseñas llegarán pronto
                          </p>
                        )}
                        {(!improvement || improvement.reviewsDiff === 0) && daysSinceStart >= 7 && (
                          <p className="text-center text-sm text-blue-600">
                            {daysSinceStart} días activo - incentiva a tu equipo para multiplicar resultados
                          </p>
                        )}
                      </div>
                    </MotionDiv>
                  </div>

                  {/* Valor monetario estimado */}
                  {monetaryValue > 0 && (
                    <MotionDiv
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">💰</span>
                          <div>
                            <p className="text-sm opacity-90">Valor estimado generado</p>
                            <p className="text-2xl font-bold">
                              <AnimatedNumber value={monetaryValue} prefix="€" />
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs opacity-80">Equivalente en</p>
                          <p className="text-sm font-semibold">marketing digital</p>
                        </div>
                      </div>
                    </MotionDiv>
                  )}
                </div>
              )}

              {/* Información adicional */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <span className="text-2xl flex-shrink-0">💡</span>
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-1">
                      ¿Sabías que...?
                    </p>
                    <p className="text-sm text-amber-800">
                      Los negocios que mantienen su suscripción activa consiguen 
                      <strong> más de 100 nuevas reseñas mensuales</strong>. Si tus empleados 
                      incentivan activamente el uso de la aplicación, puedes 
                      <strong> multiplicar estos resultados por 3 o más</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">✨</span>
                  Continuar creciendo
                </MotionButton>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  No quiero continuar
                </button>
              </div>
            </MotionDiv>
          )}

          {step === 2 && (
            <MotionDiv
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Entendemos tu situación
                </h2>
                <p className="text-gray-600">
                  Nos gustaría conocer el motivo para poder mejorar
                </p>
              </div>

              {/* Razones con diseño elegante */}
              <div className="space-y-3 mb-8">
                {reasons.map((reason) => (
                  <MotionButton
                    key={reason.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSelectedReason(reason.id);
                      if (reason.id === 'expensive') {
                        setShowOffer(true);
                      }
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      selectedReason === reason.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${reason.color} flex items-center justify-center text-white text-2xl`}>
                      {reason.icon}
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-800">{reason.label}</span>
                    {selectedReason === reason.id && (
                      <span className="text-indigo-500">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </MotionButton>
                ))}
              </div>

              {/* Campo de feedback adicional */}
              {selectedReason && (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Algún detalle adicional que quieras compartir? (opcional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Tu opinión es muy valiosa para nosotros..."
                  />
                </MotionDiv>
              )}

              {/* Oferta especial para retención */}
              {showOffer && selectedReason === 'expensive' && !offerAccepted && (
                <MotionDiv
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-6 mb-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">🎁</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">
                        Oferta exclusiva para ti
                      </h3>
                      <p className="mb-4 opacity-95">
                        Valoramos tu confianza y queremos que sigas creciendo con nosotros. 
                        Te ofrecemos un <strong>25% de descuento durante los próximos 3 meses</strong>.
                      </p>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-white/20 rounded-lg px-3 py-2">
                          <p className="text-xs opacity-80">Precio actual</p>
                          <p className="text-lg font-bold line-through opacity-70">1€/mes</p>
                        </div>
                        <span className="text-2xl">→</span>
                        <div className="bg-white/20 rounded-lg px-3 py-2">
                          <p className="text-xs">Con descuento</p>
                          <p className="text-2xl font-bold">0.75€/mes</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setOfferAccepted(true);
                          onClose();
                        }}
                        className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
                      >
                        Aplicar descuento y continuar
                      </button>
                    </div>
                  </div>
                </MotionDiv>
              )}

              {/* Botones finales */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  ← Volver
                </button>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePause}
                  disabled={!selectedReason || isLoading}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Procesando...
                    </div>
                  ) : (
                    'Suspender suscripción'
                  )}
                </MotionButton>
              </div>

              {/* Mensaje de tranquilidad */}
              <p className="text-center text-sm text-gray-500 mt-4">
                Podrás reactivar tu suscripción en cualquier momento con un solo clic
              </p>
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>
    </div>
  );
}
