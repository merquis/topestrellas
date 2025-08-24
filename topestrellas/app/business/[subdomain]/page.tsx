import { notFound } from 'next/navigation'
import { getDatabase } from '@/lib/mongodb'
import { Business } from '@/lib/types'
import BusinessReviewApp from '@/components/BusinessReviewApp'

interface PageProps {
  params: Promise<{
    subdomain: string
  }>
}

async function getBusinessBySubdomain(subdomain: string): Promise<{ business: Business | null, isSuspended: boolean }> {
  try {
    const db = await getDatabase()
    
    // Primero buscar el negocio sin importar si está activo
    const business = await db.collection<Business>('businesses').findOne({
      subdomain: subdomain
    })
    
    if (!business) return { business: null, isSuspended: false }
    
    // Convertir ObjectId a string para serialización ANTES de verificar isActive
    const serializedBusiness = JSON.parse(JSON.stringify(business))
    
    // Verificar si está suspendido
    // Solo suspender si active es explícitamente false (en la BD se llama "active", no "isActive")
    const isSuspended = serializedBusiness.active === false
    
    return { 
      business: serializedBusiness,
      isSuspended
    }
  } catch (error) {
    console.error('Error fetching business:', error)
    return { business: null, isSuspended: false }
  }
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const { business, isSuspended } = await getBusinessBySubdomain(resolvedParams.subdomain)
  
  if (!business) {
    return {
      title: 'Negocio no encontrado',
      description: 'El negocio que buscas no existe'
    }
  }
  
  if (isSuspended) {
    return {
      title: `${business.name} - Servicio suspendido`,
      description: `El servicio de ${business.name} se encuentra temporalmente suspendido`
    }
  }
  
  return {
    title: `${business.name} - Deja tu reseña`,
    description: `Comparte tu experiencia en ${business.name} y gana premios exclusivos`,
  }
}

export default async function BusinessPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { business, isSuspended } = await getBusinessBySubdomain(resolvedParams.subdomain)
  
  if (!business) {
    notFound()
  }
  
  // Si el negocio está suspendido, mostrar página de suspensión
  if (isSuspended && business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Servicio Temporalmente Suspendido
          </h1>
          
          <p className="text-gray-600 mb-6">
            Lo sentimos, el servicio de <span className="font-semibold">{business.name}</span> se encuentra temporalmente suspendido.
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              Si eres el propietario de este negocio, por favor contacta con el administrador para reactivar tu servicio.
            </p>
          </div>
          
          {business.email && (
            <div className="text-sm text-gray-500">
              <p>Para más información:</p>
              <a href={`mailto:${business.email}`} className="text-orange-500 hover:text-orange-600 font-medium">
                {business.email}
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return <BusinessReviewApp business={business!} />
}
