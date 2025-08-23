'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegistroPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a /admin que ya tiene el flujo de registro completo
    router.push('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirigiendo al registro...</p>
      </div>
    </div>
  );
}
