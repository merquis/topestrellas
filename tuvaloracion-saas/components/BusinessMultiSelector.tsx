'use client';

import { useState, useEffect, useRef } from 'react';

interface Business {
  id: string;
  name: string;
  type?: string;
  subdomain?: string;
  active?: boolean;
}

interface BusinessMultiSelectorProps {
  selectedBusinesses: Business[];
  onSelectionChange: (businesses: Business[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function BusinessMultiSelector({
  selectedBusinesses,
  onSelectionChange,
  placeholder = "Buscar negocios...",
  disabled = false,
  required = false
}: BusinessMultiSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (searchTerm.trim()) {
        searchBusinesses(searchTerm);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const searchBusinesses = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/businesses/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const businesses = await response.json();
        // Filtrar negocios ya seleccionados
        const filteredBusinesses = businesses.filter((business: Business) => 
          !selectedBusinesses.some(selected => selected.id === business.id)
        );
        setSuggestions(filteredBusinesses);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectBusiness(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const selectBusiness = (business: Business) => {
    const newSelection = [...selectedBusinesses, business];
    onSelectionChange(newSelection);
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeBusiness = (businessId: string) => {
    const newSelection = selectedBusinesses.filter(b => b.id !== businessId);
    onSelectionChange(newSelection);
  };

  const handleSuggestionClick = (business: Business) => {
    selectBusiness(business);
  };

  return (
    <div className="relative">
      {/* Selected businesses (chips) */}
      {selectedBusinesses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedBusinesses.map((business) => (
            <div
              key={business.id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              <span>🏢 {business.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeBusiness(business.id)}
                  className="text-blue-600 hover:text-blue-800 font-bold text-lg leading-none"
                  aria-label={`Eliminar ${business.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required && selectedBusinesses.length === 0}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((business, index) => (
            <button
              key={business.id}
              type="button"
              onClick={() => handleSuggestionClick(business)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🏢</span>
                <div>
                  <p className="font-medium text-gray-800">{business.name}</p>
                  {business.type && (
                    <p className="text-sm text-gray-500">{business.type}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && searchTerm.trim() && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No se encontraron negocios con "{searchTerm}"
        </div>
      )}
    </div>
  );
}
