import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, business, category, priority, subject, message } = body;

    // Validar campos requeridos
    if (!name || !email || !category || !priority || !subject || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Aquí podrías:
    // 1. Guardar en base de datos
    // 2. Enviar email de notificación
    // 3. Integrar con sistema de tickets (Zendesk, Freshdesk, etc.)
    
    // Por ahora, solo simulamos el procesamiento
    console.log('📧 Nueva consulta de contacto recibida:', {
      name,
      email,
      business,
      category,
      priority,
      subject,
      message,
      timestamp: new Date().toISOString()
    });

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: 'Consulta enviada correctamente',
      ticketId: `TKT-${Date.now()}`
    });

  } catch (error) {
    console.error('❌ Error procesando consulta de contacto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
