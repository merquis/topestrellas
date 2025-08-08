import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const { days = 30, userRole, userEmail } = await request.json();
    
    // Solo super_admin puede renovar suscripciones manualmente
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para renovar suscripciones' },
        { status: 403 }
      );
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const businessId = new ObjectId(resolvedParams.id);
    
    // Obtener el negocio actual
    const business = await db.collection('businesses').findOne({ _id: businessId });
    
    if (!business) {
      await client.close();
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentEndDate = business.subscription?.endDate ? new Date(business.subscription.endDate) : now;
    
    // Si la suscripción ya expiró, renovar desde hoy
    // Si aún está activa, extender desde la fecha de fin actual
    const startDate = currentEndDate > now ? currentEndDate : now;
    const newEndDate = new Date(startDate.getTime() + (days * 24 * 60 * 60 * 1000));

    // Actualizar el negocio
    const updateResult = await db.collection('businesses').updateOne(
      { _id: businessId },
      {
        $set: {
          'subscription.status': 'active',
          'subscription.endDate': newEndDate,
          'subscription.renewedAt': now,
          'subscription.renewedBy': userEmail,
          'subscription.autoRenew': true,
          active: true,
          updatedAt: now
        },
        $push: {
          'subscription.history': {
            action: 'subscription_renewed',
            days: days,
            newEndDate: newEndDate,
            date: now,
            performedBy: userEmail,
            reason: 'Renovación manual por Super Admin'
          } as any
        } as any
      }
    );

    // Registrar en el log de actividad
    await db.collection('activity_logs').insertOne({
      type: 'subscription_renewed',
      businessId: businessId,
      businessName: business.name,
      daysExtended: days,
      newEndDate: newEndDate,
      performedBy: userEmail,
      timestamp: now
    });

    await client.close();

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No se pudo renovar la suscripción' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Suscripción renovada exitosamente por ${days} días`,
      newEndDate
    });

  } catch (error) {
    console.error('Error renewing subscription:', error);
    return NextResponse.json(
      { error: 'Error al renovar la suscripción' },
      { status: 500 }
    );
  }
}
