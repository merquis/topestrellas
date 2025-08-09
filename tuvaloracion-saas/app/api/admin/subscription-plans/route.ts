import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { 
  syncPlanToStripe, 
  SubscriptionPlan,
  getActivePlans 
} from '@/lib/subscriptions';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Schema de validaciรณn para crear/actualizar planes
const PlanSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  setupPrice: z.number().min(0),
  recurringPrice: z.number().min(0),
  currency: z.string().default('EUR'),
  interval: z.enum(['month', 'year']).optional(),
  trialDays: z.number().min(0).default(0),
  features: z.array(z.string()),
  active: z.boolean().default(true),
  icon: z.string().optional(),
  color: z.string().optional(),
  popular: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');
    
    const db = await getDatabase();
    let query: any = activeOnly ? { active: true } : {};
    
    // Por ahora, los admins pueden ver todos los planes activos.
    // Si se implementa una asignación estricta de planes por admin,
    // se deberá reactivar una lógica de filtrado aquí.
    if (userRole === 'super_admin') {
      // Los super_admin pueden ver todos los planes (activos o inactivos)
    }
    
    const plans = await db.collection('subscriptionplans')
      .find(query)
      .sort({ recurringPrice: 1 })
      .toArray();
    
    return NextResponse.json({ 
      success: true, 
      plans 
    });
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo planes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar datos
    const validatedData = PlanSchema.parse(body);
    
    const db = await getDatabase();
    
    // Verificar si ya existe un plan con esa key
    const existingPlan = await db.collection('subscriptionplans').findOne({ 
      key: validatedData.key 
    });
    
    if (existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un plan con esa key' },
        { status: 400 }
      );
    }
    
    // Obtener creatorId de userEmail si se proporciona
    let assignedTo: string[] = [];
    if (body.userEmail) {
      const creator = await db.collection('users').findOne({ email: body.userEmail });
      if (creator && creator.role !== 'super_admin') {
        assignedTo = [creator._id.toString()];
      }
    }
    
    // Crear el plan
    const newPlan = {
      ...validatedData,
      interval: validatedData.interval || 'month',
      assignedTo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection('subscriptionplans').insertOne(newPlan);
    
    // Sincronizar con Stripe si está activo (excepto trial)
    if (newPlan.active && newPlan.key !== 'trial') {
      console.log(`[POST /subscription-plans] Sincronizando plan ${newPlan.key} con Stripe...`);
      try {
        const { productId, priceId } = await syncPlanToStripe({
          ...newPlan,
          _id: result.insertedId,
        });
        
        console.log(`[POST /subscription-plans] Plan sincronizado - ProductID: ${productId}, PriceID: ${priceId}`);
        
        await db.collection('subscriptionplans').updateOne(
          { _id: result.insertedId },
          { 
            $set: { 
              stripeProductId: productId,
              stripePriceId: priceId,
              updatedAt: new Date()
            } 
          }
        );
        
        console.log(`[POST /subscription-plans] IDs de Stripe guardados en MongoDB`);
      } catch (stripeError: any) {
        console.error('[POST /subscription-plans] Error crítico sincronizando con Stripe:', stripeError);
        
        // Eliminar el plan creado si falla la sincronización con Stripe
        await db.collection('subscriptionplans').deleteOne({ _id: result.insertedId });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error sincronizando con Stripe', 
            details: stripeError.message 
          },
          { status: 500 }
        );
      }
    }
    
    const finalPlan = await db.collection('subscriptionplans').findOne({ 
      _id: result.insertedId 
    });
    
    return NextResponse.json({ 
      success: true, 
      plan: finalPlan
    });
  } catch (error) {
    console.error('Error creando plan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Error creando plan' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del plan requerido' },
        { status: 400 }
      );
    }
    
    const validatedData = PlanSchema.partial().parse(updateData);
    
    const db = await getDatabase();
    
    const currentPlan = await db.collection('subscriptionplans').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!currentPlan) {
      return NextResponse.json(
        { success: false, error: 'Plan no encontrado' },
        { status: 404 }
      );
    }
    
    if (validatedData.key && validatedData.key !== currentPlan.key) {
      const existingPlan = await db.collection('subscriptionplans').findOne({ 
        key: validatedData.key,
        _id: { $ne: new ObjectId(id) }
      });
      
      if (existingPlan) {
        return NextResponse.json(
          { success: false, error: 'Ya existe otro plan con esa key' },
          { status: 400 }
        );
      }
    }
    
    // Si se actualiza assignedTo, mergear o reemplazar
    let updatedAssignedTo = currentPlan.assignedTo || [];
    if (updateData.assignedTo) {
      updatedAssignedTo = updateData.assignedTo;
    }
    
    const updatedPlan = {
      ...currentPlan,
      ...validatedData,
      assignedTo: updatedAssignedTo,
      updatedAt: new Date(),
    };
    
    // Sincronizar con Stripe si está activo y hubo cambios relevantes (excepto trial)
    if (updatedPlan.active && updatedPlan.key !== 'trial' && (
      validatedData.recurringPrice !== undefined ||
      validatedData.setupPrice !== undefined ||
      validatedData.interval !== undefined ||
      validatedData.trialDays !== undefined ||
      validatedData.name !== undefined ||
      validatedData.description !== undefined
    )) {
      console.log(`[PUT /subscription-plans] Sincronizando cambios del plan ${updatedPlan.key} con Stripe...`);
      try {
        const { productId, priceId } = await syncPlanToStripe(updatedPlan as SubscriptionPlan);
        
        console.log(`[PUT /subscription-plans] Plan actualizado - ProductID: ${productId}, PriceID: ${priceId}`);
        
        Object.assign(updatedPlan, {
          stripeProductId: productId,
          stripePriceId: priceId
        });
      } catch (stripeError: any) {
        console.error('[PUT /subscription-plans] Error crítico sincronizando con Stripe:', stripeError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error sincronizando con Stripe', 
            details: stripeError.message 
          },
          { status: 500 }
        );
      }
    }
    
    await db.collection('subscriptionplans').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedPlan }
    );
    
    return NextResponse.json({ 
      success: true, 
      plan: updatedPlan 
    });
  } catch (error) {
    console.error('Error actualizando plan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Error actualizando plan' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un plan (solo lo desactiva)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del plan requerido' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Verificar que el plan existe
    const plan = await db.collection('subscriptionplans').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar que no haya negocios activos con este plan
    const businessesWithPlan = await db.collection('businesses').countDocuments({
      'subscription.plan': plan.key,
      active: true
    });
    
    if (businessesWithPlan > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede eliminar el plan. Hay ${businessesWithPlan} negocio(s) activo(s) usando este plan.` 
        },
        { status: 400 }
      );
    }
    
    // Desactivar el plan en lugar de eliminarlo
    await db.collection('subscriptionplans').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          active: false,
          updatedAt: new Date()
        } 
      }
    );
    
    // Desactivar el precio en Stripe si existe
    if (plan.stripePriceId) {
      try {
        const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-07-30.basil',
        });
        
        await stripe.prices.update(plan.stripePriceId, { active: false });
        
        if (plan.stripeProductId) {
          await stripe.products.update(plan.stripeProductId, { active: false });
        }
      } catch (stripeError) {
        console.error('Error desactivando en Stripe:', stripeError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Plan desactivado correctamente' 
    });
  } catch (error) {
    console.error('Error eliminando plan:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando plan' },
      { status: 500 }
    );
  }
}
