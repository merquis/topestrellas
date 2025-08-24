import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Email de usuario requerido' }, { status: 400 });
    }

    const db = await getDatabase();

    // Actualizar el usuario para marcar que ya se le mostraron las instrucciones de impresión
    const result = await db.collection('users').updateOne(
      { email: userEmail },
      { 
        $set: { 
          qrPrintInstructionsShown: true,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking QR instructions as shown:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
