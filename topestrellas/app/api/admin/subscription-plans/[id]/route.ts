import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { syncPlanToStripe } from '@/lib/subscriptions';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-07-30.basil' as any,
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const db = await getDatabase();
    const data = await request.json();
    const { id } = resolvedParams;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener el plan actual para comparar cambios
    const currentPlan = await db.collection('subscriptionplans').findOne({ _id: new ObjectId(id) });
    
    if (!currentPlan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // Actualizar en MongoDB
    const result = await db.collection('subscriptionplans').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // Si el plan tiene stripeProductId, actualizar también en Stripe
    if (currentPlan.stripeProductId && currentPlan.key !== 'trial') {
      try {
        console.log(`📝 Actualizando plan en Stripe: ${currentPlan.stripeProductId}`);
        
        // Actualizar el producto en Stripe
        await stripe.products.update(currentPlan.stripeProductId, {
          name: data.name || currentPlan.name,
          description: data.description || currentPlan.description,
          active: data.active !== undefined ? data.active : currentPlan.active,
          metadata: {
            planKey: data.key || currentPlan.key,
            icon: data.icon || currentPlan.icon || '',
            color: data.color || currentPlan.color || '',
            popular: data.popular !== undefined ? String(data.popular) : String(currentPlan.popular || false),
          },
        });

        console.log(`✅ Plan actualizado en Stripe exitosamente`);

        // Si el precio cambió, crear un nuevo precio y archivar el anterior
        if (data.recurringPrice && data.recurringPrice !== currentPlan.recurringPrice) {
          console.log(`💰 El precio cambió de ${currentPlan.recurringPrice} a ${data.recurringPrice}, creando nuevo precio...`);
          
          // Crear nuevo precio
          const newPrice = await stripe.prices.create({
            product: currentPlan.stripeProductId,
            currency: data.currency || currentPlan.currency || 'eur',
            unit_amount: Math.round((data.recurringPrice || 0) * 100),
            recurring: data.interval ? {
              interval: data.interval as Stripe.PriceCreateParams.Recurring.Interval,
              interval_count: 1,
            } : undefined,
            nickname: `${data.name || currentPlan.name} - Actualizado ${new Date().toISOString()}`,
            metadata: {
              planKey: data.key || currentPlan.key,
            },
          });

          // Archivar el precio anterior si existe
          if (currentPlan.stripePriceId) {
            await stripe.prices.update(currentPlan.stripePriceId, { active: false });
            console.log(`🗄️ Precio anterior archivado: ${currentPlan.stripePriceId}`);
          }

          // Actualizar el stripePriceId en MongoDB
          await db.collection('subscriptionplans').updateOne(
            { _id: new ObjectId(id) },
            { $set: { stripePriceId: newPrice.id } }
          );

          console.log(`✅ Nuevo precio creado: ${newPrice.id}`);
        }
      } catch (stripeError: any) {
        console.error('⚠️ Error actualizando en Stripe:', stripeError);
        // No fallar la operación completa si Stripe falla, pero registrar el error
        return NextResponse.json({ 
          success: true, 
          warning: `Plan actualizado en la base de datos, pero hubo un error con Stripe: ${stripeError.message}` 
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar el plan:', error);
    return NextResponse.json({ error: 'Error al actualizar el plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const db = await getDatabase();
    const { id } = resolvedParams;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Primero obtener el plan para ver si tiene IDs de Stripe
    const plan = await db.collection('subscriptionplans').findOne({ _id: new ObjectId(id) });
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    console.log(`🗑️ Eliminando plan: ${plan.name} (${plan.key})`);

    // Si el plan tiene stripeProductId, archivarlo en Stripe
    if (plan.stripeProductId && plan.key !== 'trial') {
      try {
        console.log(`📦 Archivando producto en Stripe: ${plan.stripeProductId}`);
        
        // Archivar (desactivar) el producto en Stripe
        // Nota: No eliminamos, solo archivamos para preservar el historial
        await stripe.products.update(plan.stripeProductId, {
          active: false,
          metadata: {
            ...plan.metadata,
            archivedAt: new Date().toISOString(),
            archivedReason: 'Eliminado desde panel admin'
          }
        });
        
        console.log(`✅ Producto archivado en Stripe exitosamente`);

        // También archivar todos los precios asociados
        if (plan.stripePriceId) {
          console.log(`💰 Archivando precio en Stripe: ${plan.stripePriceId}`);
          try {
            await stripe.prices.update(plan.stripePriceId, {
              active: false,
              metadata: {
                archivedAt: new Date().toISOString(),
                archivedReason: 'Plan eliminado'
              }
            });
            console.log(`✅ Precio archivado en Stripe exitosamente`);
          } catch (priceError: any) {
            console.warn(`⚠️ No se pudo archivar el precio: ${priceError.message}`);
            // Continuar aunque el precio no se pueda archivar
          }
        }

        // Buscar y archivar otros precios del producto
        try {
          const prices = await stripe.prices.list({
            product: plan.stripeProductId,
            active: true,
            limit: 100
          });

          for (const price of prices.data) {
            if (price.id !== plan.stripePriceId) { // No intentar archivar el mismo precio dos veces
              await stripe.prices.update(price.id, {
                active: false,
                metadata: {
                  archivedAt: new Date().toISOString(),
                  archivedReason: 'Plan eliminado'
                }
              });
              console.log(`✅ Precio adicional archivado: ${price.id}`);
            }
          }
        } catch (pricesError: any) {
          console.warn(`⚠️ Error archivando precios adicionales: ${pricesError.message}`);
        }

      } catch (stripeError: any) {
        console.error('❌ Error archivando en Stripe:', stripeError);
        
        // Si hay suscripciones activas, informar al usuario
        if (stripeError.code === 'resource_missing') {
          return NextResponse.json({ 
            error: 'El producto no existe en Stripe. Se eliminará solo de la base de datos.' 
          }, { status: 400 });
        }
        
        // Para otros errores de Stripe, continuar pero avisar
        return NextResponse.json({ 
          error: `No se pudo archivar en Stripe: ${stripeError.message}. El plan se mantendrá en la base de datos.` 
        }, { status: 400 });
      }
    }

    // Eliminar de MongoDB
    const result = await db.collection('subscriptionplans').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'No se pudo eliminar el plan de la base de datos' }, { status: 500 });
    }

    console.log(`✅ Plan eliminado completamente`);
    return NextResponse.json({ 
      success: true,
      message: plan.stripeProductId ? 'Plan eliminado y archivado en Stripe' : 'Plan eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error al eliminar el plan:', error);
    return NextResponse.json({ 
      error: `Error al eliminar el plan: ${error.message}` 
    }, { status: 500 });
  }
}
