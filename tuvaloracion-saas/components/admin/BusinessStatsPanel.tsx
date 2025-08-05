'use client';

import { useState, useEffect } from 'react';
import { checkAuth } from '@/lib/auth';

interface BusinessStats {
  period: string;
  periodLabel: string;
  businessName: string;
  totalReviews: number;
  fiveStarReviews: number;
  fourStarReviews: number;
  qualityReviews: number;
  avgRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  ratingPercentages: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  qualityPercentage: number;
  totalCost: number;
  costPerReview: number;
  costPerFiveStar: number;
  competenciaPrice: number;
  savingsPerReview: number;
  totalSavings: number;
  savingsPercentage: number;
  reviewsGrowth: number;
  fiveStarGrowth: number;
  previousTotalReviews: number;
  previousFiveStarReviews: number;
  dailyAverage: number;
  conversionRate: number;
  dailyTrends: Array<{
    date: string;
    total: number;
    fiveStar: number;
  }>;
  // Nuevos campos para Google y TripAdvisor
  googleStats?: {
    currentRating: number;
    totalReviews: number;
  };
  tripadvisorStats?: {
    currentRating: number;
    totalReviews: number;
  };
}

interface BusinessStatsPanelProps {
  businessId: string;
  businessName?: string;
}

export default function BusinessStatsPanel({ businessId, businessName }: BusinessStatsPanelProps) {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1month');

  const periods = [
    { value: '1day', label: 'Último día', icon: '📅' },
    { value: '1week', label: 'Última semana', icon: '📊' },
    { value: '1month', label: 'Último mes', icon: '📈' },
    { value: '3months', label: '3 meses', icon: '📉' },
    { value: '6months', label: '6 meses', icon: '📋' },
    { value: '1year', label: '1 año', icon: '🗓️' }
  ];

  useEffect(() => {
    loadStats();
  }, [businessId, selectedPeriod]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const user = checkAuth();
      if (!user) return;

      const response = await fetch(
        `/api/admin/business-stats?userEmail=${user.email}&userRole=${user.role}&businessId=${businessId}&period=${selectedPeriod}`
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else {
        setError('Error al cargar estadísticas');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    const icon = isPositive ? '↗️' : '↘️';
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    return (
      <span className={`${color} font-medium`}>
        {icon} {Math.abs(growth)}%
      </span>
    );
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 5: return 'bg-green-500';
      case 4: return 'bg-blue-500';
      case 3: return 'bg-yellow-500';
      case 2: return 'bg-orange-500';
      case 1: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRatingEmoji = (rating: number) => {
    switch (rating) {
      case 5: return '⭐⭐⭐⭐⭐';
      case 4: return '⭐⭐⭐⭐';
      case 3: return '⭐⭐⭐';
      case 2: return '⭐⭐';
      case 1: return '⭐';
      default: return '';
    }
  };

  // Función para calcular reseñas necesarias para subir 0.1 puntos
  const calculateReviewsNeeded = (currentRating: number, totalReviews: number) => {
    if (currentRating >= 5.0) return { target: 5.0, reviewsNeeded: 0 };
    
    // Calcular el siguiente objetivo (subir 0.1)
    const targetRating = Math.min(5.0, Math.ceil(currentRating * 10) / 10);
    
    // Si ya está en una décima exacta, subir a la siguiente
    const actualTarget = currentRating === targetRating ? 
      Math.min(5.0, targetRating + 0.1) : targetRating;
    
    // Calcular suma actual de puntuaciones
    const currentSum = currentRating * totalReviews;
    
    // Resolver ecuación: (currentSum + 5*x) / (totalReviews + x) = actualTarget
    // currentSum + 5*x = actualTarget * (totalReviews + x)
    // currentSum + 5*x = actualTarget * totalReviews + actualTarget * x
    // 5*x - actualTarget * x = actualTarget * totalReviews - currentSum
    // x * (5 - actualTarget) = actualTarget * totalReviews - currentSum
    // x = (actualTarget * totalReviews - currentSum) / (5 - actualTarget)
    
    const reviewsNeeded = Math.ceil(
      (actualTarget * totalReviews - currentSum) / (5 - actualTarget)
    );
    
    return {
      target: actualTarget,
      reviewsNeeded: Math.max(0, reviewsNeeded)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error || 'No se pudieron cargar las estadísticas'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con selector de período */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">📊 Panel Empresarial</h1>
            <p className="text-blue-100 mt-1">{stats.businessName}</p>
            <p className="text-blue-200 text-sm">{stats.periodLabel}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value} className="text-gray-900">
                  {period.icon} {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Reseñas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">📝 Total Reseñas</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalReviews}</p>
              <p className="text-sm text-gray-500 mt-1">
                vs período anterior: {formatGrowth(stats.reviewsGrowth)}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        {/* Reseñas 5 Estrellas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">⭐ Reseñas 5★</p>
              <p className="text-3xl font-bold text-green-600">{stats.fiveStarReviews}</p>
              <p className="text-sm text-gray-500 mt-1">
                vs período anterior: {formatGrowth(stats.fiveStarGrowth)}
              </p>
            </div>
            <div className="text-4xl">🌟</div>
          </div>
        </div>

        {/* Rating Promedio */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">📊 Rating Promedio</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.avgRating}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.qualityPercentage}% son 4★ o 5★
              </p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
        </div>

        {/* Promedio Diario */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">📅 Promedio Diario</p>
              <p className="text-3xl font-bold text-purple-600">{stats.dailyAverage}</p>
              <p className="text-sm text-gray-500 mt-1">
                reseñas por día
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Análisis Financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Análisis de Costes</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700">💸 Coste Total en Premios</span>
              <span className="font-bold text-blue-600">{formatCurrency(stats.totalCost)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">⭐ Coste por Reseña 5★</span>
              <span className="font-bold text-green-600">{formatCurrency(stats.costPerFiveStar)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">📊 Coste por Reseña Total</span>
              <span className="font-bold text-gray-600">{formatCurrency(stats.costPerReview)}</span>
            </div>
          </div>
        </div>

        {/* Ahorros vs Competencia */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Ahorro vs Competencia</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700">🏢 Precio Competencia</span>
              <span className="font-bold text-red-600">{formatCurrency(stats.competenciaPrice)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">💰 Tu Ahorro por Reseña</span>
              <span className="font-bold text-green-600">{formatCurrency(stats.savingsPerReview)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
              <span className="text-gray-700 font-medium">🎉 Ahorro Total</span>
              <div className="text-right">
                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(stats.totalSavings)}</span>
                <p className="text-sm text-emerald-600">({stats.savingsPercentage}% menos)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de Ratings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">📊 Distribución de Ratings</h3>
        <div className="space-y-4">
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-medium text-gray-700">
                {getRatingEmoji(rating)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">
                    {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]} reseñas
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.ratingPercentages[rating as keyof typeof stats.ratingPercentages]}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getRatingColor(rating)}`}
                    style={{
                      width: `${stats.ratingPercentages[rating as keyof typeof stats.ratingPercentages]}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-gray-600 text-sm font-medium">Tasa de Conversión</p>
            <p className="text-3xl font-bold text-green-600">{stats.conversionRate}%</p>
            <p className="text-sm text-gray-500 mt-1">a reseñas 5★</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="text-center">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-gray-600 text-sm font-medium">Reseñas de Calidad</p>
            <p className="text-3xl font-bold text-blue-600">{stats.qualityReviews}</p>
            <p className="text-sm text-gray-500 mt-1">4★ y 5★ combinadas</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="text-center">
            <div className="text-4xl mb-2">💎</div>
            <p className="text-gray-600 text-sm font-medium">Eficiencia</p>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.costPerFiveStar)}</p>
            <p className="text-sm text-gray-500 mt-1">por reseña 5★</p>
          </div>
        </div>
      </div>

      {/* Estadísticas de Google y TripAdvisor */}
      {(stats.googleStats || stats.tripadvisorStats) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Google Reviews */}
          {stats.googleStats && stats.googleStats.currentRating > 0 && stats.googleStats.totalReviews > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl">🔍</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Google Reviews</h3>
                  <p className="text-sm text-gray-600">Tu puntuación actual en Google</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Puntuación actual</p>
                    <p className="text-2xl font-bold text-red-600">
                      {Number(stats.googleStats.currentRating).toFixed(1)}⭐
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total reseñas</p>
                    <p className="text-xl font-semibold text-gray-800">
                      {Number(stats.googleStats.totalReviews)}
                    </p>
                  </div>
                </div>

                {(() => {
                  const calculation = calculateReviewsNeeded(
                    stats.googleStats!.currentRating, 
                    stats.googleStats!.totalReviews
                  );
                  
                  if (calculation.reviewsNeeded > 0) {
                    return (
                      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-4 text-white">
                        <div className="flex items-center space-x-2">
                          <div className="text-2xl">🎯</div>
                          <div>
                            <p className="font-bold">
                              Para llegar a {calculation.target.toFixed(1)}⭐
                            </p>
                            <p className="text-sm text-red-100">
                              Te faltan <strong>{calculation.reviewsNeeded} reseñas de 5⭐</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-4 text-white text-center">
                        <div className="text-2xl mb-2">🏆</div>
                        <p className="font-bold">¡Puntuación perfecta!</p>
                        <p className="text-sm text-green-100">Ya tienes 5.0⭐ en Google</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          {/* TripAdvisor Reviews */}
          {stats.tripadvisorStats && stats.tripadvisorStats.currentRating > 0 && stats.tripadvisorStats.totalReviews > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl">🏨</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">TripAdvisor Reviews</h3>
                  <p className="text-sm text-gray-600">Tu puntuación actual en TripAdvisor</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Puntuación actual</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Number(stats.tripadvisorStats.currentRating).toFixed(1)}⭐
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total reseñas</p>
                    <p className="text-xl font-semibold text-gray-800">
                      {Number(stats.tripadvisorStats.totalReviews)}
                    </p>
                  </div>
                </div>

                {(() => {
                  const calculation = calculateReviewsNeeded(
                    stats.tripadvisorStats!.currentRating, 
                    stats.tripadvisorStats!.totalReviews
                  );
                  
                  if (calculation.reviewsNeeded > 0) {
                    return (
                      <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-4 text-white">
                        <div className="flex items-center space-x-2">
                          <div className="text-2xl">🎯</div>
                          <div>
                            <p className="font-bold">
                              Para llegar a {calculation.target.toFixed(1)}⭐
                            </p>
                            <p className="text-sm text-green-100">
                              Te faltan <strong>{calculation.reviewsNeeded} reseñas de 5⭐</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-4 text-white text-center">
                        <div className="text-2xl mb-2">🏆</div>
                        <p className="font-bold">¡Puntuación perfecta!</p>
                        <p className="text-sm text-green-100">Ya tienes 5.0⭐ en TripAdvisor</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje motivacional */}
      {stats.totalSavings > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="text-6xl">🎉</div>
            <div>
              <h3 className="text-xl font-bold">¡Excelente trabajo!</h3>
              <p className="text-green-100 mt-1">
                Has ahorrado <strong>{formatCurrency(stats.totalSavings)}</strong> comparado con la competencia.
                Eso es un <strong>{stats.savingsPercentage}%</strong> menos de lo que pagarías por el mismo número de reseñas.
              </p>
              <p className="text-green-200 text-sm mt-2">
                Con {stats.fiveStarReviews} reseñas de 5 estrellas, tu negocio está construyendo una reputación sólida de manera muy eficiente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Beneficios de tener reseñas altas - Puntos de dolor del empresario */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
        <div className="flex items-start space-x-4 mb-6">
          <div className="text-4xl">🚀</div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              ¿Por qué NECESITAS subir tus reseñas?
            </h3>
            <p className="text-gray-600 text-sm">
              Estos son los beneficios reales que te están perdiendo si no tienes reseñas altas:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Beneficio 1 - Google te recomienda primero */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">🎯</div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Google te recomienda PRIMERO</h4>
                <p className="text-gray-600 text-xs mt-1">
                  Si tienes 4.6★ y tu competencia 3.9★, <strong>apareces antes en búsquedas locales</strong>. 
                  Más visibilidad = más clientes.
                </p>
              </div>
            </div>
          </div>

          {/* Beneficio 2 - Más clientes nuevos */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">👥</div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Más clientes nuevos</h4>
                <p className="text-gray-600 text-xs mt-1">
                  <strong>El 92% de la gente</strong> confía en negocios con 4.5★ o más. 
                  Sin buenas reseñas, pierdes clientes antes de conocerte.
                </p>
              </div>
            </div>
          </div>

          {/* Beneficio 3 - Puedes subir precios */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">💰</div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Puedes subir precios</h4>
                <p className="text-gray-600 text-xs mt-1">
                  Con buena reputación, <strong>puedes cobrar 15-20% más</strong> que la competencia. 
                  La calidad percibida justifica precios premium.
                </p>
              </div>
            </div>
          </div>

          {/* Beneficio 4 - Ventaja competitiva */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">🏆</div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Ventaja frente a competencia</h4>
                <p className="text-gray-600 text-xs mt-1">
                  Entre dos opciones similares, <strong>el 89% elige el mejor valorado</strong>. 
                  Tus reseñas son tu arma secreta.
                </p>
              </div>
            </div>
          </div>

          {/* Beneficio 5 - Más conversiones */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📈</div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Mayor conversión</h4>
                <p className="text-gray-600 text-xs mt-1">
                  <strong>Más visitas → más compras</strong>. Las reseñas altas aumentan 
                  la confianza y reducen la fricción en la decisión de compra.
                </p>
              </div>
            </div>
          </div>

          {/* Beneficio 6 - Incremento en ventas */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-500">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">💸</div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Incremento directo en ventas</h4>
                <p className="text-gray-600 text-xs mt-1">
                  <strong>Está demostrado:</strong> cada estrella adicional puede aumentar 
                  los ingresos entre 5-15%. Es matemática pura.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to action motivacional */}
        <div className="mt-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-4 text-white text-center">
          <p className="font-bold text-base">
            💡 <strong>Cada día sin reseñas altas = dinero perdido</strong>
          </p>
          <p className="text-sm mt-1 text-red-100">
            Tu competencia está ganando los clientes que deberían ser tuyos. ¡Es hora de cambiar eso!
          </p>
        </div>
      </div>
    </div>
  );
}
