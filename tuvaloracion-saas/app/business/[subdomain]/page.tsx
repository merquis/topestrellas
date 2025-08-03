import { notFound } from 'next/navigation'
import { getDatabase } from '@/lib/mongodb'
import { Business } from '@/lib/types'
import BusinessReviewApp from '@/components/BusinessReviewApp'

interface PageProps {
  params: {
    subdomain: string
  }
}

async function getBusinessBySubdomain(subdomain: string): Promise<Business | null> {
  try {
    const db = await getDatabase()
    const business = await db.collection<Business>('businesses').findOne({
      subdomain: subdomain,
      active: true
    })
    
    if (!business) return null
    
    // Convertir ObjectId a string para serialización
    return JSON.parse(JSON.stringify(business))
  } catch (error) {
    console.error('Error fetching business:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps) {
  const business = await getBusinessBySubdomain(params.subdomain)
  
  if (!business) {
    return {
      title: 'Negocio no encontrado',
      description: 'El negocio que buscas no existe o no está activo'
    }
  }
  
  return {
    title: `${business.name} - Deja tu reseña`,
    description: `Comparte tu experiencia en ${business.name} y gana premios exclusivos`,
  }
}

export default async function BusinessPage({ params }: PageProps) {
  const business = await getBusinessBySubdomain(params.subdomain)
  
  if (!business) {
    notFound()
  }
  
  return <BusinessReviewApp business={business} />
}
