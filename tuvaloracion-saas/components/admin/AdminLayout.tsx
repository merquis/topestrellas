'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import BusinessSelectorModal from './BusinessSelectorModal';
import { AuthUser, clearAuth } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface AdminLayoutProps {
  children: ReactNode;
  user: AuthUser;
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar negocio seleccionado desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBusiness = localStorage.getItem('selectedBusiness');
      if (storedBusiness) {
        try {
          const business = JSON.parse(storedBusiness);
          setSelectedBusiness(business);
        } catch (error) {
          console.error('Error parsing stored business:', error);
        }
      }
    }
  }, []);

  // Cargar negocios para admins normales
  useEffect(() => {
    if (user.role === 'admin') {
      loadBusinesses();
    }
  }, [user.email, user.role]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role
      });

      const response = await fetch(`/api/admin/businesses?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Businesses loaded in AdminLayout:', data);
        
        if (Array.isArray(data)) {
          setBusinesses(data);
          // Si no hay negocio seleccionado, seleccionar el primero automáticamente
          if (!selectedBusiness && data.length > 0) {
            setSelectedBusiness(data[0]);
            if (typeof window !== 'undefined') {
              localStorage.setItem('selectedBusiness', JSON.stringify(data[0]));
              window.dispatchEvent(new CustomEvent('businessChanged'));
            }
          }
        }
      } else {
        console.error('❌ Error loading businesses:', response.status);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    // Usar window.location.href para forzar una recarga completa
    window.location.href = '/admin';
  };

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    
    // Guardar en localStorage para persistencia
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedBusiness', JSON.stringify(business));
      window.dispatchEvent(new CustomEvent('businessChanged'));
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-x-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {user.role === 'super_admin' ? 'Panel de Super Administrador' : 'Panel de Administración'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Bienvenido de nuevo, {user.name}
                  </p>
                </div>
                
              </div>
              
              <div className="flex items-center gap-4">
                {/* Business Selector Dropdown for admin users */}
                {user.role === 'admin' && (
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1">Negocio actual:</label>
                    <select
                      value={selectedBusiness?._id || ''}
                      onChange={(e) => {
                        const businessId = e.target.value;
                        if (businessId) {
                          // Buscar el negocio completo
                          const business = businesses.find(b => b._id === businessId);
                          if (business) {
                            handleBusinessSelect(business);
                          }
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm font-medium min-w-[200px] appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">Seleccionar negocio...</option>
                      {businesses.map((business) => (
                        <option key={business._id} value={business._id}>
                          🏪 {business.name} {business.active ? '(Activo)' : '(Inactivo)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Notifications */}
                <button className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors">
                  <span className="text-xl">🔔</span>
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                {/* Help */}
                <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                  <span className="text-xl">❓</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Business Selector Modal */}
      <BusinessSelectorModal
        user={user}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBusinessSelect={handleBusinessSelect}
        selectedBusiness={selectedBusiness}
      />
    </div>
  );
}
