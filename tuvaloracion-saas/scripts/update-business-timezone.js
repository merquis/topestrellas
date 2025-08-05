const { MongoClient } = require('mongodb');

// Mapeo de ciudades a zonas horarias
const CITY_TIMEZONE_MAP = {
  // Andalucía
  'Sevilla': 'Europe/Madrid',
  'Málaga': 'Europe/Madrid',
  'Córdoba': 'Europe/Madrid',
  'Granada': 'Europe/Madrid',
  'Cádiz': 'Europe/Madrid',
  'Almería': 'Europe/Madrid',
  'Huelva': 'Europe/Madrid',
  'Jaén': 'Europe/Madrid',
  
  // Madrid
  'Madrid': 'Europe/Madrid',
  'Alcalá de Henares': 'Europe/Madrid',
  'Fuenlabrada': 'Europe/Madrid',
  'Móstoles': 'Europe/Madrid',
  'Alcorcón': 'Europe/Madrid',
  'Leganés': 'Europe/Madrid',
  'Getafe': 'Europe/Madrid',
  
  // Cataluña
  'Barcelona': 'Europe/Madrid',
  'Hospitalet de Llobregat': 'Europe/Madrid',
  'Badalona': 'Europe/Madrid',
  'Terrassa': 'Europe/Madrid',
  'Sabadell': 'Europe/Madrid',
  'Lleida': 'Europe/Madrid',
  'Tarragona': 'Europe/Madrid',
  'Girona': 'Europe/Madrid',
  
  // Valencia
  'Valencia': 'Europe/Madrid',
  'Alicante': 'Europe/Madrid',
  'Elche': 'Europe/Madrid',
  'Castellón de la Plana': 'Europe/Madrid',
  'Torrevieja': 'Europe/Madrid',
  'Orihuela': 'Europe/Madrid',
  
  // País Vasco
  'Bilbao': 'Europe/Madrid',
  'Vitoria-Gasteiz': 'Europe/Madrid',
  'San Sebastián': 'Europe/Madrid',
  'Barakaldo': 'Europe/Madrid',
  
  // Galicia
  'Vigo': 'Europe/Madrid',
  'A Coruña': 'Europe/Madrid',
  'Ourense': 'Europe/Madrid',
  'Lugo': 'Europe/Madrid',
  'Santiago de Compostela': 'Europe/Madrid',
  
  // Canarias
  'Las Palmas de Gran Canaria': 'Atlantic/Canary',
  'Santa Cruz de Tenerife': 'Atlantic/Canary',
  'San Cristóbal de La Laguna': 'Atlantic/Canary',
  'Telde': 'Atlantic/Canary',
  'Santa Lucía de Tirajana': 'Atlantic/Canary',
  'Arona': 'Atlantic/Canary',
  'Arrecife': 'Atlantic/Canary',
  'Puerto del Rosario': 'Atlantic/Canary',
  'Los Llanos de Aridane': 'Atlantic/Canary',
  'San Sebastián de La Gomera': 'Atlantic/Canary',
  'Valverde': 'Atlantic/Canary',
  'Las Palmas': 'Atlantic/Canary',
  
  // Baleares
  'Palma de Mallorca': 'Europe/Madrid',
  'Ibiza': 'Europe/Madrid',
  'Mahón': 'Europe/Madrid',
  'Ciudadela de Menorca': 'Europe/Madrid',
  
  // Otras comunidades
  'Zaragoza': 'Europe/Madrid',
  'Murcia': 'Europe/Madrid',
  'Valladolid': 'Europe/Madrid',
  'Oviedo': 'Europe/Madrid',
  'Pamplona': 'Europe/Madrid',
  'Santander': 'Europe/Madrid',
  'Toledo': 'Europe/Madrid',
  'Badajoz': 'Europe/Madrid',
  'Salamanca': 'Europe/Madrid',
  'Mérida': 'Europe/Madrid',
  'Ávila': 'Europe/Madrid',
  'Cáceres': 'Europe/Madrid',
  'Guadalajara': 'Europe/Madrid',
  'Cuenca': 'Europe/Madrid',
  'Soria': 'Europe/Madrid',
  'Segovia': 'Europe/Madrid',
  'Albacete': 'Europe/Madrid',
  'Ciudad Real': 'Europe/Madrid',
  'Logroño': 'Europe/Madrid',
  'Huesca': 'Europe/Madrid',
  'Teruel': 'Europe/Madrid'
};

// Función para detectar ciudad desde la dirección
function detectCityFromAddress(address) {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  
  // Buscar coincidencias exactas primero
  for (const [city, timezone] of Object.entries(CITY_TIMEZONE_MAP)) {
    if (addressLower.includes(city.toLowerCase())) {
      return { city, timezone };
    }
  }
  
  // Buscar palabras clave específicas
  if (addressLower.includes('canarias') || addressLower.includes('tenerife') || 
      addressLower.includes('gran canaria') || addressLower.includes('lanzarote') ||
      addressLower.includes('fuerteventura') || addressLower.includes('la palma') ||
      addressLower.includes('la gomera') || addressLower.includes('el hierro')) {
    return { city: 'Las Palmas de Gran Canaria', timezone: 'Atlantic/Canary' };
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
      
      // Intentar detectar ciudad desde la dirección
      const detectedLocation = detectCityFromAddress(business.contact?.address);
      if (detectedLocation) {
        locationData.city = detectedLocation.city;
        locationData.timezone = detectedLocation.timezone;
        console.log(`🔍 ${business.name}: Detectada ciudad ${detectedLocation.city} -> ${detectedLocation.timezone}`);
      } else {
        console.log(`⚠️  ${business.name}: No se pudo detectar ciudad, usando Madrid por defecto`);
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
