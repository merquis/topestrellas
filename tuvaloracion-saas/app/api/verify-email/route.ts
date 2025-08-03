import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { email, businessId } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email es requerido' },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    
    // Verificar si el email ya fue usado para este negocio
    const existingValidation = await db.collection('email_validations').findOne({
      email: email.toLowerCase(),
      businessId: businessId ? new ObjectId(businessId) : { $exists: true }
    })
    
    const available = !existingValidation
    
    // Compatibilidad con webhook n8n si está configurado
    if (process.env.N8N_VERIFY_EMAIL_URL) {
      try {
        const n8nResponse = await fetch(process.env.N8N_VERIFY_EMAIL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        
        const n8nData = await n8nResponse.json()
        // Si n8n dice que no está disponible, respetamos esa decisión
        if (n8nData.exists || !n8nData.available) {
          return NextResponse.json({
            success: true,
            available: false,
            message: 'Email ya utilizado'
          })
        }
      } catch (error) {
        console.error('Error checking n8n webhook:', error)
        // Continuar con la verificación local si n8n falla
      }
    }
    
    return NextResponse.json({
      success: true,
      available,
      message: available ? 'Email disponible' : 'Email ya utilizado'
    })
    
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { success: false, error: 'Error al verificar email' },
      { status: 500 }
    )
  }
}
