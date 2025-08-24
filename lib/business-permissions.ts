import { AuthUser } from './auth';

export interface BusinessPermissions {
  canAccessBusiness: (businessId: string) => boolean;
  canAccessAllBusinesses: () => boolean;
  getAllowedBusinessIds: () => string[];
  filterByBusinessAccess: <T extends { businessId?: string; businessIds?: string[] }>(items: T[]) => T[];
}

export function createBusinessPermissions(user: AuthUser, userBusinessIds: string[] = []): BusinessPermissions {
  const canAccessAllBusinesses = () => {
    return user.role === 'super_admin';
  };

  const canAccessBusiness = (businessId: string) => {
    if (user.role === 'super_admin') {
      return true;
    }
    return userBusinessIds.includes(businessId);
  };

  const getAllowedBusinessIds = () => {
    if (user.role === 'super_admin') {
      return []; // Empty array means "all businesses"
    }
    return userBusinessIds;
  };

  const filterByBusinessAccess = <T extends { businessId?: string; businessIds?: string[] }>(items: T[]): T[] => {
    if (user.role === 'super_admin') {
      return items; // Super admin can see everything
    }

    return items.filter(item => {
      // Check single businessId
      if (item.businessId) {
        return userBusinessIds.includes(item.businessId);
      }
      
      // Check multiple businessIds
      if (item.businessIds && item.businessIds.length > 0) {
        return item.businessIds.some(id => userBusinessIds.includes(id));
      }
      
      // If no business association, allow for super_admin only
      return user.role === 'super_admin';
    });
  };

  return {
    canAccessBusiness,
    canAccessAllBusinesses,
    getAllowedBusinessIds,
    filterByBusinessAccess
  };
}

// Helper function to get user's business IDs from database
export async function getUserBusinessIds(userEmail: string): Promise<string[]> {
  try {
    const response = await fetch('/api/admin/users');
    if (!response.ok) {
      return [];
    }
    
    const users = await response.json();
    const user = users.find((u: any) => u.email === userEmail);
    
    if (user && user.businesses) {
      return user.businesses.map((b: any) => b.id);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user business IDs:', error);
    return [];
  }
}

// Server-side permission check for API routes
export function checkBusinessPermission(
  userRole: string,
  userBusinessIds: string[],
  targetBusinessId: string
): boolean {
  if (userRole === 'super_admin') {
    return true;
  }
  
  return userBusinessIds.includes(targetBusinessId);
}

// Filter query for MongoDB based on business permissions
export function getBusinessFilter(userRole: string, userBusinessIds: string[]) {
  if (userRole === 'super_admin') {
    return {}; // No filter for super admin
  }
  
  return {
    $or: [
      { businessId: { $in: userBusinessIds } },
      { businessIds: { $in: userBusinessIds } }
    ]
  };
}
