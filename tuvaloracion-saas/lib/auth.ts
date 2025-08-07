// Sistema de autenticación y roles
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  businessId?: string;
}

// Autenticación usando API
export const authenticateUser = async (email: string, password: string): Promise<AuthUser | null> => {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
};

export const checkAuth = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  
  const authData = localStorage.getItem('authUser');
  if (!authData) return null;
  
  try {
    return JSON.parse(authData);
  } catch {
    return null;
  }
};

export const saveAuth = (user: AuthUser) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authUser', JSON.stringify(user));
  }
};

export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authUser');
  }
};

// Función para verificar autenticación en rutas API (server-side)
export const verifyAuth = (authHeader: string): AuthUser | null => {
  // Por ahora, implementación básica
  // En producción, deberías usar JWT o sesiones seguras
  try {
    // Extraer el token o datos de autenticación del header
    // Este es un ejemplo simplificado
    if (!authHeader) return null;
    
    // Aquí deberías verificar el token JWT o la sesión
    // Por ahora, retornamos un usuario de prueba para que funcione
    return {
      id: '1',
      email: 'admin@topestrellas.com',
      name: 'Admin',
      role: 'admin'
    };
  } catch (error) {
    console.error('Error verifying auth:', error);
    return null;
  }
};
