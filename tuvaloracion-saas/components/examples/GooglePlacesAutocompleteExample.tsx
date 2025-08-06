'use client';

import React, { useState } from 'react';
import { GooglePlacesAutocomplete, GooglePlacesAutocompleteCompact, GooglePlacesAutocompleteLarge } from '@/components/GooglePlacesAutocomplete';
import { GooglePlacesBasicInput } from '@/components/GooglePlacesInput';
import { GooglePlaceData } from '@/lib/types';

// Ejemplo para formulario de administración
export function AdminBusinessFormExample() {
  const [formData, setFormData] = useState({
    name: '',
    googleRating: '',
    googleReviews: '',
    address: '',
    phone: '',
    website: '',
    googleReviewUrl: ''
  });

  const handleAutocompletePlaceSelected = (place: GooglePlaceData, placeId: string, photoUrl?: string) => {
    console.log('Lugar seleccionado:', { place, placeId, photoUrl });
    
    // Rellenar automáticamente todos los campos
    setFormData(prev => ({
      ...prev,
      name: place.name || prev.name,
      googleRating: place.rating?.toString() || '',
      googleReviews: place.user_ratings_total?.toString() || '',
      address: place.formatted_address || prev.address,
      phone: place.international_phone_number || prev.phone,
      website: place.website || prev.website,
      // Generar URL de Google Reviews usando el placeId
      googleReviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`
    }));
  };

  const handleManualPlaceSelected = (place: GooglePlaceData) => {
    // Para el método manual (URL)
    setFormData(prev => ({
      ...prev,
      name: place.name || prev.name,
      googleRating: place.rating?.toString() || '',
      googleReviews: place.user_ratings_total?.toString() || ''
    }));
  };

  const handleError = (error: string) => {
    console.error('Error:', error);
    // Aquí podrías mostrar un toast o notificación
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Crear/Editar Negocio - Panel Admin</h2>
      
      <form className="space-y-6">
        {/* NUEVA FUNCIONALIDAD: Búsqueda inteligente con autocompletado */}
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">
            🔍 Buscar tu negocio (Recomendado)
          </h3>
          <p className="text-sm text-blue-600 mb-4">
            Escribe el nombre de tu negocio y selecciónalo de las sugerencias. 
            Todos los campos se rellenarán automáticamente.
          </p>
          
          <GooglePlacesAutocompleteLarge
            onPlaceSelected={handleAutocompletePlaceSelected}
            onError={handleError}
            placeholder="Ej: Restaurante Euro, Las Palmas..."
            className="mb-4"
          />
        </div>

        {/* Separador */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 text-sm">O introduce manualmente</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Método manual existente */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">📋 Método manual</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de Google Reviews
            </label>
            <GooglePlacesBasicInput
              onDataFetched={handleManualPlaceSelected}
              onError={handleError}
              placeholder="Pega aquí la URL de Google Reviews"
              showResults={false}
            />
          </div>
        </div>

        {/* Campos del formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del negocio *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del negocio"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating de Google
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.googleRating}
              onChange={(e) => setFormData(prev => ({...prev, googleRating: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="4.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de reseñas Google
            </label>
            <input
              type="number"
              value={formData.googleReviews}
              onChange={(e) => setFormData(prev => ({...prev, googleReviews: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dirección completa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+34 123 456 789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sitio web
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({...prev, website: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://ejemplo.com"
            />
          </div>
        </div>

        {/* Campo oculto para URL de Google Reviews */}
        {formData.googleReviewUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de Google Reviews (generada automáticamente)
            </label>
            <input
              type="url"
              value={formData.googleReviewUrl}
              onChange={(e) => setFormData(prev => ({...prev, googleReviewUrl: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              placeholder="Se generará automáticamente"
              readOnly
            />
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Guardar negocio
          </button>
          <button
            type="button"
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// Ejemplo compacto para modales
export function CompactAutocompleteExample() {
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');

  const handlePlaceSelected = (place: GooglePlaceData, placeId: string) => {
    setSelectedBusiness(place.name || 'Negocio seleccionado');
  };

  return (
    <div className="p-4 border rounded-lg max-w-md">
      <h3 className="font-semibold mb-3">🔍 Búsqueda rápida</h3>
      
      <GooglePlacesAutocompleteCompact
        onPlaceSelected={handlePlaceSelected}
        placeholder="Buscar negocio..."
        className="mb-3"
      />

      {selectedBusiness && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <strong>Seleccionado:</strong> {selectedBusiness}
        </div>
      )}
    </div>
  );
}

// Ejemplo de comparación entre métodos
export function ComparisonExample() {
  const [autocompleteData, setAutocompleteData] = useState<GooglePlaceData | null>(null);
  const [manualData, setManualData] = useState<GooglePlaceData | null>(null);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Comparación de métodos</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Método nuevo: Autocompletado */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-green-600">
            ✨ Nuevo: Autocompletado inteligente
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Busca por nombre, ve la foto del local, confirma que es el correcto.
          </p>
          
          <GooglePlacesAutocomplete
            onPlaceSelected={(place) => setAutocompleteData(place)}
            placeholder="Busca tu negocio..."
            showPhoto={true}
            photoSize={60}
          />

          {autocompleteData && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
              <strong>Datos obtenidos:</strong>
              <ul className="mt-2 space-y-1">
                <li>📍 {autocompleteData.name}</li>
                <li>⭐ {autocompleteData.rating}/5</li>
                <li>📝 {autocompleteData.user_ratings_total} reseñas</li>
              </ul>
            </div>
          )}
        </div>

        {/* Método existente: URL manual */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">
            📋 Existente: URL manual
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Copia y pega la URL de Google Reviews.
          </p>
          
          <GooglePlacesBasicInput
            onDataFetched={(place) => setManualData(place)}
            placeholder="URL de Google Reviews..."
          />

          {manualData && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>Datos obtenidos:</strong>
              <ul className="mt-2 space-y-1">
                <li>📍 {manualData.name}</li>
                <li>⭐ {manualData.rating}/5</li>
                <li>📝 {manualData.user_ratings_total} reseñas</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
