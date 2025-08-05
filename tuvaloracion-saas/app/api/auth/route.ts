import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    // Super Admin hardcodeado
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (email === 'admin@tuvaloracion.com' && password === adminPassword) {
      return NextResponse.json({
        user: {
          id: '1',
          email: 'admin@tuvaloracion.com',
          name: 'Super Administrador',
          role: 'super_admin'
        }
      });
    }
    
    // Buscar usuario en la base de datos
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      );
    }
    
    // Verificar contraseña (en producción usar bcrypt)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }
    
    // Buscar el negocio asociado al usuario
    const business = await db.collection('businesses').findOne({ 
      'contact.email': email 
    });
    
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role || 'admin',
        businessId: business?._id?.toString()
      }
    });
    
  } catch (error) {
    console.error('Error authenticating user:', error);
    return NextResponse.json(
      { error: 'Error de autenticación' },
      { status: 500 }
    );
  }
}
