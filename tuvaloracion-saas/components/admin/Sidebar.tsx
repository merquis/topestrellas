'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthUser } from '@/lib/auth';

interface SidebarProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: '📊',
      href: '/admin',
      show: true
    },
    {
      title: 'Negocios',
      icon: '🏢',
      href: '/admin/businesses',
      show: user.role === 'super_admin'
    },
    {
      title: 'Usuarios',
      icon: '👥',
      href: '/admin/users',
      show: user.role === 'super_admin'
    },
    {
      title: 'Mis Negocios',
      icon: '🏪',
      href: '/admin/my-business',
      show: user.role === 'admin'
    },
    {
      title: 'Opiniones',
      icon: '⭐',
      href: '/admin/opinions',
      show: true
    },
    {
      title: 'Estadísticas',
      icon: '📈',
      href: '/admin/analytics',
      show: true
    },
    {
      title: 'Configuración',
      icon: '⚙️',
      href: '/admin/settings',
      show: true
    },
    {
      title: 'Centro de Ayuda',
      icon: '❓',
      href: '/admin/help',
      show: true
    },
    {
      title: 'Contacto',
      icon: '📞',
      href: '/admin/contact',
      show: true
    }
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <aside className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg">
              TV
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-lg">TuValoración</h2>
                <p className="text-xs text-gray-400">Panel Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-700">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-gray-400">
                {user.role === 'super_admin' ? 'Super Admin' : 'Administrador'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.filter(item => item.show).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'hover:bg-gray-700 text-gray-300 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <span className="text-xl">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium">{item.title}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all duration-200 hover:bg-red-600 text-gray-300 hover:text-white ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <span className="text-xl">🚪</span>
          {!isCollapsed && <span className="font-medium">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
