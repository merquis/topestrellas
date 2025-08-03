'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const router = useRouter();

  // Simple autenticación (en producción usar NextAuth)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
  console.log('Admin password from env:', process.env.NEXT_PUBLIC_ADMIN_PASSWORD);
  console.log('Using password:', ADMIN_PASSWORD);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('adminAuth') === 'true';
    if (isAuth) {
      setAuthenticated(true);
      loadBusinesses();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', 'true');
      setAuthenticated(true);
      loadBusinesses();
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses');
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">Panel de Administración</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded mb-4"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Estadísticas Generales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-100 p-4 rounded">
                <div className="text-2xl font-bold">{businesses.length}</div>
                <div className="text-gray-600">Negocios Activos</div>
              </div>
              <div className="bg-green-100 p-4 rounded">
                <div className="text-2xl font-bold">-</div>
                <div className="text-gray-600">Opiniones Totales</div>
              </div>
              <div className="bg-yellow-100 p-4 rounded">
                <div className="text-2xl font-bold">-</div>
                <div className="text-gray-600">Premios Entregados</div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Negocios Registrados</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Nombre</th>
                    <th className="border p-2 text-left">Subdominio</th>
                    <th className="border p-2 text-left">Plan</th>
                    <th className="border p-2 text-left">Estado</th>
                    <th className="border p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((business: any) => (
                    <tr key={business._id}>
                      <td className="border p-2">{business.name}</td>
                      <td className="border p-2">
                        <a 
                          href={`https://${business.subdomain}.tuvaloracion.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {business.subdomain}
                        </a>
                      </td>
                      <td className="border p-2">{business.subscription?.plan || 'N/A'}</td>
                      <td className="border p-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          business.active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        }`}>
                          {business.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="border p-2">
                        <button className="text-blue-500 hover:underline mr-2">Editar</button>
                        <button className="text-red-500 hover:underline">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={() => router.push('/admin/new-business')}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              + Añadir Nuevo Negocio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
