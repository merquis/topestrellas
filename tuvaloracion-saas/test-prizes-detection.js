// Script de prueba para verificar la detección de premios no configurados
// Este script simula la lógica mejorada que se ejecuta en la API

const testCases = [
  {
    name: "Caso 1: Sin premios configurados",
    business: {
      _id: "test123",
      name: "Restaurante Sin Premios",
      config: {
        prizes: []
      }
    }
  },
  {
    name: "Caso 2: Solo 2 premios válidos",
    business: {
      _id: "test456",
      name: "Restaurante Parcial",
      config: {
        prizes: [
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
        ]
      }
    }
  },
  {
    name: "Caso 3: Premios con nombres por defecto",
    business: {
      _id: "test789",
      name: "Restaurante Por Defecto",
      config: {
        prizes: [
          {
            translations: {
              es: {
                name: "Premio 1"
              }
            }
          },
          {
            translations: {
              es: {
                name: "Premio 2"
              }
            }
          },
          {
            translations: {
              es: {
                name: "Premio 3"
              }
            }
          }
        ]
      }
    }
  },
  {
    name: "Caso 4: Premios correctamente configurados",
    business: {
      _id: "test101",
      name: "Restaurante Completo",
      config: {
        prizes: [
          {
            translations: {
              es: {
                name: "Cena gratis para 2"
              }
            }
          },
          {
            translations: {
              es: {
                name: "Botella de vino"
              }
            }
          },
          {
            translations: {
              es: {
                name: "Postre de la casa"
              }
            }
          }
        ]
      }
    }
  }
];

function testPrizeDetection(business) {
  const prizes = business.config?.prizes || [];
  
  // NUEVA LÓGICA ESTRICTA: Todos los 8 premios deben estar configurados
  const validPrizes = prizes.filter((prize, index) => {
    if (!prize || !prize.translations || !prize.translations.es) {
      return false;
    }
    
    const name = prize.translations.es.name;
    if (!name || name.trim() === '' || name.trim() === `Premio ${index + 1}`) {
      return false; // Rechazar nombres vacíos o por defecto
    }
    
    return true;
  });

  // Verificar que TODOS los 8 premios estén configurados
  const needsConfiguration = validPrizes.length < 8;
  
  return {
    totalPrizes: prizes.length,
    validPrizes: validPrizes.length,
    needsConfiguration,
    missingCount: 8 - validPrizes.length,
    totalRequired: 8
  };
}

console.log('🧪 PRUEBA MEJORADA DE DETECCIÓN DE PREMIOS');
console.log('==========================================');

testCases.forEach((testCase, index) => {
  console.log(`\n${testCase.name}:`);
  console.log('─'.repeat(50));
  
  const result = testPrizeDetection(testCase.business);
  
  console.log('Negocio:', testCase.business.name);
  console.log('Premios totales:', result.totalPrizes);
  console.log('Premios válidos:', result.validPrizes);
  console.log('Requeridos:', result.totalRequired);
  console.log('Faltan:', result.missingCount);
  console.log('¿Necesita configuración?', result.needsConfiguration ? 'SÍ' : 'NO');
  
  if (result.needsConfiguration) {
    console.log('✅ Se mostrará la nota importante');
    console.log(`📝 Mensaje: "¡IMPORTANTE! Debes configurar TODOS los premios de la ruleta en ${testCase.business.name}. Faltan ${result.missingCount} premios por configurar"`);
    console.log(`🔗 URL: /admin/edit-business/${testCase.business._id}#premios`);
  } else {
    console.log('❌ No se mostrará la nota (todos los 8 premios configurados)');
  }
});

console.log('\n🎯 RESUMEN - ESTRATEGIA ESTRICTA:');
console.log('=================================');
console.log('La nueva lógica ESTRICTA requiere:');
console.log('• TODOS los 8 premios deben estar configurados');
console.log('• Rechaza premios vacíos o sin configurar');
console.log('• Rechaza premios con nombres por defecto ("Premio 1", "Premio 2", etc.)');
console.log('• El mensaje persiste hasta configurar los 8 premios completos');
console.log('• Solo desaparece cuando validPrizes.length === 8');
