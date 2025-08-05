'use client';

import { useState } from 'react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    id: 1,
    question: "¿Cómo configuro mi primer negocio?",
    answer: "Para configurar tu primer negocio, ve a 'Mis Negocios' y haz clic en 'Nuevo Negocio'. Completa todos los campos requeridos como nombre, dirección, teléfono y descripción. Una vez guardado, podrás personalizar la apariencia y configurar las opciones de reseñas.",
    category: "configuracion"
  },
  {
    id: 2,
    question: "¿Cómo personalizo la apariencia de mi página de reseñas?",
    answer: "En la sección 'Configuración' de tu negocio, encontrarás opciones para cambiar colores, logotipo, texto de bienvenida y premios de la ruleta. También puedes configurar el idioma y personalizar los mensajes que ven tus clientes.",
    category: "personalizacion"
  },
  {
    id: 3,
    question: "¿Cómo funciona la ruleta de premios?",
    answer: "La ruleta se activa cuando un cliente deja una reseña de 4 o 5 estrellas. Puedes configurar diferentes premios, su probabilidad de salir y los textos que aparecen. Los premios pueden ser descuentos, productos gratis o cualquier incentivo que quieras ofrecer.",
    category: "ruleta"
  },
  {
    id: 4,
    question: "¿Cómo veo las estadísticas de mi negocio?",
    answer: "En la sección 'Estadísticas' puedes ver el número total de reseñas, la puntuación media, las reseñas por mes, los premios otorgados y otros datos importantes. Los gráficos se actualizan en tiempo real.",
    category: "estadisticas"
  },
  {
    id: 5,
    question: "¿Puedo gestionar múltiples negocios?",
    answer: "Sí, puedes crear y gestionar varios negocios desde la misma cuenta. Usa el selector de negocios en la parte superior para cambiar entre ellos. Cada negocio tiene su propia configuración, estadísticas y reseñas independientes.",
    category: "multiples"
  },
  {
    id: 6,
    question: "¿Cómo comparto el enlace de reseñas con mis clientes?",
    answer: "Cada negocio tiene un enlace único (subdominio.tuvaloracion.com). Puedes compartirlo por WhatsApp, email, códigos QR o incluirlo en tus facturas. También puedes generar códigos QR desde la plataforma.",
    category: "compartir"
  },
  {
    id: 7,
    question: "¿Las reseñas se publican automáticamente en Google?",
    answer: "No, las reseñas se almacenan en nuestra plataforma. Sin embargo, después de dejar una reseña positiva, dirigimos a los clientes a Google My Business para que también dejen su reseña allí, ayudándote a mejorar tu presencia online.",
    category: "google"
  },
  {
    id: 8,
    question: "¿Puedo exportar mis reseñas?",
    answer: "Sí, desde la sección 'Opiniones' puedes exportar todas tus reseñas en formato CSV o PDF. Esto te permite usar los datos para análisis externos o presentaciones.",
    category: "exportar"
  }
];

const categories = [
  { id: 'todas', name: 'Todas las preguntas', icon: '📋' },
  { id: 'configuracion', name: 'Configuración inicial', icon: '⚙️' },
  { id: 'personalizacion', name: 'Personalización', icon: '🎨' },
  { id: 'ruleta', name: 'Ruleta de premios', icon: '🎰' },
  { id: 'estadisticas', name: 'Estadísticas', icon: '📊' },
  { id: 'multiples', name: 'Múltiples negocios', icon: '🏢' },
  { id: 'compartir', name: 'Compartir enlaces', icon: '🔗' },
  { id: 'google', name: 'Google Reviews', icon: '🌟' },
  { id: 'exportar', name: 'Exportar datos', icon: '📤' }
];

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'todas' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Centro de Ayuda</h1>
          <p className="text-xl opacity-90 mb-6">
            Todo lo que necesitas saber para sacar el máximo provecho de TuValoración
          </p>
        </div>
      </div>

      {/* Video Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            🎥 Video Tutorial de la Plataforma
          </h2>
          <p className="text-gray-600 text-lg">
            Aprende cómo usar TuValoración en menos de 10 minutos
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gray-100 rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white text-2xl">▶️</span>
                </div>
                <p className="text-gray-600 text-lg font-medium">
                  Video tutorial próximamente disponible
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Mientras tanto, consulta las preguntas frecuentes más abajo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar en las preguntas frecuentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Categorías</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-3 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-lg mb-1">{category.icon}</div>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          Preguntas Frecuentes
          {searchTerm && (
            <span className="text-lg font-normal text-gray-500 ml-2">
              ({filteredFAQs.length} resultados)
            </span>
          )}
        </h3>
        
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <p className="text-gray-500 text-lg">
              No se encontraron preguntas que coincidan con tu búsqueda
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-800 pr-4">
                    {faq.question}
                  </span>
                  <span className={`text-2xl transition-transform ${
                    openFAQ === faq.id ? 'rotate-180' : ''
                  }`}>
                    ⌄
                  </span>
                </button>
                {openFAQ === faq.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <a
            href="/admin/my-business"
            className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-center"
          >
            <div className="text-3xl mb-2">🏪</div>
            <h4 className="font-semibold text-gray-800">Configurar Negocio</h4>
            <p className="text-sm text-gray-600 mt-1">
              Configura tu negocio paso a paso
            </p>
          </a>
          
          <a
            href="/admin/settings"
            className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-center"
          >
            <div className="text-3xl mb-2">🎨</div>
            <h4 className="font-semibold text-gray-800">Personalizar</h4>
            <p className="text-sm text-gray-600 mt-1">
              Cambia colores, textos y premios
            </p>
          </a>
          
          <a
            href="/admin/contact"
            className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-center"
          >
            <div className="text-3xl mb-2">📞</div>
            <h4 className="font-semibold text-gray-800">Contactar Soporte</h4>
            <p className="text-sm text-gray-600 mt-1">
              ¿Necesitas ayuda personalizada?
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
