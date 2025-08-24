import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Marcar esta ruta como dinámica para evitar pre-renderizado estático
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');
    const businessId = searchParams.get('businessId');
    const dateFilter = searchParams.get('dateFilter') || 'todas';
    const ratingFilter = searchParams.get('ratingFilter') || 'todas';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!userEmail || !userRole) {
      return NextResponse.json({ error: 'Parámetros de usuario requeridos' }, { status: 400 });
    }

    const db = await getDatabase();

    // Construir filtro de fecha
    let dateQuery = {};
    const now = new Date();
    
    switch (dateFilter) {
      case 'hoy':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        dateQuery = {
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };
        break;
      case 'ayer':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endOfYesterday = new Date(startOfYesterday.getTime() + 24 * 60 * 60 * 1000);
        dateQuery = {
          createdAt: {
            $gte: startOfYesterday,
            $lt: endOfYesterday
          }
        };
        break;
      case 'semana':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateQuery = {
          createdAt: { $gte: weekAgo }
        };
        break;
      case 'mes':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateQuery = {
          createdAt: { $gte: monthAgo }
        };
        break;
      case '3meses':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateQuery = {
          createdAt: { $gte: threeMonthsAgo }
        };
        break;
      default:
        // 'todas' - sin filtro de fecha
        break;
    }

    // Construir filtro de rating
    let ratingQuery = {};
    if (ratingFilter !== 'todas') {
      ratingQuery = {
        rating: parseInt(ratingFilter)
      };
    }

    // Obtener negocios del usuario para filtrar opiniones
    let businessQuery = {};
    
    if (userRole === 'admin') {
      // Para admin normal, obtener sus negocios asignados
      const user = await db.collection('users').findOne({ email: userEmail });
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      let userBusinessIds: ObjectId[] = [];
      
      // Soporte para múltiples negocios (businessIds) y compatibilidad con businessId legacy
      if (user.businessIds && Array.isArray(user.businessIds)) {
        userBusinessIds = user.businessIds.map((id: string) => new ObjectId(id));
      } else if (user.businessId) {
        userBusinessIds = [new ObjectId(user.businessId)];
      }

      if (userBusinessIds.length === 0) {
        return NextResponse.json({ opinions: [] });
      }

      // Si se especifica un negocio específico, verificar que el usuario tenga acceso
      if (businessId && businessId !== 'all') {
        const requestedBusinessId = new ObjectId(businessId);
        const hasAccess = userBusinessIds.some(id => id.equals(requestedBusinessId));
        
        if (!hasAccess) {
          return NextResponse.json({ error: 'No tienes acceso a este negocio' }, { status: 403 });
        }
        
        businessQuery = { businessId: requestedBusinessId };
      } else {
        businessQuery = { businessId: { $in: userBusinessIds } };
      }
    } else if (userRole === 'super_admin') {
      // Super admin puede ver todas las opiniones
      if (businessId && businessId !== 'all') {
        businessQuery = { businessId: new ObjectId(businessId) };
      }
    } else {
      return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
    }

    // Construir query final
    const query = {
      ...businessQuery,
      ...dateQuery,
      ...ratingQuery
    };

    // Obtener opiniones con paginación
    const skip = (page - 1) * limit;
    
    const opinions = await db.collection('opinions')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Obtener información de negocios para mostrar nombres
    const businessIds = Array.from(new Set(opinions.map((opinion: any) => opinion.businessId)));
    const businesses = await db.collection('businesses')
      .find({ _id: { $in: businessIds } })
      .project({ name: 1, subdomain: 1 })
      .toArray();

    // Enriquecer opiniones con información del negocio
    const enrichedOpinions = opinions.map((opinion: any) => {
      const business = businesses.find((b: any) => b._id.equals(opinion.businessId));
      return {
        ...opinion,
        businessName: business?.name || 'Negocio desconocido',
        businessSubdomain: business?.subdomain
      };
    });

    // Obtener total para paginación
    const total = await db.collection('opinions').countDocuments(query);

    return NextResponse.json({
      opinions: enrichedOpinions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching opinions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
