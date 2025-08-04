// Sistema de autenticación y roles
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  businessId?: string;
}

// Simulación de autenticación - En producción usar NextAuth o similar
export const authenticateUser = (email: string, password: string): AuthUser | null => {
  // Super Admin
  const adminPassword = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_ADMIN_PASSWORD : '';
  if (email === 'admin@tuvaloracion.com' && password === adminPassword) {
    return {
      id: '1',
      email: 'admin@tuvaloracion.com',
      name: 'Super Administrador',
      role: 'super_admin'
    };
  }
  
  // Admin de negocio específico (ejemplo)
  if (email === 'restaurante@demo.com' && password === 'demo123') {
    return {
      id: '2',
      email: 'restaurante@demo.com',
      name: 'Admin Restaurante Demo',
      role: 'admin',
      businessId: 'demo-restaurant-id'
    };
  }
  
  return null;
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
