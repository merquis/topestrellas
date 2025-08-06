'use client';

import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import useSWR from 'swr';
import { GooglePlaceData, AutocompleteResult, AutocompleteApiResponse, GooglePlacesApiResponse } from '@/lib/types';

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ===== COMPONENTE INPUT COMPLETAMENTE AISLADO =====
const InputBusqueda = memo(function InputBusqueda({ 
  value, 
  onChange, 
  onKeyDown, 
  placeholder = "Busca tu negocio...",
  disabled = false 
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // CRÍTICO: Mantener foco después de cada render
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      // Solo restaurar foco si no está ya enfocado
      const shouldFocus = value.length > 0; // Solo si hay texto
      if (shouldFocus) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    }
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [onChange]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        autoComplete="off"
        spellCheck="false"
        autoFocus
      />
      
      {value && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          type="button"
          tabIndex={-1}
        >
          ✕
        </button>
      )}
    </div>
  );
});

// ===== COMPONENTE SUGERENCIAS COMPLETAMENTE SEPARADO =====
const SugerenciasResultado = memo(function SugerenciasResultado({ 
  suggestions,
  isLoading,
  error,
  onSuggestionClick,
  selectedIndex,
  onMouseEnter,
  showSuggestions
}: {
  suggestions: AutocompleteResult[];
  isLoading: boolean;
  error: any;
  onSuggestionClick: (suggestion: AutocompleteResult) => void;
  selectedIndex: number;
  onMouseEnter?: (index: number) => void;
  showSuggestions: boolean;
}) {
  if (!showSuggestions) return null;
  if (error) return <div className="text-red-500 p-2">Error: {error.message}</div>;
  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
      {isLoading && suggestions.length === 0 && (
        <div className="px-4 py-3 text-center text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Buscando...</span>
          </div>
        </div>
      )}

      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.place_id}
          onMouseDown={(e) => e.preventDefault()} // CRÍTICO: Prevenir pérdida de foco
          onMouseUp={() => onSuggestionClick(suggestion)}
          onMouseEnter={() => onMouseEnter?.(index)}
          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
            index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm">📍</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </div>

            {index === selectedIndex && (
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">→</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

// ===== FUNCIÓN PARA CALCULAR RESEÑAS NECESARIAS =====
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

// ===== COMPONENTE PRINCIPAL ORQUESTADOR =====
interface GooglePlacesUltraSeparatedProps {
  onPlaceSelected?: (place: GooglePlaceData, placeId: string, photoUrl?: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showPhoto?: boolean;
  photoSize?: number;
}

export function GooglePlacesUltraSeparated({
  onPlaceSelected,
  onError,
  placeholder = "Busca tu negocio...",
  className = "",
  disabled = false,
  showPhoto = true,
  photoSize = 80
}: GooglePlacesUltraSeparatedProps) {
  // Estados completamente separados
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceData | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // OPTIMIZACIÓN EXTREMA: Debounce más agresivo y estable
  const debounceDelay = 1000; // 1.0 segundos FIJO para máxima estabilidad
  const debouncedQuery = useDebounce(query, debounceDelay);

  // SIEMPRE 4 caracteres mínimo para evitar búsquedas genéricas
  const minChars = 4;

  // Cache manual para evitar llamadas repetidas
  const cacheRef = useRef<Map<string, { data: AutocompleteResult[], timestamp: number }>>(new Map());
  const CACHE_DURATION = 60000; // Cache de 1 minuto

  // Limpiar cache viejo
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      cacheRef.current.forEach((value, key) => {
        if (now - value.timestamp > CACHE_DURATION) {
          cacheRef.current.delete(key);
        }
      });
    }, 30000); // Limpiar cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Fetcher con cache manual
  const fetcher = useCallback(async (url: string): Promise<AutocompleteResult[]> => {
    // Extraer el query de la URL para usar como clave de cache
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const queryParam = urlParams.get('query') || '';
    
    // Verificar cache primero
    const cached = cacheRef.current.get(queryParam);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Usando cache para:', queryParam);
      return cached.data;
    }

    // Si no está en cache, hacer la llamada
    console.log('🔍 Nueva llamada a API para:', queryParam);
    console.log('📊 Timestamp:', new Date().toISOString());
    
    const response = await fetch(url);
    const result: AutocompleteApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al buscar lugares');
    }
    
    // Guardar en cache
    const predictions = result.predictions || [];
    cacheRef.current.set(queryParam, {
      data: predictions,
      timestamp: Date.now()
    });
    
    return predictions;
  }, []);

  // Crear una clave estable para SWR que solo cambie cuando realmente necesitemos buscar
  const swrKey = useMemo(() => {
    // Solo hacer búsqueda si:
    // 1. El query tiene al menos minChars caracteres
    // 2. Las sugerencias están visibles
    // 3. No estamos seleccionando un lugar
    if (debouncedQuery.length >= minChars && showSuggestions && !isSelecting) {
      return `/api/google-places/autocomplete?query=${encodeURIComponent(debouncedQuery)}&language=es&types=establishment`;
    }
    return null;
  }, [debouncedQuery, showSuggestions, isSelecting]);

  // SWR con configuración MÁXIMA optimización
  const { data: suggestions = [], error, isLoading } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,           // NUNCA revalidar al hacer foco
      revalidateIfStale: false,           // NUNCA revalidar si está obsoleto
      revalidateOnReconnect: false,       // NUNCA revalidar al reconectar
      revalidateOnMount: false,           // NUNCA revalidar al montar
      dedupingInterval: 60000,            // Deduplicación de 1 minuto
      errorRetryCount: 0,                 // NUNCA reintentar errores
      shouldRetryOnError: false,          // NUNCA reintentar en error
      suspense: false,
      keepPreviousData: true,             // Mantener datos previos
      focusThrottleInterval: 60000,       // Throttle de 1 minuto para el foco
      refreshInterval: 0,                 // NUNCA refrescar automáticamente
      refreshWhenHidden: false,           // NUNCA refrescar cuando está oculto
      refreshWhenOffline: false,          // NUNCA refrescar offline
      compare: (a, b) => {
        // Comparación profunda para evitar re-renders
        return JSON.stringify(a) === JSON.stringify(b);
      }
    }
  );

  // Función para seleccionar un lugar
  const selectPlace = useCallback(async (suggestion: AutocompleteResult) => {
    setIsSelecting(true);
    
    try {
      const params = new URLSearchParams({
        placeId: suggestion.place_id,
        fields: 'name,rating,user_ratings_total,formatted_address,international_phone_number,website,photos',
        language: 'es'
      });

      const response = await fetch(`/api/google-places?${params}`);
      const result: GooglePlacesApiResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al obtener detalles del lugar');
      }

      setSelectedPlace(result.data);

      // Obtener foto si está disponible
      let photoUrl: string | null = null;
      if (result.data.photos && result.data.photos.length > 0) {
        try {
          const photoParams = new URLSearchParams({
            photo_reference: result.data.photos[0].photo_reference,
            maxwidth: '400'
          });

          const photoResponse = await fetch(`/api/google-places/photo?${photoParams}`);
          const photoResult = await photoResponse.json();

          if (photoResult.success) {
            photoUrl = photoResult.photo_url;
            setSelectedPhotoUrl(photoUrl);
          }
        } catch (photoError) {
          console.warn('Error obteniendo foto:', photoError);
        }
      }

      onPlaceSelected?.(result.data, suggestion.place_id, photoUrl || undefined);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      onError?.(errorMsg);
    } finally {
      setIsSelecting(false);
    }
  }, [onPlaceSelected, onError]);

  // Manejar selección de sugerencia
  const handleSuggestionClick = useCallback(async (suggestion: AutocompleteResult) => {
    setShowSuggestions(false); // Ocultar sugerencias inmediatamente
    await selectPlace(suggestion);
    setSelectedIndex(-1);
  }, [selectPlace]);

  // Manejar navegación con teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setSelectedIndex(-1);
        break;
    }
  }, [suggestions, selectedIndex, handleSuggestionClick]);

  // Manejar cambio de query con validación estricta
  const handleQueryChange = useCallback((newQuery: string) => {
    // Solo actualizar si realmente cambió
    if (newQuery !== query) {
      setQuery(newQuery);
      setSelectedIndex(-1);
      
      // Solo mostrar sugerencias si tiene al menos minChars caracteres
      if (newQuery.length >= minChars) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
      
      if (newQuery.length === 0) {
        setSelectedPlace(null);
        setSelectedPhotoUrl(null);
        setShowSuggestions(false);
      }
    }
  }, [query]);

  // Cerrar sugerencias cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.google-places-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Prevenir revalidación cuando el componente pierde/gana foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <div className={`relative google-places-container ${className}`}>
      {/* Input completamente separado */}
      <InputBusqueda
        value={query}
        onChange={handleQueryChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isSelecting}
      />

      {/* Indicador de carga */}
      {isSelecting && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Sugerencias completamente separadas */}
      <SugerenciasResultado
        suggestions={suggestions}
        isLoading={isLoading}
        error={error}
        onSuggestionClick={handleSuggestionClick}
        selectedIndex={selectedIndex}
        onMouseEnter={handleMouseEnter}
        showSuggestions={showSuggestions && debouncedQuery.length >= minChars && !isSelecting}
      />

      {/* Vista previa del lugar seleccionado */}
      {selectedPlace && (
        <div className="mt-4 p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-lg">
          <div className="flex items-start gap-6">
            {showPhoto && selectedPhotoUrl && (
              <div className="flex-shrink-0">
                <img
                  src={selectedPhotoUrl}
                  alt={selectedPlace.name}
                  className="rounded-xl object-cover shadow-md border-2 border-white"
                  style={{ width: photoSize, height: photoSize }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-green-500 mt-1 text-xl">✅</span>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-800 mb-1">
                    {selectedPlace.name}
                  </h4>
                  <p className="text-sm text-green-600 font-medium">
                    Datos obtenidos correctamente
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-4">
                {selectedPlace.rating && (
                  <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-lg">⭐</span>
                      <span className="font-semibold text-gray-700">Puntuación:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-yellow-600">{selectedPlace.rating}</span>
                      <span className="text-gray-500">/5</span>
                    </div>
                  </div>
                )}
                
                {selectedPlace.user_ratings_total !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500 text-lg">📊</span>
                      <span className="font-semibold text-gray-700">Reseñas:</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">{selectedPlace.user_ratings_total}</span>
                  </div>
                )}
                
                {selectedPlace.formatted_address && (
                  <div className="p-3 bg-white/80 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-red-500 text-lg mt-0.5">📍</span>
                      <span className="font-semibold text-gray-700">Dirección:</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed pl-6 break-words">
                      {selectedPlace.formatted_address}
                    </p>
                  </div>
                )}
              </div>

              {/* Sección "¡Aumenta tus ventas!" */}
              {selectedPlace.rating && selectedPlace.rating < 5.0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-orange-500 text-xl mt-0.5">💡</span>
                    <div className="flex-1">
                      <h5 className="font-bold text-orange-800 mb-2">¡Aumenta tus ventas!</h5>
                      <p className="text-sm text-orange-700 leading-relaxed">
                        Con {selectedPlace.rating} estrellas tienes potencial de mejora. ¡No te preocupes! 
                        Vamos a implementar estrategias efectivas para subir tu puntuación y atraer más clientes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección "Tu próximo objetivo" */}
              {selectedPlace.rating && selectedPlace.user_ratings_total && (
                (() => {
                  const reviewData = calculateReviewsNeeded(selectedPlace.rating, selectedPlace.user_ratings_total);
                  return (
                    <div className="mt-4 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-md">
                      <div className="flex items-start gap-3">
                        <span className="text-white text-xl mt-0.5">🚀</span>
                        <div className="flex-1">
                          <h5 className="font-bold text-white mb-2">
                            Tu próximo objetivo: {reviewData.target.toFixed(1)} estrellas
                          </h5>
                          <p className="text-white/95 text-sm leading-relaxed">
                            {reviewData.reviewsNeeded > 0 
                              ? `Consigue ${reviewData.reviewsNeeded} reseñas de 5 estrellas y verás cómo sube tu puntuación. ¡Vamos a por ello!`
                              : reviewData.message
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente con foto grande
export function GooglePlacesUltraSeparatedLarge(props: GooglePlacesUltraSeparatedProps) {
  return (
    <GooglePlacesUltraSeparated
      {...props}
      showPhoto={true}
      photoSize={120}
      className={`${props.className || ''} large`}
    />
  );
}
