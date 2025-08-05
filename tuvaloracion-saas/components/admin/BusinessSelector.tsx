'use client';

import { useState } from 'react';
import { useBusinessContext } from '@/lib/business-context';

export default function BusinessSelector() {
  const { selectedBusiness, businesses, setSelectedBusiness, loading } = useBusinessContext();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || businesses.length <= 1) {
    // Si solo hay un negocio o está cargando, mostrar solo el nombre
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
        <span className="text-2xl">🏪</span>
        <div>
          <p className="font-medium text-gray-900">
            {loading ? 'Cargando...' : selectedBusiness?.name || 'Sin negocio'}
          </p>
          {selectedBusiness && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                selectedBusiness.active ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="text-xs text-gray-500">
                {selectedBusiness.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 transition-colors min-w-[200px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏪</span>
          <div className="text-left">
            <p className="font-medium text-gray-900">
              {selectedBusiness?.name || 'Seleccionar negocio'}
            </p>
            {selectedBusiness && (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  selectedBusiness.active ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="text-xs text-gray-500">
                  {selectedBusiness.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            )}
          </div>
        </div>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar el dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {businesses.map((business) => (
              <button
                key={business._id}
                onClick={() => {
                  setSelectedBusiness(business);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedBusiness?._id === business._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <span className="text-xl">🏪</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{business.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${
                      business.active ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-xs text-gray-500">
                      {business.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {business.subdomain}.tuvaloracion.com
                    </span>
                  </div>
                </div>
                {selectedBusiness?._id === business._id && (
                  <span className="text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
