'use client';

import React, { useState, useEffect } from 'react';
import { useGooglePlaces } from '@/lib/hooks/useGooglePlaces';
import { GooglePlaceData } from '@/lib/types';

interface GooglePlacesInputProps {
  onDataFetched?: (data: GooglePlaceData) => void;
  onError?: (error: string) => void;
  fields?: string[];
  showButton?: boolean;
  autoFetch?: boolean;
  placeholder?: string;
  className?: string;
  language?: string;
  disabled?: boolean;
  initialValue?: string;
  showResults?: boolean;
  buttonText?: string;
  loadingText?: string;
}

export function GooglePlacesInput({
  onDataFetched,
  onError,
  fields = ['name', 'rating', 'user_ratings_total'],
  showButton = true,
  autoFetch = false,
  placeholder = "URL de Google Reviews o Place ID",
  className = "",
  language = 'es',
  disabled = false,
  initialValue = '',
  showResults = true,
  buttonText = "🔄 Obtener datos",
  loadingText = "Obteniendo..."
}: GooglePlacesInputProps) {
  const [input, setInput] = useState(initialValue);
  const [hasTriggeredCallback, setHasTriggeredCallback] = useState(false);

  const { data, loading, error, fetchPlaceData, reset, isValidUrl } = useGooglePlaces({
    onSuccess: (data) => {
      if (!hasTriggeredCallback) {
        onDataFetched?.(data);
        setHasTriggeredCallback(true);
      }
    },
    onError: (error) => {
      onError?.(error);
      setHasTriggeredCallback(false);
    }
  });

  // Reset callback trigger when input changes
  useEffect(() => {
    setHasTriggeredCallback(false);
  }, [input]);

  const handleFetch = async () => {
    if (!input.trim()) {
      onError?.('Por favor, introduce una URL o Place ID');
      return;
    }
    
    setHasTriggeredCallback(false);
    await fetchPlaceData(input, fields, language);
  };

  // Auto-fetch cuando cambia el input (si está habilitado)
  const handleInputChange = (value: string) => {
    setInput(value);
    
    if (autoFetch && value.trim() && isValidUrl(value)) {
      // Debounce para evitar demasiadas llamadas
      const timeoutId = setTimeout(() => {
        setHasTriggeredCallback(false);
        fetchPlaceData(value, fields, language);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleReset = () => {
    setInput('');
    setHasTriggeredCallback(false);
    reset();
  };

  const isInputValid = input.trim() && (isValidUrl(input) || input.length > 15);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={loading || disabled}
          />
          
          {input && (
            <button
              onClick={handleReset}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              ✕
            </button>
          )}
        </div>
        
        {showButton && (
          <button
            onClick={handleFetch}
            disabled={loading || !isInputValid || disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            type="button"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {loadingText}
              </>
            ) : (
              buttonText
            )}
          </button>
        )}
      </div>
      
      {/* Indicador de validez de URL */}
      {input && !loading && (
        <div className="text-xs">
          {isValidUrl(input) ? (
            <span className="text-green-600">✓ URL de Google válida</span>
          ) : input.length > 15 ? (
            <span className="text-blue-600">→ Place ID detectado</span>
          ) : (
            <span className="text-gray-500">Introduce una URL de Google Reviews o Place ID</span>
          )}
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <div className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5">❌</span>
            <div>
              <div className="font-medium">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {showResults && data && !error && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✅</span>
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 mb-2">Datos obtenidos correctamente</h4>
              <div className="space-y-1 text-sm text-green-700">
                {data.name && (
                  <div className="flex justify-between">
                    <span className="font-medium">🏪 Nombre:</span>
                    <span>{data.name}</span>
                  </div>
                )}
                {data.rating && (
                  <div className="flex justify-between">
                    <span className="font-medium">⭐ Rating:</span>
                    <span>{data.rating}/5</span>
                  </div>
                )}
                {data.user_ratings_total !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-medium">📝 Total reseñas:</span>
                    <span>{data.user_ratings_total}</span>
                  </div>
                )}
                {data.reviews && data.reviews.length > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">💬 Reseñas obtenidas:</span>
                    <span>{data.reviews.length}</span>
                  </div>
                )}
                {data.formatted_address && (
                  <div className="flex justify-between">
                    <span className="font-medium">📍 Dirección:</span>
                    <span className="text-right max-w-xs truncate">{data.formatted_address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente especializado para datos básicos
export function GooglePlacesBasicInput(props: Omit<GooglePlacesInputProps, 'fields'>) {
  return (
    <GooglePlacesInput
      {...props}
      fields={['name', 'rating', 'user_ratings_total']}
    />
  );
}

// Componente especializado para datos con reseñas
export function GooglePlacesWithReviewsInput(props: Omit<GooglePlacesInputProps, 'fields'>) {
  return (
    <GooglePlacesInput
      {...props}
      fields={['name', 'rating', 'user_ratings_total', 'reviews']}
    />
  );
}

// Componente compacto sin mostrar resultados
export function GooglePlacesCompactInput(props: GooglePlacesInputProps) {
  return (
    <GooglePlacesInput
      {...props}
      showResults={false}
      className={`${props.className || ''} compact`}
    />
  );
}
