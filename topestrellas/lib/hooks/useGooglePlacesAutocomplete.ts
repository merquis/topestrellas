'use client';

import { useState, useCallback, useEffect } from 'react';
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

export function useGooglePlacesAutocomplete(
  options: UseGooglePlacesAutocompleteOptions = {}
): UseGooglePlacesAutocompleteReturn {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceData | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const {
    onPlaceSelected,
    onError,
    debounceMs = 300,
    minQueryLength = 2
  } = options;

  // Debounce para las búsquedas
  useEffect(() => {
    if (query.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPlaces(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs, minQueryLength]);

  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        language: 'es',
        types: 'establishment'
      });

      const response = await fetch(`/api/google-places/autocomplete?${params}`);
      const result: AutocompleteApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al buscar lugares');
      }

      setSuggestions(result.predictions || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      onError?.(errorMsg);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [minQueryLength, onError]);

  const selectPlace = useCallback(async (suggestion: AutocompleteResult) => {
    setLoading(true);
    setError(null);

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

      // Limpiar sugerencias PERO NO cambiar el query para mantener el foco
      setSuggestions([]);
      // NO actualizar el query aquí para evitar pérdida de foco
      // setQuery(suggestion.structured_formatting.main_text);

      // Callback con los datos obtenidos
      onPlaceSelected?.(result.data, suggestion.place_id, photoUrl || undefined);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [onPlaceSelected, onError]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setError(null);
    setSelectedPlace(null);
    setSelectedPhotoUrl(null);
    setLoading(false);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    selectedPlace,
    selectedPhotoUrl,
    selectPlace,
    clearSuggestions,
    reset
  };
}

// Hook especializado para búsqueda rápida con foto
export function useGooglePlacesQuickSearch(
  options: UseGooglePlacesAutocompleteOptions = {}
) {
  const hook = useGooglePlacesAutocomplete({
    ...options,
    debounceMs: 500, // Más lento para evitar demasiadas llamadas
    minQueryLength: 3 // Mínimo 3 caracteres
  });

  return {
    ...hook,
    // Método simplificado para búsqueda rápida
    quickSearch: async (businessName: string) => {
      hook.setQuery(businessName);
      // El efecto se encargará de hacer la búsqueda
    }
  };
}
