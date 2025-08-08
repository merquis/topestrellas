import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { endDate, userRole, userEmail } = await request.json();
    
    // Solo super_admin puede establecer fechas personalizadas
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para establecer fechas personalizadas' },
        { status: 403 }
      );
    }

    if (!endDate) {
      return NextResponse.json(
        { error: 'Fecha de finalización requerida' },
        { status: 400 }
      );
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const businessId = new ObjectId(params.id);
    
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
    const customEndDate = new Date(endDate);
    
    // Validar que la fecha sea futura
    if (customEndDate <= now) {
      await client.close();
      return NextResponse.json(
        { error: 'La fecha debe ser futura' },
        { status: 400 }
      );
    }

    // Actualizar el negocio con la fecha personalizada
    const updateResult = await db.collection('businesses').updateOne(
      { _id: businessId },
      {
        $set: {
          'subscription.endDate': customEndDate,
          'subscription.customDate': true,
          'subscription.lastModified': now,
          'subscription.modifiedBy': userEmail,
          active: true,
          updatedAt: now
        },
        $push: {
          'subscription.history': {
            action: 'custom_date_set',
            endDate: customEndDate,
            date: now,
            performedBy: userEmail,
            reason: 'Fecha personalizada establecida por Super Admin'
          } as any
        } as any
      }
    );

    // Registrar en el log de actividad
    await db.collection('activity_logs').insertOne({
      type: 'subscription_custom_date',
      businessId: businessId,
      businessName: business.name,
      customEndDate: customEndDate,
      performedBy: userEmail,
      timestamp: now
    });

    await client.close();

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la fecha' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Fecha de suscripción actualizada hasta ${customEndDate.toLocaleDateString('es-ES')}`,
      endDate: customEndDate
    });

  } catch (error) {
    console.error('Error setting custom subscription date:', error);
    return NextResponse.json(
      { error: 'Error al establecer fecha personalizada' },
      { status: 500 }
    );
  }
}
