import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const plans = await db.collection('subscriptionplans').find().sort({ createdAt: -1 }).toArray();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error al obtener los planes:', error);
    return NextResponse.json({ error: 'Error al obtener los planes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    const data = await request.json();

    if (!data.name || !data.key || !data.recurringPrice || !data.interval) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Asegurar que recurringPrice se guarda en céntimos
    let recurringPrice = Number(data.recurringPrice);
    if (recurringPrice < 20) { // Si es menor de 20, probablemente está en euros
      recurringPrice = Math.round(recurringPrice * 100);
    }
    const newPlan = {
      ...data,
      recurringPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('subscriptionplans').insertOne(newPlan);
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Error al crear el plan:', error);
    return NextResponse.json({ error: 'Error al crear el plan' }, { status: 500 });
  }
}
