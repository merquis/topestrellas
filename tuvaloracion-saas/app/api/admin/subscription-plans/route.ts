import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { 
  syncPlanToStripe, 
  SubscriptionPlan,
  getActivePlans 
} from '@/lib/subscriptions';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Schema para características - soporta tanto strings como objetos para compatibilidad
const FeatureSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    included: z.boolean()
  })
]);

// Schema base para planes (sin validaciones de refine)
const BasePlanSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  originalPrice: z.number().min(0).optional(),
  setupPrice: z.number().min(0),
  recurringPrice: z.number().min(0),
  currency: z.string().default('EUR'),
  interval: z.enum(['month', 'quarter', 'semester', 'year']).optional(),
  trialDays: z.number().min(0).default(0),
  features: z.array(FeatureSchema),
  active: z.boolean().default(true),
  icon: z.string().optional(),
  color: z.string().optional(),
  popular: z.boolean().default(false),
});

// Schema para crear planes (con validación de refine)
const PlanSchema = BasePlanSchema.refine(
  (data: z.infer<typeof BasePlanSchema>) => {
    // Si hay precio original, debe ser mayor que el precio recurrente
    if (data.originalPrice !== undefined && data.originalPrice !== null) {
      return data.originalPrice > data.recurringPrice;
    }
    return true;
  },
  {
    message: "El precio original debe ser mayor que el precio recurrente",
    path: ["originalPrice"],
  }
);

// Schema para actualizar planes (partial sin refine)
const UpdatePlanSchema = BasePlanSchema.partial();

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
      .toArray();
    
    // Ordenar los planes con un orden fijo específico
    const planOrder = ['esencial', 'crecimiento', 'liderazgo'];
    const sortedPlans = plans.sort((a, b) => {
      const aIndex = planOrder.indexOf(a.key.toLowerCase());
      const bIndex = planOrder.indexOf(b.key.toLowerCase());
      
      // Si ambos planes están en el orden definido, usar ese orden
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Si solo uno está en el orden definido, ese va primero
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // Si ninguno está en el orden definido, ordenar por precio
      return a.recurringPrice - b.recurringPrice;
    });
    
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
  } catch (error: any) {
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
    
    // Usar el schema de actualización (partial sin refine)
    const validatedData = UpdatePlanSchema.parse(updateData);
    
    // Validación manual del precio original si se proporciona
    if (validatedData.originalPrice !== undefined && validatedData.recurringPrice !== undefined) {
      if (validatedData.originalPrice <= validatedData.recurringPrice) {
        return NextResponse.json(
          { success: false, error: 'El precio original debe ser mayor que el precio recurrente' },
          { status: 400 }
        );
      }
    }
    
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
    
    // Validación adicional si solo se actualiza el precio original
    if (validatedData.originalPrice !== undefined && validatedData.recurringPrice === undefined) {
      if (validatedData.originalPrice <= currentPlan.recurringPrice) {
        return NextResponse.json(
          { success: false, error: 'El precio original debe ser mayor que el precio recurrente actual' },
          { status: 400 }
        );
      }
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
  } catch (error: any) {
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
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
