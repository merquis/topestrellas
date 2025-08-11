'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Tipos de framer-motion con cast seguro para evitar conflictos de typings con React 19
const MotionButton = motion.button as any;

interface CancelSubscriptionModalProps {
  business: any;
  initialStats: { rating: number; totalReviews: number } | null;
  currentStats: { rating: number; totalReviews: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelSubscriptionModal({
  business,
  initialStats,
  currentStats,
  onClose,
  onConfirm
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);

  const reasons = [
    { id: 'expensive', label: 'Es demasiado caro', icon: '💰' },
    { id: 'not_using', label: 'No lo estoy usando', icon: '😴' },
    { id: 'missing_features', label: 'Faltan características', icon: '🔧' },
    { id: 'technical_issues', label: 'Problemas técnicos', icon: '⚠️' },
    { id: 'other', label: 'Otro motivo', icon: '💭' }
  ];

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/subscriptions/${business._id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          feedback
        })
      });

      if (response.ok) {
        onConfirm();
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Header con estadísticas */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                  <span className="text-4xl">😢</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  ¿Estás seguro de cancelar?
                </h2>
                <p className="text-gray-600">
                  Mira todo lo que has conseguido con nosotros
                </p>
              </div>

              {/* Estadísticas de mejora */}
              {improvement && (currentStats || initialStats) && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                    📊 Tu progreso desde que empezaste
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Valoración */}
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-500">Valoración</span>
                        {improvement.ratingDiff > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            +{improvement.ratingPercentage}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Antes</p>
                          <div className="flex items-center gap-1">
                            <span className="text-2xl">⭐</span>
                            <span className="text-xl font-bold">{initialStats?.rating || 0}</span>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            {improvement.ratingDiff > 0 ? (
                              <span className="text-green-500 text-2xl">→</span>
                            ) : (
                              <span className="text-gray-400 text-2xl">→</span>
                            )}
                          </motion.div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Ahora</p>
                          <div className="flex items-center gap-1">
                            <span className="text-2xl">⭐</span>
                            <span className="text-xl font-bold text-green-600">
                              {currentStats?.rating || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      {improvement.ratingDiff > 0 && (
                        <p className="text-xs text-green-600 text-center mt-2">
                          ¡Has mejorado {improvement.ratingDiff} puntos!
                        </p>
                      )}
                    </div>

                    {/* Reseñas */}
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-500">Reseñas</span>
                        {improvement.reviewsDiff > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            +{improvement.reviewsPercentage}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Antes</p>
                          <div className="flex items-center gap-1">
                            <span className="text-2xl">💬</span>
                            <span className="text-xl font-bold">{initialStats?.totalReviews || 0}</span>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            {improvement.reviewsDiff > 0 ? (
                              <span className="text-green-500 text-2xl">→</span>
                            ) : (
                              <span className="text-gray-400 text-2xl">→</span>
                            )}
                          </motion.div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Ahora</p>
                          <div className="flex items-center gap-1">
                            <span className="text-2xl">💬</span>
                            <span className="text-xl font-bold text-green-600">
                              {currentStats?.totalReviews || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      {improvement.reviewsDiff > 0 && (
                        <p className="text-xs text-green-600 text-center mt-2">
                          ¡{improvement.reviewsDiff} nuevas reseñas!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Beneficios que perderás */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-red-900 mb-3">
                  ⚠️ Si cancelas, perderás:
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span className="text-sm text-gray-700">
                      Acceso al sistema de reseñas automatizado
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span className="text-sm text-gray-700">
                      Estadísticas y análisis de tu negocio
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span className="text-sm text-gray-700">
                      Sistema de premios para clientes
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span className="text-sm text-gray-700">
                      Todo el progreso y configuración actual
                    </span>
                  </li>
                </ul>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="text-lg">🎉</span> Mantener mi suscripción
                </MotionButton>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Continuar con la cancelación
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ayúdanos a mejorar
                </h2>
                <p className="text-gray-600">
                  ¿Por qué quieres cancelar tu suscripción?
                </p>
              </div>

              {/* Razones */}
              <div className="space-y-3 mb-6">
                {reasons.map((reason) => (
                  <MotionButton
                    key={reason.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      selectedReason === reason.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{reason.icon}</span>
                    <span className="font-medium text-gray-900">{reason.label}</span>
                    {selectedReason === reason.id && (
                      <span className="ml-auto text-blue-500">✓</span>
                    )}
                  </MotionButton>
                ))}
              </div>

              {/* Feedback adicional */}
              {selectedReason && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Algo más que quieras compartir? (opcional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Tu opinión es muy importante para nosotros..."
                  />
                </motion.div>
              )}

              {/* Oferta especial */}
              {selectedReason === 'expensive' && !showOffer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-6 mb-6"
                >
                  <h3 className="text-xl font-bold mb-2">
                    🎁 ¡Espera! Tenemos una oferta especial para ti
                  </h3>
                  <p className="mb-4">
                    Quédate con nosotros y obtén un 30% de descuento durante los próximos 3 meses
                  </p>
                  <button
                    onClick={() => {
                      setShowOffer(true);
                      onClose();
                    }}
                    className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
                  >
                    ¡Aplicar descuento!
                  </button>
                </motion.div>
              )}

              {/* Botones finales */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  ← Volver
                </button>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  disabled={!selectedReason || isLoading}
                  className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Cancelando...
                    </div>
                  ) : (
                    'Confirmar cancelación'
                  )}
                </MotionButton>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
