import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TYPE_ALIASES: Record<string, string> = {
  cancelaciones: 'subscription_paused',
  cancelados: 'subscription_paused',
  canceladas: 'subscription_paused',
  pausas: 'subscription_paused',
  pausa: 'subscription_paused',
};

const SEVERITY_BY_TYPE: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
  subscription_paused: 'danger',
  payment_failed: 'warning',
  subscription_trial_ending: 'warning',
  upcoming_invoice: 'info',
  payment_method_updated: 'info',
  subscription_plan_changed: 'info',
  invoice_paid: 'success',
  subscription_resumed: 'success',
  subscription_started: 'success',
};

function parseDateParam(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  try {
    // Auth: solo super_admin
    const cookieHeader = req.headers.get('cookie') || '';
    const user = verifyAuth(cookieHeader);
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(req.url);
    const sp = url.searchParams;

    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20', 10)));
    const typesParam = sp.get('types'); // coma separada
    const severityParam = sp.get('severity'); // coma separada
    const businessId = sp.get('businessId'); // 'all' | id
    const search = (sp.get('search') || '').trim();
    const from = parseDateParam(sp.get('from'));
    const to = parseDateParam(sp.get('to'));

    // Normalizar tipos (acepta alias en español)
    let types: string[] | undefined;
    if (typesParam && typesParam.length > 0) {
      types = typesParam.split(',').map(t => t.trim()).filter(Boolean).map(t => TYPE_ALIASES[t] || t);
    }

    let severities: string[] | undefined;
    if (severityParam && severityParam.length > 0) {
      severities = severityParam.split(',').map(s => s.trim()).filter(Boolean);
    }

    const db = await getDatabase();

    // Construir query base para activity_logs
    const query: any = {};
    if (types && types.length > 0) {
      query.type = { $in: types };
    }
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }

    // Filtrado por negocio
    if (businessId && businessId !== 'all') {
      // En los logs guardamos businessId como string (ObjectId en texto)
      query.businessId = String(businessId);
    }

    // Buscar logs
    const cursor = db.collection('activity_logs')
      .find(query)
      .sort({ createdAt: -1 });

    const totalCount = await cursor.count();
    const items = await cursor
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Cargar negocios relacionados (map por ObjectId)
    const uniqueBusinessIds = Array.from(new Set(items.map((it: any) => String(it.businessId)).filter(Boolean)));
    const businessObjectIds = uniqueBusinessIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const businesses = await db.collection('businesses')
      .find({ _id: { $in: businessObjectIds } })
      .project({ name: 1, subdomain: 1, contact: 1 })
      .toArray();

    const businessMap = new Map<string, any>();
    businesses.forEach(b => businessMap.set(String(b._id), b));

    // Mapear y formatear resultados + severidad + búsqueda
    let results = items.map((it: any) => {
      const b = businessMap.get(String(it.businessId));
      const type = it.type || 'info';
      const severity = SEVERITY_BY_TYPE[type] || 'info';

      // Determinar occurredAt (por ejemplo para upcoming_invoice con dueDate)
      const occurredAt = it.metadata?.dueDate ? new Date(it.metadata.dueDate) : undefined;

      // Texto corto sugerido
      let summary = '';
      switch (type) {
        case 'invoice_paid':
          summary = `Pago recibido de ${b?.name || 'negocio'}: ${(it.metadata?.amount || 0) / 100} ${it.metadata?.currency?.toUpperCase() || 'EUR'}`;
          break;
        case 'payment_failed':
          summary = `Pago fallido en ${b?.name || 'negocio'} – intento ${it.metadata?.attemptCount || 1}`;
          break;
        case 'upcoming_invoice':
          summary = `Próxima factura para ${b?.name || 'negocio'}: ${(it.metadata?.amountDue || 0) / 100} EUR`;
          break;
        case 'payment_method_updated':
          summary = `Método de pago actualizado en ${b?.name || 'negocio'}`;
          break;
        case 'subscription_paused':
          summary = `Suscripción pausada en ${b?.name || 'negocio'}`;
          break;
        case 'subscription_resumed':
          summary = `Suscripción reanudada en ${b?.name || 'negocio'}`;
          break;
        case 'subscription_started':
          summary = `Nueva suscripción en ${b?.name || 'negocio'} (${it.metadata?.planKey || ''})`;
          break;
        case 'subscription_plan_changed':
          summary = `Cambio de plan en ${b?.name || 'negocio'}: ${it.metadata?.fromPlan || ''} → ${it.metadata?.toPlan || ''}`;
          break;
        case 'subscription_trial_ending':
          summary = `Trial termina pronto en ${b?.name || 'negocio'}`;
          break;
        default:
          summary = it.description || 'Evento';
      }

      const businessInfo = {
        id: String(it.businessId || ''),
        name: b?.name || '',
        email: b?.contact?.email || '',
        subdomain: b?.subdomain || '',
      };

      return {
        id: String(it._id),
        type,
        severity,
        createdAt: it.createdAt,
        occurredAt: occurredAt || it.createdAt,
        business: businessInfo,
        summary,
        description: it.description || '',
        metadata: it.metadata || {},
        cta: buildCTA(type, businessInfo.id),
      };
    });

    // Filtro de búsqueda (servidor) por nombre/email/subdominio si search dado
    if (search) {
      const needle = search.toLowerCase();
      results = results.filter(r =>
        r.business.name.toLowerCase().includes(needle) ||
        r.business.email.toLowerCase().includes(needle) ||
        r.business.subdomain.toLowerCase().includes(needle)
      );
    }

    // Filtro adicional por severidad si se solicitó
    if (severities && severities.length > 0) {
      const set = new Set(severities);
      results = results.filter(r => set.has(r.severity));
    }

    return NextResponse.json({
      items: results,
      totalCount,
      hasMore: page * limit < totalCount,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error en /api/super/recent-activity:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function buildCTA(type: string, businessId: string) {
  switch (type) {
    case 'payment_failed':
      return { label: 'Contactar', url: `/super/businesses?focus=${businessId}` };
    case 'invoice_paid':
      return { label: 'Ver facturas', url: `/super/subscriptions?businessId=${businessId}` };
    case 'upcoming_invoice':
      return { label: 'Ver facturas', url: `/super/subscriptions?businessId=${businessId}` };
    case 'subscription_paused':
    case 'subscription_resumed':
    case 'subscription_started':
    case 'subscription_plan_changed':
      return { label: 'Ver suscripción', url: `/super/subscriptions?businessId=${businessId}` };
    default:
      return { label: 'Ver perfil', url: `/super/businesses?focus=${businessId}` };
  }
}
