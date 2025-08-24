import { NextRequest, NextResponse } from 'next/server';
import getMongoClientPromise from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const resolvedParams = await params;
  try {
    const client = await getMongoClientPromise();
    const db = client.db('tuvaloracion');
    
    // Obtener datos del request (email del usuario)
    const body = await request.json();
    const userEmail = body.email;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email del usuario requerido' },
        { status: 400 }
      );
    }

    // Obtener información del negocio
    const business = await db.collection('businesses').findOne({ subdomain: resolvedParams.subdomain });
    
    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Incrementar el contador atómicamente (solo para alternating)
    let newCounter = business.config?.reviewClickCounter || 0;
    const reviewPlatform = business.config?.reviewPlatform || 'google';
    
    // Determinar qué plataforma usar basado en la configuración
    let useGoogle = true;
    let platform = 'google';
    
    if (reviewPlatform === 'google') {
      // Solo Google
      useGoogle = true;
      platform = 'google';
    } else if (reviewPlatform === 'tripadvisor') {
      // Solo TripAdvisor
      useGoogle = false;
      platform = 'tripadvisor';
    } else if (reviewPlatform === 'alternating') {
      // Alternado automático: incrementar contador y decidir plataforma
      const updateResult = await db.collection('businesses').findOneAndUpdate(
        { subdomain: resolvedParams.subdomain },
        { $inc: { 'config.reviewClickCounter': 1 } },
        { returnDocument: 'after' }
      );
      
      newCounter = updateResult?.config?.reviewClickCounter || 1;
      useGoogle = newCounter % 2 === 1;
      platform = useGoogle ? 'google' : 'tripadvisor';
    }

    // Buscar la opinión de 5⭐ más reciente del usuario que no haya sido redirigida
    const opinion = await db.collection('opinions').findOne({
      businessId: business._id,
      email: userEmail,
      rating: 5,
      externalReview: false
    }, {
      sort: { createdAt: -1 }
    });

    if (!opinion) {
      return NextResponse.json(
        { error: 'No se encontró opinión de 5⭐ pendiente de redirección' },
        { status: 404 }
      );
    }

    // Actualizar la opinión con la información de redirección
    await db.collection('opinions').updateOne(
      { _id: opinion._id },
      {
        $set: {
          externalReview: true,
          redirectionPlatform: platform,
          redirectedAt: new Date()
        }
      }
    );

    console.log(`[${resolvedParams.subdomain}] User: ${userEmail}, Platform: ${platform}, Counter: ${newCounter}`);

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
