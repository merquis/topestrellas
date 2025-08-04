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
    
    // Generar código de premio
    const prizeCode = generatePrizeCode(data.subdomain, data.rating)
    
    // Crear objeto de opinión
    const opinion: Omit<Opinion, '_id'> = {
      businessId: new ObjectId(data.businessId),
      subdomain: data.subdomain,
      customer: {
        name: data.name,
        email: data.email,
      },
      rating: data.rating,
      review: data.feedback || '',
      prize: {
        index: data.prize.index,
        name: data.prize.name,
        code: prizeCode,
        value: data.prize.value,
      },
      metadata: {
        language: data.language,
        userAgent: request.headers.get('user-agent') || '',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      },
      externalReview: false,
      createdAt: new Date(),
    }
    
    // Guardar en base de datos
    const result = await db.collection<Opinion>('opinions').insertOne(opinion as Opinion)
    
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
