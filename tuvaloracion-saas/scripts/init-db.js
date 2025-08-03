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
    await db.collection('businesses').createIndex({ 'subscription.validUntil': 1 });
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

    // Crear negocio de ejemplo
    const exampleBusiness = {
      subdomain: 'demo',
      name: 'Restaurante Demo',
      type: 'restaurante',
      category: 'Mediterráneo',
      config: {
        languages: ['es', 'en'],
        defaultLanguage: 'es',
        googleReviewUrl: 'https://g.page/r/example',
        theme: {
          primaryColor: '#f97316',
          secondaryColor: '#ea580c'
        },
        prizes: [
          {
            index: 0,
            value: '60€',
            translations: {
              es: { name: 'Cena para 2', emoji: '🍽️' },
              en: { name: 'Dinner for 2', emoji: '🍽️' }
            }
          },
          {
            index: 1,
            value: '30€',
            translations: {
              es: { name: 'Descuento 30€', emoji: '💰' },
              en: { name: '€30 Discount', emoji: '💰' }
            }
          },
          {
            index: 2,
            value: '25€',
            translations: {
              es: { name: 'Botella de vino', emoji: '🍾' },
              en: { name: 'Wine bottle', emoji: '🍾' }
            }
          },
          {
            index: 3,
            value: '10€',
            translations: {
              es: { name: 'Postre gratis', emoji: '🍦' },
              en: { name: 'Free dessert', emoji: '🍦' }
            }
          },
          {
            index: 4,
            value: '5€',
            translations: {
              es: { name: 'Bebida gratis', emoji: '🍺' },
              en: { name: 'Free drink', emoji: '🍺' }
            }
          },
          {
            index: 5,
            value: '3€',
            translations: {
              es: { name: 'Café gratis', emoji: '☕' },
              en: { name: 'Free coffee', emoji: '☕' }
            }
          },
          {
            index: 6,
            value: '8€',
            translations: {
              es: { name: 'Cóctel gratis', emoji: '🍹' },
              en: { name: 'Free cocktail', emoji: '🍹' }
            }
          },
          {
            index: 7,
            value: '2€',
            translations: {
              es: { name: 'Chupito gratis', emoji: '🥃' },
              en: { name: 'Free shot', emoji: '🥃' }
            }
          }
        ],
        features: {
          showScarcityIndicators: true,
          requireGoogleReview: true
        }
      },
      contact: {
        phone: '+34 900 000 000',
        email: 'demo@tuvaloracion.com',
        address: 'Calle Demo 123, Madrid'
      },
      subscription: {
        plan: 'trial',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        status: 'active'
      },
      stats: {
        totalOpinions: 0,
        totalPrizesGiven: 0,
        avgRating: 0
      },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
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
