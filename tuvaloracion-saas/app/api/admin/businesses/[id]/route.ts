import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { translatePrizesWithAI } from '@/lib/ai-translation';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    let objectId;
    try {
      objectId = new ObjectId(params.id);
    } catch (e) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    
    const business = await db.collection('businesses').findOne({ 
      _id: objectId 
    });
    
    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: 'Error al obtener negocio' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const data = await request.json();
    
    let objectId;
    try {
      objectId = new ObjectId(params.id);
    } catch (e) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    
    // Validar datos requeridos
    if (!data.name) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar permisos según el rol del usuario
    const userRole = data.userRole; // Debe enviarse desde el frontend
    
    // Obtener el negocio actual para preservar algunos datos
    const currentBusiness = await db.collection('businesses').findOne({ _id: objectId });
    
    if (!currentBusiness) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Procesar premios con IA SOLO si han cambiado
    let translatedPrizes = currentBusiness.config?.prizes || [];
    if (data.prizes && Array.isArray(data.prizes)) {
      const newPrizeNames = data.prizes.map((p: any) => p.name).filter(Boolean);
      
      // Obtener premios actuales para comparar
      const currentPrizeNames = (currentBusiness.config?.prizes || []).map((p: any) => {
        return p.translations?.es?.name || '';
      }).filter(Boolean);
      
      // Solo ejecutar IA si los premios han cambiado
      const prizesChanged = JSON.stringify(newPrizeNames) !== JSON.stringify(currentPrizeNames);
      
      if (newPrizeNames.length > 0 && prizesChanged) {
        console.log('🤖 Premios modificados, ejecutando IA para traducir...');
        try {
          translatedPrizes = await translatePrizesWithAI(newPrizeNames);
          
          // Agregar el coste real a cada premio traducido
          translatedPrizes = translatedPrizes.map((prize: any, index: number) => ({
            ...prize,
            realCost: data.prizes[index]?.realCost || 0
          }));
        } catch (error) {
          console.error('Error traduciendo premios:', error);
          // Continuar con los premios existentes si falla la IA
        }
      } else if (!prizesChanged) {
        console.log('✅ Premios sin cambios, manteniendo traducciones existentes');
        // Actualizar solo los costes reales sin cambiar las traducciones
        translatedPrizes = translatedPrizes.map((prize: any, index: number) => ({
          ...prize,
          realCost: data.prizes[index]?.realCost || prize.realCost || 0
        }));
      }
    }
    
    // Preparar datos para actualizar según permisos
    const updateData: any = {
      name: data.name,
      type: data.type || 'restaurante',
      category: data.category || '',
      config: {
        ...currentBusiness.config, // Preservar configuración existente
        googleReviewUrl: data.googleReviewUrl || '',
        tripadvisorReviewUrl: data.tripadvisorReviewUrl || '',
        reviewPlatform: data.reviewPlatform || 'google',
        googleStats: {
          currentRating: data.googleCurrentRating || 0,
          totalReviews: data.googleTotalReviews || 0
        },
        tripadvisorStats: {
          currentRating: data.tripadvisorCurrentRating || 0,
          totalReviews: data.tripadvisorTotalReviews || 0
        },
        theme: {
        },
        prizes: translatedPrizes
      },
      contact: {
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || ''
      },
      subscription: {
        ...currentBusiness.subscription, // Preservar datos de suscripción
        plan: data.plan || 'trial'
      },
      updatedAt: new Date()
    };

    // Solo super_admin puede cambiar el estado activo/inactivo
    if (userRole === 'super_admin') {
      updateData.active = data.active !== false;
      updateData.subscription.status = data.active ? 'active' : 'suspended';
    } else {
      // Admin normal: preservar estado actual
      updateData.active = currentBusiness.active;
      updateData.subscription.status = currentBusiness.subscription?.status || 'active';
    }
    
    // Actualizar el negocio
    const result = await db.collection('businesses').updateOne(
      { _id: objectId },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Negocio actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Error al actualizar negocio' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    const data = await request.json();
    
    let objectId;
    try {
      objectId = new ObjectId(params.id);
    } catch (e) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    
    // Para suspender/activar rápidamente
    if (data.action === 'suspend') {
      const result = await db.collection('businesses').updateOne(
        { _id: objectId },
        { 
          $set: { 
            active: false,
            'subscription.status': 'suspended',
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Negocio no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Negocio suspendido'
      });
    } else if (data.action === 'activate') {
      const result = await db.collection('businesses').updateOne(
        { _id: objectId },
        { 
          $set: { 
            active: true,
            'subscription.status': 'active',
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Negocio no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Negocio activado'
      });
    }
    
    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error updating business status:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado del negocio' },
      { status: 500 }
    );
  }
}
