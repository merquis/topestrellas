import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const client = await clientPromise;
    const db = client.db('tuvaloracion');
    
    let searchFilter = {};
    
    if (query.trim()) {
      // Escapar caracteres especiales de regex y buscar en cualquier parte del nombre
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchFilter = {
        name: { $regex: escapedQuery, $options: 'i' }
      };
      
      // Log para debug
      console.log(`Searching businesses with query: "${query}" -> regex: "${escapedQuery}"`);
    }
    
    const businesses = await db.collection('businesses')
      .find(searchFilter)
      .limit(Math.min(limit, 50)) // Máximo 50 resultados
      .sort({ name: 1 })
      .toArray();
    
    const formattedBusinesses = businesses.map(business => ({
      id: business._id.toString(),
      name: business.name,
      type: business.type || 'Negocio',
      subdomain: business.subdomain,
      active: business.active !== false
    }));
    
    return NextResponse.json(formattedBusinesses);
    
  } catch (error) {
    console.error('Error searching businesses:', error);
    return NextResponse.json(
      { error: 'Error al buscar negocios' },
      { status: 500 }
    );
  }
}
