'use client';

import React, { useState } from 'react';
import { GooglePlacesAutocompleteSWR, GooglePlacesAutocompleteLargeSWR } from '@/components/GooglePlacesAutocompleteSWR';
import { GooglePlaceData } from '@/lib/types';

export function GooglePlacesAutocompleteSWRExample() {
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceData | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceSelected = (place: GooglePlaceData, placeId: string, photoUrl?: string) => {
    console.log('🎯 Lugar seleccionado:', { place, placeId, photoUrl });
    setSelectedPlace(place);
    setSelectedPhotoUrl(photoUrl || null);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    console.error('❌ Error:', errorMessage);
    setError(errorMessage);
    setSelectedPlace(null);
    setSelectedPhotoUrl(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🚀 Google Places Autocomplete con SWR
        </h1>
        <p className="text-gray-600">
          Autocompletado optimizado que mantiene el foco y usa cache inteligente
        </p>
      </div>

      {/* Ejemplo Básico */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📍 Versión Básica</h2>
        <GooglePlacesAutocompleteSWR
          onPlaceSelected={handlePlaceSelected}
          onError={handleError}
          placeholder="Busca un restaurante, hotel, tienda..."
          className="mb-4"
        />
      </div>

      {/* Ejemplo Grande */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">🏢 Versión Grande (Para Formularios)</h2>
        <GooglePlacesAutocompleteLargeSWR
          onPlaceSelected={handlePlaceSelected}
          onError={handleError}
          placeholder="Ej: Restaurante Euro, Las Palmas de Gran Canaria..."
          className="mb-4"
        />
      </div>

      {/* Información del lugar seleccionado */}
      {selectedPlace && (
        <div className="bg-green-50 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-green-800 mb-4">
            ✅ Información del Lugar Seleccionado
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos básicos */}
            <div>
              <h3 className="font-medium text-green-700 mb-3">📋 Datos Básicos</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Nombre:</span>
                  <span>{selectedPlace.name}</span>
                </div>
                {selectedPlace.rating && (
                  <div className="flex justify-between">
                    <span className="font-medium">Rating:</span>
                    <span>⭐ {selectedPlace.rating}/5</span>
                  </div>
                )}
                {selectedPlace.user_ratings_total !== undefined && (
                  <div className="flex justify-between">
                    <span className="font-medium">Reseñas:</span>
                    <span>📝 {selectedPlace.user_ratings_total}</span>
                  </div>
                )}
                {selectedPlace.formatted_address && (
                  <div className="flex justify-between">
                    <span className="font-medium">Dirección:</span>
                    <span className="text-right max-w-xs truncate">
                      📍 {selectedPlace.formatted_address}
                    </span>
                  </div>
                )}
                {selectedPlace.international_phone_number && (
                  <div className="flex justify-between">
                    <span className="font-medium">Teléfono:</span>
                    <span>📞 {selectedPlace.international_phone_number}</span>
                  </div>
                )}
                {selectedPlace.website && (
                  <div className="flex justify-between">
                    <span className="font-medium">Web:</span>
                    <a 
                      href={selectedPlace.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      🌐 Visitar
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Foto */}
            {selectedPhotoUrl && (
              <div>
                <h3 className="font-medium text-green-700 mb-3">📸 Foto</h3>
                <img
                  src={selectedPhotoUrl}
                  alt={selectedPlace.name}
                  className="w-full h-48 object-cover rounded-lg shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* JSON Raw Data */}
          <details className="mt-6">
            <summary className="cursor-pointer font-medium text-green-700 hover:text-green-800">
              🔍 Ver datos JSON completos
            </summary>
            <pre className="mt-3 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
              {JSON.stringify(selectedPlace, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            ❌ Error
          </h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Características de SWR */}
      <div className="bg-blue-50 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">
          🚀 Características de SWR
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Mantiene el foco durante las búsquedas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Cache inteligente para búsquedas repetidas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Deduplicación automática de peticiones</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Revalidación en background</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Gestión automática de estados de carga</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Manejo inteligente de errores</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Experiencia fluida como Google Search</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Optimizado para Docker y producción</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones de uso */}
      <div className="bg-gray-50 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          📖 Cómo usar
        </h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>1. Escribe el nombre de tu negocio:</strong> Por ejemplo "restaurante euro"
          </p>
          <p>
            <strong>2. Mantén el foco:</strong> Puedes seguir escribiendo sin interrupciones
          </p>
          <p>
            <strong>3. Selecciona de las sugerencias:</strong> Haz clic o usa las flechas + Enter
          </p>
          <p>
            <strong>4. Datos automáticos:</strong> Se rellenan todos los campos automáticamente
          </p>
        </div>
      </div>
    </div>
  );
}
