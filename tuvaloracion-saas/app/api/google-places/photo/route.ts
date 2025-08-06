import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesService } from '@/lib/google-places';
import { PlacePhotoResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const photoReference = searchParams.get('photo_reference');
    const maxwidth = parseInt(searchParams.get('maxwidth') || '400');
    const maxheight = searchParams.get('maxheight') ? parseInt(searchParams.get('maxheight')!) : undefined;
    
    if (!photoReference) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'photo_reference parameter requerido' 
        } as PlacePhotoResponse,
        { status: 400 }
      );
    }

    if (maxwidth < 1 || maxwidth > 1600) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'maxwidth debe estar entre 1 y 1600' 
        } as PlacePhotoResponse,
        { status: 400 }
      );
    }
    
    // Obtener URL de la foto
    const photoUrl = await GooglePlacesService.getPlacePhotoUrl(photoReference, maxwidth, maxheight);
    
    return NextResponse.json({
      success: true,
      photo_url: photoUrl
    } as PlacePhotoResponse);
    
  } catch (error) {
    console.error('Error en Google Places Photo API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener foto' 
      } as PlacePhotoResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photo_reference, maxwidth = 400, maxheight } = body;
    
    if (!photo_reference) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'photo_reference requerido en el body' 
        } as PlacePhotoResponse,
        { status: 400 }
      );
    }

    if (maxwidth < 1 || maxwidth > 1600) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'maxwidth debe estar entre 1 y 1600' 
        } as PlacePhotoResponse,
        { status: 400 }
      );
    }
    
    // Obtener URL de la foto
    const photoUrl = await GooglePlacesService.getPlacePhotoUrl(photo_reference, maxwidth, maxheight);
    
    return NextResponse.json({
      success: true,
      photo_url: photoUrl
    } as PlacePhotoResponse);
    
  } catch (error) {
    console.error('Error en Google Places Photo API (POST):', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener foto' 
      } as PlacePhotoResponse,
      { status: 500 }
    );
  }
}
