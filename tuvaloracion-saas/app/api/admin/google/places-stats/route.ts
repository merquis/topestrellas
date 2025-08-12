import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación - aceptar Bearer (token base64) o cookie 'auth-token'
    let user = null;

    // Intentar con Bearer token (mismo formato base64 que la cookie 'auth-token')
    const authorizationHeader = request.headers.get('authorization');
    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
      const token = authorizationHeader.substring(7).trim();
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.email) {
          user = parsed;
        }
      } catch {
        // Ignorar y probar con cookies
      }
    }
    
    // Si no hay Bearer válido, intentar con cookies
    if (!user) {
      const cookieHeader = request.headers.get('cookie');
      user = verifyAuth(cookieHeader || '');
    }
    
    if (!user) {
      console.error('Authentication failed - no valid token or cookie found');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessId, placeId } = await request.json();

    if (
      !businessId || typeof businessId !== 'string' || businessId.trim().length === 0 ||
      !placeId || typeof placeId !== 'string' || placeId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'businessId y placeId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener datos actuales de Google Places incluyendo fotos
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,photos&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(placeDetailsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: 'Error al obtener datos de Google Places' },
        { status: 500 }
      );
    }

    const rating = data.result.rating || 0;
    const totalReviews = data.result.user_ratings_total || 0;
    
    // Obtener la URL de la primera foto si existe
    let photoUrl = null;
    if (data.result.photos && data.result.photos.length > 0) {
      const photoReference = data.result.photos[0].photo_reference;
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
    }

    // Actualizar en la base de datos
    // IMPORTANTE: Solo actualizamos googlePlaces y updatedAt
    // NO tocamos stats para preservar los valores iniciales
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    await db.collection('businesses').updateOne(
      { _id: new ObjectId(businessId) },
      {
        $set: {
          'googlePlaces.rating': rating,
          'googlePlaces.totalReviews': totalReviews,
          'googlePlaces.photoUrl': photoUrl,  // Actualizar también la URL de la foto
          'updatedAt': new Date()
          // NO actualizamos stats.googleRating ni stats.googleReviews
          // para preservar los valores iniciales
        }
      }
    );

    await client.close();

    return NextResponse.json({
      success: true,
      rating,
      totalReviews,
      photoUrl,
      message: 'Estadísticas actualizadas correctamente'
    });
  } catch (error) {
    console.error('Error fetching Google Places stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas de Google Places' },
      { status: 500 }
    );
  }
}
