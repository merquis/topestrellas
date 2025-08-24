// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Obtener todos los negocios
    const businesses = await db.collection('businesses').find({}).toArray();
    
    // Calcular estadísticas
    const totalBusinesses = businesses.length;
    
    // Contar por planes
    let trialCount = 0;
    let basicCount = 0;
    let premiumCount = 0;
    
    businesses.forEach((business: any) => {
      const plan = business.subscription?.plan || 'trial';
      switch (plan) {
        case 'trial':
          trialCount++;
          break;
        case 'basic':
          basicCount++;
          break;
        case 'premium':
          premiumCount++;
          break;
        default:
          trialCount++; // Por defecto consideramos trial
      }
    });
    
    const stats = {
      totalBusinesses,
      trialCount,
      basicCount,
      premiumCount
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener las estadísticas' },
      { status: 500 }
    );
  }
}
