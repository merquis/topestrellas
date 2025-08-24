'use client';

import { useState } from 'react';
import SimpleBusinessSelector from './SimpleBusinessSelector';
import SimpleDashboard from './SimpleDashboard';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface AdminDashboardWithSelectorProps {
  user: AuthUser;
}

export default function AdminDashboardWithSelector({ user }: AdminDashboardWithSelectorProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const handleBusinessChange = (business: Business | null) => {
    console.log('🔄 Business changed to:', business?.name);
    setSelectedBusiness(business);
  };

  return (
    <>
      {/* Header con selector de negocio */}
      {user.role === 'admin' && (
        <div className="mb-6">
          <SimpleBusinessSelector 
            user={user} 
            onBusinessChange={handleBusinessChange}
          />
        </div>
      )}

      {/* Header informativo del negocio seleccionado */}
      {user.role === 'admin' && selectedBusiness && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <h2 className="font-semibold text-blue-900">
                Estadísticas de: {selectedBusiness.name}
              </h2>
              <p className="text-sm text-blue-700">
                {selectedBusiness.subdomain}.tuvaloracion.com • 
                <span className={`ml-1 ${selectedBusiness.active ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedBusiness.active ? 'Activo' : 'Inactivo'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard con negocio seleccionado */}
      <SimpleDashboard user={user} selectedBusiness={selectedBusiness} />
    </>
  );
}
