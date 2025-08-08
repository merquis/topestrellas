const fs = require('fs');
const path = require('path');

// Lista de archivos API que necesitan ser corregidos
const apiFiles = [
  'app/api/admin/users/[id]/route.ts',
  'app/api/admin/subscriptions/[id]/cancel/route.ts',
  'app/api/admin/subscriptions/[id]/set-custom-date/route.ts',
  'app/api/admin/subscriptions/[id]/resume/route.ts',
  'app/api/admin/subscriptions/[id]/renew/route.ts',
  'app/api/admin/subscriptions/[id]/pause/route.ts',
  'app/api/admin/subscriptions/[id]/change-plan/route.ts',
  'app/api/admin/subscription-plans/[id]/route.ts'
];

function fixApiFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Archivo no encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Patrón para encontrar funciones de API con parámetros dinámicos
    const patterns = [
      // Para funciones con { params }: { params: { id: string } }
      {
        search: /(\w+)\s*\(\s*([^,]+),\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*(\w+):\s*string\s*\}\s*\}\s*\)/g,
        replace: '$1($2, { params }: { params: Promise<{ $3: string }> })'
      },
      // Para funciones con { params }: { params: { subdomain: string } }
      {
        search: /(\w+)\s*\(\s*([^,]+),\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*subdomain:\s*string\s*\}\s*\}\s*\)/g,
        replace: '$1($2, { params }: { params: Promise<{ subdomain: string }> })'
      }
    ];

    // Aplicar patrones de reemplazo
    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
      }
    });

    // Agregar resolución de parámetros al inicio de cada función
    if (modified) {
      // Buscar el inicio de cada función y agregar la resolución de parámetros
      content = content.replace(
        /(export\s+async\s+function\s+\w+\s*\([^)]+Promise<[^>]+>\s*\)\s*\)\s*\{)/g,
        '$1\n  const resolvedParams = await params;'
      );

      // Reemplazar todas las referencias a params.xxx con resolvedParams.xxx
      content = content.replace(/params\.(\w+)/g, 'resolvedParams.$1');
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Corregido: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  Sin cambios: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return false;
  }
}

// Ejecutar correcciones
console.log('🔧 Iniciando corrección de archivos API...\n');

let correctedCount = 0;
apiFiles.forEach(file => {
  if (fixApiFile(file)) {
    correctedCount++;
  }
});

console.log(`\n✨ Proceso completado. ${correctedCount} archivos corregidos de ${apiFiles.length} total.`);
