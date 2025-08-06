# 📱 Módulo de Generación de Códigos QR

## 🎯 Descripción

Módulo independiente y escalable para la generación de códigos QR con diferentes configuraciones y casos de uso. Diseñado para crecer y añadir personalizaciones futuras.

## 📁 Estructura del Módulo

```
lib/
├── qr-generator.ts          # Librería principal
components/
├── QRCodeGenerator.tsx      # Componente base
├── BusinessQR.tsx           # Componente específico para negocios
└── MultiQRDownload.tsx      # Componente multi-descarga
```

## 🔧 Instalación

Las dependencias ya están añadidas al `package.json`:

```json
{
  "dependencies": {
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

## 📖 Uso Básico

### 1. Generación Simple

```typescript
import { QRGenerator } from '@/lib/qr-generator';

// Generar QR básico
const qrResult = await QRGenerator.generate('https://ejemplo.com');

// Generar QR para negocio
const businessQR = await QRGenerator.generateBusinessQR('restaurante-colibri');
```

### 2. Componente React

```tsx
import { BusinessQR } from '@/components/QRCodeGenerator';

function MyComponent() {
  return (
    <BusinessQR 
      subdomain="restaurante-colibri"
      businessName="Restaurante Colibrí"
      type="display"
      showDownloadButton={true}
    />
  );
}
```

## 🎨 Tipos de QR Disponibles

### 📱 Display (120×120px)
- **Uso**: Vista previa en pantalla
- **DPI**: 72
- **Tamaño físico**: 4.2×4.2 cm

### 🌐 Web (300×300px)
- **Uso**: Uso web responsive
- **DPI**: 72
- **Tamaño físico**: 10.5×10.5 cm

### 📄 Print (1800×1800px)
- **Uso**: Impresión profesional
- **DPI**: 300
- **Tamaño físico**: 15×15 cm
- **Calidad**: Perfecta para impresión

## 🚀 Funcionalidades

### ✅ Características Actuales

- **Múltiples resoluciones**: Display, Web, Print
- **Descarga automática**: Con nombres de archivo inteligentes
- **Corrección de errores**: Nivel H para impresión
- **Componentes React**: Listos para usar
- **TypeScript**: Completamente tipado
- **Responsive**: Adaptable a diferentes pantallas

### 🔮 Funcionalidades Futuras (Escalabilidad)

- **Personalización de colores**: Colores corporativos
- **Logos en QR**: Insertar logo en el centro
- **Formatos adicionales**: SVG, PDF
- **Batch generation**: Generar múltiples QRs
- **Analytics**: Tracking de escaneos
- **Plantillas**: QRs con marcos personalizados
- **API REST**: Endpoint para generar QRs
- **Cache**: Sistema de caché para QRs frecuentes

## 📋 API Reference

### QRGenerator Class

#### `generate(data, type, customConfig)`
Genera un código QR con configuración específica.

**Parámetros:**
- `data` (string): Datos a codificar
- `type` (QRType): 'display' | 'web' | 'print'
- `customConfig` (Partial<QRConfig>): Configuración personalizada

**Retorna:** `Promise<QRResult>`

#### `generateBusinessQR(subdomain, type)`
Genera QR específico para URLs de negocios.

**Parámetros:**
- `subdomain` (string): Subdominio del negocio
- `type` (QRType): Tipo de QR a generar

**Retorna:** `Promise<QRResult>`

#### `downloadQR(qrResult)`
Descarga un QR como archivo PNG.

**Parámetros:**
- `qrResult` (QRResult): Resultado de QR generado

### Componentes React

#### `<QRCodeGenerator />`
Componente base para generar QRs.

**Props:**
- `data` (string): Datos para el QR
- `type` (QRType): Tipo de QR
- `showDownloadButton` (boolean): Mostrar botón de descarga
- `onGenerated` (function): Callback cuando se genera
- `onError` (function): Callback de error

#### `<BusinessQR />`
Componente específico para negocios.

**Props:**
- `subdomain` (string): Subdominio del negocio
- `businessName` (string): Nombre del negocio
- `type` (QRType): Tipo de QR
- `showDownloadButton` (boolean): Mostrar botón de descarga

#### `<MultiQRDownload />`
Componente con múltiples opciones de descarga.

**Props:**
- `data` (string): Datos para el QR
- `filename` (string): Nombre base del archivo

## 🎯 Casos de Uso

### 1. Panel de Administración
```tsx
// En my-business/page.tsx
<BusinessQR 
  subdomain={business.subdomain}
  businessName={business.name}
  type="display"
/>
```

### 2. Página de Edición de Negocio
```tsx
// Múltiples opciones de descarga
<MultiQRDownload 
  data={`https://${business.subdomain}.tuvaloracion.com`}
  filename={`QR-${business.subdomain}`}
/>
```

### 3. Generación Masiva
```typescript
// Para múltiples negocios
const businesses = await getBusinesses();
const qrResults = await Promise.all(
  businesses.map(b => QRGenerator.generateBusinessQR(b.subdomain, 'print'))
);
```

## 🔧 Configuración Avanzada

### Personalizar Colores
```typescript
const customConfig = {
  color: {
    dark: '#1a365d',    // Azul oscuro
    light: '#ffffff'    // Blanco
  }
};

const qr = await QRGenerator.generate(data, 'print', customConfig);
```

### Configurar Margen
```typescript
const customConfig = {
  margin: 6,  // Margen más grande
  width: 2000 // Resolución personalizada
};
```

## 📊 Presets Disponibles

```typescript
export const QR_PRESETS = {
  display: {
    width: 120,
    margin: 2,
    errorCorrectionLevel: 'M'
  },
  web: {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M'
  },
  print: {
    width: 1800,
    margin: 4,
    errorCorrectionLevel: 'H'  // Máxima corrección
  }
};
```

## 🚀 Roadmap de Mejoras

### Fase 1 (Actual) ✅
- [x] Generación básica de QRs
- [x] Múltiples resoluciones
- [x] Componentes React
- [x] Descarga de archivos

### Fase 2 (Próxima)
- [ ] Personalización de colores
- [ ] Inserción de logos
- [ ] Plantillas con marcos
- [ ] Generación en lote

### Fase 3 (Futuro)
- [ ] API REST endpoints
- [ ] Analytics de escaneos
- [ ] Cache inteligente
- [ ] Formatos SVG/PDF

## 🔍 Testing

```typescript
// Ejemplo de test
describe('QRGenerator', () => {
  it('should generate business QR', async () => {
    const result = await QRGenerator.generateBusinessQR('test-business');
    expect(result.dataURL).toContain('data:image/png');
    expect(result.filename).toBe('QR-test-business.png');
  });
});
```

## 📝 Notas de Desarrollo

- **Modular**: Cada funcionalidad en su propio archivo
- **Escalable**: Fácil añadir nuevas características
- **Tipado**: TypeScript completo
- **Reutilizable**: Componentes independientes
- **Performante**: Generación asíncrona
- **Responsive**: Adaptable a diferentes pantallas

---

**Versión**: 1.0.0  
**Última actualización**: 2025-01-08  
**Mantenedor**: Sistema TuValoración
