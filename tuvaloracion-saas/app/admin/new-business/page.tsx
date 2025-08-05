'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import LoadingOverlay from '@/components/LoadingOverlay';
import { checkAuth } from '@/lib/auth';

export default function NewBusinessPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    type: 'restaurante',
    phone: '',
    email: '',
    address: '',
    googleReviewUrl: '',
    tripadvisorReviewUrl: '',
    reviewPlatform: 'google',
    plan: 'trial',
    prizes: [
      'CENA Max 60€',
      'DESCUENTO 30€', 
      'BOTELLA VINO',
      'HELADO',
      'CERVEZA',
      'REFRESCO',
      'MOJITO',
      'CHUPITO'
    ]
  });

  // Premios por tipo de negocio
  const prizesByType = {
    restaurante: [
      'CENA Max 60€',
      'DESCUENTO 30€', 
      'BOTELLA VINO',
      'HELADO',
      'CERVEZA',
      'REFRESCO',
      'MOJITO',
      'CHUPITO'
    ],
    cafeteria: [
      'Upgrade gratis',
      'Shot extra',
      'Sirope adicional',
      'Descuento 15%',
      'Crema extra',
      '2x1 futuro',
      'Topping gratis',
      'Azúcar premium'
    ],
    peluqueria: [
      'CORTE GRATIS',
      'DESCUENTO 30€',
      'MASAJE CAPILAR',
      'MANICURA',
      'PRODUCTOS',
      'PEINADO',
      'TRATAMIENTO',
      'REGALO'
    ],
    hotel: [
      'NOCHE GRATIS',
      'UPGRADE SUITE',
      'DESAYUNO',
      'SPA GRATIS',
      'CENA',
      'BEBIDA',
      'LATE CHECKOUT',
      'DESCUENTO'
    ],
    tienda: [
      'DESCUENTO 50%',
      'PRODUCTO GRATIS',
      'VALE 20€',
      'OFERTA 2x1',
      'DESCUENTO 15%',
      'REGALO',
      'VALE 10€',
      'DESCUENTO 5%'
    ],
    otro: [
      'PREMIO 1',
      'PREMIO 2',
      'PREMIO 3',
      'PREMIO 4',
      'PREMIO 5',
      'PREMIO 6',
      'PREMIO 7',
      'PREMIO 8'
    ]
  };

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    if (authUser.role !== 'super_admin') {
      router.push('/admin');
      return;
    }
    setUser(authUser);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ 
          message: `Negocio creado exitosamente! Subdominio: ${data.subdomain}.tuvaloracion.com`, 
          type: 'success' 
        });
        setTimeout(() => router.push('/admin/businesses'), 2000);
      } else {
        setToast({ message: `Error: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error al crear el negocio', type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Si se cambia el tipo de negocio, actualizar los premios automáticamente
    if (name === 'type' && prizesByType[value as keyof typeof prizesByType]) {
      setFormData({
        ...formData,
        [name]: value,
        prizes: prizesByType[value as keyof typeof prizesByType]
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePrizeChange = (index: number, value: string) => {
    const newPrizes = [...formData.prizes];
    newPrizes[index] = value;
    setFormData({ ...formData, prizes: newPrizes });
  };

  if (!user) {
    return null;
  }

  return (
    <AdminLayout user={user}>
      <LoadingOverlay isLoading={loading} text="Creando tu negocio y traduciendo premios con IA..." />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">Añadir Nuevo Negocio</h1>
            <p className="text-gray-600 mt-1">Configura un nuevo negocio en la plataforma</p>
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
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Negocio *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Mi Restaurante"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+34 900 000 000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
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
                            value={prize}
                            onChange={(e) => handlePrizeChange(index, e.target.value)}
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

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/admin/businesses')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Negocio'}
              </button>
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
