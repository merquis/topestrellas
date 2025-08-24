'use client';

import { useState, useCallback } from 'react';
import { GooglePlaceData, GooglePlacesApiResponse } from '@/lib/types';

interface UseGooglePlacesOptions {
  onSuccess?: (data: GooglePlaceData) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
}

interface UseGooglePlacesReturn {
  data: GooglePlaceData | null;
  loading: boolean;
  error: string | null;
  fetchPlaceData: (placeIdOrUrl: string, fields?: string[], language?: string) => Promise<void>;
  fetchBasicData: (placeIdOrUrl: string, language?: string) => Promise<void>;
  fetchWithReviews: (placeIdOrUrl: string, language?: string) => Promise<void>;
  fetchAllData: (placeIdOrUrl: string, language?: string) => Promise<void>;
  reset: () => void;
  isValidUrl: (url: string) => boolean;
}

export function useGooglePlaces(options: UseGooglePlacesOptions = {}): UseGooglePlacesReturn {
  const [data, setData] = useState<GooglePlaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError, onLoading } = options;

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const fetchPlaceData = useCallback(async (
    placeIdOrUrl: string, 
    fields?: string[], 
    language: string = 'es'
  ) => {
    if (!placeIdOrUrl?.trim()) {
      const errorMsg = 'Place ID o URL requerido';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    onLoading?.(true);

    try {
      const params = new URLSearchParams();
      
      // Detectar si es URL o Place ID
      if (placeIdOrUrl.includes('placeid=') || placeIdOrUrl.includes('maps')) {
        params.append('url', placeIdOrUrl);
      } else {
        params.append('placeId', placeIdOrUrl);
      }
      
      if (fields && fields.length > 0) {
        params.append('fields', fields.join(','));
      }
      
      params.append('language', language);
      
      const response = await fetch(`/api/google-places?${params}`);
      const result: GooglePlacesApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }
      
      if (result.data) {
        setData(result.data);
        onSuccess?.(result.data);
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  }, [onSuccess, onError, onLoading]);

  const fetchBasicData = useCallback(async (placeIdOrUrl: string, language: string = 'es') => {
    await fetchPlaceData(placeIdOrUrl, ['name', 'rating', 'user_ratings_total'], language);
  }, [fetchPlaceData]);

  const fetchWithReviews = useCallback(async (placeIdOrUrl: string, language: string = 'es') => {
    await fetchPlaceData(placeIdOrUrl, ['name', 'rating', 'user_ratings_total', 'reviews'], language);
  }, [fetchPlaceData]);

  const fetchAllData = useCallback(async (placeIdOrUrl: string, language: string = 'es') => {
    await fetchPlaceData(placeIdOrUrl, undefined, language); // undefined usará 'all' por defecto
  }, [fetchPlaceData]);

  const isValidUrl = useCallback((url: string): boolean => {
    if (!url) return false;
    
    // Patrones básicos para validar URLs de Google
    const patterns = [
      /placeid=/i,
      /maps\.google/i,
      /google\.com\/maps/i,
      /google\.es\/maps/i,
      /!1s[^!]+/i,  // Para URLs con data como !1s0xc6a98303044cbe5:0xeb759006615600f5
      /ftid=/i,
      /cid=/i
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }, []);

  return {
    data,
    loading,
    error,
    fetchPlaceData,
    fetchBasicData,
    fetchWithReviews,
    fetchAllData,
    reset,
    isValidUrl
  };
}

// Hook especializado para obtener solo datos básicos
export function useGooglePlacesBasic(options: UseGooglePlacesOptions = {}) {
  const hook = useGooglePlaces(options);
  
  return {
    ...hook,
    fetchData: hook.fetchBasicData
  };
}

// Hook especializado para obtener datos con reseñas
export function useGooglePlacesWithReviews(options: UseGooglePlacesOptions = {}) {
  const hook = useGooglePlaces(options);
  
  return {
    ...hook,
    fetchData: hook.fetchWithReviews
  };
}
