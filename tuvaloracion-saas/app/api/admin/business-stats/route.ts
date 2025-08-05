import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Precios de la competencia para calcular ahorros
const COMPETENCIA_PRICES = {
  1: 7.19,
  5: 29.99,
  10: 55.99,
  20: 89.99,
  50: 199.99,
  100: 349.99
};

// Función para calcular precio de competencia según volumen
function getCompetenciaPrice(numReviews: number): number {
  if (numReviews <= 1) return COMPETENCIA_PRICES[1];
  if (numReviews <= 5) return COMPETENCIA_PRICES[5] / 5;
  if (numReviews <= 10) return COMPETENCIA_PRICES[10] / 10;
  if (numReviews <= 20) return COMPETENCIA_PRICES[20] / 20;
  if (numReviews <= 50) return COMPETENCIA_PRICES[50] / 50;
  if (numReviews <= 100) return COMPETENCIA_PRICES[100] / 100;
  return 3.50; // Precio promedio para volúmenes altos
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');
    const businessId = searchParams.get('businessId');
    const period = searchParams.get('period') || '1month'; // 1day, 1week, 1month, 3months, 6months, 1year

    if (!userEmail || !userRole || !businessId) {
      return NextResponse.json({ error: 'Parámetros requeridos: userEmail, userRole, businessId' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verificar permisos del usuario
    if (userRole === 'admin') {
      const user = await db.collection('users').findOne({ email: userEmail });
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }

      // Verificar que el admin tenga acceso a este negocio
      const hasAccess = (user.businessIds && user.businessIds.includes(businessId)) || 
                       (user.businessId === businessId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'No tienes acceso a este negocio' }, { status: 403 });
      }
    } else if (userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 });
    }

    // Obtener información del negocio y sus premios
    const business = await db.collection('businesses').findOne({ _id: new ObjectId(businessId) });
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // Calcular fechas según el período
    const now = new Date();
    const periodStart = new Date();
    const previousPeriodStart = new Date();
    const previousPeriodEnd = new Date();

    switch (period) {
      case '1day':
        periodStart.setDate(now.getDate() - 1);
        previousPeriodStart.setDate(now.getDate() - 2);
        previousPeriodEnd.setDate(now.getDate() - 1);
        break;
      case '1week':
        periodStart.setDate(now.getDate() - 7);
        previousPeriodStart.setDate(now.getDate() - 14);
        previousPeriodEnd.setDate(now.getDate() - 7);
        break;
      case '1month':
        periodStart.setMonth(now.getMonth() - 1);
        previousPeriodStart.setMonth(now.getMonth() - 2);
        previousPeriodEnd.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        periodStart.setMonth(now.getMonth() - 3);
        previousPeriodStart.setMonth(now.getMonth() - 6);
        previousPeriodEnd.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        periodStart.setMonth(now.getMonth() - 6);
        previousPeriodStart.setMonth(now.getMonth() - 12);
        previousPeriodEnd.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        periodStart.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(now.getFullYear() - 2);
        previousPeriodEnd.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Query base para opiniones del negocio
    const baseQuery = { businessId: new ObjectId(businessId) };

    // 1. ESTADÍSTICAS GENERALES DEL PERÍODO
    const currentPeriodQuery = { ...baseQuery, createdAt: { $gte: periodStart, $lte: now } };
    const previousPeriodQuery = { ...baseQuery, createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd } };

    // Obtener todas las opiniones del período actual
    const currentOpinions = await db.collection('opinions').find(currentPeriodQuery).toArray();
    const previousOpinions = await db.collection('opinions').find(previousPeriodQuery).toArray();

    // 2. ANÁLISIS POR RATING
    const ratingDistribution = {
      1: currentOpinions.filter((o: any) => o.rating === 1).length,
      2: currentOpinions.filter((o: any) => o.rating === 2).length,
      3: currentOpinions.filter((o: any) => o.rating === 3).length,
      4: currentOpinions.filter((o: any) => o.rating === 4).length,
      5: currentOpinions.filter((o: any) => o.rating === 5).length,
    };

    const totalReviews = currentOpinions.length;
    const fiveStarReviews = ratingDistribution[5];
    const fourStarReviews = ratingDistribution[4];
    const qualityReviews = fiveStarReviews + fourStarReviews; // 4 y 5 estrellas

    // Porcentajes
    const ratingPercentages = {
      1: totalReviews > 0 ? Math.round((ratingDistribution[1] / totalReviews) * 100) : 0,
      2: totalReviews > 0 ? Math.round((ratingDistribution[2] / totalReviews) * 100) : 0,
      3: totalReviews > 0 ? Math.round((ratingDistribution[3] / totalReviews) * 100) : 0,
      4: totalReviews > 0 ? Math.round((ratingDistribution[4] / totalReviews) * 100) : 0,
      5: totalReviews > 0 ? Math.round((ratingDistribution[5] / totalReviews) * 100) : 0,
    };

    // 3. CÁLCULO DE COSTES
    // Obtener configuración de premios del negocio
    const prizes = business.config?.prizes || [];
    
    // Calcular coste total y coste por reseña de 5 estrellas
    let totalCost = 0;
    let fiveStarCost = 0;

    currentOpinions.forEach(opinion => {
      if (opinion.prize && opinion.prize.index !== undefined) {
        const prizeIndex = opinion.prize.index;
        const prize = prizes[prizeIndex];
        if (prize && prize.realCost) {
          totalCost += prize.realCost;
          if (opinion.rating === 5) {
            fiveStarCost += prize.realCost;
          }
        }
      }
    });

    // Coste por reseña de 5 estrellas
    const costPerFiveStar = fiveStarReviews > 0 ? totalCost / fiveStarReviews : 0;
    const costPerReview = totalReviews > 0 ? totalCost / totalReviews : 0;

    // 4. COMPARACIÓN CON COMPETENCIA
    const competenciaPrice = getCompetenciaPrice(totalReviews);
    const savingsPerReview = competenciaPrice - costPerFiveStar;
    const totalSavings = savingsPerReview * fiveStarReviews;
    const savingsPercentage = competenciaPrice > 0 ? Math.round((savingsPerReview / competenciaPrice) * 100) : 0;

    // 5. COMPARACIONES CON PERÍODO ANTERIOR
    const previousTotalReviews = previousOpinions.length;
    const previousFiveStarReviews = previousOpinions.filter(o => o.rating === 5).length;
    
    const reviewsGrowth = previousTotalReviews > 0 
      ? Math.round(((totalReviews - previousTotalReviews) / previousTotalReviews) * 100)
      : totalReviews > 0 ? 100 : 0;

    const fiveStarGrowth = previousFiveStarReviews > 0 
      ? Math.round(((fiveStarReviews - previousFiveStarReviews) / previousFiveStarReviews) * 100)
      : fiveStarReviews > 0 ? 100 : 0;

    // 6. MÉTRICAS DE RENDIMIENTO
    const avgRating = totalReviews > 0 
      ? Math.round((currentOpinions.reduce((sum, o) => sum + o.rating, 0) / totalReviews) * 10) / 10
      : 0;

    const qualityPercentage = totalReviews > 0 ? Math.round((qualityReviews / totalReviews) * 100) : 0;

    // 7. ESTADÍSTICAS TEMPORALES (últimos 30 días para tendencias)
    const last30Days = new Date();
    last30Days.setDate(now.getDate() - 30);
    
    const recentOpinions = await db.collection('opinions')
      .find({ ...baseQuery, createdAt: { $gte: last30Days } })
      .sort({ createdAt: 1 })
      .toArray();

    // Agrupar por días para tendencias
    const dailyStats: { [key: string]: { total: number; fiveStar: number } } = {};
    recentOpinions.forEach(opinion => {
      const day = opinion.createdAt.toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { total: 0, fiveStar: 0 };
      }
      dailyStats[day].total++;
      if (opinion.rating === 5) {
        dailyStats[day].fiveStar++;
      }
    });

    const dailyAverage = Object.keys(dailyStats).length > 0 
      ? Math.round(Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.total, 0) / Object.keys(dailyStats).length * 10) / 10
      : 0;

    return NextResponse.json({
      // Información del período
      period,
      periodLabel: getPeriodLabel(period),
      businessName: business.name,
      
      // Estadísticas principales
      totalReviews,
      fiveStarReviews,
      fourStarReviews,
      qualityReviews,
      avgRating,
      
      // Distribución de ratings
      ratingDistribution,
      ratingPercentages,
      qualityPercentage,
      
      // Costes y ahorros
      totalCost: Math.round(totalCost * 100) / 100,
      costPerReview: Math.round(costPerReview * 100) / 100,
      costPerFiveStar: Math.round(costPerFiveStar * 100) / 100,
      competenciaPrice: Math.round(competenciaPrice * 100) / 100,
      savingsPerReview: Math.round(savingsPerReview * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      savingsPercentage,
      
      // Comparaciones temporales
      reviewsGrowth,
      fiveStarGrowth,
      previousTotalReviews,
      previousFiveStarReviews,
      
      // Métricas de rendimiento
      dailyAverage,
      conversionRate: totalReviews > 0 ? Math.round((fiveStarReviews / totalReviews) * 100) : 0,
      
      // Datos para gráficos
      dailyTrends: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
        date,
        total: stats.total,
        fiveStar: stats.fiveStar
      })).slice(-30) // Últimos 30 días
    });

  } catch (error) {
    console.error('Error fetching business stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case '1day': return 'Último día';
    case '1week': return 'Última semana';
    case '1month': return 'Último mes';
    case '3months': return 'Últimos 3 meses';
    case '6months': return 'Últimos 6 meses';
    case '1year': return 'Último año';
    default: return 'Período seleccionado';
  }
}
