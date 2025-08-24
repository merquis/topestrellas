const fs = require('fs');
const path = require('path');

// Lista de archivos a corregir
const files = [
  'app/api/business/[subdomain]/increment-counter/route.ts',
  'app/api/auth/route.ts',
  'app/api/admin/users/[id]/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/businesses/search/route.ts',
  'app/api/admin/businesses/route.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Reemplazar import
    content = content.replace(
      "import clientPromise from '@/lib/mongodb';",
      "import getMongoClientPromise from '@/lib/mongodb';"
    );
    
    // Reemplazar uso
    content = content.replace(
      /const client = await clientPromise;/g,
      'const client = await getMongoClientPromise();'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Corregido: ${file}`);
  } catch (error) {
    console.error(`❌ Error en ${file}:`, error.message);
  }
});

console.log('\n✨ Corrección completada');
