import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Email de usuario requerido' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Marcar que el usuario ya vio la sugerencia de exploración
    await db.collection('users').updateOne(
      { email: userEmail },
      { 
        $set: { 
          explorationSuggestionShown: true,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking exploration suggestion as shown:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
