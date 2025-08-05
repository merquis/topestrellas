import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

      // Soporte para múltiples negocios (businessIds) y compatibilidad con businessId legacy
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

    // Calcular rating promedio
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

    return NextResponse.json({
      totalBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      totalOpinions,
      totalPrizes,
      avgRating,
      monthlyGrowth,
      opinionsGrowth,
      inactiveGrowth
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
