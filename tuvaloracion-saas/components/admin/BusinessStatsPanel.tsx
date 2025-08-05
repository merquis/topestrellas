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
  // Campos para Google y TripAdvisor
  googleStats?: {
    currentRating: number;
    totalReviews: number;
  };
  tripadvisorStats?: {
    currentRating: number;
    totalReviews: number;
  };
  // Nuevos campos para redirecciones
  totalRedirections: number;
  googleRedirections: number;
  tripadvisorRedirections: number;
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
    // Si ya está en 5.0, mostrar mensaje especial
    if (currentRating >= 5.0) {
      return {
        target: 5.0,
        reviewsNeeded: 0,
        message: `¡Excelente! Mantén tu puntuación perfecta de 5.0⭐`
      };
    }
    
    // Calcular el siguiente objetivo (SIEMPRE la siguiente décima superior)
    // Redondear hacia arriba a la siguiente décima
    let targetRating = Math.ceil(currentRating * 10) / 10;
    
    // Si ya está exactamente en una décima (ej: 4.0, 4.1, 4.2), subir a la siguiente
    if (Math.abs(currentRating - targetRating) < 0.01) {
      targetRating = Math.min(5.0, targetRating + 0.1);
    }
    
    // Calcular suma actual de puntuaciones
    const currentSum = currentRating * totalReviews;
    
    // Resolver ecuación: (currentSum + 5*x) / (totalReviews + x) = targetRating
    // currentSum + 5*x = targetRating * (totalReviews + x)
    // currentSum + 5*x = targetRating * totalReviews + targetRating * x
    // 5*x - targetRating * x = targetRating * totalReviews - currentSum
    // x * (5 - targetRating) = targetRating * totalReviews - currentSum
    // x = (targetRating * totalReviews - currentSum) / (5 - targetRating)
    
    const reviewsNeeded = Math.ceil(
      (targetRating * totalReviews - currentSum) / (5 - targetRating)
    );
    
    return {
      target: targetRating,
      reviewsNeeded: Math.max(0, reviewsNeeded),
      message: `Para llegar a ${targetRating.toFixed(1)}⭐: Te faltan ${Math.max(0, reviewsNeeded)} reseñas de 5⭐`
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
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-2xl font-bold">📊 Panel Empresarial</h1>
            <p className="text-blue-100 mt-1">{stats.businessName}</p>
            <p className="text-blue-200 text-sm">{stats.periodLabel}</p>
          </div>
          
          {/* Selector de período horizontal */}
          <div className="flex flex-wrap gap-2">
            {periods.map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  selectedPeriod === period.value
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span>{period.icon}</span>
                <span>{period.label}</span>
              </button>
            ))}
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

      {/* Estadísticas de Google y TripAdvisor con Redirecciones */}
      <div className="space-y-6">
        {/* Fila Google - solo si hay datos de Google */}
        {stats.googleStats && stats.googleStats.currentRating > 0 && stats.googleStats.totalReviews > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google Reviews */}
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
                  
                  return (
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-4 text-white">
                      <div className="flex items-center space-x-2">
                        <div className="text-2xl">🎯</div>
                        <div>
                          <p className="font-bold">
                            {calculation.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Estadísticas de Redirecciones Google */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl">📊</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Redirecciones a Google</h3>
                  <p className="text-sm text-gray-600">Usuarios enviados al formulario de Google</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-gray-700 font-semibold text-lg">Usuarios enviados</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.totalRedirections > 0 ? Math.round((stats.googleRedirections / stats.totalRedirections) * 100) : 0}% del total
                    </p>
                  </div>
                  <div className="text-4xl font-bold text-blue-600">
                    {stats.googleRedirections}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-4 text-white">
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">🚀</div>
                    <div>
                      <p className="font-bold">
                        Impacto: {stats.googleRedirections} posibles reseñas en Google
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fila TripAdvisor - solo si hay datos de TripAdvisor */}
        {stats.tripadvisorStats && stats.tripadvisorStats.currentRating > 0 && stats.tripadvisorStats.totalReviews > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TripAdvisor Reviews */}
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
                  
                  return (
                    <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-4 text-white">
                      <div className="flex items-center space-x-2">
                        <div className="text-2xl">🎯</div>
                        <div>
                          <p className="font-bold">
                            {calculation.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Estadísticas de Redirecciones TripAdvisor */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl">📊</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Redirecciones a TripAdvisor</h3>
                  <p className="text-sm text-gray-600">Usuarios enviados al formulario de TripAdvisor</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div>
                    <p className="text-gray-700 font-semibold text-lg">Usuarios enviados</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.totalRedirections > 0 ? Math.round((stats.tripadvisorRedirections / stats.totalRedirections) * 100) : 0}% del total
                    </p>
                  </div>
                  <div className="text-4xl font-bold text-orange-600">
                    {stats.tripadvisorRedirections}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-4 text-white">
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">🚀</div>
                    <div>
                      <p className="font-bold">
                        Impacto: {stats.tripadvisorRedirections} posibles reseñas en TripAdvisor
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección de recomendaciones si falta alguna plataforma */}
        {(!stats.googleStats || stats.googleStats.currentRating === 0 || stats.googleStats.totalReviews === 0) && 
         (!stats.tripadvisorStats || stats.tripadvisorStats.currentRating === 0 || stats.tripadvisorStats.totalReviews === 0) && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start space-x-4">
              <div className="text-4xl">💡</div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Recomendación de Crecimiento
                </h3>
                <p className="text-gray-600 mb-4">
                  Maximiza tu alcance configurando ambas plataformas de reseñas:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(!stats.googleStats || stats.googleStats.currentRating === 0 || stats.googleStats.totalReviews === 0) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-2xl">🔍</div>
                        <h4 className="font-bold text-gray-800">Google Reviews</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Google es la plataforma #1 para búsquedas locales. Configúrala para:
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Aparecer primero en búsquedas locales</li>
                        <li>• Aumentar la confianza del cliente</li>
                        <li>• Mejorar tu SEO local</li>
                      </ul>
                      <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium">
                        🔗 Configurar Google
                      </button>
                    </div>
                  )}
                  
                  {(!stats.tripadvisorStats || stats.tripadvisorStats.currentRating === 0 || stats.tripadvisorStats.totalReviews === 0) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-2xl">🏨</div>
                        <h4 className="font-bold text-gray-800">TripAdvisor Reviews</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        TripAdvisor es clave para turismo y hostelería. Te ayuda a:
                      </p>
                      <ul className="text-xs text-gray-600 space-y-1 mb-4">
                        <li>• Atraer turistas y viajeros</li>
                        <li>• Competir en el sector turístico</li>
                        <li>• Aumentar reservas directas</li>
                      </ul>
                      <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-3 rounded-lg text-sm font-medium">
                        🔗 Configurar TripAdvisor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
