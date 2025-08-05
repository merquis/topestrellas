'use client';

import { useState, useEffect } from 'react';

interface Business {
  id: string;
  name: string;
}

interface BusinessSelectorProps {
  userBusinesses: Business[];
  selectedBusinessId: string | null;
  onBusinessChange: (businessId: string | null) => void;
  userRole: 'admin' | 'super_admin';
}

export default function BusinessSelector({ 
  userBusinesses, 
  selectedBusinessId, 
  onBusinessChange, 
  userRole 
}: BusinessSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Para super_admin, mostrar "Todos los negocios" como opción
  const allBusinessesOption = { id: 'all', name: 'Todos los negocios' };
  
  const options = userRole === 'super_admin' 
    ? [allBusinessesOption, ...userBusinesses]
    : userBusinesses;

  const selectedBusiness = selectedBusinessId === 'all' 
    ? allBusinessesOption 
    : options.find(b => b.id === selectedBusinessId) || options[0];

  const handleSelect = (business: Business) => {
    const businessId = business.id === 'all' ? 'all' : business.id;
    onBusinessChange(businessId);
    setIsOpen(false);
  };

  // Si no hay negocios, no mostrar el selector
  if (options.length === 0) {
    return null;
  }

  // Si solo hay un negocio y no es super_admin, no mostrar selector
  if (options.length === 1 && userRole !== 'super_admin') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
        <span className="text-blue-600">🏢</span>
        <span className="text-sm font-medium text-blue-800">{options[0].name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600">🏢</span>
          <span className="text-sm font-medium text-gray-800 truncate">
            {selectedBusiness?.name || 'Seleccionar negocio'}
          </span>
        </div>
        <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {options.map((business) => (
              <button
                key={business.id}
                onClick={() => handleSelect(business)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  selectedBusinessId === business.id ? 'bg-blue-50 text-blue-800' : 'text-gray-800'
                }`}
              >
                <span className="text-blue-600">
                  {business.id === 'all' ? '🌐' : '🏢'}
                </span>
                <span className="text-sm font-medium truncate">
                  {business.name}
                </span>
                {selectedBusinessId === business.id && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
