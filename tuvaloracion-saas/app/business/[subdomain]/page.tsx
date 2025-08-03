import { notFound } from 'next/navigation'
import { getDatabase } from '@/lib/mongodb'
import { Business } from '@/lib/types'
import BusinessReviewApp from '@/components/BusinessReviewApp'

interface PageProps {
  params: {
    subdomain: string
  }
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
    // Solo suspender si isActive es explícitamente false
    const isSuspended = serializedBusiness.isActive === false
    
    // Log para depuración
    console.log('Business subdomain:', subdomain)
    console.log('Business isActive (raw):', business.isActive)
    console.log('Business isActive (serialized):', serializedBusiness.isActive)
    console.log('Is suspended:', isSuspended)
    
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
  const { business, isSuspended } = await getBusinessBySubdomain(params.subdomain)
  
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
  const { business, isSuspended } = await getBusinessBySubdomain(params.subdomain)
  
  if (!business) {
    notFound()
  }
  
  // TEMPORALMENTE DESHABILITADO: Si el negocio está suspendido, mostrar página de suspensión
  // Solo mostrar página de suspensión si isActive es explícitamente false
  if (false && isSuspended && business) {
    // Este código no se ejecutará por ahora
  }
  
  return <BusinessReviewApp business={business!} />
}
