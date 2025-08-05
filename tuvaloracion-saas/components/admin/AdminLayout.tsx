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

  const handleLogout = () => {
    clearAuth();
    // Usar window.location.href para forzar una recarga completa
    window.location.href = '/admin';
  };

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
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
                {/* Business Selector Button for admin users */}
                {user.role === 'admin' && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    <span className="text-lg">🏪</span>
                    <span className="hidden sm:inline">
                      {selectedBusiness ? selectedBusiness.name : 'Cambiar Negocio'}
                    </span>
                    <span className="sm:hidden">Negocio</span>
                  </button>
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
