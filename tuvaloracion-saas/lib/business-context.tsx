'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
  type: string;
  subscription?: {
    plan: string;
    status: string;
  };
}

interface BusinessContextType {
  selectedBusiness: Business | null;
  businesses: Business[];
  setSelectedBusiness: (business: Business) => void;
  loading: boolean;
  loadBusinesses: (user: AuthUser) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [selectedBusiness, setSelectedBusinessState] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar negocios del usuario
  const loadBusinesses = async (user: AuthUser) => {
    console.log('🔍 loadBusinesses called with user:', { email: user.email, role: user.role, businessId: user.businessId });
    
    if (user.role !== 'admin') {
      console.log('❌ User is not admin, skipping business loading');
      return; // Solo para admins normales
    }
    
    setLoading(true);
    try {
      // Enviar parámetros necesarios para el filtrado
      const params = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role
      });
      
      console.log('📡 Fetching businesses with params:', params.toString());
      const response = await fetch(`/api/admin/businesses?${params}`);
      
      if (response.ok) {
        const userBusinesses = await response.json();
        console.log('✅ Businesses loaded:', userBusinesses.length, 'businesses');
        console.log('📋 Business list:', userBusinesses.map((b: Business) => ({ id: b._id, name: b.name })));
        
        setBusinesses(userBusinesses);
        
        // Seleccionar el primer negocio por defecto o el guardado en localStorage
        const savedBusinessId = localStorage.getItem('selectedBusinessId');
        console.log('💾 Saved business ID from localStorage:', savedBusinessId);
        
        const businessToSelect = savedBusinessId 
          ? userBusinesses.find((b: Business) => b._id === savedBusinessId) || userBusinesses[0]
          : userBusinesses[0];
          
        if (businessToSelect) {
          console.log('🎯 Selected business:', { id: businessToSelect._id, name: businessToSelect.name });
          setSelectedBusinessState(businessToSelect);
        } else {
          console.log('❌ No business to select');
        }
      } else {
        console.error('❌ Error response:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        setBusinesses([]);
      }
    } catch (error) {
      console.error('❌ Error loading businesses:', error);
      setBusinesses([]);
    } finally {
      setLoading(false);
      console.log('🏁 loadBusinesses finished');
    }
  };

  // Función para cambiar el negocio seleccionado
  const setSelectedBusiness = (business: Business) => {
    setSelectedBusinessState(business);
    localStorage.setItem('selectedBusinessId', business._id);
  };

  const value: BusinessContextType = {
    selectedBusiness,
    businesses,
    setSelectedBusiness,
    loading,
    loadBusinesses
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}
