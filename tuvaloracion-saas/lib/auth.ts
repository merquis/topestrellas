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
export const verifyAuth = (cookieHeader: string): AuthUser | null => {
  if (!cookieHeader) return null;

  try {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const token = cookies['auth-token'];
    if (!token) return null;

    // Asumimos que el token es el objeto AuthUser en base64
    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    const user: AuthUser = JSON.parse(decodedToken);

    return user;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
};
