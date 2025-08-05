'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import BusinessSelector from './BusinessSelector';
import SimpleBusinessSelector from './SimpleBusinessSelector';
import { AuthUser, clearAuth } from '@/lib/auth';
import { BusinessProvider, useBusinessContext } from '@/lib/business-context';

interface AdminLayoutProps {
  children: ReactNode;
  user: AuthUser;
}

function AdminLayoutContent({ children, user }: AdminLayoutProps) {
  const { loadBusinesses } = useBusinessContext();

  useEffect(() => {
    // Solo cargar negocios para admins normales
    if (user.role === 'admin') {
      loadBusinesses(user);
    }
  }, [user, loadBusinesses]);

  const handleLogout = () => {
    clearAuth();
    // Usar window.location.href para forzar una recarga completa
    window.location.href = '/admin';
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
                
                {/* Business Selector - Solo para admins normales */}
                {user.role === 'admin' && <SimpleBusinessSelector user={user} />}
              </div>
              
              <div className="flex items-center gap-4">
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
    </div>
  );
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  return (
    <BusinessProvider>
      <AdminLayoutContent user={user}>
        {children}
      </AdminLayoutContent>
    </BusinessProvider>
  );
}
