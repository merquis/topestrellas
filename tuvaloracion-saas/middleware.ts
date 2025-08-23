import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Obtener el dominio principal de las variables de entorno
  const mainDomain = process.env.APP_DOMAIN || 'tuvaloracion.com'
  const adminDomain = process.env.ADMIN_DOMAIN || 'admin.topestrellas.com'
  
  // Si es el dominio de admin, permitir acceso
  if (hostname === adminDomain || 
      hostname === 'admin.topestrellas.com' ||
      hostname.startsWith('admin.topestrellas.')) {
    return NextResponse.next()
  }
  
  // Para desarrollo local
  if (hostname.includes('localhost')) {
    // Simular subdominio con query param en desarrollo
    const subdomain = url.searchParams.get('subdomain')
    if (subdomain && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/admin')) {
      url.pathname = `/business/${subdomain}${url.pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }
  
  // Extraer subdominio
  const parts = hostname.split('.')
  const isSubdomain = parts.length >= 3 || (parts.length === 2 && !parts[0].includes('www'))
  
  if (isSubdomain && parts[0] !== 'www') {
    const subdomain = parts[0]
    
    // Redirigir subdominios a la ruta /business/[subdomain]
    if (!url.pathname.startsWith('/api') && !url.pathname.startsWith('/business')) {
      url.pathname = `/business/${subdomain}${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
