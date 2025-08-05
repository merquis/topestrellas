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

    // Obtener negocios del usuario para filtrar actividades
    let businessQuery = {};
    let userBusinessIds: ObjectId[] = [];
    
    if (userRole === 'admin') {
      const user = await db.collection('users').findOne({ email: userEmail });
      console.log('👤 DEBUG - Usuario encontrado:', {
        email: user?.email,
        businessId: user?.businessId,
        businessIds: user?.businessIds,
        role: user?.role
      });
      
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      if (businessId) {
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
        if (user.businessIds && Array.isArray(user.businessIds)) {
          userBusinessIds = user.businessIds.map((id: string) => new ObjectId(id));
        } else if (user.businessId) {
          userBusinessIds = [new ObjectId(user.businessId)];
        }

        if (userBusinessIds.length === 0) {
          return NextResponse.json({ activities: [] });
        }

        businessQuery = { _id: { $in: userBusinessIds } };
      }
    } else if (userRole === 'super_admin') {
      if (businessId && businessId !== 'all') {
        userBusinessIds = [new ObjectId(businessId)];
        businessQuery = { _id: new ObjectId(businessId) };
      } else {
        const allBusinesses = await db.collection('businesses').find({}).project({ _id: 1 }).toArray();
        userBusinessIds = allBusinesses.map((b: any) => b._id);
        businessQuery = {};
      }
    } else {
      return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
    }

    // Obtener información de negocios
    const businesses = await db.collection('businesses').find(businessQuery).toArray();
    const businessMap = new Map(businesses.map((b: any) => [b._id.toString(), b]));

    const activities: any[] = [];

    // 1. ACTIVIDADES DE NUEVAS OPINIONES (últimas 48 horas)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    console.log('🔍 DEBUG - Buscando opiniones recientes:');
    console.log('- userBusinessIds:', userBusinessIds.map(id => id.toString()));
    console.log('- twoDaysAgo:', twoDaysAgo);
    console.log('- userRole:', userRole);
    console.log('- businessId param:', businessId);
    
    const recentOpinions = await db.collection('opinions')
      .find({
        businessId: { $in: userBusinessIds },
        createdAt: { $gte: twoDaysAgo }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
      
    console.log('📊 Found opinions:', recentOpinions.length);
    recentOpinions.forEach((opinion, index) => {
      console.log(`Opinion ${index + 1}:`, {
        rating: opinion.rating,
        businessId: opinion.businessId.toString(),
        customerName: opinion.customer?.name,
        createdAt: opinion.createdAt
      });
    });

    for (const opinion of recentOpinions) {
      const business = businessMap.get(opinion.businessId.toString());
      const timeAgo = getTimeAgo(opinion.createdAt);
      const marketingValue = opinion.rating === 5 ? 20 : opinion.rating === 4 ? 15 : 10;
      const businessName = business?.name || 'Negocio desconocido';
      
      let message = '';
      let icon = '';
      
      if (opinion.rating >= 4) {
        icon = '💰';
        message = `Nueva opinión ${opinion.rating}⭐ de ${opinion.customer.name} en ${businessName} - Valor estimado: ${marketingValue}€ en marketing gratuito`;
      } else if (opinion.rating === 3) {
        icon = '⚠️';
        message = `Opinión ${opinion.rating}⭐ de ${opinion.customer.name} en ${businessName} - Responde rápido para evitar daños`;
      } else {
        icon = '🚨';
        message = `ALERTA: Opinión ${opinion.rating}⭐ de ${opinion.customer.name} en ${businessName} - Actúa YA para proteger tu reputación`;
      }

      activities.push({
        icon,
        message,
        time: timeAgo,
        type: 'new_opinion',
        priority: opinion.rating <= 2 ? 'high' : 'normal',
        createdAt: opinion.createdAt
      });
    }

    // 2. DETECCIÓN DE INACTIVIDAD
    for (const businessObj of businesses) {
      const lastOpinion = await db.collection('opinions')
        .findOne(
          { businessId: businessObj._id },
          { sort: { createdAt: -1 } }
        );

      if (lastOpinion) {
        const hoursSinceLastOpinion = (Date.now() - lastOpinion.createdAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastOpinion > 72) { // Más de 3 días
          const daysSince = Math.floor(hoursSinceLastOpinion / 24);
          const businessName = (businessObj as any).name || 'Negocio desconocido';
          activities.push({
            icon: '😴',
            message: `Llevas ${daysSince} días sin opiniones en ${businessName} - Momento perfecto para activar promociones`,
            time: `Hace ${daysSince} días`,
            type: 'inactivity',
            priority: 'medium',
            createdAt: new Date(Date.now() - hoursSinceLastOpinion * 60 * 60 * 1000)
          });
        }
      }
    }

    // 3. DETECCIÓN DE PICOS DE ACTIVIDAD
    for (const businessObj of businesses) {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      
      const opinionsToday = await db.collection('opinions').countDocuments({
        businessId: businessObj._id,
        createdAt: { $gte: startOfToday }
      });

      const opinionsYesterday = await db.collection('opinions').countDocuments({
        businessId: businessObj._id,
        createdAt: { $gte: yesterday, $lt: startOfToday }
      });

      // Si hoy hay más del doble que ayer y al menos 3 opiniones
      if (opinionsToday >= 3 && opinionsToday > opinionsYesterday * 2) {
        const businessName = (businessObj as any).name || 'Negocio desconocido';
        activities.push({
          icon: '🚀',
          message: `¡BOOM! ${opinionsToday} opiniones hoy en ${businessName} vs ${opinionsYesterday} ayer - ¡Tu mejor racha!`,
          time: 'Hoy',
          type: 'activity_spike',
          priority: 'high',
          createdAt: new Date()
        });
      }
    }

    // 4. CAMBIOS EN ESTADÍSTICAS (solo si hay datos suficientes)
    for (const businessObj of businesses) {
      const totalOpinions = await db.collection('opinions').countDocuments({
        businessId: businessObj._id
      });

      if (totalOpinions >= 5) {
        // Calcular promedio actual
        const ratingPipeline = [
          { $match: { businessId: businessObj._id } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ];
        
        const ratingResult = await db.collection('opinions').aggregate(ratingPipeline).toArray();
        const currentAvg = ratingResult.length > 0 ? ratingResult[0].avgRating : 0;

        // Calcular promedio de la semana pasada
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const previousRatingPipeline = [
          { $match: { businessId: businessObj._id, createdAt: { $lt: weekAgo } } },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ];
        
        const previousRatingResult = await db.collection('opinions').aggregate(previousRatingPipeline).toArray();
        const previousAvg = previousRatingResult.length > 0 ? previousRatingResult[0].avgRating : 0;

        if (currentAvg > previousAvg && previousAvg > 0) {
          const improvement = (currentAvg - previousAvg).toFixed(1);
          const businessName = (businessObj as any).name || 'Negocio desconocido';
          activities.push({
            icon: '🏆',
            message: `Tu promedio subió ${improvement} puntos a ${currentAvg.toFixed(1)}⭐ en ${businessName}`,
            time: 'Esta semana',
            type: 'stats_improvement',
            priority: 'normal',
            createdAt: new Date()
          });
        }

        // Hitos de opiniones
        const milestones = [10, 25, 50, 100, 200, 500];
        const milestone = milestones.find(m => totalOpinions >= m && totalOpinions < m + 5);
        
        if (milestone) {
          const estimatedValue = milestone * 15; // 15€ valor promedio por opinión
          const businessName = (businessObj as any).name || 'Negocio desconocido';
          activities.push({
            icon: '🎯',
            message: `¡HITO! Alcanzaste ${totalOpinions} opiniones en ${businessName} - Valor generado: ${estimatedValue}€`,
            time: 'Reciente',
            type: 'milestone',
            priority: 'high',
            createdAt: new Date()
          });
        }
      }
    }

    // Ordenar por fecha y prioridad, limitar a 8 actividades
    const sortedActivities = activities
      .sort((a, b) => {
        // Primero por prioridad
        const priorityOrder = { high: 3, medium: 2, normal: 1 };
        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Luego por fecha
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 8);

    return NextResponse.json({ activities: sortedActivities });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Ahora mismo';
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
}
