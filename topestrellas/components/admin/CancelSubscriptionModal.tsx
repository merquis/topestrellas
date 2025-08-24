'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Tipos de framer-motion con cast seguro para evitar conflictos de typings con React 19
const MotionButton = motion.button as any;
const MotionDiv = motion.div as any;

interface CancelSubscriptionModalProps {
  businessId: string;
  businessName?: string;
  businessPhotoUrl?: string;
  initialStats: { rating: number; totalReviews: number } | null;
  currentStats: { rating: number; totalReviews: number } | null;
  createdAt?: string;
  googleRedirections?: number;
  tripadvisorRedirections?: number;
  dailyAverage?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelSubscriptionModal({
  businessId,
  businessName = 'Tu negocio',
  businessPhotoUrl,
  initialStats,
  currentStats,
  createdAt,
  googleRedirections = 0,
  tripadvisorRedirections = 0,
  dailyAverage = 0,
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
      // Obtener el usuario autenticado del localStorage
      const authData = localStorage.getItem('authUser');
      let authToken = '';
      
      if (authData) {
        try {
          const authUser = JSON.parse(authData);
          // Crear el token en formato base64 como espera la API
          const tokenData = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.name,
            role: authUser.role,
            businessId: authUser.businessId
          };
          authToken = btoa(JSON.stringify(tokenData));
        } catch (e) {
          console.error('Failed to parse auth data:', e);
        }
      }
      
      const response = await fetch(`/api/admin/subscriptions/${businessId}/pause`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        credentials: 'include', // Incluir cookies para autenticación
        body: JSON.stringify({
          reason: selectedReason,
          feedback,
          offerShown: showOffer,
          offerAccepted
        })
      });

      if (response.ok) {
        onConfirm();
      } else {
        console.error('Error response:', response.status, response.statusText);
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          console.error('Error details:', errorData);
        }
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

  // Calcular tiempo con TopEstrellas en formato legible
  const calculateTimeWithService = () => {
    if (!createdAt) return null;
    
    const start = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Calcular años, meses y días
    const years = Math.floor(totalDays / 365);
    const remainingDaysAfterYears = totalDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;
    
    // Construir el texto según el tiempo transcurrido
    if (years > 0) {
      if (months > 0) {
        return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
      }
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    } else if (months > 0) {
      if (days > 0) {
        return `${months} ${months === 1 ? 'mes' : 'meses'} y ${days} ${days === 1 ? 'día' : 'días'}`;
      }
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else if (totalDays >= 7) {
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      if (remainingDays > 0) {
        return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`;
      }
      return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    } else {
      return `${totalDays} ${totalDays === 1 ? 'día' : 'días'}`;
    }
  };

  const timeWithService = calculateTimeWithService();

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden relative"
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
          <AnimatePresence mode="wait">
            {step === 1 && (
              <MotionDiv
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 sm:p-6 lg:p-8"
              >
                {/* Header elegante con foto del local */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    {/* Foto del local */}
                    {businessPhotoUrl ? (
                      <MotionDiv
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <img
                          src={businessPhotoUrl}
                          alt={businessName}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover shadow-lg border-2 border-white"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="hidden w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl sm:rounded-2xl items-center justify-center"
                          style={{ display: 'none' }}
                        >
                          <span className="text-2xl sm:text-3xl">🏢</span>
                        </div>
                      </MotionDiv>
                    ) : (
                      <MotionDiv
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                        className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center"
                      >
                        <span className="text-2xl sm:text-3xl">🏢</span>
                      </MotionDiv>
                    )}
                    
                    {/* Nombre y descripción */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent truncate">
                        {businessName}
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600 mt-1">
                        Análisis de rendimiento y progreso
                      </p>
                    </div>
                    
                    {/* Icono de estadísticas */}
                    <MotionDiv
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <span className="text-xl sm:text-2xl">📊</span>
                      </div>
                    </MotionDiv>
                  </div>
                </div>

                {/* Mensaje dinámico de retención */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                  <div className="flex gap-3">
                    <span className="text-xl sm:text-2xl flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-sm sm:text-base text-amber-900 font-medium mb-1">
                        ¡Espera, acabas de empezar!
                      </p>
                      <p className="text-xs sm:text-sm text-amber-800">
                        El 92% de los negocios que esperan al menos 3 semanas ven resultados significativos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span className="text-lg sm:text-xl">✨</span>
                    Continuar creciendo
                  </MotionButton>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm sm:text-base"
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
                className="p-4 sm:p-6 lg:p-8"
              >
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Entendemos tu situación
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Nos gustaría conocer el motivo para poder mejorar
                  </p>
                </div>

                {/* Razones con diseño elegante */}
                <div className="space-y-3 mb-6 sm:mb-8">
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
                      className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center gap-3 sm:gap-4 ${
                        selectedReason === reason.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${reason.color} flex items-center justify-center text-white text-lg sm:text-2xl`}>
                        {reason.icon}
                      </div>
                      <span className="flex-1 text-left font-medium text-gray-800 text-sm sm:text-base">{reason.label}</span>
                      {selectedReason === reason.id && (
                        <span className="text-indigo-500">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
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
                    className="mb-4 sm:mb-6"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ¿Algún detalle adicional que quieras compartir? (opcional)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm sm:text-base"
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
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="text-3xl sm:text-4xl">🎁</span>
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold mb-2">
                          Oferta exclusiva para ti
                        </h3>
                        <p className="mb-3 sm:mb-4 opacity-95 text-sm sm:text-base">
                          Valoramos tu confianza y queremos que sigas creciendo con nosotros. 
                          Te ofrecemos un <strong>25% de descuento durante los próximos 3 meses</strong>.
                        </p>
                        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
                            <p className="text-xs opacity-80">Precio actual</p>
                            <p className="text-base sm:text-lg font-bold line-through opacity-70">1€/mes</p>
                          </div>
                          <span className="text-xl sm:text-2xl">→</span>
                          <div className="bg-white/20 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
                            <p className="text-xs">Con descuento</p>
                            <p className="text-xl sm:text-2xl font-bold">0.75€/mes</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setOfferAccepted(true);
                            onClose();
                          }}
                          className="bg-white text-purple-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all text-sm sm:text-base"
                        >
                          Aplicar descuento y continuar
                        </button>
                      </div>
                    </div>
                  </MotionDiv>
                )}

                {/* Botones finales */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm sm:text-base"
                  >
                    ← Volver
                  </button>
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePause}
                    disabled={!selectedReason || isLoading}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white" />
                        Procesando...
                      </div>
                    ) : (
                      'Suspender suscripción'
                    )}
                  </MotionButton>
                </div>

                {/* Mensaje de tranquilidad */}
                <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
                  Podrás reactivar tu suscripción en cualquier momento con un solo clic
                </p>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </MotionDiv>
    </div>
  );
}
