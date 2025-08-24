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

    if (!userEmail || !userRole) {
      return NextResponse.json({ error: 'Parámetros de usuario requeridos' }, { status: 400 });
    }

    const db = await getDatabase();

    // Obtener negocios del usuario para filtrar estadísticas
    let businessQuery = {};
    let userBusinessIds: ObjectId[] = [];
    
    if (userRole === 'admin') {
      // Para admin normal, obtener sus negocios asignados
      const user = await db.collection('users').findOne({ email: userEmail });
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      // Si se especifica un businessId, verificar que el admin tenga acceso a ese negocio
      if (businessId) {
        // Verificar que el businessId esté en los negocios asignados al admin
        if (user.businessIds && Array.isArray(user.businessIds)) {
          if (user.businessIds.includes(businessId)) {
            userBusinessIds = [new ObjectId(businessId)];
            businessQuery = { _id: new ObjectId(businessId) };
          } else {
            return NextResponse.json({ error: 'No tienes acceso a este negocio' }, { status: 403 });
          }
        } else if (user.businessId && user.businessId === businessId) {
          userBusinessIds = [new ObjectId(businessId)];
          businessQuery = { _id: new ObjectId(businessId) };
        } else {
          return NextResponse.json({ error: 'No tienes acceso a este negocio' }, { status: 403 });
        }
      } else {
        // Sin businessId específico, usar todos los negocios asignados
        if (user.businessIds && Array.isArray(user.businessIds)) {
          userBusinessIds = user.businessIds.map((id: string) => new ObjectId(id));
        } else if (user.businessId) {
          userBusinessIds = [new ObjectId(user.businessId)];
        }

        if (userBusinessIds.length === 0) {
          return NextResponse.json({
            totalBusinesses: 0,
            activeBusinesses: 0,
            totalOpinions: 0,
            totalPrizes: 0,
            avgRating: 0,
            monthlyGrowth: 0,
            opinionsGrowth: 0
          });
        }

        businessQuery = { _id: { $in: userBusinessIds } };
      }
    } else if (userRole === 'super_admin') {
      // Super admin puede ver todas las estadísticas
      if (businessId && businessId !== 'all') {
        userBusinessIds = [new ObjectId(businessId)];
        businessQuery = { _id: new ObjectId(businessId) };
      } else {
        // Obtener todos los negocios para super admin
        const allBusinesses = await db.collection('businesses').find({}).project({ _id: 1 }).toArray();
        userBusinessIds = allBusinesses.map((b: any) => b._id);
        businessQuery = {};
      }
    } else {
      return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
    }

    // Obtener estadísticas de negocios
    const businesses = await db.collection('businesses').find(businessQuery).toArray();
    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter((b: any) => b.active).length;
    const inactiveBusinesses = businesses.filter((b: any) => !b.active).length;

    // Construir query para opiniones basado en los negocios del usuario
    const opinionsQuery = userBusinessIds.length > 0 
      ? { businessId: { $in: userBusinessIds } }
      : {};

    // Obtener estadísticas de opiniones
    const totalOpinions = await db.collection('opinions').countDocuments(opinionsQuery);

    // Calcular total de premios entregados (cada opinión genera un premio)
    const totalPrizes = totalOpinions;

    // Calcular rating promedio interno
    const ratingPipeline = [
      { $match: opinionsQuery },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ];

    const ratingResult = await db.collection('opinions').aggregate(ratingPipeline).toArray();
    const avgRating = ratingResult.length > 0 ? Math.round(ratingResult[0].avgRating * 10) / 10 : 0;

    // Obtener datos de Google Places si hay un negocio específico
    let googleRating = 0;
    let googleReviews = 0;
    
    if (userBusinessIds.length === 1) {
      // Solo para un negocio específico, obtener datos de Google Places
      const business = businesses.find((b: any) => b._id.equals(userBusinessIds[0]));
      if (business && business.googlePlaces) {
        googleRating = business.googlePlaces.rating || 0;
        googleReviews = business.googlePlaces.totalReviews || 0;
      }
    } else if (userBusinessIds.length > 1) {
      // Para múltiples negocios, calcular promedio de Google Places
      const businessesWithGoogle = businesses.filter((b: any) => b.googlePlaces && b.googlePlaces.rating);
      if (businessesWithGoogle.length > 0) {
        const totalGoogleRating = businessesWithGoogle.reduce((sum: number, b: any) => sum + b.googlePlaces.rating, 0);
        const totalGoogleReviews = businessesWithGoogle.reduce((sum: number, b: any) => sum + (b.googlePlaces.totalReviews || 0), 0);
        googleRating = Math.round((totalGoogleRating / businessesWithGoogle.length) * 10) / 10;
        googleReviews = totalGoogleReviews;
      }
    }

    // Calcular crecimiento mensual de negocios
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const businessesLastMonth = await db.collection('businesses').countDocuments({
      ...businessQuery,
      createdAt: { $lt: oneMonthAgo }
    });

    const businessesThisMonth = await db.collection('businesses').countDocuments({
      ...businessQuery,
      createdAt: { $gte: oneMonthAgo }
    });

    const monthlyGrowth = businessesLastMonth > 0 
      ? Math.round((businessesThisMonth / businessesLastMonth) * 100 * 10) / 10
      : businessesThisMonth > 0 ? 100 : 0;

    // Calcular crecimiento mensual de opiniones
    const opinionsLastMonth = await db.collection('opinions').countDocuments({
      ...opinionsQuery,
      createdAt: { $lt: oneMonthAgo }
    });

    const opinionsThisMonth = await db.collection('opinions').countDocuments({
      ...opinionsQuery,
      createdAt: { $gte: oneMonthAgo }
    });

    const opinionsGrowth = opinionsLastMonth > 0 
      ? Math.round((opinionsThisMonth / opinionsLastMonth) * 100 * 10) / 10
      : opinionsThisMonth > 0 ? 100 : 0;

    // Calcular crecimiento mensual de negocios inactivos
    const inactiveBusinessesLastMonth = await db.collection('businesses').countDocuments({
      ...businessQuery,
      active: false,
      createdAt: { $lt: oneMonthAgo }
    });

    const inactiveBusinessesThisMonth = await db.collection('businesses').countDocuments({
      ...businessQuery,
      active: false,
      createdAt: { $gte: oneMonthAgo }
    });

    const inactiveGrowth = inactiveBusinessesLastMonth > 0 
      ? Math.round((inactiveBusinessesThisMonth / inactiveBusinessesLastMonth) * 100 * 10) / 10
      : inactiveBusinessesThisMonth > 0 ? 100 : 0;

    // Calcular porcentajes respecto al total de negocios
    const activePercentage = totalBusinesses > 0 
      ? Math.round((activeBusinesses / totalBusinesses) * 100 * 10) / 10
      : 0;
    
    const inactivePercentage = totalBusinesses > 0 
      ? Math.round((inactiveBusinesses / totalBusinesses) * 100 * 10) / 10
      : 0;

    return NextResponse.json({
      totalBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      totalOpinions,
      totalPrizes,
      avgRating,
      googleRating,
      googleReviews,
      monthlyGrowth,
      opinionsGrowth,
      inactiveGrowth,
      activePercentage,
      inactivePercentage
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
