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
        let business = null;
        if (user.businessId) {
          business = await db.collection('businesses').findOne({ 
            _id: new ObjectId(user.businessId) 
          });
        }
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || 'admin',
          businessId: user.businessId,
          businessName: business?.name || null,
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
    
    // Si es admin, debe tener un businessId
    if (data.role === 'admin' && !data.businessId) {
      return NextResponse.json(
        { error: 'Los usuarios admin deben estar asociados a un negocio' },
        { status: 400 }
      );
    }
    
    // Verificar que el negocio existe si se proporciona businessId
    if (data.businessId) {
      const business = await db.collection('businesses').findOne({ 
        _id: new ObjectId(data.businessId) 
      });
      if (!business) {
        return NextResponse.json(
          { error: 'El negocio especificado no existe' },
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
      businessId: data.businessId || null,
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
