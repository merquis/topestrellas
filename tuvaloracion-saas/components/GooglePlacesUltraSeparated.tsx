'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import useSWR from 'swr';
import { GooglePlaceData, AutocompleteResult, AutocompleteApiResponse, GooglePlacesApiResponse } from '@/lib/types';

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
  query,
  onSuggestionClick,
  selectedIndex,
  onMouseEnter
}: {
  query: string;
  onSuggestionClick: (suggestion: AutocompleteResult) => void;
  selectedIndex: number;
  onMouseEnter?: (index: number) => void;
}) {
  // Fetcher para SWR
  const fetcher = async (url: string): Promise<AutocompleteResult[]> => {
    const response = await fetch(url);
    const result: AutocompleteApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al buscar lugares');
    }
    
    return result.predictions || [];
  };

  // SWR con configuración ultra-optimizada para evitar re-renders
  const { data: suggestions = [], error, isLoading } = useSWR(
    query.length >= 2 ? `/api/google-places/autocomplete?query=${encodeURIComponent(query)}&language=es&types=establishment` : null,
    fetcher,
    {
      revalidateOnFocus: false,        // CRÍTICO: No revalidar al hacer foco
      revalidateIfStale: false,        // CRÍTICO: No revalidar si está obsoleto
      revalidateOnReconnect: false,    // CRÍTICO: No revalidar al reconectar
      dedupingInterval: 300,           // Deduplicación inteligente
      errorRetryCount: 1,
      errorRetryInterval: 1000,
      suspense: false                  // CRÍTICO: No usar suspense
    }
  );

  if (query.length < 2) return null;
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

  // Obtener sugerencias para navegación con teclado
  const { data: suggestions = [] } = useSWR(
    query.length >= 2 ? `/api/google-places/autocomplete?query=${encodeURIComponent(query)}&language=es&types=establishment` : null,
    async (url: string) => {
      const response = await fetch(url);
      const result: AutocompleteApiResponse = await response.json();
      return result.success ? result.predictions || [] : [];
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      suspense: false
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

  // Manejar cambio de query
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(-1);
    if (newQuery.length === 0) {
      setSelectedPlace(null);
      setSelectedPhotoUrl(null);
    }
  }, []);

  const handleMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <div className={`relative ${className}`}>
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
        query={query}
        onSuggestionClick={handleSuggestionClick}
        selectedIndex={selectedIndex}
        onMouseEnter={handleMouseEnter}
      />

      {/* Vista previa del lugar seleccionado */}
      {selectedPlace && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-4">
            {showPhoto && selectedPhotoUrl && (
              <div className="flex-shrink-0">
                <img
                  src={selectedPhotoUrl}
                  alt={selectedPlace.name}
                  className="rounded-lg object-cover"
                  style={{ width: photoSize, height: photoSize }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-green-500 mt-0.5">✅</span>
                <div>
                  <h4 className="font-semibold text-green-800">
                    {selectedPlace.name}
                  </h4>
                  <p className="text-sm text-green-600 mt-1">
                    Datos obtenidos correctamente
                  </p>
                </div>
              </div>
              
              <div className="space-y-1 text-sm text-green-700">
                {selectedPlace.rating && (
                  <div className="flex justify-between">
                    <span className="font-medium">⭐ Rating:</span>
                    <span>{selectedPlace.rating}/5</span>
                  </div>
                )}
                {selectedPlace.user_ratings_total !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-medium">📝 Reseñas:</span>
                    <span>{selectedPlace.user_ratings_total}</span>
                  </div>
                )}
                {selectedPlace.formatted_address && (
                  <div className="flex justify-between">
                    <span className="font-medium">📍 Dirección:</span>
                    <span className="text-right max-w-xs truncate">
                      {selectedPlace.formatted_address}
                    </span>
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
