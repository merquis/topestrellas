// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'tuvaloracion';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const userRole = searchParams.get('userRole');

    if (!userEmail || !userRole) {
      return NextResponse.json({ error: 'Faltan parámetros de usuario' }, { status: 400 });
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    let businessFilter = {};
    
    if (userRole === 'admin') {
      const user = await db.collection('users').findOne({ email: userEmail });
      
      if (user && user.businessIds && user.businessIds.length > 0) {
        businessFilter = {
          _id: { $in: user.businessIds.map((id: string) => new ObjectId(id)) }
        };
      } else if (user && user.businessId) {
        businessFilter = {
          _id: new ObjectId(user.businessId)
        };
      } else {
        businessFilter = {
          'contact.email': userEmail
        };
      }
    }
    // Super admin no tiene filtro

    const businesses = await db.collection('businesses').find(businessFilter).toArray();
    
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
        plan: business.subscription?.plan || 'trial',
        status: status,
        startDate: business.subscription?.startDate || createdAt,
        endDate: endDate,
        trialEndsAt: business.subscription?.plan === 'trial' ? trialEndsAt : undefined,
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
