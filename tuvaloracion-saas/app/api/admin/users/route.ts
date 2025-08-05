import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    // Obtener todos los usuarios de la base de datos
    const users = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    // Obtener información de negocios asociados
    const usersWithBusinesses = await Promise.all(
      users.map(async (user) => {
        let businesses: { id: string; name: string }[] = [];
        
        // Soportar tanto businessId (legacy) como businessIds (nuevo)
        const businessIds = user.businessIds || (user.businessId ? [user.businessId] : []);
        
        if (businessIds.length > 0) {
          const businessDocs = await db.collection('businesses')
            .find({ _id: { $in: businessIds.map((id: string) => new ObjectId(id)) } })
            .toArray();
          
          businesses = businessDocs.map(b => ({
            id: b._id.toString(),
            name: b.name
          }));
        }
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || 'admin',
          businessIds: businessIds,
          businesses: businesses,
          // Mantener compatibilidad con código existente
          businessId: businessIds[0] || null,
          businessName: businesses[0]?.name || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          active: user.active !== false // Por defecto activo si no está definido
        };
      })
    );
    
    return NextResponse.json(usersWithBusinesses);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const data = await request.json();
    
    // Validar datos requeridos
    if (!data.name || !data.email || !data.password || !data.role) {
      return NextResponse.json(
        { error: 'Nombre, email, contraseña y rol son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar que el email no exista
    const existingUser = await db.collection('users').findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 400 }
      );
    }
    
    // Validar rol
    if (!['admin', 'super_admin'].includes(data.role)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }
    
    // Procesar negocios asignados
    let businessIds = [];
    
    // Soportar tanto businessId (legacy) como businessIds (nuevo)
    if (data.businessIds && Array.isArray(data.businessIds)) {
      businessIds = data.businessIds;
    } else if (data.businessId) {
      businessIds = [data.businessId];
    }
    
    // Si es admin, debe tener al menos un negocio (excepto si lo crea un super_admin)
    // Nota: En una implementación completa, aquí verificarías el rol del usuario que hace la petición
    // Por ahora, permitimos crear admins sin negocios para que el super_admin pueda asignarlos después
    if (data.role === 'admin' && businessIds.length === 0) {
      // Permitir crear admin sin negocios - se pueden asignar después
      console.log('Admin creado sin negocios asignados - se pueden asignar posteriormente');
    }
    
    // Verificar que todos los negocios existen
    if (businessIds.length > 0) {
      const existingBusinesses = await db.collection('businesses')
        .find({ _id: { $in: businessIds.map((id: string) => new ObjectId(id)) } })
        .toArray();
      
      if (existingBusinesses.length !== businessIds.length) {
        return NextResponse.json(
          { error: 'Uno o más negocios especificados no existen' },
          { status: 400 }
        );
      }
    }
    
    // Crear nuevo usuario
    const newUser = {
      name: data.name,
      email: data.email,
      password: data.password, // En producción usar bcrypt
      role: data.role,
      businessIds: businessIds,
      // Mantener compatibilidad con código existente
      businessId: businessIds[0] || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    return NextResponse.json({
      success: true,
      userId: result.insertedId,
      message: 'Usuario creado exitosamente'
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
