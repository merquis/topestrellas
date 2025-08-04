import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { db } = await connectToDatabase();
    
    // Incrementar el contador atómicamente y devolver el nuevo valor
    const result = await db.collection('businesses').findOneAndUpdate(
      { subdomain: params.subdomain },
      { 
        $inc: { 'config.reviewClickCounter': 1 },
        $setOnInsert: { 'config.reviewClickCounter': 0 }
      },
      { 
        returnDocument: 'after',
        upsert: false
      }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const newCounter = result.config?.reviewClickCounter || 0;

    return NextResponse.json({
      success: true,
      counter: newCounter,
      useGoogle: newCounter % 2 === 0
    });

  } catch (error) {
    console.error('Error incrementando contador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
