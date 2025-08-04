'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function NewBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState({
    subdomain: '',
    name: '',
    type: 'restaurante',
    category: '',
    phone: '',
    email: '',
    address: '',
    googleReviewUrl: '',
    plan: 'trial',
    prizes: [
      'CENA PARA 2',
      '30€ DESCUENTO', 
      'BOTELLA VINO',
      'HELADO',
      'CERVEZA',
      'REFRESCO',
      'MOJITO',
      'CHUPITO'
    ]
  });

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
        setTimeout(() => router.push('/admin'), 2000);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePrizeChange = (index: number, value: string) => {
    const newPrizes = [...formData.prizes];
    newPrizes[index] = value;
    setFormData({ ...formData, prizes: newPrizes });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <LoadingOverlay isLoading={loading} text="Creando tu negocio y traduciendo premios con IA..." />
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Añadir Nuevo Negocio</h1>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Subdominio *
                </label>
                <input
                  type="text"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleChange}
                  placeholder="mi-restaurante"
                  className="w-full p-2 border rounded"
                  required
                  pattern="[a-z0-9-]+"
                  title="Solo letras minúsculas, números y guiones"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL: {formData.subdomain || 'mi-restaurante'}.tuvaloracion.com
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Negocio *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Mi Restaurante"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo de Negocio
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="restaurante">Restaurante</option>
                  <option value="peluqueria">Peluquería</option>
                  <option value="hotel">Hotel</option>
                  <option value="tienda">Tienda</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Categoría
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Ej: Italiano, Mexicano..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+34 900 000 000"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="info@minegocio.com"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Calle Principal 123, Ciudad"
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Sección de Premios */}
              <div className="md:col-span-2 mt-6">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">🎁 Premios de la Ruleta</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ IMPORTANTE:</strong> Los primeros 3 premios deben ser los más grandes y valiosos ya que tienen menor probabilidad de salir (<strong>0.01% cada uno</strong>). 
                      Los premios 4-8 tienen mayor probabilidad (<strong>19.994% cada uno</strong>). Los premios se traducirán automáticamente a <strong>inglés, alemán y francés</strong> además del español, y se generarán emojis apropiados con IA.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {formData.prizes.map((prize, index) => (
                      <div key={index} className={`flex gap-2 items-center p-3 rounded-lg ${index < 3 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex-shrink-0 w-20">
                          <span className={`text-sm font-medium ${index < 3 ? 'text-orange-700' : 'text-gray-600'}`}>
                            Premio {index + 1}:
                          </span>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={prize}
                            onChange={(e) => handlePrizeChange(index, e.target.value)}
                            placeholder={`Ej: ${index === 0 ? 'CENA PARA 2' : index === 1 ? '30€ DESCUENTO' : 'HELADO'}`}
                            className="w-full p-2 border rounded text-sm"
                            required
                          />
                        </div>
                        <div className="flex-shrink-0 w-12 text-center">
                          <span className="text-lg">🤖</span>
                          <div className="text-xs text-gray-500">IA</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  URL de Google Reviews
                </label>
                <input
                  type="url"
                  name="googleReviewUrl"
                  value={formData.googleReviewUrl}
                  onChange={handleChange}
                  placeholder="https://g.page/r/..."
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Obtén esta URL desde Google My Business
                </p>
              </div>


              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan de Suscripción
                </label>
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="trial">Trial (30 días gratis)</option>
                  <option value="basic">Básico</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Negocio'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
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
    </div>
  );
}
