import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export async function GET(request: NextRequest) {
  try {
    // Autenticación: solo super_admin
    const cookieHeader = request.headers.get('cookie') || '';
    const user = verifyAuth(cookieHeader);
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = await getDatabase();
    const startOfMonth = getStartOfMonth();

    // 1) MRR del mes (dinero cobrado), desde activity_logs del webhook
    //    type: 'invoice_paid' con metadata.amount (en céntimos)
    const mrrAgg = await db.collection('activity_logs').aggregate([
      { $match: { type: 'invoice_paid', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, totalCents: { $sum: '$metadata.amount' } } }
    ]).toArray();

    const mrr = mrrAgg.length > 0 ? (mrrAgg[0].totalCents || 0) / 100 : 0;

    // 2) Negocios totales y activos
    const totalBusinesses = await db.collection('businesses').countDocuments({});
    const activeBusinesses = await db.collection('businesses').countDocuments({ active: true });

    // 3) Nuevos este mes
    const newThisMonth = await db.collection('businesses').countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // 4) "Cancelaciones" = pausas iniciadas este mes
    const cancellationsCount = await db.collection('businesses').countDocuments({
      'subscription.pausedAt': { $gte: startOfMonth }
    });

    return NextResponse.json({
      mrr,
      totalBusinesses,
      activeBusinesses,
      newThisMonth,
      cancellationsCount
    });
  } catch (error) {
    console.error('Error en /api/super/metrics:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
