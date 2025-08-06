'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { AutocompleteResult, GooglePlaceData, AutocompleteApiResponse, GooglePlacesApiResponse } from '@/lib/types';

interface UseGooglePlacesAutocompleteOptions {
  onPlaceSelected?: (place: GooglePlaceData, placeId: string, photoUrl?: string) => void;
  onError?: (error: string) => void;
  debounceMs?: number;
  minQueryLength?: number;
}

interface UseGooglePlacesAutocompleteReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: AutocompleteResult[];
  loading: boolean;
  error: string | null;
  selectedPlace: GooglePlaceData | null;
  selectedPhotoUrl: string | null;
  selectPlace: (suggestion: AutocompleteResult) => Promise<void>;
  clearSuggestions: () => void;
  reset: () => void;
}

// Fetcher function para SWR
const fetcher = async (url: string): Promise<AutocompleteResult[]> => {
  const response = await fetch(url);
  const result: AutocompleteApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Error al buscar lugares');
  }
  
  return result.predictions || [];
};

export function useGooglePlacesAutocompleteSWR(
  options: UseGooglePlacesAutocompleteOptions = {}
): UseGooglePlacesAutocompleteReturn {
  const [query, setQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceData | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const {
    onPlaceSelected,
    onError,
    minQueryLength = 2
  } = options;

  // Crear la URL para SWR solo si la query es válida
  const swrKey = useMemo(() => {
    if (query.length < minQueryLength) return null;
    
    const params = new URLSearchParams({
      query: query,
      language: 'es',
      types: 'establishment'
    });
    
    return `/api/google-places/autocomplete?${params}`;
  }, [query, minQueryLength]);

  // Usar SWR para las búsquedas con configuración optimizada
  const { data: suggestions = [], error: swrError, isLoading } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300, // Deduplicación inteligente
      errorRetryCount: 1,
      errorRetryInterval: 1000,
      onError: (error) => {
        setManualError(error.message);
        onError?.(error.message);
      }
    }
  );

  // Función para seleccionar un lugar
  const selectPlace = useCallback(async (suggestion: AutocompleteResult) => {
    setManualError(null);

    try {
      // Obtener detalles completos del lugar incluyendo fotos
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
          // No es crítico, continuamos sin foto
        }
      }

      // Callback con los datos obtenidos
      onPlaceSelected?.(result.data, suggestion.place_id, photoUrl || undefined);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setManualError(errorMsg);
      onError?.(errorMsg);
    }
  }, [onPlaceSelected, onError]);

  const clearSuggestions = useCallback(() => {
    // Con SWR no necesitamos limpiar manualmente, se maneja automáticamente
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setManualError(null);
    setSelectedPlace(null);
    setSelectedPhotoUrl(null);
  }, []);

  // Combinar errores de SWR y manuales
  const error = manualError || (swrError ? swrError.message : null);

  return {
    query,
    setQuery,
    suggestions,
    loading: isLoading,
    error,
    selectedPlace,
    selectedPhotoUrl,
    selectPlace,
    clearSuggestions,
    reset
  };
}
