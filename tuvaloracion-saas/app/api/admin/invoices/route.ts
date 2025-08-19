import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import clientPromise, { getDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieHeader = request.headers.get('cookie') || '';
    const user = verifyAuth(cookieHeader);
    
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener parámetros de la URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const year = searchParams.get('year');

    // Conectar a MongoDB para obtener el customerId
    const db = await getDatabase();
    
    // Buscar el usuario en la base de datos
    const dbUser = await db.collection('users').findOne({ 
      email: user.email 
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar el business asociado al usuario
    let stripeCustomerId = null;
    
    // Si el usuario es admin, buscar su business
    if (dbUser.role === 'admin' && (dbUser.businessId || (user as any).businessId)) {
      const businessIdCandidate = (dbUser.businessId as any) ?? (user as any).businessId;
      console.log('Buscando business con ID:', businessIdCandidate);
      
      // Intentar localizar el business por _id como ObjectId, luego como string y, por último, por email de contacto
      let business = null as any;
      try {
        if (businessIdCandidate && ObjectId.isValid(String(businessIdCandidate))) {
          business = await db.collection('businesses').findOne({ _id: new ObjectId(String(businessIdCandidate)) });
          console.log('Buscando con ObjectId:', businessIdCandidate);
        }
      } catch {}
      if (!business && businessIdCandidate) {
        business = await db.collection('businesses').findOne({ _id: String(businessIdCandidate) });
        console.log('Buscando como string:', businessIdCandidate);
      }
      if (!business) {
        business = await db.collection('businesses').findOne({ 'contact.email': user.email });
        console.log('Buscando por contact.email:', user.email);
      }
      
      console.log('Business encontrado:', business ? 'Sí' : 'No');
      
      if (business) {
        // Buscar stripeCustomerId en diferentes ubicaciones posibles
        if (business.subscription && business.subscription.stripeCustomerId) {
          stripeCustomerId = business.subscription.stripeCustomerId;
          console.log('Stripe Customer ID encontrado en subscription:', stripeCustomerId);
        } else if (business.billing && business.billing.stripeCustomerId) {
          stripeCustomerId = business.billing.stripeCustomerId;
          console.log('Stripe Customer ID encontrado en billing:', stripeCustomerId);
        } else if (business.stripeCustomerId) {
          stripeCustomerId = business.stripeCustomerId;
          console.log('Stripe Customer ID encontrado directamente:', stripeCustomerId);
        }
        
        // Log para depuración
        console.log('Estructura del business:', {
          hasSubscription: !!business.subscription,
          hasBilling: !!business.billing,
          subscriptionKeys: business.subscription ? Object.keys(business.subscription) : [],
          billingKeys: business.billing ? Object.keys(business.billing) : []
        });
      }
    }
    
    // Si el usuario es super_admin, puede ver todas las facturas (implementar lógica específica si es necesario)
    if (dbUser.role === 'super_admin') {
      // Por ahora, retornar vacío para super_admin
      return NextResponse.json({ 
        invoices: [],
        hasMore: false,
        totalCount: 0,
        unpaidCount: 0,
        unpaidAmount: 0,
        message: 'Vista de super administrador no implementada'
      });
    }

    if (!stripeCustomerId) {
      console.log('No se encontró stripeCustomerId para el usuario:', user.email);
      return NextResponse.json({ 
        invoices: [],
        hasMore: false,
        totalCount: 0,
        unpaidCount: 0,
        unpaidAmount: 0,
        message: 'No se encontró información de facturación para este negocio'
      });
    }
    
    console.log('Obteniendo facturas para customer:', stripeCustomerId);

    // Configurar filtros de fecha
    const now = new Date();
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(now.getFullYear() - 5);
    
    let dateFilter: any = {
      gte: Math.floor(fiveYearsAgo.getTime() / 1000)
    };

    // Si se especifica un año, filtrar por ese año
    if (year && year !== 'all') {
      const yearNum = parseInt(year);
      const startOfYear = new Date(yearNum, 0, 1);
      const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59);
      dateFilter = {
        gte: Math.floor(startOfYear.getTime() / 1000),
        lte: Math.floor(endOfYear.getTime() / 1000)
      };
    }

    // Obtener facturas de Stripe
    const invoicesResponse = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: limit,
      created: dateFilter,
      expand: ['data.subscription', 'data.payment_intent']
    });

    // Ordenar por fecha más reciente primero
    const sortedInvoices = invoicesResponse.data.sort((a, b) => b.created - a.created);

    // Implementar paginación manual
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInvoices = sortedInvoices.slice(startIndex, endIndex);

    // Calcular estadísticas de facturas impagadas
    const unpaidInvoices = invoicesResponse.data.filter(
      inv => inv.status === 'open' || inv.status === 'uncollectible'
    );
    const unpaidCount = unpaidInvoices.length;
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, inv) => sum + (inv.amount_due || 0), 
      0
    );

    // Obtener descripción del plan si existe
    const invoicesWithDetails = paginatedInvoices.map((invoice: any) => {
      let description = '';
      if (invoice.lines?.data?.[0]) {
        description = invoice.lines.data[0].description || '';
      }

      // Manejar la suscripción que puede venir como string o objeto expandido
      let subscriptionId = null;
      if (invoice.subscription) {
        subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription.id;
      }

      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        subscription: subscriptionId,
        description: description,
        payment_intent: invoice.payment_intent 
          ? {
              status: typeof invoice.payment_intent === 'string' 
                ? '' 
                : invoice.payment_intent.status
            }
          : undefined,
        next_payment_attempt: invoice.next_payment_attempt,
        lines: invoice.lines ? {
          data: invoice.lines.data.map((line: any) => ({
            description: line.description || '',
            amount: line.amount
          }))
        } : undefined
      };
    });

    return NextResponse.json({
      invoices: invoicesWithDetails,
      hasMore: endIndex < sortedInvoices.length,
      totalCount: sortedInvoices.length,
      unpaidCount,
      unpaidAmount
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener las facturas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener el PDF de una factura específica
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieHeader = request.headers.get('cookie') || '';
    const user = verifyAuth(cookieHeader);
    
    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { invoiceId, action } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'ID de factura requerido' }, { status: 400 });
    }

    // Conectar a MongoDB para verificar el usuario
    const db = await getDatabase();
    
    const dbUser = await db.collection('users').findOne({ 
      email: user.email 
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar el business asociado al usuario
    let stripeCustomerId = null;
    
    if (dbUser.role === 'admin' && (dbUser.businessId || (user as any).businessId)) {
      const businessIdCandidate = (dbUser.businessId as any) ?? (user as any).businessId;
      // Intentar localizar el business por múltiples criterios
      let business = null as any;
      try {
        if (businessIdCandidate && ObjectId.isValid(String(businessIdCandidate))) {
          business = await db.collection('businesses').findOne({ _id: new ObjectId(String(businessIdCandidate)) });
        }
      } catch {}
      if (!business && businessIdCandidate) {
        business = await db.collection('businesses').findOne({ _id: String(businessIdCandidate) });
      }
      if (!business) {
        business = await db.collection('businesses').findOne({ 'contact.email': user.email });
      }
      
      if (business) {
        // Buscar stripeCustomerId en diferentes ubicaciones
        if (business.subscription && business.subscription.stripeCustomerId) {
          stripeCustomerId = business.subscription.stripeCustomerId;
        } else if (business.billing && business.billing.stripeCustomerId) {
          stripeCustomerId = business.billing.stripeCustomerId;
        } else if (business.stripeCustomerId) {
          stripeCustomerId = business.stripeCustomerId;
        }
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No se encontró información de facturación' }, { status: 404 });
    }

    // Obtener la factura de Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Verificar que la factura pertenece al cliente
    if (invoice.customer !== stripeCustomerId) {
      return NextResponse.json({ error: 'Factura no autorizada' }, { status: 403 });
    }

    // Realizar la acción solicitada
    switch (action) {
      case 'download':
        // Devolver la URL del PDF
        return NextResponse.json({
          pdfUrl: invoice.invoice_pdf,
          invoiceUrl: invoice.hosted_invoice_url
        });

      case 'pay':
        // Si la factura está abierta, intentar pagarla
        if (invoice.status === 'open') {
          try {
            const paidInvoice = await stripe.invoices.pay(invoiceId);
            return NextResponse.json({
              success: true,
              invoice: paidInvoice,
              message: 'Factura pagada exitosamente'
            });
          } catch (payError) {
            return NextResponse.json({
              success: false,
              error: 'Error al procesar el pago',
              details: payError instanceof Error ? payError.message : 'Error desconocido'
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            error: 'La factura no está pendiente de pago'
          }, { status: 400 });
        }

      case 'send':
        // Enviar factura por email
        await stripe.invoices.sendInvoice(invoiceId);
        return NextResponse.json({
          success: true,
          message: 'Factura enviada por email'
        });

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing invoice action:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
