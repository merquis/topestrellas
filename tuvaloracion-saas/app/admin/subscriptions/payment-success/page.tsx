'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { checkAuth } from '@/lib/auth';

function PaymentSuccessContent() {
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authUser = checkAuth();
    if (!authUser) {
      router.push('/admin');
      return;
    }
    setUser(authUser);
  }, []);

  useEffect(() => {
    if (user) {
      verifyPayment();
    }
  }, [user]);

  const verifyPayment = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      const orderId = searchParams.get('order_id');
      
      if (!sessionId && !orderId) {
        setError('No se encontró información del pago');
        setProcessing(false);
        return;
      }

      const response = await fetch('/api/admin/subscriptions/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          orderId
        })
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin/subscriptions');
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Error al verificar el pago');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Error al verificar el pago');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <AdminLayout user={user}>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Procesando pago...</h2>
              <p className="text-gray-600">Por favor, espera mientras verificamos tu pago</p>
            </>
          ) : success ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pago completado!</h2>
              <p className="text-gray-600 mb-4">Tu suscripción ha sido actualizada correctamente</p>
              <p className="text-sm text-gray-500">Redirigiendo a tus suscripciones...</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en el pago</h2>
              <p className="text-gray-600 mb-4">{error || 'Hubo un problema al procesar tu pago'}</p>
              <button
                onClick={() => router.push('/admin/subscriptions')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Volver a suscripciones
              </button>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
