'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subdomain: '',
    name: '',
    type: 'restaurante',
    category: '',
    phone: '',
    email: '',
    address: '',
    googleReviewUrl: '',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    plan: 'trial'
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
        alert(`Negocio creado exitosamente! Subdominio: ${data.subdomain}.tuvaloracion.com`);
        router.push('/admin');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error al crear el negocio');
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

  return (
    <div className="min-h-screen bg-gray-100">
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
                  Color Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="h-10 w-20"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    readOnly
                    className="p-2 border rounded bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="secondaryColor"
                    value={formData.secondaryColor}
                    onChange={handleChange}
                    className="h-10 w-20"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    readOnly
                    className="p-2 border rounded bg-gray-50"
                  />
                </div>
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
    </div>
  );
}
