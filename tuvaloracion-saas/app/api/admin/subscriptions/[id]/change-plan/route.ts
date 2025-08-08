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
    const { newPlan, userRole, userEmail } = await request.json();
    
    // Solo super_admin puede cambiar planes
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para cambiar planes' },
        { status: 403 }
      );
    }

    if (!newPlan || !['trial', 'basic', 'premium', 'lifetime'].includes(newPlan)) {
      return NextResponse.json(
        { error: 'Plan inválido' },
        { status: 400 }
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

    const currentPlan = business.subscription?.plan || business.plan || 'trial';
    
    // Si es el mismo plan, no hacer nada
    if (currentPlan === newPlan) {
      await client.close();
      return NextResponse.json(
        { message: 'El negocio ya tiene este plan' },
        { status: 200 }
      );
    }

    // Calcular nuevas fechas según el plan
    const now = new Date();
    let endDate = new Date();
    
    if (newPlan === 'trial') {
      // Trial de 7 días desde ahora
      endDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    } else if (newPlan === 'lifetime') {
      // Lifetime: fecha muy lejana (100 años)
      endDate = new Date(now.getTime() + (100 * 365 * 24 * 60 * 60 * 1000));
    } else {
      // Planes de pago: 30 días desde ahora
      endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    // Actualizar el negocio con el nuevo plan
    const updateResult = await db.collection('businesses').updateOne(
      { _id: businessId },
      {
        $set: {
          plan: newPlan,
          'subscription.plan': newPlan,
          'subscription.status': 'active',
          'subscription.startDate': now,
          'subscription.endDate': endDate,
          'subscription.lastModified': now,
          'subscription.modifiedBy': userEmail,
          active: true,
          updatedAt: now
        },
        $push: {
          'subscription.history': {
            action: 'plan_changed',
            fromPlan: currentPlan,
            toPlan: newPlan,
            date: now,
            performedBy: userEmail,
            reason: 'Cambio manual por Super Admin'
          } as any
        } as any
      }
    );

    // Registrar en el log de actividad
    await db.collection('activity_logs').insertOne({
      type: 'subscription_plan_changed',
      businessId: businessId,
      businessName: business.name,
      fromPlan: currentPlan,
      toPlan: newPlan,
      performedBy: userEmail,
      timestamp: now
    });

    await client.close();

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plan cambiado exitosamente de ${currentPlan} a ${newPlan}`,
      newPlan,
      endDate
    });

  } catch (error) {
    console.error('Error changing subscription plan:', error);
    return NextResponse.json(
      { error: 'Error al cambiar el plan de suscripción' },
      { status: 500 }
    );
  }
}
