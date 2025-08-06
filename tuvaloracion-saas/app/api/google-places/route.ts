import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesService } from '@/lib/google-places';
import { GooglePlacesApiResponse, GooglePlacesRequest, GOOGLE_PLACES_FIELDS, AutocompleteApiResponse, PlacePhotoResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraer parámetros de la query string
    const placeId = searchParams.get('placeId');
    const url = searchParams.get('url');
    const fieldsParam = searchParams.get('fields');
    const language = searchParams.get('language') || 'es';
    
    // Determinar qué campos solicitar
    let fields: string[] = [...GOOGLE_PLACES_FIELDS.BASIC];
    
    if (fieldsParam) {
      if (fieldsParam === 'basic') {
        fields = [...GOOGLE_PLACES_FIELDS.BASIC];
      } else if (fieldsParam === 'reviews') {
        fields = [...GOOGLE_PLACES_FIELDS.BASIC, ...GOOGLE_PLACES_FIELDS.REVIEWS];
      } else if (fieldsParam === 'all') {
        fields = [...GOOGLE_PLACES_FIELDS.ALL];
      } else {
        // Campos personalizados separados por coma
        fields = fieldsParam.split(',').map(f => f.trim());
      }
    }
    
    let finalPlaceId = placeId;
    
    // Si se proporciona URL, extraer Place ID
    if (url && !placeId) {
      finalPlaceId = GooglePlacesService.extractPlaceId(url);
    }
    
    if (!finalPlaceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Place ID o URL de Google Reviews requerido' 
        } as GooglePlacesApiResponse,
        { status: 400 }
      );
    }
    
    // Validar Place ID
    if (!GooglePlacesService.validatePlaceId(finalPlaceId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Place ID no válido' 
        } as GooglePlacesApiResponse,
        { status: 400 }
      );
    }
    
    // Obtener datos de Google Places API
    const data = await GooglePlacesService.getPlaceDetails(finalPlaceId, fields, language);
    
    return NextResponse.json({
      success: true,
      data,
      placeId: finalPlaceId
    } as GooglePlacesApiResponse);
    
  } catch (error) {
    console.error('Error en Google Places API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener datos de Google Places' 
      } as GooglePlacesApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GooglePlacesRequest = await request.json();
    const { placeId, url, fields: requestFields, language = 'es' } = body;
    
    // Determinar qué campos solicitar
    let fields: string[] = [...GOOGLE_PLACES_FIELDS.BASIC];
    
    if (requestFields && requestFields.length > 0) {
      fields = requestFields;
    }
    
    let finalPlaceId = placeId;
    
    // Si se proporciona URL, extraer Place ID
    if (url && !placeId) {
      finalPlaceId = GooglePlacesService.extractPlaceId(url);
    }
    
    if (!finalPlaceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Place ID o URL de Google Reviews requerido en el body' 
        } as GooglePlacesApiResponse,
        { status: 400 }
      );
    }
    
    // Validar Place ID
    if (!GooglePlacesService.validatePlaceId(finalPlaceId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Place ID no válido' 
        } as GooglePlacesApiResponse,
        { status: 400 }
      );
    }
    
    // Obtener datos de Google Places API
    const data = await GooglePlacesService.getPlaceDetails(finalPlaceId, fields, language);
    
    return NextResponse.json({
      success: true,
      data,
      placeId: finalPlaceId
    } as GooglePlacesApiResponse);
    
  } catch (error) {
    console.error('Error en Google Places API (POST):', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener datos de Google Places' 
      } as GooglePlacesApiResponse,
      { status: 500 }
    );
  }
}

// Endpoint para obtener solo estadísticas básicas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { placeId, url, language = 'es' } = body;
    
    let finalPlaceId = placeId;
    
    if (url && !placeId) {
      finalPlaceId = GooglePlacesService.extractPlaceId(url);
    }
    
    if (!finalPlaceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Place ID o URL requerido' 
        } as GooglePlacesApiResponse,
        { status: 400 }
      );
    }
    
    // Obtener solo estadísticas básicas
    const stats = await GooglePlacesService.getPlaceStats(finalPlaceId, language);
    
    return NextResponse.json({
      success: true,
      data: {
        name: stats.name,
        rating: stats.rating,
        user_ratings_total: stats.totalReviews,
        reviews_available: stats.reviewsAvailable
      },
      placeId: finalPlaceId
    } as GooglePlacesApiResponse);
    
  } catch (error) {
    console.error('Error en Google Places Stats API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener estadísticas' 
      } as GooglePlacesApiResponse,
      { status: 500 }
    );
  }
}
