// @ts-nocheck
'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import BusinessSelectorModal from './BusinessSelectorModal';
import { AuthUser, clearAuth } from '@/lib/auth';
import { useMobileSidebar, useMobileDetect } from '@/lib/hooks/useMobileDetect';

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
  
  // Hooks para manejo móvil
  const { isMobile, isTablet, isDesktop } = useMobileDetect();
  const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar, handleLinkClick } = useMobileSidebar();

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
    if (user && user.role === 'admin') {
      loadBusinesses();
    }
  }, [user]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      if (!user) return;
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

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Barra Superior Móvil */}
      {(isMobile || isTablet) && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="font-bold text-white text-lg">TopEstrellas</span>
            </div>

            {/* Botón Menu */}
            <button
              onClick={toggleSidebar}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all duration-200 text-white"
            >
              {isSidebarOpen ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium text-sm">CERRAR</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="font-medium text-sm">MENU</span>
                </>
              )}
            </button>
          </div>

          {/* Selector de negocio compacto para móvil (solo admin) */}
          {user.role === 'admin' && selectedBusiness && (
            <div className="px-4 pb-2 border-t border-gray-700/50">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedBusiness.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-300 font-medium">{selectedBusiness.name}</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Cambiar
                </button>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Sidebar */}
      <Sidebar 
        user={user} 
        onLogout={handleLogout}
        isMobile={isMobile}
        isTablet={isTablet}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onLinkClick={handleLinkClick}
      />

      {/* Main Content */}
      <main className={`flex-1 overflow-x-hidden ${(isMobile || isTablet) ? 'w-full' : ''}`}>
        {/* Top Bar Desktop */}
        {isDesktop && (
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
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
                  {/* Business Selector Dropdown for admin users (Desktop) */}
                  {user.role === 'admin' && (
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-600 mb-2 tracking-wide uppercase">
                        Negocio actual
                      </label>
                      <div className="relative">
                        <select
                          value={selectedBusiness?._id || ''}
                          onChange={(e) => {
                            const businessId = e.target.value;
                            if (businessId) {
                              const business = businesses.find(b => b._id === businessId);
                              if (business) {
                                handleBusinessSelect(business);
                              }
                            }
                          }}
                          className="w-full pl-14 pr-10 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm font-semibold text-gray-800 min-w-[240px] appearance-none cursor-pointer shadow-sm hover:shadow-md"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234f46e5' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.75rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.25em 1.25em'
                          }}
                        >
                          <option value="" className="text-gray-500">
                            ✨ Seleccionar negocio...
                          </option>
                          {businesses.map((business) => (
                            <option key={business._id} value={business._id} className="py-2">
                              {business.name}
                            </option>
                          ))}
                        </select>
                        
                        {/* Status indicator overlay */}
                        {selectedBusiness && (
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                            <div className={`w-2.5 h-2.5 rounded-full mr-2 ${
                              selectedBusiness.active 
                                ? 'bg-green-500 shadow-green-200 shadow-lg' 
                                : 'bg-red-500 shadow-red-200 shadow-lg'
                            }`}></div>
                          </div>
                        )}
                        
                        {/* Business icon overlay */}
                        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <span className="text-blue-600 text-lg">🏪</span>
                        </div>
                      </div>
                      
                      {/* Status text */}
                      {selectedBusiness && (
                        <div className="mt-1 flex items-center text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            selectedBusiness.active ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`font-medium ${
                            selectedBusiness.active ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {selectedBusiness.active ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-gray-400 ml-2">
                            {selectedBusiness.subdomain}.tuvaloracion.com
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}
        
        {/* Content con padding superior en móvil para la barra fija */}
        <div className={`p-6 ${(isMobile || isTablet) ? 'pt-24' : ''}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
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
