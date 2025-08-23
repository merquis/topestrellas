'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthUser } from '@/lib/auth';

interface SidebarProps {
  user: AuthUser;
  onLogout: () => void;
  isMobile?: boolean;
  isTablet?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onLinkClick?: () => void;
}

export default function Sidebar({ 
  user, 
  onLogout, 
  isMobile = false, 
  isTablet = false,
  isOpen = true, 
  onClose,
  onLinkClick 
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // En móvil/tablet, nunca colapsar
  const shouldCollapse = !isMobile && !isTablet && isCollapsed;

  // Determinar la ruta base según el rol
  const baseRoute = user.role === 'super_admin' ? '/super' : 
                    user.role === 'affiliate' ? '/affiliate' : 
                    '/admin';

  // Menú para Super Admin
  const superAdminMenu = [
    {
      title: 'Dashboard',
      icon: '📊',
      href: '/super',
      show: true,
      description: 'Métricas del negocio SaaS'
    },
    {
      title: 'Negocios',
      icon: '🏢',
      href: '/super/businesses',
      show: true,
      description: 'Gestionar todos los negocios'
    },
    {
      title: 'Usuarios',
      icon: '👥',
      href: '/super/users',
      show: true,
      description: 'Administrar usuarios'
    },
    {
      title: 'Afiliados',
      icon: '🤝',
      href: '/super/affiliates',
      show: true,
      description: 'Gestionar partners y afiliados'
    },
    {
      title: 'Planes de Suscripción',
      icon: '🛠️',
      href: '/super/subscriptions',
      show: true,
      description: 'Configurar planes y precios'
    },
    {
      title: 'Analytics',
      icon: '📈',
      href: '/super/analytics',
      show: true,
      description: 'Análisis detallado del negocio'
    }
  ];

  // Menú para Afiliados
  const affiliateMenu = [
    {
      title: 'Dashboard',
      icon: '📊',
      href: '/affiliate',
      show: true,
      description: 'Vista general de afiliado'
    },
    {
      title: 'Mis Referidos',
      icon: '👥',
      href: '/affiliate/referrals',
      show: true,
      description: 'Clientes que has referido'
    },
    {
      title: 'Comisiones',
      icon: '💰',
      href: '/affiliate/commissions',
      show: true,
      description: 'Historial de comisiones'
    },
    {
      title: 'Estadísticas',
      icon: '📈',
      href: '/affiliate/stats',
      show: true,
      description: 'Análisis de rendimiento'
    },
    {
      title: 'Materiales',
      icon: '📦',
      href: '/affiliate/materials',
      show: true,
      description: 'Recursos de marketing'
    },
    {
      title: 'Mi Perfil',
      icon: '👤',
      href: '/affiliate/profile',
      show: true,
      description: 'Configuración de cuenta'
    }
  ];

  // Menú para Admin normal
  const adminMenu = [
    {
      title: 'Dashboard',
      icon: '📊',
      href: '/admin',
      show: true,
      description: 'Vista general'
    },
    {
      title: 'Mis Negocios',
      icon: '🏪',
      href: '/admin/my-business',
      show: true,
      description: 'Gestionar mis negocios'
    },
    {
      title: 'Mis Suscripciones',
      icon: '💳',
      href: '/admin/subscriptions',
      show: true,
      description: 'Ver mis suscripciones'
    },
    {
      title: 'Mis Facturas',
      icon: '📄',
      href: '/admin/invoices',
      show: true,
      description: 'Historial de facturas'
    },
    {
      title: 'Opiniones',
      icon: '⭐',
      href: '/admin/opinions',
      show: true,
      description: 'Gestionar reseñas'
    },
    {
      title: 'Estadísticas',
      icon: '📈',
      href: '/admin/analytics',
      show: true,
      description: 'Análisis y métricas'
    },
    {
      title: 'Configuración',
      icon: '⚙️',
      href: '/admin/settings',
      show: true,
      description: 'Ajustes del sistema'
    },
    {
      title: 'Centro de Ayuda',
      icon: '❓',
      href: '/admin/help',
      show: true,
      description: 'Documentación y soporte'
    },
    {
      title: 'Contacto',
      icon: '📞',
      href: '/admin/contact',
      show: true,
      description: 'Contactar soporte'
    }
  ];

  // Seleccionar el menú según el rol
  const menuItems = user.role === 'super_admin' ? superAdminMenu :
                   user.role === 'affiliate' ? affiliateMenu :
                   adminMenu;

  const isActive = (href: string) => pathname === href;

  // Manejar click en enlaces
  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  // Manejar logout con confirmación en móvil
  const handleLogoutClick = () => {
    if (isMobile || isTablet) {
      if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        onLogout();
      }
    } else {
      onLogout();
    }
  };

  return (
    <>
      {/* Overlay para móvil/tablet con animación */}
      {(isMobile || isTablet) && (
        <div 
          className={`
            fixed inset-0 bg-black transition-opacity duration-300 ease-in-out z-40 lg:hidden
            ${isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        ${(isMobile || isTablet)
          ? `fixed top-0 left-0 z-50 h-full transform transition-transform duration-300 ease-in-out ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : `transition-all duration-300 ${shouldCollapse ? 'w-20' : 'w-64'}`
        }
        bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white min-h-screen flex flex-col shadow-2xl
        ${!isMobile && !isTablet && !shouldCollapse ? 'w-64' : ''}
        ${!isMobile && !isTablet && shouldCollapse ? 'w-20' : ''}
        ${(isMobile || isTablet) ? 'w-72' : ''}
      `}>
        {/* Header con logo mejorado */}
        <div className="p-4 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${shouldCollapse ? 'justify-center' : ''}`}>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                {/* Indicador de estado */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
              </div>
              {!shouldCollapse && (
                <div>
                  <h2 className="font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    TopEstrellas
                  </h2>
                  <p className="text-xs text-gray-400">Panel Admin</p>
                </div>
              )}
            </div>
            {/* Botón colapsar solo en desktop */}
            {!isMobile && !isTablet && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-white transition-all duration-200 hover:bg-gray-700/50 p-1 rounded cursor-pointer"
                title={isCollapsed ? 'Expandir' : 'Colapsar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={isCollapsed ? 'M13 5l7 7-7 7' : 'M11 19l-7-7 7-7'} />
                </svg>
              </button>
            )}
            {/* Botón cerrar en móvil/tablet */}
            {(isMobile || isTablet) && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-all duration-200 hover:bg-gray-700/50 p-1 rounded lg:hidden cursor-pointer"
                title="Cerrar menú"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* User Info con mejor diseño */}
        <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className={`flex items-center gap-3 ${shouldCollapse ? 'justify-center' : ''}`}>
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center font-bold shadow-lg shadow-green-500/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {/* Badge de rol */}
              {user.role === 'super_admin' && !shouldCollapse && (
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  SA
                </div>
              )}
            </div>
            {!shouldCollapse && (
              <div className="flex-1">
                <p className="font-medium text-sm text-white">{user.name}</p>
                <p className="text-xs text-gray-400">
                  {user.role === 'super_admin' ? '👑 Super Admin' : 
                   user.role === 'affiliate' ? '🤝 Afiliado' : 
                   '🔧 Administrador'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation con scroll mejorado */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <ul className="space-y-1">
            {menuItems.filter(item => item.show).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                    ${isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'hover:bg-gray-700/50 text-gray-300 hover:text-white hover:translate-x-1'
                    } 
                    ${shouldCollapse ? 'justify-center' : ''}
                  `}
                  title={shouldCollapse ? item.title : ''}
                >
                  {/* Indicador activo */}
                  {isActive(item.href) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full -ml-4"></div>
                  )}
                  
                  <span className={`text-xl transition-transform duration-200 ${
                    isActive(item.href) ? 'scale-110' : 'group-hover:scale-110'
                  }`}>
                    {item.icon}
                  </span>
                  
                  {!shouldCollapse && (
                    <div className="flex-1">
                      <span className="font-medium block">{item.title}</span>
                      {(isMobile || isTablet) && !isActive(item.href) && (
                        <span className="text-xs text-gray-400 mt-0.5 block">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Flecha para items activos */}
                  {!shouldCollapse && isActive(item.href) && (
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer con logout mejorado */}
        <div className="p-4 border-t border-gray-700/50 bg-gradient-to-t from-gray-900 to-gray-800/50">
          <button
            onClick={handleLogoutClick}
            className={`
              group flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200 
              bg-gradient-to-r from-red-600/10 to-red-700/10 hover:from-red-600 hover:to-red-700 
              text-gray-300 hover:text-white hover:shadow-lg hover:shadow-red-500/25 cursor-pointer
              ${shouldCollapse ? 'justify-center' : ''}
            `}
            title={shouldCollapse ? 'Cerrar Sesión' : ''}
          >
            <span className="text-xl transition-transform duration-200 group-hover:scale-110">
              🚪
            </span>
            {!shouldCollapse && (
              <>
                <span className="font-medium">Cerrar Sesión</span>
                <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
