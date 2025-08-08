import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('cookie');
    const user = verifyAuth(authHeader || '');
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    // Obtener todos los negocios (ya que cada usuario tiene al menos uno)
    // Para admin, buscar por email del contacto
    let query: any = {};
    
    if (user.role === 'admin') {
      // Buscar negocios donde el email del contacto coincida con el del usuario
      query = { 'contact.email': user.email };
    }
    // Super admin puede ver todas las suscripciones (sin filtro)

    const businesses = await db.collection('businesses').find(query).toArray();
    
    // Formatear la respuesta con información de suscripción
    const subscriptions = businesses.map(business => {
      const now = new Date();
      const createdAt = new Date(business.createdAt);
      const trialDays = 7;
      const trialEndsAt = new Date(createdAt.getTime() + (trialDays * 24 * 60 * 60 * 1000));
      
      // Determinar el estado de la suscripción
      let status = 'active';
      if (!business.active) {
        status = 'inactive';
      } else if (business.subscription?.status) {
        status = business.subscription.status;
      }
      
      // Calcular fechas según el plan
      let endDate = trialEndsAt;
      if (business.subscription?.endDate) {
        endDate = new Date(business.subscription.endDate);
      } else if (business.plan !== 'trial') {
        // Si no es trial y no tiene fecha de fin, asumimos renovación mensual
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      }
      
      return {
        businessId: business._id.toString(),
        businessName: business.name,
        subdomain: business.subdomain,
        plan: business.plan || 'trial',
        status: status,
        startDate: business.subscription?.startDate || createdAt,
        endDate: endDate,
        trialEndsAt: business.plan === 'trial' ? trialEndsAt : undefined,
        autoRenew: business.subscription?.autoRenew || false,
        paymentMethod: business.subscription?.paymentMethod || null,
        lastPayment: business.subscription?.lastPayment || null
      };
    });

    await client.close();
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Error al obtener las suscripciones' },
      { status: 500 }
    );
  }
}
