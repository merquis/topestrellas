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
  
  const authData = sessionStorage.getItem('authUser');
  if (!authData) return null;
  
  try {
    return JSON.parse(authData);
  } catch {
    return null;
  }
};

export const saveAuth = (user: AuthUser) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('authUser', JSON.stringify(user));
  }
};

export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('authUser');
  }
};
