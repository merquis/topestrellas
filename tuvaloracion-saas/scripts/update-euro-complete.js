const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function updateEuroComplete() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI no está configurado en .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db('tuvaloracion');
    
    // Obtener el negocio actual
    const currentBusiness = await db.collection('businesses').findOne({ subdomain: 'restaurante-euro' });
    
    if (!currentBusiness) {
      console.error('❌ No se encontró el negocio restaurante-euro');
      return;
    }
    
    // Actualizar los premios con traducciones completas
    const updatedPrizes = [
      {
        index: 0,
        value: '60€',
        translations: {
          es: { name: 'CENA (VALOR 60€)', emoji: '🍽️' },
          en: { name: 'DINNER (VALUE €60)', emoji: '🍽️' },
          de: { name: 'ABENDESSEN (WERT 60€)', emoji: '🍽️' },
          fr: { name: 'DÎNER (VALEUR 60€)', emoji: '🍽️' }
        }
      },
      {
        index: 1,
        value: '30€',
        translations: {
          es: { name: '30€ DESCUENTO', emoji: '💰' },
          en: { name: '€30 DISCOUNT', emoji: '💰' },
          de: { name: '30€ RABATT', emoji: '💰' },
          fr: { name: '30€ DE RÉDUCTION', emoji: '💰' }
        }
      },
      {
        index: 2,
        value: '25€',
        translations: {
          es: { name: 'BOTELLA VINO', emoji: '🍾' },
          en: { name: 'WINE BOTTLE', emoji: '🍾' },
          de: { name: 'WEINFLASCHE', emoji: '🍾' },
          fr: { name: 'BOUTEILLE DE VIN', emoji: '🍾' }
        }
      },
      {
        index: 3,
        value: '10€',
        translations: {
          es: { name: 'HELADO', emoji: '🍦' },
          en: { name: 'ICE CREAM', emoji: '🍦' },
          de: { name: 'EIS', emoji: '🍦' },
          fr: { name: 'GLACE', emoji: '🍦' }
        }
      },
      {
        index: 4,
        value: '5€',
        translations: {
          es: { name: 'CERVEZA', emoji: '🍺' },
          en: { name: 'BEER', emoji: '🍺' },
          de: { name: 'BIER', emoji: '🍺' },
          fr: { name: 'BIÈRE', emoji: '🍺' }
        }
      },
      {
        index: 5,
        value: '3€',
        translations: {
          es: { name: 'REFRESCO', emoji: '🥤' },
          en: { name: 'SOFT DRINK', emoji: '🥤' },
          de: { name: 'ERFRISCHUNG', emoji: '🥤' },
          fr: { name: 'BOISSON', emoji: '🥤' }
        }
      },
      {
        index: 6,
        value: '8€',
        translations: {
          es: { name: 'MOJITO', emoji: '🍹' },
          en: { name: 'MOJITO', emoji: '🍹' },
          de: { name: 'MOJITO', emoji: '🍹' },
          fr: { name: 'MOJITO', emoji: '🍹' }
        }
      },
      {
        index: 7,
        value: '2€',
        translations: {
          es: { name: 'CHUPITO', emoji: '🥃' },
          en: { name: 'SHOT', emoji: '🥃' },
          de: { name: 'SHOT', emoji: '🥃' },
          fr: { name: 'SHOT', emoji: '🥃' }
        }
      }
    ];
    
    // Actualizar el negocio con idiomas y premios completos
    const result = await db.collection('businesses').updateOne(
      { subdomain: 'restaurante-euro' },
      { 
        $set: { 
          'config.languages': ['es', 'en', 'de', 'fr'],
          'config.prizes': updatedPrizes,
          // Agregar colores de ruleta si no existen
          'config.rouletteColors': currentBusiness.config.rouletteColors || [
            '#e67e22', '#e74c3c', '#2980b9', '#8e44ad',
            '#27ae60', '#f1c40f', '#3498db', '#9b59b6'
          ],
          // Agregar colores del tema si faltan
          'config.theme.bgPrimary': currentBusiness.config.theme?.bgPrimary || '#1a1a2e',
          'config.theme.bgSecondary': currentBusiness.config.theme?.bgSecondary || '#16213e',
          'config.theme.buttonPrimary': currentBusiness.config.theme?.buttonPrimary || '#5a6c7d',
          'config.theme.buttonSecondary': currentBusiness.config.theme?.buttonSecondary || '#6c7b8a',
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Negocio restaurante-euro actualizado completamente');
    }
    
    // Verificar el estado final
    const updatedBusiness = await db.collection('businesses').findOne({ subdomain: 'restaurante-euro' });
    if (updatedBusiness) {
      console.log('\n📋 Estado final del negocio:');
      console.log('   - Nombre:', updatedBusiness.name);
      console.log('   - Idiomas:', updatedBusiness.config.languages);
      console.log('   - Número de premios:', updatedBusiness.config.prizes.length);
      console.log('   - Active:', updatedBusiness.active);
      console.log('   - Colores de ruleta:', updatedBusiness.config.rouletteColors?.length || 0);
    }
    
    console.log('\n🎉 Actualización completada');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

updateEuroComplete();
