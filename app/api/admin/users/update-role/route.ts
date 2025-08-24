import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    const data = await request.json();
    
    const { userId, email, businessId, newRole, paymentCompleted } = data;
    
    // Buscar el usuario por ID o email
    let query: any = {};
    if (userId) {
      query._id = new ObjectId(userId);
    } else if (email) {
      query.email = email;
    } else {
      return NextResponse.json(
        { error: 'Se requiere userId o email' },
        { status: 400 }
      );
    }
    
    // Actualizar el rol del usuario
    const updateData: any = {
      role: newRole || 'admin',
      registrationStatus: 'completed',
      paymentCompleted: paymentCompleted || true,
      updatedAt: new Date()
    };
    
    // Si se proporciona businessId, también actualizarlo
    if (businessId) {
      updateData.businessId = businessId;
    }
    
    const result = await db.collection('users').updateOne(
      query,
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Si se proporciona businessId, también actualizar el negocio
    if (businessId) {
      await db.collection('businesses').updateOne(
        { _id: new ObjectId(businessId) },
        { 
          $set: { 
            'subscription.paymentCompleted': true,
            'subscription.status': 'active',
            active: true,
            updatedAt: new Date()
          } 
        }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Rol de usuario actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('Error actualizando rol de usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar rol de usuario' },
      { status: 500 }
    );
  }
}

// GET - Obtener información del usuario
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');
    
    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Se requiere email o userId' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    let query: any = {};
    if (userId) {
      query._id = new ObjectId(userId);
    } else if (email) {
      query.email = email;
    }
    
    const user = await db.collection('users').findOne(query);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener información del negocio si existe
    let business = null;
    if (user.businessId) {
      business = await db.collection('businesses').findOne({
        _id: new ObjectId(user.businessId)
      });
    }
    
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        businessId: user.businessId,
        registrationStatus: user.registrationStatus,
        paymentCompleted: user.paymentCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      business: business ? {
        id: business._id.toString(),
        name: business.name,
        subdomain: business.subdomain,
        active: business.active,
        subscription: business.subscription
      } : null
    });
    
  } catch (error) {
    console.error('Error obteniendo información del usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener información del usuario' },
      { status: 500 }
    );
  }
}
