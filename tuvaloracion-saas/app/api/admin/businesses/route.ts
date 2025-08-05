import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { translatePrizesWithAI } from '@/lib/ai-translation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');
    
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    let businessFilter = {};
    
    // Si es admin normal, filtrar solo sus negocios asignados
    if (userRole === 'admin' && userEmail) {
      // Obtener los negocios asignados al usuario
      const user = await db.collection('users').findOne({ email: userEmail });
      if (user && user.businessIds && user.businessIds.length > 0) {
        // Filtrar por los negocios asignados al usuario
        businessFilter = {
          _id: { $in: user.businessIds.map((id: string) => new ObjectId(id)) }
        };
      } else if (user && user.businessId) {
        // Compatibilidad con el campo legacy businessId
        businessFilter = {
          _id: new ObjectId(user.businessId)
        };
      } else {
        // Si no tiene negocios asignados, devolver array vacío
        return NextResponse.json([]);
      }
    }
    // Si es super_admin, no aplicar filtro (mostrar todos)
    
    const businesses = await db.collection('businesses')
      .find(businessFilter)
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Error al obtener negocios' },
      { status: 500 }
    );
  }
}

// Función para generar subdominio a partir del nombre
function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Eliminar guiones múltiples
    .replace(/^-|-$/g, ''); // Eliminar guiones al inicio y final
}

// Función para encontrar un subdominio único
async function findUniqueSubdomain(db: any, baseSubdomain: string): Promise<string> {
  let subdomain = baseSubdomain;
  let counter = 1;
  
  // Verificar si el subdominio base está disponible
  let existing = await db.collection('businesses').findOne({ subdomain });
  
  // Si el subdominio base está ocupado, buscar uno con sufijo
  while (existing) {
    subdomain = `${baseSubdomain}-${counter}`;
    existing = await db.collection('businesses').findOne({ subdomain });
    counter++;
    
    // Protección contra bucles infinitos (máximo 1000 intentos)
    if (counter > 1000) {
      throw new Error('No se pudo encontrar un subdominio único después de 1000 intentos');
    }
  }
  
  console.log(`Subdominio único encontrado: ${subdomain} (base: ${baseSubdomain})`);
  return subdomain;
}

// Mapeo de ciudades a zonas horarias
const CITY_TIMEZONE_MAP: { [key: string]: string } = {
  // Andalucía
  'Sevilla': 'Europe/Madrid',
  'Málaga': 'Europe/Madrid',
  'Córdoba': 'Europe/Madrid',
  'Granada': 'Europe/Madrid',
  'Cádiz': 'Europe/Madrid',
  'Almería': 'Europe/Madrid',
  'Huelva': 'Europe/Madrid',
  'Jaén': 'Europe/Madrid',
  
  // Madrid
  'Madrid': 'Europe/Madrid',
  'Alcalá de Henares': 'Europe/Madrid',
  'Fuenlabrada': 'Europe/Madrid',
  'Móstoles': 'Europe/Madrid',
  'Alcorcón': 'Europe/Madrid',
  'Leganés': 'Europe/Madrid',
  'Getafe': 'Europe/Madrid',
  
  // Cataluña
  'Barcelona': 'Europe/Madrid',
  'Hospitalet de Llobregat': 'Europe/Madrid',
  'Badalona': 'Europe/Madrid',
  'Terrassa': 'Europe/Madrid',
  'Sabadell': 'Europe/Madrid',
  'Lleida': 'Europe/Madrid',
  'Tarragona': 'Europe/Madrid',
  'Girona': 'Europe/Madrid',
  
  // Valencia
  'Valencia': 'Europe/Madrid',
  'Alicante': 'Europe/Madrid',
  'Elche': 'Europe/Madrid',
  'Castellón de la Plana': 'Europe/Madrid',
  'Torrevieja': 'Europe/Madrid',
  'Orihuela': 'Europe/Madrid',
  
  // País Vasco
  'Bilbao': 'Europe/Madrid',
  'Vitoria-Gasteiz': 'Europe/Madrid',
  'San Sebastián': 'Europe/Madrid',
  'Barakaldo': 'Europe/Madrid',
  
  // Galicia
  'Vigo': 'Europe/Madrid',
  'A Coruña': 'Europe/Madrid',
  'Ourense': 'Europe/Madrid',
  'Lugo': 'Europe/Madrid',
  'Santiago de Compostela': 'Europe/Madrid',
  
  // Canarias
  'Las Palmas de Gran Canaria': 'Atlantic/Canary',
  'Santa Cruz de Tenerife': 'Atlantic/Canary',
  'San Cristóbal de La Laguna': 'Atlantic/Canary',
  'Telde': 'Atlantic/Canary',
  'Santa Lucía de Tirajana': 'Atlantic/Canary',
  'Arona': 'Atlantic/Canary',
  'Arrecife': 'Atlantic/Canary',
  'Puerto del Rosario': 'Atlantic/Canary',
  'Los Llanos de Aridane': 'Atlantic/Canary',
  'San Sebastián de La Gomera': 'Atlantic/Canary',
  'Valverde': 'Atlantic/Canary',
  'Las Palmas': 'Atlantic/Canary',
  
  // Baleares
  'Palma de Mallorca': 'Europe/Madrid',
  'Ibiza': 'Europe/Madrid',
  'Mahón': 'Europe/Madrid',
  'Ciudadela de Menorca': 'Europe/Madrid',
  
  // Otras comunidades
  'Zaragoza': 'Europe/Madrid',
  'Murcia': 'Europe/Madrid',
  'Valladolid': 'Europe/Madrid',
  'Oviedo': 'Europe/Madrid',
  'Pamplona': 'Europe/Madrid',
  'Santander': 'Europe/Madrid',
  'Toledo': 'Europe/Madrid',
  'Badajoz': 'Europe/Madrid',
  'Salamanca': 'Europe/Madrid',
  'Mérida': 'Europe/Madrid',
  'Ávila': 'Europe/Madrid',
  'Cáceres': 'Europe/Madrid',
  'Guadalajara': 'Europe/Madrid',
  'Cuenca': 'Europe/Madrid',
  'Soria': 'Europe/Madrid',
  'Segovia': 'Europe/Madrid',
  'Albacete': 'Europe/Madrid',
  'Ciudad Real': 'Europe/Madrid',
  'Logroño': 'Europe/Madrid',
  'Huesca': 'Europe/Madrid',
  'Teruel': 'Europe/Madrid'
};

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const data = await request.json();
    
    // Validar datos requeridos
    const businessName = data.businessName || data.name;
    if (!businessName || !data.phone || !data.city || !data.postalCode || !data.address) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos: nombre, teléfono, ciudad, código postal y dirección' },
        { status: 400 }
      );
    }
    
    // Obtener zona horaria basada en la ciudad
    const timezone = CITY_TIMEZONE_MAP[data.city] || 'Europe/Madrid';
    
    // Generar subdominio automáticamente
    const baseSubdomain = generateSubdomain(businessName);
    console.log(`Generando subdominio para "${businessName}" -> "${baseSubdomain}"`);
    
    if (!baseSubdomain) {
      return NextResponse.json(
        { error: 'No se pudo generar un subdominio válido a partir del nombre del negocio' },
        { status: 400 }
      );
    }
    
    // Encontrar un subdominio único
    const uniqueSubdomain = await findUniqueSubdomain(db, baseSubdomain);
    
    // Procesar premios con IA
    const prizesToTranslate = data.prizes || [
      'CENA Max 60€',
      'DESCUENTO 30€', 
      'BOTELLA VINO',
      'HELADO',
      'CERVEZA',
      'REFRESCO',
      'MOJITO',
      'CHUPITO'
    ];
    const translatedPrizes = await translatePrizesWithAI(prizesToTranslate);

    // Estructura del nuevo negocio
    const newBusiness = {
      subdomain: uniqueSubdomain,
      name: data.businessName || data.name,
      type: data.type || 'restaurante',
      category: data.category || '',
      location: {
        country: data.country || 'España',
        city: data.city,
        postalCode: data.postalCode,
        address: data.address,
        timezone: timezone
      },
      config: {
        languages: data.languages || ['es', 'en', 'de', 'fr'],
        defaultLanguage: 'es',
        googleReviewUrl: data.googleReviewUrl || '',
        tripadvisorReviewUrl: data.tripadvisorReviewUrl || '',
        reviewPlatform: data.reviewPlatform || 'google',
        reviewClickCounter: 0,
        theme: {
        },
        prizes: translatedPrizes,
        features: {
          showScarcityIndicators: true,
          requireGoogleReview: true
        }
      },
      contact: {
        phone: data.phone || '',
        email: data.email || '',
        address: `${data.address}, ${data.postalCode} ${data.city}, ${data.country}`
      },
      subscription: {
        plan: data.plan || 'trial',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        status: 'active'
      },
      stats: {
        totalOpinions: 0,
        totalPrizesGiven: 0,
        avgRating: 0
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('businesses').insertOne(newBusiness);
    
    // Crear usuario en la base de datos si no existe
    if (data.email && data.ownerName) {
      const existingUser = await db.collection('users').findOne({ email: data.email });
      
      if (!existingUser) {
        const newUser = {
          email: data.email,
          name: data.ownerName,
          password: data.password || 'temp123', // Contraseña temporal si no se proporciona
          role: 'admin',
          businessId: result.insertedId.toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('users').insertOne(newUser);
      }
    }
    
    return NextResponse.json({
      success: true,
      businessId: result.insertedId,
      subdomain: newBusiness.subdomain,
      user: {
        id: result.insertedId.toString(),
        email: data.email || '',
        name: data.ownerName || '',
        role: 'admin',
        businessId: result.insertedId.toString()
      }
    });
    
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Error al crear negocio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID del negocio es requerido' },
        { status: 400 }
      );
    }
    
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    // Verificar que el ID sea válido
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    
    // Eliminar el negocio
    const result = await db.collection('businesses').deleteOne({ 
      _id: objectId 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }
    
    // También eliminar las opiniones asociadas
    await db.collection('opinions').deleteMany({ 
      businessId: id 
    });
    
    return NextResponse.json({
      success: true,
      message: 'Negocio eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Error al eliminar negocio' },
      { status: 500 }
    );
  }
}
