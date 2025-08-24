const { MongoClient } = require('mongodb');

// Mapeo de provincias a zonas horarias
const PROVINCE_TIMEZONE_MAP = {
  // Provincias peninsulares (mainland) - Europe/Madrid
  'Álava': 'Europe/Madrid',
  'Albacete': 'Europe/Madrid',
  'Alicante': 'Europe/Madrid',
  'Almería': 'Europe/Madrid',
  'Asturias': 'Europe/Madrid',
  'Ávila': 'Europe/Madrid',
  'Badajoz': 'Europe/Madrid',
  'Barcelona': 'Europe/Madrid',
  'Burgos': 'Europe/Madrid',
  'Cáceres': 'Europe/Madrid',
  'Cádiz': 'Europe/Madrid',
  'Cantabria': 'Europe/Madrid',
  'Castellón': 'Europe/Madrid',
  'Ciudad Real': 'Europe/Madrid',
  'Córdoba': 'Europe/Madrid',
  'Cuenca': 'Europe/Madrid',
  'Girona': 'Europe/Madrid',
  'Granada': 'Europe/Madrid',
  'Guadalajara': 'Europe/Madrid',
  'Guipúzcoa': 'Europe/Madrid',
  'Huelva': 'Europe/Madrid',
  'Huesca': 'Europe/Madrid',
  'Jaén': 'Europe/Madrid',
  'La Coruña (A Coruña)': 'Europe/Madrid',
  'La Rioja': 'Europe/Madrid',
  'León': 'Europe/Madrid',
  'Lleida': 'Europe/Madrid',
  'Lugo': 'Europe/Madrid',
  'Madrid': 'Europe/Madrid',
  'Málaga': 'Europe/Madrid',
  'Murcia': 'Europe/Madrid',
  'Navarra': 'Europe/Madrid',
  'Ourense': 'Europe/Madrid',
  'Palencia': 'Europe/Madrid',
  'Pontevedra': 'Europe/Madrid',
  'Salamanca': 'Europe/Madrid',
  'Segovia': 'Europe/Madrid',
  'Sevilla': 'Europe/Madrid',
  'Soria': 'Europe/Madrid',
  'Tarragona': 'Europe/Madrid',
  'Teruel': 'Europe/Madrid',
  'Toledo': 'Europe/Madrid',
  'Valencia': 'Europe/Madrid',
  'Valladolid': 'Europe/Madrid',
  'Zamora': 'Europe/Madrid',
  'Zaragoza': 'Europe/Madrid',
  
  // Islas Canarias - Atlantic/Canary
  'Tenerife': 'Atlantic/Canary',
  'Gran Canaria': 'Atlantic/Canary',
  'Lanzarote': 'Atlantic/Canary',
  'Fuerteventura': 'Atlantic/Canary',
  'La Palma': 'Atlantic/Canary',
  'La Gomera': 'Atlantic/Canary',
  'El Hierro': 'Atlantic/Canary',
  
  // Islas Baleares - Europe/Madrid
  'Mallorca': 'Europe/Madrid',
  'Menorca': 'Europe/Madrid',
  'Ibiza (Eivissa)': 'Europe/Madrid',
  'Formentera': 'Europe/Madrid',
  
  // Ciudades autónomas - Europe/Madrid
  'Ceuta': 'Europe/Madrid',
  'Melilla': 'Europe/Madrid'
};

// Función para detectar provincia desde la dirección
function detectProvinceFromAddress(address) {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  
  // Buscar coincidencias exactas primero
  for (const [province, timezone] of Object.entries(PROVINCE_TIMEZONE_MAP)) {
    if (addressLower.includes(province.toLowerCase())) {
      return { province, timezone };
    }
  }
  
  // Buscar palabras clave específicas para Canarias
  if (addressLower.includes('canarias') || addressLower.includes('tenerife')) {
    return { province: 'Tenerife', timezone: 'Atlantic/Canary' };
  }
  if (addressLower.includes('gran canaria') || addressLower.includes('las palmas')) {
    return { province: 'Gran Canaria', timezone: 'Atlantic/Canary' };
  }
  if (addressLower.includes('lanzarote')) {
    return { province: 'Lanzarote', timezone: 'Atlantic/Canary' };
  }
  if (addressLower.includes('fuerteventura')) {
    return { province: 'Fuerteventura', timezone: 'Atlantic/Canary' };
  }
  if (addressLower.includes('la palma')) {
    return { province: 'La Palma', timezone: 'Atlantic/Canary' };
  }
  if (addressLower.includes('la gomera')) {
    return { province: 'La Gomera', timezone: 'Atlantic/Canary' };
  }
  if (addressLower.includes('el hierro')) {
    return { province: 'El Hierro', timezone: 'Atlantic/Canary' };
  }
  
  return null;
}

async function updateBusinessTimezones() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tuvaloracion';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db('tuvaloracion');
    const businesses = await db.collection('businesses').find({}).toArray();
    
    console.log(`Encontrados ${businesses.length} negocios para actualizar`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const business of businesses) {
      // Si ya tiene location.timezone, saltar
      if (business.location?.timezone) {
        console.log(`✓ ${business.name} ya tiene zona horaria: ${business.location.timezone}`);
        skipped++;
        continue;
      }
      
      let locationData = {
        country: 'España',
        city: null,
        postalCode: null,
        address: business.contact?.address || '',
        timezone: 'Europe/Madrid' // Default
      };
      
      // Intentar detectar provincia desde la dirección
      const detectedLocation = detectProvinceFromAddress(business.contact?.address);
      if (detectedLocation) {
        locationData.city = detectedLocation.province;
        locationData.timezone = detectedLocation.timezone;
        console.log(`🔍 ${business.name}: Detectada provincia ${detectedLocation.province} -> ${detectedLocation.timezone}`);
      } else {
        console.log(`⚠️  ${business.name}: No se pudo detectar provincia, usando Madrid por defecto`);
      }
      
      // Actualizar el negocio
      await db.collection('businesses').updateOne(
        { _id: business._id },
        {
          $set: {
            location: locationData,
            updatedAt: new Date()
          }
        }
      );
      
      updated++;
      console.log(`✅ Actualizado: ${business.name}`);
    }
    
    console.log('\n=== RESUMEN ===');
    console.log(`✅ Negocios actualizados: ${updated}`);
    console.log(`⏭️  Negocios omitidos (ya tenían timezone): ${skipped}`);
    console.log(`📊 Total procesados: ${businesses.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateBusinessTimezones();
}

module.exports = { updateBusinessTimezones };
