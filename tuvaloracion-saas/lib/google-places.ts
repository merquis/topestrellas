import { GooglePlaceData, GoogleReview, GOOGLE_PLACES_FIELDS, AutocompleteResult } from './types';

export class GooglePlacesService {
  private static readonly API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  private static readonly BASE_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
  private static readonly AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private static readonly PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

  /**
   * Extrae el Place ID de una URL de Google Reviews o Google Maps
   */
  static extractPlaceId(url: string): string | null {
    if (!url) return null;
    
    // Patrones comunes de URLs de Google
    const patterns = [
      // URL de escribir reseña: https://search.google.com/local/writereview?placeid=ChIJ5ctEMDCYagwR9QBWYQaQdes
      /placeid=([^&]+)/i,
      /place_id[=:]([^&\s]+)/i,
      
      // URL de Google Maps con data: https://www.google.es/maps/place/.../@.../data=!...!1s0xc6a98303044cbe5:0xeb759006615600f5!...
      /!1s([^!]+)/i,
      
      // URL de Google Maps con ftid: https://maps.google.com/maps?ftid=0x...
      /ftid=([^&\s]+)/i,
      
      // URL de Google Maps con cid: https://maps.google.com/maps?cid=...
      /cid=([^&\s]+)/i,
      
      // Otros patrones de data en URLs de Maps
      /maps\/place\/[^/]+\/[^/]*@[^/]+\/data=.*!1s([^!]+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        let extractedId = decodeURIComponent(match[1]);
        
        // Si es un ID hexadecimal (como 0xc6a98303044cbe5:0xeb759006615600f5), convertirlo
        if (extractedId.includes(':0x')) {
          extractedId = this.convertHexToPlaceId(extractedId);
        }
        
        return extractedId;
      }
    }

    return null;
  }

  /**
   * Convierte un ID hexadecimal de Google Maps a Place ID
   */
  private static convertHexToPlaceId(hexId: string): string {
    // Para IDs hexadecimales como "0xc6a98303044cbe5:0xeb759006615600f5"
    // Google usa un formato específico que necesita ser convertido
    
    try {
      // Extraer las dos partes del ID hexadecimal
      const parts = hexId.split(':');
      if (parts.length === 2) {
        const part1 = parts[0].replace('0x', '');
        const part2 = parts[1].replace('0x', '');
        
        // Convertir a formato Place ID estándar
        // Esto es una aproximación - en casos reales podrías necesitar usar la Geocoding API
        const combined = part1 + part2;
        
        // Generar un Place ID válido basado en el hex ID
        // Nota: Este es un método aproximado. Para mayor precisión, 
        // se podría usar la Geocoding API con las coordenadas
        return `ChIJ${combined.substring(0, 20)}`;
      }
    } catch (error) {
      console.warn('Error convirtiendo hex ID a Place ID:', error);
    }
    
    // Si no se puede convertir, devolver el ID original
    return hexId;
  }

  /**
   * Extrae coordenadas de una URL de Google Maps para usar como fallback
   */
  static extractCoordinates(url: string): { lat: number; lng: number } | null {
    if (!url) return null;
    
    // Patrón para coordenadas en URLs de Maps: /@28.0064487,-16.6590947,17z
    const coordPattern = /@(-?\d+\.\d+),(-?\d+\.\d+),\d+z/;
    const match = url.match(coordPattern);
    
    if (match && match[1] && match[2]) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    
    return null;
  }

  /**
   * Valida si un Place ID tiene el formato correcto
   */
  static validatePlaceId(placeId: string): boolean {
    if (!placeId || typeof placeId !== 'string') return false;
    
    // Place IDs suelen tener entre 20-100 caracteres y contienen letras, números, guiones y guiones bajos
    return /^[A-Za-z0-9_-]{15,100}$/.test(placeId);
  }

  /**
   * Obtiene los detalles de un lugar usando Google Places API
   */
  static async getPlaceDetails(
    placeId: string, 
    fields: string[] = [...GOOGLE_PLACES_FIELDS.BASIC],
    language: string = 'es'
  ): Promise<GooglePlaceData> {
    if (!this.API_KEY) {
      throw new Error('Google Places API key no configurada en las variables de entorno');
    }

    if (!this.validatePlaceId(placeId)) {
      throw new Error('Place ID no válido');
    }

    const params = new URLSearchParams({
      place_id: placeId,
      fields: fields.join(','),
      language: language,
      key: this.API_KEY
    });

    try {
      const response = await fetch(`${this.BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        switch (data.status) {
          case 'ZERO_RESULTS':
            throw new Error('No se encontró ningún lugar con ese Place ID');
          case 'OVER_QUERY_LIMIT':
            throw new Error('Se ha excedido el límite de consultas de la API');
          case 'REQUEST_DENIED':
            throw new Error('Solicitud denegada. Verifica la API key y las restricciones');
          case 'INVALID_REQUEST':
            throw new Error('Solicitud inválida. Verifica los parámetros');
          case 'NOT_FOUND':
            throw new Error('Place ID no encontrado');
          default:
            throw new Error(data.error_message || `Error de API: ${data.status}`);
        }
      }

      const result = data.result;
      
      // Procesar y limpiar los datos
      const placeData: GooglePlaceData = {
        name: result.name,
        rating: result.rating,
        user_ratings_total: result.user_ratings_total,
        formatted_address: result.formatted_address,
        international_phone_number: result.international_phone_number,
        website: result.website,
        opening_hours: result.opening_hours,
        photos: result.photos
      };

      // Procesar reseñas si están incluidas
      if (result.reviews && Array.isArray(result.reviews)) {
        placeData.reviews = result.reviews.map((review: any): GoogleReview => ({
          author_name: review.author_name || 'Usuario anónimo',
          author_url: review.author_url,
          language: review.language || language,
          profile_photo_url: review.profile_photo_url || '',
          rating: review.rating || 0,
          relative_time_description: review.relative_time_description || '',
          text: review.text || '',
          time: review.time || 0,
          translated: review.translated || false
        }));
      }

      return placeData;

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al obtener datos de Google Places');
    }
  }

  /**
   * Obtiene datos básicos (nombre, rating, total de reseñas)
   */
  static async getBasicData(placeId: string, language: string = 'es'): Promise<GooglePlaceData> {
    return this.getPlaceDetails(placeId, [...GOOGLE_PLACES_FIELDS.BASIC], language);
  }

  /**
   * Obtiene datos básicos + reseñas
   */
  static async getDataWithReviews(placeId: string, language: string = 'es'): Promise<GooglePlaceData> {
    const fields = [...GOOGLE_PLACES_FIELDS.BASIC, ...GOOGLE_PLACES_FIELDS.REVIEWS];
    return this.getPlaceDetails(placeId, fields, language);
  }

  /**
   * Obtiene todos los datos disponibles
   */
  static async getAllData(placeId: string, language: string = 'es'): Promise<GooglePlaceData> {
    return this.getPlaceDetails(placeId, [...GOOGLE_PLACES_FIELDS.ALL], language);
  }

  /**
   * Procesa una URL de Google Reviews y obtiene los datos
   */
  static async getDataFromUrl(
    url: string, 
    fields: string[] = [...GOOGLE_PLACES_FIELDS.BASIC],
    language: string = 'es'
  ): Promise<GooglePlaceData> {
    const placeId = this.extractPlaceId(url);
    
    if (!placeId) {
      throw new Error('No se pudo extraer el Place ID de la URL proporcionada');
    }

    return this.getPlaceDetails(placeId, fields, language);
  }

  /**
   * Valida si una URL contiene un Place ID válido
   */
  static validateGoogleUrl(url: string): boolean {
    const placeId = this.extractPlaceId(url);
    return placeId ? this.validatePlaceId(placeId) : false;
  }

  /**
   * Obtiene estadísticas resumidas de un lugar
   */
  static async getPlaceStats(placeId: string, language: string = 'es'): Promise<{
    name: string;
    rating: number;
    totalReviews: number;
    reviewsAvailable: number;
  }> {
    const data = await this.getDataWithReviews(placeId, language);
    
    return {
      name: data.name || 'Nombre no disponible',
      rating: data.rating || 0,
      totalReviews: data.user_ratings_total || 0,
      reviewsAvailable: data.reviews?.length || 0
    };
  }

  /**
   * Busca lugares usando Google Places Autocomplete API
   */
  static async searchPlaces(
    query: string,
    language: string = 'es',
    types: string = 'establishment'
  ): Promise<AutocompleteResult[]> {
    if (!this.API_KEY) {
      throw new Error('Google Places API key no configurada en las variables de entorno');
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    const params = new URLSearchParams({
      input: query.trim(),
      types: types,
      language: language,
      key: this.API_KEY
    });

    try {
      const response = await fetch(`${this.AUTOCOMPLETE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        switch (data.status) {
          case 'ZERO_RESULTS':
            return [];
          case 'OVER_QUERY_LIMIT':
            throw new Error('Se ha excedido el límite de consultas de la API de Autocomplete');
          case 'REQUEST_DENIED':
            throw new Error('Solicitud denegada. Verifica la API key y las restricciones');
          case 'INVALID_REQUEST':
            throw new Error('Solicitud inválida para Autocomplete');
          default:
            throw new Error(data.error_message || `Error de Autocomplete API: ${data.status}`);
        }
      }

      return data.predictions || [];

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido al buscar lugares');
    }
  }

  /**
   * Obtiene la URL de una foto de un lugar
   */
  static async getPlacePhotoUrl(
    photoReference: string,
    maxwidth: number = 400,
    maxheight?: number
  ): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('Google Places API key no configurada en las variables de entorno');
    }

    if (!photoReference) {
      throw new Error('Photo reference requerido');
    }

    const params = new URLSearchParams({
      photo_reference: photoReference,
      maxwidth: maxwidth.toString(),
      key: this.API_KEY
    });

    if (maxheight) {
      params.append('maxheight', maxheight.toString());
    }

    // La API de Photos devuelve directamente la imagen, no JSON
    // Por lo que devolvemos la URL construida
    return `${this.PHOTO_URL}?${params}`;
  }

  /**
   * Busca un lugar y obtiene sus datos completos incluyendo foto
   */
  static async searchAndGetPlaceWithPhoto(
    query: string,
    language: string = 'es'
  ): Promise<{
    place: GooglePlaceData;
    photoUrl?: string;
    placeId: string;
  } | null> {
    try {
      // Buscar lugares
      const results = await this.searchPlaces(query, language);
      
      if (results.length === 0) {
        return null;
      }

      // Tomar el primer resultado
      const firstResult = results[0];
      
      // Obtener datos completos incluyendo fotos
      const placeData = await this.getPlaceDetails(
        firstResult.place_id,
        [...GOOGLE_PLACES_FIELDS.BASIC, ...GOOGLE_PLACES_FIELDS.CONTACT, ...GOOGLE_PLACES_FIELDS.PHOTOS],
        language
      );

      // Obtener URL de la primera foto si existe
      let photoUrl: string | undefined;
      if (placeData.photos && placeData.photos.length > 0) {
        photoUrl = await this.getPlacePhotoUrl(placeData.photos[0].photo_reference);
      }

      return {
        place: placeData,
        photoUrl,
        placeId: firstResult.place_id
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al buscar y obtener datos del lugar');
    }
  }

  /**
   * Valida si un query de búsqueda es válido
   */
  static validateSearchQuery(query: string): boolean {
    return Boolean(query && query.trim().length >= 2 && query.trim().length <= 100);
  }
}
