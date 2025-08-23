/**
 * Script de verificación para la migración de admin.topestrellas.com a panel.topestrellas.com
 * Ejecutar con: node scripts/verify-admin-migration.js
 */

const https = require('https');
const http = require('http');

const domains = [
  'panel.topestrellas.com',
  'admin.topestrellas.com' // dominio antiguo para verificar redirección
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function checkDomain(domain, protocol = 'https') {
  return new Promise((resolve) => {
    const module = protocol === 'https' ? https : http;
    const url = `${protocol}://${domain}/admin`;
    
    console.log(`${colors.blue}Verificando ${url}...${colors.reset}`);
    
    module.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Migration-Checker/1.0'
      }
    }, (res) => {
      const { statusCode } = res;
      
      if (statusCode === 200) {
        console.log(`${colors.green}✓ ${domain}: OK (Status: ${statusCode})${colors.reset}`);
        resolve({ domain, status: 'success', statusCode });
      } else if (statusCode === 301 || statusCode === 302) {
        const redirectTo = res.headers.location;
        console.log(`${colors.yellow}→ ${domain}: Redirección a ${redirectTo} (Status: ${statusCode})${colors.reset}`);
        resolve({ domain, status: 'redirect', statusCode, redirectTo });
      } else {
        console.log(`${colors.yellow}⚠ ${domain}: Status ${statusCode}${colors.reset}`);
        resolve({ domain, status: 'warning', statusCode });
      }
      
      // Consumir datos para evitar memory leaks
      res.resume();
    }).on('error', (err) => {
      console.log(`${colors.red}✗ ${domain}: Error - ${err.message}${colors.reset}`);
      resolve({ domain, status: 'error', error: err.message });
    }).on('timeout', () => {
      console.log(`${colors.red}✗ ${domain}: Timeout${colors.reset}`);
      resolve({ domain, status: 'timeout' });
    });
  });
}

async function verifyMigration() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Verificación de Migración Admin Panel${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  const results = [];
  
  // Verificar HTTPS
  console.log(`${colors.yellow}1. Verificando acceso HTTPS:${colors.reset}`);
  for (const domain of domains) {
    const result = await checkDomain(domain, 'https');
    results.push(result);
  }
  
  console.log(`\n${colors.yellow}2. Verificando redirección HTTP a HTTPS:${colors.reset}`);
  for (const domain of domains) {
    const result = await checkDomain(domain, 'http');
    results.push(result);
  }
  
  // Resumen
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}RESUMEN:${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  const httpsResults = results.filter(r => r.domain.includes('https'));
  const successCount = results.filter(r => r.status === 'success' || r.status === 'redirect').length;
  const errorCount = results.filter(r => r.status === 'error' || r.status === 'timeout').length;
  
  if (errorCount === 0) {
    console.log(`${colors.green}✓ Todos los dominios responden correctamente${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Algunos dominios tienen problemas${colors.reset}`);
  }
  
  console.log(`\n${colors.yellow}Próximos pasos:${colors.reset}`);
  console.log('1. Verificar que puedes iniciar sesión en ambos dominios');
  console.log('2. Comprobar que las funciones del panel funcionan correctamente');
  console.log('3. Revisar los logs del servidor para errores');
  console.log('4. Actualizar la variable ADMIN_DOMAIN en .env si no lo has hecho');
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

// Ejecutar verificación
verifyMigration().catch(console.error);
