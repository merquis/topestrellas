'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StatsCard from '@/components/admin/StatsCard';
import QRIrresistibleButton from './QRIrresistibleButton';
import { AuthUser } from '@/lib/auth';

interface Business {
  _id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

interface FunctionalDashboardProps {
  user: AuthUser;
}

export default function FunctionalDashboard({ user }: FunctionalDashboardProps) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    inactiveBusinesses: 0,
    totalOpinions: 0,
    totalPrizes: 0,
    avgRating: 0,
    googleRating: 0,
    googleReviews: 0,
    monthlyGrowth: 0,
    opinionsGrowth: 0,
    inactiveGrowth: 0,
    activePercentage: 0,
    inactivePercentage: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [showPrizesSpotlight, setShowPrizesSpotlight] = useState(false);
  const [hasPrizesIssue, setHasPrizesIssue] = useState(false);
  const [showQRSpotlight, setShowQRSpotlight] = useState(false);
  const [hasQRIssue, setHasQRIssue] = useState(false);
  const [showHelpSpotlight, setShowHelpSpotlight] = useState(false);
  const [hasHelpIssue, setHasHelpIssue] = useState(false);
  const [showPrintInstructionsSpotlight, setShowPrintInstructionsSpotlight] = useState(false);
  const [hasPrintInstructionsIssue, setHasPrintInstructionsIssue] = useState(false);
  const [userTriedToNavigate, setUserTriedToNavigate] = useState(false);
  const recentActivityRef = useRef<HTMLDivElement>(null);

  // Cargar estadísticas cuando cambia el negocio seleccionado o el usuario
  useEffect(() => {
    loadStats();
  }, [user]);

  // Cargar negocios para admins normales
  useEffect(() => {
    if (user.role === 'admin') {
      loadBusinesses();
    }
  }, [user.email, user.role]);

  // Escuchar cambios en localStorage para el negocio seleccionado
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;

    const handleStorageChange = () => {
      try {
        const storedBusiness = localStorage.getItem('selectedBusiness');
        if (storedBusiness) {
          const business = JSON.parse(storedBusiness);
          console.log('📦 Business from localStorage:', business);
          setSelectedBusiness(business);
        }
      } catch (error) {
        console.error('❌ Error parsing stored business:', error);
      }
    };

    // Cargar negocio inicial desde localStorage
    handleStorageChange();

    // Escuchar cambios en localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar cambios personalizados (para cambios en la misma pestaña)
    window.addEventListener('businessChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('businessChanged', handleStorageChange);
    };
  }, []);

  // Recargar estadísticas cuando cambia el negocio seleccionado
  useEffect(() => {
    if (selectedBusiness) {
      console.log('🔄 Business changed, reloading stats for:', selectedBusiness.name);
      loadStats();
      loadRecentActivities();
    }
  }, [selectedBusiness]);

  // Cargar actividades recientes cuando se carga el componente
  useEffect(() => {
    loadRecentActivities();
  }, [user]);

  // Listener global para detectar clics en cualquier parte cuando hay problemas de premios, QR, instrucciones o ayuda
  useEffect(() => {
    if (!hasPrizesIssue && !hasQRIssue && !hasPrintInstructionsIssue && !hasHelpIssue) return;

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      const isConfigurePrizesButton = target.closest('a[href*="edit-business"][href*="#premios"]');
      const isDownloadQRButton = target.closest('button')?.textContent?.includes('Descargar QR Irresistible');
      const isUnderstoodButton = target.closest('button')?.textContent?.includes('¡Entendido!');
      const isHelpButton = target.closest('button')?.textContent?.includes('Ver Centro de Ayuda');

      if (!isConfigurePrizesButton && !isDownloadQRButton && !isUnderstoodButton && !isHelpButton) {
        event.preventDefault();
        event.stopPropagation();
        setUserTriedToNavigate(true);
      }
    };

    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [hasPrizesIssue, hasQRIssue, hasPrintInstructionsIssue, hasHelpIssue]);

  // Verificar si hay actividades de premios no configurados, QR no descargado, instrucciones de impresión o ayuda
  useEffect(() => {
    const prizesActivity = recentActivities.find(activity => 
      activity.type === 'prizes_not_configured' && 
      activity.priority === 'high'
    );
    
    const qrActivity = recentActivities.find(activity =>
      activity.type === 'qr_download_needed' &&
      activity.priority === 'high'
    );

    const printInstructionsActivity = recentActivities.find(activity =>
      activity.type === 'qr_print_instructions' &&
      activity.priority === 'medium'
    );

    const helpActivity = recentActivities.find(activity =>
      activity.type === 'exploration_suggestion'
    );

    // Si no hay actividades críticas, limpiar todos los estados
    if (!prizesActivity && !qrActivity && !printInstructionsActivity && !helpActivity) {
      setHasPrizesIssue(false);
      setHasQRIssue(false);
      setHasPrintInstructionsIssue(false);
      setHasHelpIssue(false);
      setShowPrizesSpotlight(false);
      setShowQRSpotlight(false);
      setShowPrintInstructionsSpotlight(false);
      setShowHelpSpotlight(false);
      setUserTriedToNavigate(false);
      return;
    }

    if (prizesActivity && user.role === 'admin') {
      setHasPrizesIssue(true);
      setHasQRIssue(false);
      setHasPrintInstructionsIssue(false);
      setHasHelpIssue(false);
      // Solo mostrar spotlight si el usuario ya intentó navegar
      setShowPrizesSpotlight(userTriedToNavigate);
      setShowQRSpotlight(false);
      setShowPrintInstructionsSpotlight(false);
      setShowHelpSpotlight(false);
    } else if (qrActivity && user.role === 'admin') {
      setHasPrizesIssue(false);
      setHasQRIssue(true);
      setHasPrintInstructionsIssue(false);
      setHasHelpIssue(false);
      // Solo mostrar spotlight si el usuario ya intentó navegar
      setShowPrizesSpotlight(false);
      setShowQRSpotlight(userTriedToNavigate);
      setShowPrintInstructionsSpotlight(false);
      setShowHelpSpotlight(false);
    } else if (printInstructionsActivity && user.role === 'admin') {
      setHasPrizesIssue(false);
      setHasQRIssue(false);
      setHasPrintInstructionsIssue(true);
      setHasHelpIssue(false);
      // Solo mostrar spotlight si el usuario ya intentó navegar
      setShowPrizesSpotlight(false);
      setShowQRSpotlight(false);
      setShowPrintInstructionsSpotlight(userTriedToNavigate);
      setShowHelpSpotlight(false);
    } else if (helpActivity) {
      setHasPrizesIssue(false);
      setHasQRIssue(false);
      setHasPrintInstructionsIssue(false);
      setHasHelpIssue(true);
      setShowPrizesSpotlight(false);
      setShowQRSpotlight(false);
      setShowPrintInstructionsSpotlight(false);
      setShowHelpSpotlight(userTriedToNavigate);
    }
  }, [recentActivities, user.role, userTriedToNavigate]);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role
      });

      const response = await fetch(`/api/admin/businesses?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Businesses loaded:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          setBusinesses(data);
          setSelectedBusiness(data[0]); // Seleccionar el primero automáticamente
        }
      } else {
        setError(`Error ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      console.error('❌ Error loading businesses:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsParams = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
        ...(selectedBusiness && user.role === 'admin' ? { businessId: selectedBusiness._id } : {}),
        ...(user.businessId && user.role !== 'super_admin' && !selectedBusiness ? { businessId: user.businessId } : {})
      });

      console.log('📊 Loading stats with params:', Object.fromEntries(statsParams));

      const response = await fetch(`/api/admin/stats?${statsParams}`);
      if (response.ok) {
        const statsData = await response.json();
        console.log('✅ Stats loaded:', statsData);
        setStats({
          totalBusinesses: statsData.totalBusinesses,
          activeBusinesses: statsData.activeBusinesses,
          inactiveBusinesses: statsData.inactiveBusinesses,
          totalOpinions: statsData.totalOpinions,
          totalPrizes: statsData.totalPrizes,
          avgRating: statsData.avgRating,
          googleRating: statsData.googleRating,
          googleReviews: statsData.googleReviews,
          monthlyGrowth: statsData.monthlyGrowth,
          opinionsGrowth: statsData.opinionsGrowth,
          inactiveGrowth: statsData.inactiveGrowth,
          activePercentage: statsData.activePercentage,
          inactivePercentage: statsData.inactivePercentage
        });
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activityParams = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
        ...(selectedBusiness && user.role === 'admin' ? { businessId: selectedBusiness._id } : {}),
        ...(user.businessId && user.role !== 'super_admin' && !selectedBusiness ? { businessId: user.businessId } : {})
      });

      console.log('🔄 Loading recent activities with params:', Object.fromEntries(activityParams));

      const response = await fetch(`/api/admin/recent-activity?${activityParams}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Recent activities loaded:', data);
        setRecentActivities(data.activities || []);
      }
    } catch (error) {
      console.error('❌ Error loading recent activities:', error);
      // En caso de error, mantener actividades vacías
      setRecentActivities([]);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    console.log('🔄 Business selected:', business.name);
    setSelectedBusiness(business);
    setIsDropdownOpen(false);
  };

  // Función para interceptar navegación cuando hay problemas
  const handleNavigationAttempt = (callback: () => void) => {
    if (hasPrizesIssue || hasQRIssue || hasPrintInstructionsIssue || hasHelpIssue) {
      setUserTriedToNavigate(true);
      return;
    }
    callback();
  };

  return (
    <>
      {/* Overlay global que bloquea toda interacción */}
      {(showPrizesSpotlight || showQRSpotlight || showPrintInstructionsSpotlight || showHelpSpotlight) && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-80 pointer-events-auto"></div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {user.role === 'super_admin' && (
          <StatsCard
            title="Negocios Totales"
            value={stats.totalBusinesses}
            icon="🏢"
            trend={{ value: stats.monthlyGrowth, isPositive: true }}
            bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
            iconBgColor="bg-blue-500"
          />
        )}
        {user.role === 'super_admin' && (
          <StatsCard
            title="Negocios Activos"
            value={stats.activeBusinesses}
            icon="✅"
            trend={{ value: stats.activePercentage, isPositive: true }}
            bgColor="bg-gradient-to-br from-green-50 to-green-100"
            iconBgColor="bg-green-500"
          />
        )}
        {user.role === 'super_admin' && (
          <StatsCard
            title="Negocios Inactivos"
            value={stats.inactiveBusinesses}
            icon="❌"
            trend={{ value: stats.inactivePercentage, isPositive: false }}
            bgColor="bg-gradient-to-br from-red-50 to-red-100"
            iconBgColor="bg-red-500"
          />
        )}
        <StatsCard
          title="Nota Google"
          value={stats.googleRating > 0 ? stats.googleRating.toFixed(1) : (stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—')}
          icon="⭐"
          bgColor="bg-gradient-to-br from-amber-50 to-orange-100"
          iconBgColor="bg-amber-500"
        />
        <StatsCard
          title="Reseñas Google"
          value={stats.googleReviews > 0 ? stats.googleReviews.toLocaleString() : stats.totalOpinions.toLocaleString()}
          icon="📝"
          bgColor="bg-gradient-to-br from-blue-50 to-indigo-100"
          iconBgColor="bg-blue-500"
        />
        <StatsCard
          title="Opiniones Totales"
          value={stats.totalOpinions.toLocaleString()}
          icon="💬"
          trend={{ value: stats.opinionsGrowth, isPositive: stats.opinionsGrowth >= 0 }}
          bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
          iconBgColor="bg-yellow-500"
        />
        <StatsCard
          title="Premios Entregados"
          value={stats.totalPrizes}
          icon="🎁"
          bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
          iconBgColor="bg-purple-500"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity */}
        <div
          ref={recentActivityRef}
          className={`lg:col-span-2 bg-white rounded-xl shadow-lg p-6 ${
            showPrizesSpotlight ? 'relative z-50 ring-4 ring-orange-500 ring-opacity-75 shadow-2xl' :
            showQRSpotlight ? 'relative z-50 ring-4 ring-blue-500 ring-opacity-75 shadow-2xl' :
            showPrintInstructionsSpotlight ? 'relative z-50 ring-4 ring-green-500 ring-opacity-75 shadow-2xl' :
            showHelpSpotlight ? 'relative z-50 ring-4 ring-indigo-500 ring-opacity-75 shadow-2xl' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Actividades Recientes</h2>
            {recentActivities.length > 8 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {recentActivities.length} actividades
              </span>
            )}
          </div>
          <div 
            className="space-y-4 max-h-[440px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6'
            }}
          >
            {recentActivities.length > 0 ? (
              recentActivities.map((activity: any, index: number) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors ${
                    activity.priority === 'high' ? 'border-l-4 border-red-500 bg-red-50' :
                    activity.priority === 'medium' ? 'border-l-4 border-yellow-500 bg-yellow-50' : ''
                  } ${
                    activity.type === 'qr_print_instructions' && showPrintInstructionsSpotlight ? 
                    'relative z-50 ring-4 ring-green-500 ring-opacity-75 shadow-2xl bg-green-50' : ''
                  }`}
                >
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p 
                      className={`${
                        activity.priority === 'high' ? 'text-red-800 font-semibold' : 
                        activity.priority === 'medium' ? 'text-yellow-800' : 'text-gray-800'
                      }`}
                      dangerouslySetInnerHTML={{ __html: activity.message }}
                    />
                    <p className="text-sm text-gray-500">{activity.time}</p>
                    
                    {/* Enlace especial para configurar premios */}
                    {activity.type === 'prizes_not_configured' && activity.businessId && (
                      <div className="mt-4">
                        <a
                          href={`/admin/edit-business/${activity.businessId}#premios`}
                          className="relative z-[9999] inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-lg font-bold rounded-2xl hover:from-orange-700 hover:to-orange-800 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-orange-500/50 border-2 border-orange-400"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="text-2xl">🎁</span>
                          <span>Configurar Premios</span>
                          <span className="text-xl">→</span>
                        </a>
                      </div>
                    )}

                    {/* Botón especial para descargar código QR Irresistible directamente */}
                    {activity.type === 'qr_download_needed' && activity.businessName && (
                      <QRIrresistibleButton 
                        activity={activity}
                        user={user}
                        selectedBusiness={selectedBusiness}
                        businesses={businesses}
                        onDownloadComplete={loadRecentActivities}
                      />
                    )}

                    {/* Mensaje de instrucciones de impresión */}
                    {activity.type === 'qr_print_instructions' && (
                      <div className="mt-4">
                        <button
                          onClick={async () => {
                            try {
                              // Marcar como visto
                              await fetch('/api/admin/mark-qr-instructions-shown', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userEmail: user.email })
                              });
                              
                              // Recargar actividades para mostrar la nueva sugerencia de exploración
                              loadRecentActivities();
                            } catch (error) {
                              console.error('Error:', error);
                            }
                          }}
                          className="relative z-[9999] inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-bold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-green-500/50 border-2 border-green-400"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="text-2xl">✅</span>
                          <span>¡Entendido!</span>
                        </button>
                      </div>
                    )}

                    {/* Mensaje de sugerencia de exploración */}
                    {activity.type === 'exploration_suggestion' && (
                      <div className="mt-4">
                        <button
                          onClick={async () => {
                            // Marcar como visto y luego navegar
                            try {
                              await fetch('/api/admin/mark-exploration-suggestion-shown', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userEmail: user.email })
                              });
                            } catch (error) {
                              console.error('Error marking suggestion shown:', error);
                            }
                            router.push('/admin/help');
                          }}
                          className="relative z-[9999] w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white text-lg font-bold rounded-2xl hover:from-indigo-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-indigo-500/50 border-2 border-indigo-400"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <span className="text-2xl">🚀</span>
                          <span>Ver Centro de Ayuda</span>
                          <span className="text-xl">→</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">📊</span>
                <p>No hay actividad reciente</p>
                <p className="text-sm">Las actividades aparecerán aquí cuando ocurran eventos en tu negocio</p>
              </div>
            )}
          </div>
          {recentActivities.length > 8 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <span className="mr-2">⬆️</span>
                Desliza hacia arriba para ver más actividades
                <span className="ml-2">⬆️</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
          <div className="space-y-3">
            {user.role === 'super_admin' && (
              <button
                onClick={() => handleNavigationAttempt(() => router.push('/admin/new-business'))}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
              >
                <span>➕</span> Añadir Negocio
              </button>
            )}
            <button
              onClick={() => handleNavigationAttempt(() => router.push('/admin/opinions'))}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <span>📝</span> Ver Opiniones
            </button>
            <button
              onClick={() => handleNavigationAttempt(() => router.push('/admin/analytics'))}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <span>📊</span> Estadísticas
            </button>
            <button
              onClick={() => handleNavigationAttempt(() => router.push('/admin/settings'))}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <span>⚙️</span> Configuración
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
