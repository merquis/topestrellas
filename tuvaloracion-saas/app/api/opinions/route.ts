import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { Opinion } from '@/lib/types'
import { generatePrizeCode } from '@/lib/utils'
import { ObjectId } from 'mongodb'
import nodemailer from 'nodemailer'

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const db = await getDatabase()
    
    // Obtener información del negocio para usar su zona horaria
    let business;
    
    // Buscar por subdomain primero
    if (data.subdomain) {
      business = await db.collection('businesses').findOne({ subdomain: data.subdomain });
    }
    
    // Si no se encuentra por subdomain, buscar por businessId
    if (!business && data.businessId) {
      business = await db.collection('businesses').findOne({ _id: new ObjectId(data.businessId) });
    }
    
    if (!business) {
      console.error('❌ Negocio no encontrado:', { subdomain: data.subdomain, businessId: data.businessId });
      return NextResponse.json({ success: false, error: 'Negocio no encontrado' }, { status: 404 });
    }
    
    // Obtener zona horaria del negocio (fallback a Europe/Madrid)
    const businessTimezone = business.location?.timezone || 'Europe/Madrid';
    
    // Debug: mostrar información del negocio
    console.log('🏢 Negocio encontrado:', {
      id: business._id,
      name: business.name,
      subdomain: business.subdomain,
      city: business.location?.city,
      timezone: business.location?.timezone,
      fullLocation: business.location
    });
    
    // Generar código de premio
    const prizeCode = generatePrizeCode(data.subdomain, data.rating)
    
    // Crear fecha y hora en la zona horaria del negocio
    const now = new Date();
    
    // Formatear fecha y hora usando la zona horaria del negocio
    const businessDate = new Intl.DateTimeFormat('en-US', {
      timeZone: businessTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(now);
    
    const businessTime = new Intl.DateTimeFormat('en-US', {
      timeZone: businessTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);
    
    // Los formatos ya vienen correctos: MM/DD/YYYY y HH:MM:SS
    const dateStr = businessDate; // Formato: MM/DD/YYYY
    const timeStr = businessTime; // Formato: HH:MM:SS
    
    console.log(`📍 Negocio: ${business.name} (${business.location?.city || 'Sin ciudad'})`);
    console.log(`🕐 Zona horaria: ${businessTimezone}`);
    console.log(`📅 Fecha local del negocio: ${dateStr}`);
    console.log(`⏰ Hora local del negocio: ${timeStr}`);
    
    // Crear objeto de opinión con la estructura solicitada
    const opinion = {
      businessId: new ObjectId(data.businessId),
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      review: data.feedback || '',
      rating: data.rating,
      lang: data.language || 'es',
      premio: data.prize.name,
      codigoPremio: prizeCode,
      date: dateStr,
      time: timeStr,
      date_real: now,
      subdomain: data.subdomain,
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone || '',
      comment: data.feedback || '',
      prize: {
        index: data.prize.index,
        name: data.prize.name,
        code: prizeCode,
        value: data.prize.value,
      },
      metadata: {
        language: data.language || 'es',
        userAgent: request.headers.get('user-agent') || '',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      },
      externalReview: false,
      createdAt: now,
    }
    
    // Guardar en base de datos
    const result = await db.collection('opinions').insertOne(opinion)
    
    // Actualizar estadísticas del negocio
    await db.collection('businesses').updateOne(
      { _id: new ObjectId(data.businessId) },
      {
        $inc: {
          'stats.totalOpinions': 1,
          'stats.totalPrizesGiven': 1,
        },
        $set: {
          'stats.lastOpinion': new Date(),
        },
      }
    )
    
    // Guardar validación de email
    await db.collection('email_validations').insertOne({
      email: data.email.toLowerCase(),
      businessId: new ObjectId(data.businessId),
      usedAt: new Date(),
    })
    
    // Enviar email con el código del premio
    try {
      await sendPrizeEmail(data.email, data.name, data.prize.name, prizeCode, data.subdomain)
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // No fallar la operación si el email falla
    }
    
    // Enviar a webhook de n8n si está configurado (compatibilidad)
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            codigoPremio: prizeCode,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (webhookError) {
        console.error('Error sending to n8n:', webhookError)
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId,
        prizeCode,
      },
    })
  } catch (error) {
    console.error('Error saving opinion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al guardar la opinión' },
      { status: 500 }
    )
  }
}

async function sendPrizeEmail(
  email: string,
  name: string,
  prizeName: string,
  prizeCode: string,
  subdomain: string
) {
  const mailOptions = {
    from: `"Tu Valoración" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `¡${name}, aquí está tu premio! 🎁`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">¡Felicidades ${name}!</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Has ganado: ${prizeName}</h2>
          
          <div style="background-color: #fff; border: 2px dashed #007bff; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">Tu código de premio es:</p>
            <h3 style="font-size: 32px; color: #007bff; margin: 10px 0; letter-spacing: 2px;">
              ${prizeCode}
            </h3>
          </div>
          
          <p style="color: #666;">
            Presenta este código en el establecimiento para canjear tu premio.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Este premio es válido por tiempo limitado. ¡No olvides canjearlo!
          </p>
        </div>
        
        <div style="background-color: #333; color: #999; padding: 10px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 Tu Valoración. Todos los derechos reservados.</p>
        </div>
      </div>
    `,
  }
  
  await transporter.sendMail(mailOptions)
}

// GET endpoint para obtener opiniones (para el panel de admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const rating = searchParams.get('rating')
    
    const db = await getDatabase()
    
    // Construir query
    const query: any = {}
    if (subdomain) query.subdomain = subdomain
    if (rating) query.rating = parseInt(rating)
    
    // Obtener total
    const total = await db.collection('opinions').countDocuments(query)
    
    // Obtener opiniones paginadas
    const opinions = await db
      .collection('opinions')
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()
    
    return NextResponse.json({
      success: true,
      data: {
        opinions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching opinions:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener opiniones' },
      { status: 500 }
    )
  }
}
