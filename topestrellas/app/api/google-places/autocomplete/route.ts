import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesService } from '@/lib/google-places';
import { AutocompleteApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query');
    const language = searchParams.get('language') || 'es';
    const types = searchParams.get('types') || 'establishment';
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query parameter requerido' 
        } as AutocompleteApiResponse,
        { status: 400 }
      );
    }

    if (!GooglePlacesService.validateSearchQuery(query)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query debe tener entre 2 y 100 caracteres' 
        } as AutocompleteApiResponse,
        { status: 400 }
      );
    }
    
    // Buscar lugares usando Autocomplete API
    const predictions = await GooglePlacesService.searchPlaces(query, language, types);
    
    return NextResponse.json({
      success: true,
      predictions
    } as AutocompleteApiResponse);
    
  } catch (error) {
    console.error('Error en Google Places Autocomplete API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al buscar lugares' 
      } as AutocompleteApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, language = 'es', types = 'establishment' } = body;
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query requerido en el body' 
        } as AutocompleteApiResponse,
        { status: 400 }
      );
    }

    if (!GooglePlacesService.validateSearchQuery(query)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query debe tener entre 2 y 100 caracteres' 
        } as AutocompleteApiResponse,
        { status: 400 }
      );
    }
    
    // Buscar lugares usando Autocomplete API
    const predictions = await GooglePlacesService.searchPlaces(query, language, types);
    
    return NextResponse.json({
      success: true,
      predictions
    } as AutocompleteApiResponse);
    
  } catch (error) {
    console.error('Error en Google Places Autocomplete API (POST):', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al buscar lugares' 
      } as AutocompleteApiResponse,
      { status: 500 }
    );
  }
}
