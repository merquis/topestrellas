import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const data = await request.json();
    const userId = params.id;
    
    // Verificar que el ID sea válido
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario existe
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Preparar datos de actualización
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Actualizar campos permitidos
    if (data.name) updateData.name = data.name;
    if (data.email) {
      // Verificar que el email no esté en uso por otro usuario
      const emailExists = await db.collection('users').findOne({ 
        email: data.email,
        _id: { $ne: new ObjectId(userId) }
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Ya existe otro usuario con este email' },
          { status: 400 }
        );
      }
      updateData.email = data.email;
    }
    
    if (data.role && ['admin', 'super_admin'].includes(data.role)) {
      updateData.role = data.role;
    }
    
    // Procesar negocios asignados
    if (data.businessIds !== undefined || data.businessId !== undefined) {
      let businessIds = [];
      
      // Soportar tanto businessId (legacy) como businessIds (nuevo)
      if (data.businessIds && Array.isArray(data.businessIds)) {
        businessIds = data.businessIds;
      } else if (data.businessId !== undefined) {
        businessIds = data.businessId ? [data.businessId] : [];
      }
      
      // Si es admin, debe tener al menos un negocio
      if (updateData.role === 'admin' && businessIds.length === 0) {
        return NextResponse.json(
          { error: 'Los usuarios admin deben estar asociados a al menos un negocio' },
          { status: 400 }
        );
      }
      
      // Verificar que todos los negocios existen
      if (businessIds.length > 0) {
        const existingBusinesses = await db.collection('businesses')
          .find({ _id: { $in: businessIds.map(id => new ObjectId(id)) } })
          .toArray();
        
        if (existingBusinesses.length !== businessIds.length) {
          return NextResponse.json(
            { error: 'Uno o más negocios especificados no existen' },
            { status: 400 }
          );
        }
      }
      
      updateData.businessIds = businessIds;
      // Mantener compatibilidad con código existente
      updateData.businessId = businessIds[0] || null;
    }
    
    if (data.active !== undefined) {
      updateData.active = data.active;
    }
    
    if (data.password) {
      updateData.password = data.password; // En producción usar bcrypt
    }
    
    // Actualizar usuario
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const userId = params.id;
    
    // Verificar que el ID sea válido
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario existe
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // No permitir eliminar super admins (medida de seguridad)
    if (existingUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'No se pueden eliminar usuarios super admin' },
        { status: 403 }
      );
    }
    
    // Eliminar usuario
    const result = await db.collection('users').deleteOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
