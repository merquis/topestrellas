const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function initDatabase() {
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

    // Crear colecciones
    const collections = ['businesses', 'opinions', 'users', 'email_validations'];
    
    for (const collectionName of collections) {
      const exists = await db.listCollections({ name: collectionName }).hasNext();
      if (!exists) {
        await db.createCollection(collectionName);
        console.log(`✅ Colección '${collectionName}' creada`);
      } else {
        console.log(`ℹ️  Colección '${collectionName}' ya existe`);
      }
    }

    // Crear índices
    console.log('\n📋 Creando índices...');

    // Índices para businesses
    await db.collection('businesses').createIndex({ subdomain: 1 }, { unique: true });
    await db.collection('businesses').createIndex({ active: 1 });
    await db.collection('businesses').createIndex({ plan: 1 });
    console.log('✅ Índices de businesses creados');

    // Índices para opinions
    await db.collection('opinions').createIndex({ businessId: 1 });
    await db.collection('opinions').createIndex({ subdomain: 1 });
    await db.collection('opinions').createIndex({ createdAt: -1 });
    await db.collection('opinions').createIndex({ 'customer.email': 1 });
    console.log('✅ Índices de opinions creados');

    // Índices para users
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ businessId: 1 });
    console.log('✅ Índices de users creados');

    // Índices para email_validations
    await db.collection('email_validations').createIndex({ email: 1, businessId: 1 });
    await db.collection('email_validations').createIndex({ usedAt: 1 });
    console.log('✅ Índices de email_validations creados');

    // Crear negocio de ejemplo con todos los campos personalizables
    const exampleBusiness = {
      subdomain: 'demo',
      name: 'Restaurante Pizzería EURO',
      type: 'restaurante',
      category: 'Internacional, Canaria',
      phone: '+34666543026',
      email: 'info@restaurantepizzeriaeuro.com',
      address: 'Paseo marítimo 6',
      googleReviewUrl: 'https://google.es',
      plan: 'basic',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: {
        theme: {
          primaryColor: '#f97316',
          secondaryColor: '#ea580c',
          bgPrimary: '#1a1a2e',
          bgSecondary: '#16213e',
          buttonPrimary: '#5a6c7d',
          buttonSecondary: '#6c7b8a'
        },
        rouletteColors: [
          '#e67e22', '#e74c3c', '#2980b9', '#8e44ad',
          '#27ae60', '#f1c40f', '#3498db', '#9b59b6'
        ],
        languages: ['es', 'en', 'de', 'fr'],
        prizes: [
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
        ],
        features: {
          showScarcityIndicators: true,
          showPrizeWheel: true,
          requireGoogleReview: true
        },
        webhooks: {
          saveLeadUrl: 'https://n8n-n8n.hpv7eo.easypanel.host/webhook/guardar-lead',
          verifyEmailUrl: 'https://n8n-n8n.hpv7eo.easypanel.host/webhook/verificar-email',
          getOpinionsUrl: 'https://n8n-n8n.hpv7eo.easypanel.host/webhook/opiniones'
        }
      }
    };

    const existingDemo = await db.collection('businesses').findOne({ subdomain: 'demo' });
    if (!existingDemo) {
      await db.collection('businesses').insertOne(exampleBusiness);
      console.log('\n✅ Negocio de demo creado');
      console.log('   Puedes acceder en: http://localhost:3000?subdomain=demo');
    } else {
      console.log('\nℹ️  Negocio de demo ya existe');
    }

    console.log('\n🎉 Base de datos inicializada correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initDatabase();
