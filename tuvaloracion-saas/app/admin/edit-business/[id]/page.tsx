'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import LoadingOverlay from '@/components/LoadingOverlay';
import { checkAuth } from '@/lib/auth';
import { GooglePlacesUltraSeparatedLarge } from '@/components/GooglePlacesUltraSeparated';
import { GooglePlaceData } from '@/lib/types';

export default function EditBusinessPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    subdomain: '',
    name: '',
    type: 'restaurante',
    phone: '',
    email: '',
    address: '',
    googleReviewUrl: '',
    tripadvisorReviewUrl: '',
    reviewPlatform: 'google',
    plan: 'trial',
    active: true,
    prizes: Array(8).fill({ name: '', realCost: 0 }),
    googleCurrentRating: 0,
    googleTotalReviews: 0,
    tripadvisorCurrentRating: 0,
    tripadvisorTotalReviews: 0
  });

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    // Permitir acceso tanto a super_admin como a admin
    if (!['super_admin', 'admin'].includes(authUser.role)) {
      router.push('/admin');
      return;
    }
    setUser(authUser);
    loadBusiness();
  }, [params.id]);

  // Detectar hash en la URL para navegar a la pestaña correcta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#premios') {
        setActiveTab('prizes');
      } else if (hash === '#resenas') {
        setActiveTab('reviews');
      } else if (hash === '#configuracion') {
        setActiveTab('settings');
      } else if (hash === '#basico') {
        setActiveTab('basic');
      }
    }
  }, []);

  const loadBusiness = async () => {
    try {
      const response = await fetch(`/api/admin/businesses/${params.id}`);
      if (response.ok) {
        const business = await response.json();
        // Extraer premios existentes
        const existingPrizes = business.config?.prizes || [];
        const prizes = Array(8).fill(null).map((_, index) => {
          const prize = existingPrizes[index];
          if (prize && prize.translations && prize.translations.es) {
            return {
              name: prize.translations.es.name || '',
              realCost: prize.realCost || 0
            };
          }
          return { name: '', realCost: 0 };
        });

        setFormData({
          subdomain: business.subdomain,
          name: business.name,
          type: business.type || 'restaurante',
          phone: business.contact?.phone || '',
          email: business.contact?.email || '',
          address: business.contact?.address || '',
          googleReviewUrl: business.config?.googleReviewUrl || '',
          tripadvisorReviewUrl: business.config?.tripadvisorReviewUrl || '',
          reviewPlatform: business.config?.reviewPlatform || 'google',
          plan: business.subscription?.plan || 'trial',
          active: business.active !== false,
          prizes: prizes,
          googleCurrentRating: business.config?.googleStats?.currentRating || 0,
          googleTotalReviews: business.config?.googleStats?.totalReviews || 0,
          tripadvisorCurrentRating: business.config?.tripadvisorStats?.currentRating || 0,
          tripadvisorTotalReviews: business.config?.tripadvisorStats?.totalReviews || 0
        });
      } else {
        setToast({ message: 'Error al cargar el negocio', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al cargar el negocio', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/businesses/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userRole: user?.role // Enviar el rol del usuario para validación de permisos
        }),
      });

      if (response.ok) {
        setToast({ message: 'Negocio actualizado exitosamente', type: 'success' });
        // No redirigir automáticamente, permanecer en la misma página
      } else {
        const data = await response.json();
        setToast({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al actualizar el negocio', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handlePrizeChange = (index: number, field: 'name' | 'realCost', value: string | number) => {
    const newPrizes = [...formData.prizes];
    
    if (field === 'realCost') {
      // Convertir el valor a número, manejando tanto punto como coma
      let numericValue = 0;
      if (typeof value === 'string') {
        // Reemplazar coma por punto para parseFloat
        const normalizedValue = value.replace(',', '.');
        numericValue = parseFloat(normalizedValue) || 0;
      } else {
        numericValue = value || 0;
      }
      
      newPrizes[index] = {
        ...newPrizes[index],
        [field]: numericValue
      };
    } else {
      newPrizes[index] = {
        ...newPrizes[index],
        [field]: value
      };
    }
    
    setFormData({ ...formData, prizes: newPrizes });
  };

  // Función para formatear el valor mostrado con coma decimal
  const formatCostValue = (value: number) => {
    // Si es un número entero, mostrarlo sin decimales
    if (value % 1 === 0) {
      return value.toString();
    }
    // Si tiene decimales, mostrar con 2 decimales y coma
    const formatted = value.toFixed(2).replace('.', ',');
    return formatted;
  };

  // Función para manejar el input de coste con formato español
  const handleCostInput = (index: number, inputValue: string) => {
    // Permitir escribir tanto punto como coma, pero convertir internamente
    const cleanValue = inputValue.replace(',', '.');
    const numericValue = parseFloat(cleanValue) || 0;
    handlePrizeChange(index, 'realCost', numericValue);
  };

  // Handler para cuando se selecciona un lugar con autocompletado
  const handleAutocompletePlaceSelected = (place: GooglePlaceData, placeId: string, photoUrl?: string) => {
    console.log('Lugar seleccionado:', { place, placeId, photoUrl });
    
    // Rellenar automáticamente todos los campos
    setFormData(prev => ({
      ...prev,
      name: place.name || prev.name,
      googleCurrentRating: place.rating || prev.googleCurrentRating,
      googleTotalReviews: place.user_ratings_total || prev.googleTotalReviews,
      address: place.formatted_address || prev.address,
      phone: place.international_phone_number || prev.phone,
      // Generar URL de Google Reviews usando el placeId
      googleReviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`
    }));

    // Mostrar toast de confirmación
    setToast({ 
      message: `✅ Datos actualizados: ${place.name} (${place.rating}⭐, ${place.user_ratings_total} reseñas)`, 
      type: 'success' 
    });
  };

  const handleAutocompleteError = (error: string) => {
    console.error('Error en autocompletado:', error);
    setToast({ message: `Error: ${error}`, type: 'error' });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <LoadingOverlay isLoading={saving} text="Actualizando negocio y traduciendo premios con IA..." />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Editar Negocio</h1>
                <p className="text-gray-600 mt-1">Actualiza la configuración del negocio</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  formData.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    formData.active ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  {formData.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('basic')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Información Básica
              </button>
              <button
                onClick={() => setActiveTab('prizes')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'prizes'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Premios
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reseñas
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Configuración
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subdominio
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.subdomain}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-400">🔒</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      URL: {formData.subdomain}.tuvaloracion.com
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Negocio *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Negocio
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="restaurante">🍽️ Restaurante</option>
                      <option value="cafeteria">☕ Cafetería</option>
                      <option value="peluqueria">✂️ Peluquería</option>
                      <option value="hotel">🏨 Hotel</option>
                      <option value="tienda">🛍️ Tienda</option>
                      <option value="otro">📦 Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan de Suscripción
                    </label>
                    <select
                      name="plan"
                      value={formData.plan}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="trial">🎁 Prueba (7 días gratis)</option>
                      <option value="basic">⭐ Básico</option>
                      <option value="premium">💎 Premium</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+34 900 000 000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="info@minegocio.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Calle Principal 123, Ciudad"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Prizes Tab */}
            {activeTab === 'prizes' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900 mb-2">⚠️ Configuración de Premios</h3>
                  <p className="text-sm text-amber-800">
                    Los primeros 3 premios tienen <strong>0.01% de probabilidad</strong> cada uno (premios grandes).
                    Los premios 4-8 tienen <strong>19.994% de probabilidad</strong> cada uno.
                  </p>
                  <p className="text-sm text-amber-800 mt-2">
                    Los premios se traducirán automáticamente a inglés, alemán y francés con IA.
                  </p>
                </div>

                <div className="space-y-3">
                  {formData.prizes.map((prize, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-2 ${
                        index < 3 
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                            index < 3 ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-700'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={prize.name}
                            onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                            placeholder={`Premio ${index + 1}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div className="flex-shrink-0 text-center">
                          <span className="text-2xl">🤖</span>
                          <p className="text-xs text-gray-500">Auto IA</p>
                        </div>
                      </div>
                      <div className="mt-3 ml-14">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          💰 Coste real del premio
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={formatCostValue(prize.realCost)}
                            onChange={(e) => handleCostInput(index, e.target.value)}
                            placeholder="0,00"
                            className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            pattern="[0-9]+([,][0-9]{1,2})?"
                            title="Formato: 0,00 (usar coma para decimales)"
                          />
                          <span className="text-sm text-gray-600">€</span>
                        </div>
                      </div>
                      {index < 3 && (
                        <p className="text-xs text-orange-700 mt-2 ml-14">
                          Premio especial - Baja probabilidad (0.01%)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* NUEVA FUNCIONALIDAD: Búsqueda inteligente con autocompletado */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="text-lg font-semibold mb-4 text-blue-800">
                    🔍 Buscar tu negocio (Recomendado)
                  </h3>
                  <p className="text-sm text-blue-600 mb-4">
                    Escribe el nombre de tu negocio y selecciónalo de las sugerencias. 
                    Todos los campos se rellenarán automáticamente.
                  </p>
                  
                  <GooglePlacesUltraSeparatedLarge
                    onPlaceSelected={handleAutocompletePlaceSelected}
                    onError={handleAutocompleteError}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Google Reviews
                  </label>
                  <textarea
                    name="googleReviewUrl"
                    value={formData.googleReviewUrl}
                    onChange={handleChange}
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Obtén esta URL desde Google My Business
                  </p>
                  
                  {/* Estadísticas de Google */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⭐ Puntuación actual Google
                      </label>
                      <input
                        type="number"
                        name="googleCurrentRating"
                        value={formData.googleCurrentRating}
                        onChange={handleChange}
                        min="0"
                        max="5"
                        step="0.1"
                        placeholder="4.2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📊 Número de reseñas Google
                      </label>
                      <input
                        type="number"
                        name="googleTotalReviews"
                        value={formData.googleTotalReviews}
                        onChange={handleChange}
                        min="0"
                        placeholder="127"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de TripAdvisor Reviews
                  </label>
                  <textarea
                    name="tripadvisorReviewUrl"
                    value={formData.tripadvisorReviewUrl}
                    onChange={handleChange}
                    placeholder="https://www.tripadvisor.es/UserReviewEdit-..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Obtén esta URL desde TripAdvisor
                  </p>
                  
                  {/* Estadísticas de TripAdvisor */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⭐ Puntuación actual TripAdvisor
                      </label>
                      <input
                        type="number"
                        name="tripadvisorCurrentRating"
                        value={formData.tripadvisorCurrentRating}
                        onChange={handleChange}
                        min="0"
                        max="5"
                        step="0.1"
                        placeholder="4.0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📊 Número de reseñas TripAdvisor
                      </label>
                      <input
                        type="number"
                        name="tripadvisorTotalReviews"
                        value={formData.tripadvisorTotalReviews}
                        onChange={handleChange}
                        min="0"
                        placeholder="89"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Plataforma de Reviews Activa
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewPlatform"
                        value="google"
                        checked={formData.reviewPlatform === 'google'}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Google Reviews</p>
                        <p className="text-sm text-gray-500">Redirigir solo a Google</p>
                      </div>
                    </label>
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewPlatform"
                        value="tripadvisor"
                        checked={formData.reviewPlatform === 'tripadvisor'}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">TripAdvisor Reviews</p>
                        <p className="text-sm text-gray-500">Redirigir solo a TripAdvisor</p>
                      </div>
                    </label>
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewPlatform"
                        value="alternating"
                        checked={formData.reviewPlatform === 'alternating'}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Alternado Automático</p>
                        <p className="text-sm text-gray-500">Rotar entre Google y TripAdvisor</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Recomendado
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Gestión de Suscripción - Para TODOS los roles */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-medium text-blue-900 mb-4">📋 Gestión de Suscripción</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div>
                        <p className="font-medium text-gray-900">Plan Actual</p>
                        <p className="text-sm text-gray-600">
                          {formData.plan === 'trial' && '🎁 Prueba (7 días gratis)'}
                          {formData.plan === 'basic' && '⭐ Básico'}
                          {formData.plan === 'premium' && '💎 Premium'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        formData.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {formData.active ? 'Activo' : 'Suspendido'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implementar cancelación de suscripción
                          alert('Funcionalidad de cancelación en desarrollo');
                        }}
                        className="p-4 border-2 border-orange-300 rounded-lg hover:bg-orange-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⏸️</span>
                          <div>
                            <p className="font-medium text-orange-900">Cancelar Suscripción</p>
                            <p className="text-sm text-orange-700">Pausar el servicio temporalmente</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implementar renovación de suscripción
                          alert('Funcionalidad de renovación en desarrollo');
                        }}
                        className="p-4 border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🔄</span>
                          <div>
                            <p className="font-medium text-green-900">Renovar Suscripción</p>
                            <p className="text-sm text-green-700">Reactivar el servicio</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implementar cambio de plan
                          alert('Funcionalidad de cambio de plan en desarrollo');
                        }}
                        className="p-4 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📈</span>
                          <div>
                            <p className="font-medium text-blue-900">Cambiar Plan</p>
                            <p className="text-sm text-blue-700">Upgrade o downgrade</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implementar historial de facturación
                          alert('Funcionalidad de facturación en desarrollo');
                        }}
                        className="p-4 border-2 border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📊</span>
                          <div>
                            <p className="font-medium text-purple-900">Ver Facturación</p>
                            <p className="text-sm text-purple-700">Historial de pagos</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Controles Administrativos - Solo Super Admin */}
                {user?.role === 'super_admin' && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="font-medium text-gray-900 mb-4">⚙️ Estado del Negocio</h3>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="active"
                          checked={formData.active}
                          onChange={handleChange}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700">
                          Negocio activo
                        </span>
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        Si desactivas el negocio, los clientes no podrán acceder a la página de valoraciones.
                      </p>
                    </div>

                    <div className="bg-red-50 rounded-lg p-6">
                      <h3 className="font-medium text-red-900 mb-4">⚠️ Zona de Peligro</h3>
                      <p className="text-sm text-red-700 mb-4">
                        Las siguientes acciones son permanentes y no se pueden deshacer.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('¿Estás seguro de que quieres eliminar este negocio? Esta acción no se puede deshacer.')) {
                            // Implementar eliminación
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Eliminar Negocio
                      </button>
                    </div>
                  </>
                )}

                {/* Información para Admin Normal */}
                {user?.role === 'admin' && (
                  <div className="bg-amber-50 rounded-lg p-6">
                    <h3 className="font-medium text-amber-900 mb-2">ℹ️ Información</h3>
                    <p className="text-sm text-amber-800">
                      Como administrador de negocio, puedes gestionar la información, premios y reseñas, 
                      pero no puedes activar/desactivar o eliminar el negocio. Para estas acciones, 
                      contacta con el soporte técnico.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  const redirectPath = user?.role === 'super_admin' ? '/admin/businesses' : '/admin/my-business';
                  router.push(redirectPath);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <div className="flex gap-3">
                <a
                  href={`https://${formData.subdomain}.tuvaloracion.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  Ver Sitio <span className="text-sm">↗</span>
                </a>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}
