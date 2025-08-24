'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import FunctionalDashboard from '@/components/admin/FunctionalDashboard';
import { AuthUser, checkAuth } from '@/lib/auth';

export default function AdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      // Si no hay usuario autenticado, redirigir al login
      router.push('/login');
    } else if (authUser.role === 'super_admin') {
      // Si es super admin, redirigir al panel super
      router.push('/super');
    } else if (authUser.role === 'affiliate') {
      // Si es afiliado, redirigir al panel de afiliados
      router.push('/affiliate');
    } else if (authUser.role === 'admin') {
      // Solo los usuarios con rol 'admin' pueden ver este panel
      setUser(authUser);
    } else {
      // Cualquier otro rol, redirigir al login
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Se mostrará mientras redirige
  }

  return (
    <AdminLayout user={user}>
      <FunctionalDashboard user={user} />
    </AdminLayout>
  );
}
