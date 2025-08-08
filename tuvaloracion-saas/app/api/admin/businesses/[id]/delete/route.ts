import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const { userRole, userEmail, hardDelete = false } = await request.json();
    
    // Solo super_admin puede eliminar negocios
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar negocios' },
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

    if (hardDelete) {
      // Eliminación permanente (solo si ya está marcado como eliminado y han pasado 30 días)
      if (!business.deletedAt) {
        await client.close();
        return NextResponse.json(
          { error: 'El negocio debe estar marcado para eliminación primero' },
          { status: 400 }
        );
      }

      const deletedDate = new Date(business.deletedAt);
      const daysSinceDeleted = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceDeleted < 30) {
        await client.close();
        return NextResponse.json(
          { error: `Faltan ${30 - daysSinceDeleted} días para poder eliminar permanentemente` },
          { status: 400 }
        );
      }

      // Hacer backup antes de eliminar permanentemente
      await db.collection('businesses_backup').insertOne({
        ...business,
        permanentlyDeletedAt: now,
        deletedBy: userEmail
      });

      // Eliminar permanentemente
      await db.collection('businesses').deleteOne({ _id: businessId });

      // Registrar en el log
      await db.collection('activity_logs').insertOne({
        type: 'business_permanently_deleted',
        businessId: businessId,
        businessName: business.name,
        performedBy: userEmail,
        timestamp: now
      });

      await client.close();

      return NextResponse.json({
        success: true,
        message: 'Negocio eliminado permanentemente'
      });

    } else {
      // Soft delete - marcar como eliminado
      const deletionDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 días desde ahora
      
      const updateResult = await db.collection('businesses').updateOne(
        { _id: businessId },
        {
          $set: {
            deletedAt: now,
            deletedBy: userEmail,
            deletionScheduledFor: deletionDate,
            active: false,
            updatedAt: now
          },
          $push: {
            'subscription.history': {
              action: 'business_deleted',
              date: now,
              performedBy: userEmail,
              reason: hardDelete ? 'Eliminación permanente' : 'Soft delete - recuperable por 30 días'
            } as any
          } as any
        }
      );

      // Registrar en el log de actividad
      await db.collection('activity_logs').insertOne({
        type: 'business_soft_deleted',
        businessId: businessId,
        businessName: business.name,
        performedBy: userEmail,
        timestamp: now,
        canBeRestoredUntil: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
      });

      await client.close();

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json(
          { error: 'No se pudo eliminar el negocio' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Negocio marcado para eliminación. Se puede restaurar en los próximos 30 días.'
      });
    }

  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el negocio' },
      { status: 500 }
    );
  }
}

// Restaurar negocio eliminado
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const { userRole, userEmail } = await request.json();
    
    // Solo super_admin puede restaurar negocios
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para restaurar negocios' },
        { status: 403 }
      );
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const businessId = new ObjectId(resolvedParams.id);
    
    // Obtener el negocio
    const business = await db.collection('businesses').findOne({ _id: businessId });
    
    if (!business) {
      await client.close();
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    if (!business.deletedAt) {
      await client.close();
      return NextResponse.json(
        { error: 'El negocio no está marcado como eliminado' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Restaurar el negocio
    const updateResult = await db.collection('businesses').updateOne(
      { _id: businessId },
      {
        $set: {
          active: true,
          'subscription.status': 'active',
          updatedAt: now
        },
        $unset: {
          deletedAt: '',
          deletedBy: ''
        },
        $push: {
          'subscription.history': {
            action: 'business_restored',
            date: now,
            performedBy: userEmail,
            reason: 'Negocio restaurado por Super Admin'
          } as any
        } as any
      }
    );

    // Registrar en el log
    await db.collection('activity_logs').insertOne({
      type: 'business_restored',
      businessId: businessId,
      businessName: business.name,
      performedBy: userEmail,
      timestamp: now
    });

    await client.close();

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No se pudo restaurar el negocio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Negocio restaurado exitosamente'
    });

  } catch (error) {
    console.error('Error restoring business:', error);
    return NextResponse.json(
      { error: 'Error al restaurar el negocio' },
      { status: 500 }
    );
  }
}
