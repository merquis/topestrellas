// Script de prueba para verificar la detección de premios no configurados
// Este script simula la lógica que se ejecuta en la API

const testBusiness = {
  _id: "test123",
  name: "Restaurante Test",
  config: {
    prizes: [
      // Simulamos que solo hay 2 premios configurados de los 8 necesarios
      {
        translations: {
          es: {
            name: "Descuento 10%"
          }
        }
      },
      {
        translations: {
          es: {
            name: "Café gratis"
          }
        }
      }
      // Los otros 6 premios están vacíos o no configurados
    ]
  }
};

// Lógica de detección (copiada de la API)
const prizes = testBusiness.config?.prizes || [];

const configuredPrizes = prizes.filter((prize) => 
  prize && 
  prize.translations && 
  prize.translations.es && 
  prize.translations.es.name && 
  prize.translations.es.name.trim() !== ''
);

console.log('🧪 PRUEBA DE DETECCIÓN DE PREMIOS');
console.log('================================');
console.log('Negocio:', testBusiness.name);
console.log('Premios totales en config:', prizes.length);
console.log('Premios configurados correctamente:', configuredPrizes.length);
console.log('¿Necesita configurar premios?', configuredPrizes.length < 3 ? 'SÍ' : 'NO');

if (configuredPrizes.length < 3) {
  console.log('✅ La detección funciona correctamente');
  console.log('📝 Se mostrará la nota importante en el dashboard');
} else {
  console.log('❌ No se mostrará la nota (premios ya configurados)');
}

console.log('\n🔗 URL que se generará:');
console.log(`/admin/edit-business/${testBusiness._id}#premios`);
