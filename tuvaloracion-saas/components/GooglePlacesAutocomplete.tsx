'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGooglePlacesAutocomplete } from '@/lib/hooks/useGooglePlacesAutocomplete';
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

export function GooglePlacesAutocomplete({
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useGooglePlacesAutocomplete({
    onPlaceSelected,
    onError,
    debounceMs: 300,
    minQueryLength: 2
  });

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar dropdown cuando hay sugerencias
  useEffect(() => {
    setIsOpen(suggestions.length > 0);
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value.length === 0) {
      reset();
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = async (suggestion: AutocompleteResult) => {
    await selectPlace(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
  };

  const handleClear = () => {
    reset();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input principal */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {/* Botón de limpiar */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
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

      {/* Dropdown de sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
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

// Componente compacto para espacios pequeños
export function GooglePlacesAutocompleteCompact(props: GooglePlacesAutocompleteProps) {
  return (
    <GooglePlacesAutocomplete
      {...props}
      showPhoto={false}
      className={`${props.className || ''} compact`}
    />
  );
}

// Componente con foto grande para formularios principales
export function GooglePlacesAutocompleteLarge(props: GooglePlacesAutocompleteProps) {
  return (
    <GooglePlacesAutocomplete
      {...props}
      showPhoto={true}
      photoSize={120}
      className={`${props.className || ''} large`}
    />
  );
}
