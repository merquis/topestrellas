'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, authenticateUser, checkAuth, saveAuth } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    // Verificar si ya está autenticado
    const authUser = checkAuth();
    if (authUser) {
      // Redirigir según el rol
      if (authUser.role === 'super_admin') {
        router.push('/super');
      } else if (authUser.role === 'affiliate') {
        router.push('/affiliate');
      } else {
        router.push('/admin');
      }
    }
    setCheckingAuth(false);
  }, [router]);

  // Verificar si hay mensaje de éxito del pago
  useEffect(() => {
    const paymentSuccess = localStorage.getItem('paymentSuccess');
    if (paymentSuccess === 'true') {
      const message = localStorage.getItem('successMessage');
      // Mostrar el mensaje como información positiva
      const successDiv = document.createElement('div');
      successDiv.className = 'bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm border border-green-200 mb-4';
      successDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-green-500">✅</span>
          <span>${message || '¡Registro completado! Inicia sesión para acceder.'}</span>
        </div>
      `;
      
      // Insertar el mensaje antes del formulario
      setTimeout(() => {
        const loginForm = document.querySelector('form');
        if (loginForm && loginForm.parentNode) {
          loginForm.parentNode.insertBefore(successDiv, loginForm);
          
          // Eliminar el mensaje después de 10 segundos
          setTimeout(() => {
            if (successDiv.parentNode) {
              successDiv.remove();
            }
          }, 10000);
        }
      }, 100);
      
      // Limpiar localStorage
      localStorage.removeItem('paymentSuccess');
      localStorage.removeItem('successMessage');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    
    try {
      const authUser = await authenticateUser(loginEmail, loginPassword);
      if (authUser) {
        saveAuth(authUser);
        
        // Redirigir según el rol del usuario
        if (authUser.role === 'super_admin') {
          router.push('/super');
        } else if (authUser.role === 'affiliate') {
          router.push('/affiliate');
        } else {
          router.push('/admin');
        }
      } else {
        setLoginError('Credenciales incorrectas');
      }
    } catch (error) {
      setLoginError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">TopEstrellas.com</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
          <p className="text-gray-600">Accede a tu panel de administración</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              placeholder="tu@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              placeholder="••••••••"
              required
            />
          </div>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">
              <div className="flex items-center gap-2">
                <span className="text-red-500">❌</span>
                <span>{loginError}</span>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Iniciando sesión...</span>
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link
              href="/registro"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Crear cuenta nueva
            </Link>
          </p>
          <p className="text-xs text-gray-400 mt-4">
            ¿Necesitas ayuda? Contacta con soporte
          </p>
        </div>
      </div>
    </div>
  );
}
