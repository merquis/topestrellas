import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    if (!data.subdomain || !data.name) {
      return NextResponse.json(
        { error: 'Subdominio y nombre son requeridos' },
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
    
    // Estructura del nuevo negocio
    const newBusiness = {
      subdomain: data.subdomain.toLowerCase(),
      name: data.name,
      type: data.type || 'restaurante',
      category: data.category || '',
      config: {
        languages: data.languages || ['es', 'en', 'de', 'fr'],
        defaultLanguage: 'es',
        googleReviewUrl: data.googleReviewUrl || '',
        theme: {
          primaryColor: data.primaryColor || '#f97316',
          secondaryColor: data.secondaryColor || '#ea580c'
        },
        prizes: data.prizes || [
          {
            index: 0,
            value: '60€',
            translations: {
              es: { name: 'Premio Mayor', emoji: '🎁' },
              en: { name: 'Grand Prize', emoji: '🎁' },
              de: { name: 'Hauptpreis', emoji: '🎁' },
              fr: { name: 'Grand Prix', emoji: '🎁' }
            }
          },
          {
            index: 1,
            value: '30€',
            translations: {
              es: { name: 'Descuento 30€', emoji: '💰' },
              en: { name: '€30 Discount', emoji: '💰' },
              de: { name: '30€ Rabatt', emoji: '💰' },
              fr: { name: '30€ de Réduction', emoji: '💰' }
            }
          },
          {
            index: 2,
            value: '25€',
            translations: {
              es: { name: 'Vale 25€', emoji: '🎟️' },
              en: { name: '€25 Voucher', emoji: '🎟️' },
              de: { name: '25€ Gutschein', emoji: '🎟️' },
              fr: { name: 'Bon 25€', emoji: '🎟️' }
            }
          },
          {
            index: 3,
            value: '10€',
            translations: {
              es: { name: 'Descuento 10€', emoji: '💵' },
              en: { name: '€10 Discount', emoji: '💵' },
              de: { name: '10€ Rabatt', emoji: '💵' },
              fr: { name: '10€ de Réduction', emoji: '💵' }
            }
          },
          {
            index: 4,
            value: '5€',
            translations: {
              es: { name: 'Vale 5€', emoji: '🎫' },
              en: { name: '€5 Voucher', emoji: '🎫' },
              de: { name: '5€ Gutschein', emoji: '🎫' },
              fr: { name: 'Bon 5€', emoji: '🎫' }
            }
          },
          {
            index: 5,
            value: '3€',
            translations: {
              es: { name: 'Descuento 3€', emoji: '🪙' },
              en: { name: '€3 Discount', emoji: '🪙' },
              de: { name: '3€ Rabatt', emoji: '🪙' },
              fr: { name: '3€ de Réduction', emoji: '🪙' }
            }
          },
          {
            index: 6,
            value: '8€',
            translations: {
              es: { name: 'Vale 8€', emoji: '🎯' },
              en: { name: '€8 Voucher', emoji: '🎯' },
              de: { name: '8€ Gutschein', emoji: '🎯' },
              fr: { name: 'Bon 8€', emoji: '🎯' }
            }
          },
          {
            index: 7,
            value: '2€',
            translations: {
              es: { name: 'Descuento 2€', emoji: '✨' },
              en: { name: '€2 Discount', emoji: '✨' },
              de: { name: '2€ Rabatt', emoji: '✨' },
              fr: { name: '2€ de Réduction', emoji: '✨' }
            }
          }
        ],
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
