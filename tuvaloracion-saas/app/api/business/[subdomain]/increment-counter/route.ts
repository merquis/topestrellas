import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    // Primero, incrementar el contador atómicamente
    const updateResult = await db.collection('businesses').findOneAndUpdate(
      { subdomain: params.subdomain },
      { 
        $inc: { 'config.reviewClickCounter': 1 }
      },
      { 
        returnDocument: 'after',
        upsert: false
      }
    );

    if (!updateResult) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el contador actualizado
    const newCounter = updateResult.config?.reviewClickCounter || 1;
    
    // Determinar qué plataforma usar basado en el contador
    // Contador 1,3,5... (impar) = Google
    // Contador 2,4,6... (par) = TripAdvisor
    const useGoogle = newCounter % 2 === 1;
    const platform = useGoogle ? 'google' : 'tripadvisor';

    // Incrementar el contador específico de la plataforma
    const platformField = useGoogle ? 'config.redirectionStats.googleRedirections' : 'config.redirectionStats.tripadvisorRedirections';
    
    // Crear el objeto de actualización con tipos correctos
    const updateDoc: any = {
      $inc: { [platformField]: 1 },
      $push: {
        'config.redirectionStats.lastRedirections': {
          $each: [{
            platform: platform,
            timestamp: new Date()
          }],
          $slice: -50 // Mantener solo las últimas 50 redirecciones
        }
      }
    };
    
    await db.collection('businesses').updateOne(
      { subdomain: params.subdomain },
      updateDoc
    );

    console.log(`[${params.subdomain}] Counter: ${newCounter}, Platform: ${platform}, Use Google: ${useGoogle}`);

    return NextResponse.json({
      success: true,
      counter: newCounter,
      useGoogle: useGoogle,
      platform: platform
    });

  } catch (error) {
    console.error('Error incrementando contador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
