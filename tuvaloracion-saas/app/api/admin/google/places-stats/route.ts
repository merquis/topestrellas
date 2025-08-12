import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessId, placeId } = await request.json();

    if (!businessId || !placeId) {
      return NextResponse.json(
        { error: 'businessId y placeId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener datos actuales de Google Places
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${GOOGLE_PLACES_API_KEY}`;
    
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
