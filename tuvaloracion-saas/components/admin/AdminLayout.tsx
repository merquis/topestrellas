'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import BusinessSelector from './BusinessSelector';
import { AuthUser, clearAuth } from '@/lib/auth';

interface Business {
  id: string;
  name: string;
}

interface BusinessContextType {
  selectedBusinessId: string | null;
  userBusinesses: Business[];
  setSelectedBusinessId: (id: string | null) => void;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export const useBusinessContext = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext must be used within AdminLayout');
  }
  return context;
};

interface AdminLayoutProps {
  children: ReactNode;
  user: AuthUser;
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const router = useRouter();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserBusinesses();
  }, [user]);

  const loadUserBusinesses = async () => {
    try {
      if (user.role === 'super_admin') {
        // Super admin puede ver todos los negocios
        const response = await fetch('/api/admin/businesses');
        if (response.ok) {
          const businesses = await response.json();
          setUserBusinesses(businesses.map((b: any) => ({ id: b._id, name: b.name })));
          setSelectedBusinessId('all'); // Por defecto "Todos los negocios"
        }
      } else {
        // Admin regular solo ve sus negocios asignados
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const users = await response.json();
          const currentUser = users.find((u: any) => u.email === user.email);
          if (currentUser && currentUser.businesses) {
            setUserBusinesses(currentUser.businesses);
            setSelectedBusinessId(currentUser.businesses[0]?.id || null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    // Usar window.location.href para forzar una recarga completa
    window.location.href = '/admin';
  };

  const businessContextValue: BusinessContextType = {
    selectedBusinessId,
    userBusinesses,
    setSelectedBusinessId
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <BusinessContext.Provider value={businessContextValue}>
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
                  
                  {/* Business Selector */}
                  {userBusinesses.length > 0 && (
                    <BusinessSelector
                      userBusinesses={userBusinesses}
                      selectedBusinessId={selectedBusinessId}
                      onBusinessChange={setSelectedBusinessId}
                      userRole={user.role}
                    />
                  )}
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
    </BusinessContext.Provider>
  );
}
