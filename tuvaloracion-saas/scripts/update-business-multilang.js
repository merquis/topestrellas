const { MongoClient } = require('mongodb');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'tuvaloracion';

async function updateBusinessesWithMultiLanguage() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db(DB_NAME);
    const businessesCollection = db.collection('businesses');
    
    // Buscar todos los negocios que no tienen los 4 idiomas
    const businesses = await businessesCollection.find({
      $or: [
        { 'config.languages': { $ne: ['es', 'en', 'de', 'fr'] } },
        { 'config.languages': { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Encontrados ${businesses.length} negocios para actualizar`);
    
    for (const business of businesses) {
      console.log(`Actualizando negocio: ${business.name} (${business.subdomain})`);
      
      // Actualizar idiomas
      const updateData = {
        'config.languages': ['es', 'en', 'de', 'fr'],
        'config.defaultLanguage': 'es',
        updatedAt: new Date()
      };
      
      // Actualizar premios con traducciones completas si no las tienen
      if (!business.config?.prizes || 
          !business.config.prizes[0]?.translations?.de || 
          !business.config.prizes[0]?.translations?.fr) {
        
        updateData['config.prizes'] = [
          {
            index: 0,
            value: '60€',
            translations: {
              es: { name: 'Premio Mayor', emoji: '🎁' },
              en: { name: 'Grand Prize', emoji: '🎁' },
              de: { name: 'Hauptpreis', emoji: '🎁' },
              fr: { name: 'Grand Prix', emoji: '🎁' }
            }
          },
          {
            index: 1,
            value: '30€',
            translations: {
              es: { name: 'Descuento 30€', emoji: '💰' },
              en: { name: '€30 Discount', emoji: '💰' },
              de: { name: '30€ Rabatt', emoji: '💰' },
              fr: { name: '30€ de Réduction', emoji: '💰' }
            }
          },
          {
            index: 2,
            value: '25€',
            translations: {
              es: { name: 'Vale 25€', emoji: '🎟️' },
              en: { name: '€25 Voucher', emoji: '🎟️' },
              de: { name: '25€ Gutschein', emoji: '🎟️' },
              fr: { name: 'Bon 25€', emoji: '🎟️' }
            }
          },
          {
            index: 3,
            value: '10€',
            translations: {
              es: { name: 'Descuento 10€', emoji: '💵' },
              en: { name: '€10 Discount', emoji: '💵' },
              de: { name: '10€ Rabatt', emoji: '💵' },
              fr: { name: '10€ de Réduction', emoji: '💵' }
            }
          },
          {
            index: 4,
            value: '5€',
            translations: {
              es: { name: 'Vale 5€', emoji: '🎫' },
              en: { name: '€5 Voucher', emoji: '🎫' },
              de: { name: '5€ Gutschein', emoji: '🎫' },
              fr: { name: 'Bon 5€', emoji: '🎫' }
            }
          },
          {
            index: 5,
            value: '3€',
            translations: {
              es: { name: 'Descuento 3€', emoji: '🪙' },
              en: { name: '€3 Discount', emoji: '🪙' },
              de: { name: '3€ Rabatt', emoji: '🪙' },
              fr: { name: '3€ de Réduction', emoji: '🪙' }
            }
          },
          {
            index: 6,
            value: '8€',
            translations: {
              es: { name: 'Vale 8€', emoji: '🎯' },
              en: { name: '€8 Voucher', emoji: '🎯' },
              de: { name: '8€ Gutschein', emoji: '🎯' },
              fr: { name: 'Bon 8€', emoji: '🎯' }
            }
          },
          {
            index: 7,
            value: '2€',
            translations: {
              es: { name: 'Descuento 2€', emoji: '✨' },
              en: { name: '€2 Discount', emoji: '✨' },
              de: { name: '2€ Rabatt', emoji: '✨' },
              fr: { name: '2€ de Réduction', emoji: '✨' }
            }
          }
        ];
      }
      
      // Realizar la actualización
      const result = await businessesCollection.updateOne(
        { _id: business._id },
        { $set: updateData }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Negocio ${business.name} actualizado correctamente`);
      } else {
        console.log(`⚠️ No se pudo actualizar el negocio ${business.name}`);
      }
    }
    
    console.log('\n🎉 Actualización completada!');
    console.log(`Total de negocios procesados: ${businesses.length}`);
    
  } catch (error) {
    console.error('Error durante la actualización:', error);
  } finally {
    await client.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar el script
if (require.main === module) {
  updateBusinessesWithMultiLanguage()
    .then(() => {
      console.log('Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error ejecutando el script:', error);
      process.exit(1);
    });
}

module.exports = { updateBusinessesWithMultiLanguage };
