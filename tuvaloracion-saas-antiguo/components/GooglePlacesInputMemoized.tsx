'use client';

import React, { memo, useRef, useCallback } from 'react';

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Componente del input completamente aislado y memoizado
const GooglePlacesInputMemoized = memo(function GooglePlacesInputMemoized({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = "Busca tu negocio...",
  disabled = false,
  className = ""
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    // Mantener foco después de limpiar
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        autoComplete="off"
        spellCheck="false"
      />
      
      {/* Botón de limpiar */}
      {value && (
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
    </div>
  );
});

export default GooglePlacesInputMemoized;
