'use client';

import React, { useState } from 'react';
import { GooglePlacesInput, GooglePlacesBasicInput, GooglePlacesWithReviewsInput } from '@/components/GooglePlacesInput';
import { GooglePlaceData } from '@/lib/types';

// Ejemplo de uso en un formulario de negocio
export function BusinessFormExample() {
  const [formData, setFormData] = useState({
    name: '',
    googleRating: '',
    googleReviews: '',
    address: '',
    phone: '',
    website: ''
  });

  const handleGoogleData = (data: GooglePlaceData) => {
    setFormData(prev => ({
      ...prev,
      name: data.name || prev.name,
      googleRating: data.rating?.toString() || '',
      googleReviews: data.user_ratings_total?.toString() || '',
      address: data.formatted_address || prev.address,
      phone: data.international_phone_number || prev.phone,
      website: data.website || prev.website
    }));
  };

  const handleError = (error: string) => {
    console.error('Error obteniendo datos de Google:', error);
    // Aquí podrías mostrar un toast o notificación
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Crear/Editar Negocio</h2>
      
      <form className="space-y-6">
        {/* Sección de Google Places */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">📍 Datos de Google</h3>
          <GooglePlacesBasicInput
            onDataFetched={handleGoogleData}
            onError={handleError}
            placeholder="Pega aquí la URL de Google Reviews de tu negocio"
            buttonText="🔄 Obtener datos de Google"
            className="mb-4"
          />
        </div>

        {/* Campos del formulario que se rellenan automáticamente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del negocio
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del negocio"
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
              Número de reseñas
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

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Guardar negocio
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// Ejemplo para obtener reseñas
export function ReviewsExample() {
  const [reviews, setReviews] = useState<GooglePlaceData | null>(null);

  const handleReviewsData = (data: GooglePlaceData) => {
    setReviews(data);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">📝 Obtener Reseñas de Google</h2>
      
      <GooglePlacesWithReviewsInput
        onDataFetched={handleReviewsData}
        placeholder="URL de Google Reviews para obtener reseñas"
        buttonText="📝 Obtener reseñas"
        className="mb-6"
      />

      {reviews && reviews.reviews && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            Reseñas obtenidas ({reviews.reviews.length}/5 máximo)
          </h3>
          
          <div className="grid gap-4">
            {reviews.reviews.map((review, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-avatar.png';
                      }}
                    />
                    <div>
                      <div className="font-semibold">{review.author_name}</div>
                      <div className="text-sm text-gray-500">
                        {review.relative_time_description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {'⭐'.repeat(review.rating)}
                    <span className="ml-1 text-sm text-gray-600">
                      ({review.rating}/5)
                    </span>
                  </div>
                </div>
                
                {review.text && (
                  <p className="text-gray-700 leading-relaxed">
                    {review.text}
                  </p>
                )}
                
                {review.translated && (
                  <div className="mt-2 text-xs text-blue-600">
                    🌐 Traducido automáticamente
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Ejemplo compacto para usar en modales o espacios pequeños
export function CompactExample() {
  const [quickData, setQuickData] = useState<{rating?: number, reviews?: number}>({});

  const handleQuickData = (data: GooglePlaceData) => {
    setQuickData({
      rating: data.rating,
      reviews: data.user_ratings_total
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">🔍 Verificación rápida</h3>
      
      <GooglePlacesBasicInput
        onDataFetched={handleQuickData}
        showResults={false}
        buttonText="Verificar"
        className="mb-3"
      />

      {(quickData.rating || quickData.reviews) && (
        <div className="flex gap-4 text-sm">
          {quickData.rating && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              ⭐ {quickData.rating}
            </span>
          )}
          {quickData.reviews && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              📝 {quickData.reviews} reseñas
            </span>
          )}
        </div>
      )}
    </div>
  );
}
