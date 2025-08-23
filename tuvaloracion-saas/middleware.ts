import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Función para decodificar el JWT (sin verificar firma, solo para obtener payload)
function decodeToken(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )
    return payload
  } catch (error) {
    return null
  }
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  const hostname = request.headers.get('host') || ''
  
  // Obtener el dominio principal de las variables de entorno
  const mainDomain = process.env.APP_DOMAIN || 'tuvaloracion.com'
  const adminDomain = process.env.ADMIN_DOMAIN || 'admin.topestrellas.com'
  
  // Si es el dominio de admin, aplicar verificación de seguridad
  if (hostname === adminDomain || 
      hostname === 'admin.topestrellas.com' ||
      hostname.startsWith('admin.topestrellas.')) {
    
    // Obtener el token de autenticación
    const token = request.cookies.get('auth-token')?.value
    
    // Rutas que requieren autenticación
    const protectedPaths = ['/admin', '/super', '/affiliate']
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    
    // Si es una ruta protegida
    if (isProtectedPath) {
      // Permitir acceso a la página de login sin token
      if (pathname === '/admin' && !token) {
        return NextResponse.next()
      }
      
      // Si no hay token y no es la página de login, redireccionar
      if (!token && pathname !== '/admin') {
        console.log(`⚠️ Intento de acceso sin autenticación a: ${pathname}`)
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      
      // Si hay token, verificar permisos por rol
      if (token) {
        const payload = decodeToken(token)
        
        if (!payload || !payload.role) {
          console.error('❌ Token inválido o sin rol')
          // Token inválido, redireccionar a login
          const response = NextResponse.redirect(new URL('/admin', request.url))
          response.cookies.delete('auth-token')
          return response
        }
        
        const userRole = payload.role
        const userEmail = payload.email || 'unknown'
        
        // VERIFICACIÓN ESTRICTA DE ACCESO POR ROL
        
        // Rutas de SUPER ADMIN
        if (pathname.startsWith('/super')) {
          if (userRole !== 'super_admin') {
            console.error(`🚫 ACCESO DENEGADO: ${userEmail} (rol: ${userRole}) intentó acceder a ${pathname}`)
            
            // Redireccionar al panel correcto según su rol
            if (userRole === 'affiliate') {
              return NextResponse.redirect(new URL('/affiliate', request.url))
            } else if (userRole === 'admin') {
              return NextResponse.redirect(new URL('/admin', request.url))
            } else {
              return NextResponse.redirect(new URL('/admin', request.url))
            }
          }
        }
        
        // Rutas de AFFILIATE
        else if (pathname.startsWith('/affiliate')) {
          if (userRole !== 'affiliate') {
            console.error(`🚫 ACCESO DENEGADO: ${userEmail} (rol: ${userRole}) intentó acceder a ${pathname}`)
            
            // Redireccionar al panel correcto según su rol
            if (userRole === 'super_admin') {
              return NextResponse.redirect(new URL('/super', request.url))
            } else if (userRole === 'admin') {
              return NextResponse.redirect(new URL('/admin', request.url))
            } else {
              return NextResponse.redirect(new URL('/admin', request.url))
            }
          }
        }
        
        // Rutas de ADMIN normal
        else if (pathname.startsWith('/admin') && pathname !== '/admin') {
          // Super admin NO puede acceder al panel de admin normal
          if (userRole === 'super_admin') {
            console.error(`🚫 ACCESO DENEGADO: ${userEmail} (super_admin) intentó acceder a panel admin normal: ${pathname}`)
            return NextResponse.redirect(new URL('/super', request.url))
          }
          
          // Affiliate NO puede acceder al panel de admin
          if (userRole === 'affiliate') {
            console.error(`🚫 ACCESO DENEGADO: ${userEmail} (affiliate) intentó acceder a panel admin: ${pathname}`)
            return NextResponse.redirect(new URL('/affiliate', request.url))
          }
          
          // Si es admin normal, permitir acceso
          if (userRole !== 'admin') {
            console.error(`🚫 ACCESO DENEGADO: ${userEmail} (rol: ${userRole}) no tiene permisos de admin`)
            return NextResponse.redirect(new URL('/admin', request.url))
          }
        }
        
        // Log de acceso exitoso para auditoría
        if (pathname !== '/admin' || userRole) {
          console.log(`✅ Acceso permitido: ${userEmail} (${userRole}) → ${pathname}`)
        }
      }
    }
    
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
