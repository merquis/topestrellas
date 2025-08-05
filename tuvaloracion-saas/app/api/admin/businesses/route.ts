import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { translatePrizesWithAI } from '@/lib/ai-translation';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    const businesses = await db.collection('businesses')
      .find({})
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

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const data = await request.json();
    
    // Validar datos requeridos
    const businessName = data.businessName || data.name;
    if (!data.subdomain || !businessName || !data.phone) {
      return NextResponse.json(
        { error: 'Subdominio, nombre y teléfono son requeridos' },
        { status: 400 }
      );
    }
    
    // Verificar si el subdominio ya existe
    const existing = await db.collection('businesses').findOne({ 
      subdomain: data.subdomain 
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'El subdominio ya está en uso' },
        { status: 400 }
      );
    }
    
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
      subdomain: data.subdomain.toLowerCase(),
      name: data.businessName || data.name,
      type: data.type || 'restaurante',
      category: data.category || '',
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
        address: data.address || ''
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
    
    return NextResponse.json({
      success: true,
      businessId: result.insertedId,
      subdomain: newBusiness.subdomain
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
