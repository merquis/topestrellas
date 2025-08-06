'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGooglePlacesAutocompleteSWR } from '@/lib/hooks/useGooglePlacesAutocompleteSWR';
import { GooglePlaceData, AutocompleteResult } from '@/lib/types';

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

export function GooglePlacesAutocompleteFocusFixed({
  onPlaceSelected,
  onError,
  placeholder = "Busca tu negocio...",
  className = "",
  disabled = false,
  showPhoto = true,
  photoSize = 80,
  language = 'es'
}: GooglePlacesAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false); // Flag para prevenir pérdida de foco
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Función para mantener el foco de manera agresiva
  const maintainFocus = useCallback(() => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    
    focusTimeoutRef.current = setTimeout(() => {
      if (inputRef.current && !isSelecting) {
        inputRef.current.focus();
      }
    }, 0);
  }, [isSelecting]);

  // Cerrar dropdown cuando se hace clic fuera - PERO NO durante selección
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSelecting) return; // No cerrar si estamos seleccionando
      
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isSelecting]);

  // Mostrar dropdown cuando hay sugerencias
  useEffect(() => {
    if (suggestions.length > 0 && !isSelecting) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else if (suggestions.length === 0) {
      setIsOpen(false);
    }
  }, [suggestions, isSelecting]);

  // Manejar cambios en el input
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (value.length === 0) {
      reset();
      setIsOpen(false);
    }
  }, [setQuery, reset]);

  // Manejar selección de sugerencia - VERSIÓN ULTRA ROBUSTA
  const handleSuggestionClick = useCallback(async (suggestion: AutocompleteResult) => {
    setIsSelecting(true); // Marcar que estamos seleccionando
    
    try {
      await selectPlace(suggestion);
      setIsOpen(false);
      setSelectedIndex(-1);
    } finally {
      setIsSelecting(false);
      // Restaurar foco inmediatamente
      maintainFocus();
    }
  }, [selectPlace, maintainFocus]);

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
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, suggestions, selectedIndex, handleSuggestionClick]);

  const handleClear = useCallback(() => {
    reset();
    setIsOpen(false);
    maintainFocus();
  }, [reset, maintainFocus]);

  // Manejar eventos de foco
  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  }, [suggestions.length]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Solo perder foco si no estamos seleccionando y el foco no va al dropdown
    if (!isSelecting && !dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [isSelecting]);

  return (
    <div className={`relative ${className}`}>
      {/* Input principal - ULTRA OPTIMIZADO para mantener foco */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* Botón de limpiar */}
        {query && (
          <button
            onMouseDown={(e) => e.preventDefault()} // Prevenir pérdida de foco
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
            tabIndex={-1}
          >
            ✕
          </button>
        )}

        {/* Indicador de carga */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Dropdown de sugerencias - OPTIMIZADO para no interferir con foco */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          onMouseDown={(e) => {
            // Prevenir que cualquier interacción con el dropdown quite el foco
            e.preventDefault();
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              onMouseDown={(e) => {
                e.preventDefault(); // Crítico: prevenir pérdida de foco
                setIsSelecting(true);
              }}
              onMouseUp={() => {
                // Ejecutar selección en mouseup para mantener mejor control
                handleSuggestionClick(suggestion);
              }}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Icono de lugar */}
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">📍</span>
                </div>
                
                {/* Información del lugar */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
export function GooglePlacesAutocompleteLargeFocusFixed(props: GooglePlacesAutocompleteProps) {
  return (
    <GooglePlacesAutocompleteFocusFixed
      {...props}
      showPhoto={true}
      photoSize={120}
      className={`${props.className || ''} large`}
    />
  );
}
