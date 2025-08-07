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
  
  // Lógica mejorada de detección (copiada de la API)
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

  // También verificar que los primeros 3 premios estén configurados específicamente
  const firstThreePrizes = prizes.slice(0, 3);
  const configuredFirstThree = firstThreePrizes.filter((prize, index) => {
    if (!prize || !prize.translations || !prize.translations.es) {
      return false;
    }
    
    const name = prize.translations.es.name;
    return name && name.trim() !== '' && name.trim() !== `Premio ${index + 1}`;
  });

  // Mostrar mensaje si no tiene al menos 3 premios válidos O si los primeros 3 no están configurados
  const needsConfiguration = validPrizes.length < 3 || configuredFirstThree.length < 3;
  
  return {
    totalPrizes: prizes.length,
    validPrizes: validPrizes.length,
    configuredFirstThree: configuredFirstThree.length,
    needsConfiguration,
    missingCount: 3 - Math.max(validPrizes.length, configuredFirstThree.length)
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
  console.log('Primeros 3 configurados:', result.configuredFirstThree);
  console.log('¿Necesita configuración?', result.needsConfiguration ? 'SÍ' : 'NO');
  
  if (result.needsConfiguration) {
    console.log('✅ Se mostrará la nota importante');
    console.log(`📝 Mensaje: "¡IMPORTANTE! Debes configurar los premios de la ruleta en ${testCase.business.name}. Faltan ${result.missingCount > 0 ? result.missingCount : 'algunos'} premios por configurar"`);
    console.log(`🔗 URL: /admin/edit-business/${testCase.business._id}#premios`);
  } else {
    console.log('❌ No se mostrará la nota (premios correctamente configurados)');
  }
});

console.log('\n🎯 RESUMEN:');
console.log('===========');
console.log('La nueva lógica detecta:');
console.log('• Premios vacíos o sin configurar');
console.log('• Premios con nombres por defecto ("Premio 1", "Premio 2", etc.)');
console.log('• Verifica específicamente que los primeros 3 premios estén configurados');
console.log('• Persiste hasta que el usuario configure correctamente los premios');
