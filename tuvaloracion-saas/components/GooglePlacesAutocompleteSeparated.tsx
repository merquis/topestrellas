'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useGooglePlacesAutocompleteSWR } from '@/lib/hooks/useGooglePlacesAutocompleteSWR';
import { GooglePlaceData, AutocompleteResult } from '@/lib/types';
import GooglePlacesInputMemoized from './GooglePlacesInputMemoized';
import GooglePlacesSuggestions from './GooglePlacesSuggestions';

interface GooglePlacesAutocompleteProps {
  onPlaceSelected?: (place: GooglePlaceData, placeId: string, photoUrl?: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showPhoto?: boolean;
  photoSize?: number;
  language?: string;
}

export function GooglePlacesAutocompleteSeparated({
  onPlaceSelected,
  onError,
  placeholder = "Busca tu negocio...",
  className = "",
  disabled = false,
  showPhoto = true,
  photoSize = 80,
  language = 'es'
}: GooglePlacesAutocompleteProps) {
  // Estados locales para la UI
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Hook SWR para datos
  const {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    selectedPlace,
    selectedPhotoUrl,
    selectPlace,
    reset
  } = useGooglePlacesAutocompleteSWR({
    onPlaceSelected,
    onError,
    minQueryLength: 2
  });

  // Mostrar/ocultar dropdown basado en sugerencias
  useEffect(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [suggestions]);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-google-places-container]')) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers memoizados para evitar re-renders innecesarios
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (value.length === 0) {
      reset();
      setIsOpen(false);
    }
  }, [setQuery, reset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, selectedIndex]);

  const handleSuggestionClick = useCallback(async (suggestion: AutocompleteResult) => {
    try {
      await selectPlace(suggestion);
      setIsOpen(false);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Error selecting place:', err);
    }
  }, [selectPlace]);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  }, [suggestions.length]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Solo cerrar si el foco no va a las sugerencias
    const relatedTarget = e.relatedTarget as Element;
    if (!relatedTarget?.closest('[data-google-places-container]')) {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, []);

  const handleMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <div className={`relative ${className}`} data-google-places-container>
      {/* Input completamente separado y memoizado */}
      <GooglePlacesInputMemoized
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || loading}
      />

      {/* Indicador de carga separado */}
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Sugerencias completamente separadas */}
      <GooglePlacesSuggestions
        suggestions={suggestions}
        isOpen={isOpen}
        selectedIndex={selectedIndex}
        loading={loading}
        onSuggestionClick={handleSuggestionClick}
        onMouseEnter={handleMouseEnter}
      />

      {/* Error */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <div className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5">❌</span>
            <div>
              <div className="font-medium">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Vista previa del lugar seleccionado */}
      {selectedPlace && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-4">
            {/* Foto del lugar */}
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
            
            {/* Información del lugar */}
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

// Componente con foto grande para formularios principales
export function GooglePlacesAutocompleteLargeSeparated(props: GooglePlacesAutocompleteProps) {
  return (
    <GooglePlacesAutocompleteSeparated
      {...props}
      showPhoto={true}
      photoSize={120}
      className={`${props.className || ''} large`}
    />
  );
}
