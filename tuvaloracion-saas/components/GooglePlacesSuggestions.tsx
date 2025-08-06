'use client';

import React, { memo, useRef, useEffect } from 'react';
import { AutocompleteResult } from '@/lib/types';

interface GooglePlacesSuggestionsProps {
  suggestions: AutocompleteResult[];
  isOpen: boolean;
  selectedIndex: number;
  loading: boolean;
  onSuggestionClick: (suggestion: AutocompleteResult) => void;
  onMouseEnter?: (index: number) => void;
}

// Componente de sugerencias completamente separado y memoizado
const GooglePlacesSuggestions = memo(function GooglePlacesSuggestions({
  suggestions,
  isOpen,
  selectedIndex,
  loading,
  onSuggestionClick,
  onMouseEnter
}: GooglePlacesSuggestionsProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll automático al elemento seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || (suggestions.length === 0 && !loading)) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
      onMouseDown={(e) => {
        // Prevenir que cualquier interacción con el dropdown quite el foco del input
        e.preventDefault();
      }}
    >
      {loading && suggestions.length === 0 && (
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
          onMouseDown={(e) => {
            e.preventDefault(); // Crítico: prevenir pérdida de foco
          }}
          onMouseUp={() => {
            // Ejecutar selección en mouseup para mantener mejor control
            onSuggestionClick(suggestion);
          }}
          onMouseEnter={() => {
            onMouseEnter?.(index);
          }}
          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
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

            {/* Indicador de selección */}
            {index === selectedIndex && (
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">→</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {loading && suggestions.length > 0 && (
        <div className="px-4 py-2 text-center text-gray-500 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-xs">Cargando más...</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default GooglePlacesSuggestions;
