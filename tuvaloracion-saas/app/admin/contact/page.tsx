'use client';

import { useState } from 'react';

interface ContactForm {
  name: string;
  email: string;
  business: string;
  category: string;
  priority: string;
  subject: string;
  message: string;
}

const categories = [
  { id: 'technical', name: 'Problema técnico', icon: '🔧' },
  { id: 'configuration', name: 'Ayuda con configuración', icon: '⚙️' },
  { id: 'billing', name: 'Facturación y pagos', icon: '💳' },
  { id: 'feature', name: 'Solicitud de funcionalidad', icon: '💡' },
  { id: 'training', name: 'Formación personalizada', icon: '🎓' },
  { id: 'other', name: 'Otros', icon: '💬' }
];

const priorities = [
  { id: 'low', name: 'Baja - No es urgente', color: 'text-green-600' },
  { id: 'medium', name: 'Media - Necesito ayuda pronto', color: 'text-yellow-600' },
  { id: 'high', name: 'Alta - Es urgente', color: 'text-red-600' }
];

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    business: '',
    category: '',
    priority: 'medium',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        console.error('Error enviando formulario');
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    } catch (error) {
      console.error('Error:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            ¡Mensaje enviado correctamente!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Hemos recibido tu consulta y te responderemos en las próximas 24 horas.
          </p>
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">¿Qué pasa ahora?</h3>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• Revisaremos tu consulta en detalle</li>
              <li>• Te contactaremos por email en máximo 24 horas</li>
              <li>• Si es urgente, también podemos llamarte por teléfono</li>
              <li>• Te proporcionaremos una solución paso a paso</li>
            </ul>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                name: '',
                email: '',
                business: '',
                category: '',
                priority: 'medium',
                subject: '',
                message: ''
              });
            }}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors"
          >
            Enviar otra consulta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Contactar Soporte</h1>
          <p className="text-xl opacity-90 mb-6">
            ¿Necesitas ayuda personalizada? Estamos aquí para ayudarte
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Formulario de Contacto
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del negocio
                </label>
                <input
                  type="text"
                  name="business"
                  value={form.business}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Nombre de tu negocio (opcional)"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de consulta *
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        form.category === category.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={category.id}
                        checked={form.category === category.id}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-2xl mr-3">{category.icon}</span>
                      <span className="font-medium text-gray-800">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad *
                </label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Resumen breve de tu consulta"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                  placeholder="Describe tu consulta con el mayor detalle posible. Incluye capturas de pantalla si es necesario."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Enviando mensaje...
                  </span>
                ) : (
                  'Enviar mensaje'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Contact Info Sidebar */}
        <div className="space-y-6">
          {/* Contact Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Información de Contacto
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-2xl mr-3">📧</span>
                <div>
                  <p className="font-medium text-gray-800">Email</p>
                  <p className="text-gray-600">soporte@tuvaloracion.com</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">⏰</span>
                <div>
                  <p className="font-medium text-gray-800">Horario de atención</p>
                  <p className="text-gray-600">Lunes a Viernes</p>
                  <p className="text-gray-600">9:00 - 18:00 (CET)</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚡</span>
                <div>
                  <p className="font-medium text-gray-800">Tiempo de respuesta</p>
                  <p className="text-gray-600">Máximo 24 horas</p>
                  <p className="text-gray-600 text-sm">Urgente: 2-4 horas</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="bg-blue-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              ¿Has revisado las FAQs?
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Muchas consultas se resuelven rápidamente en nuestro centro de ayuda.
            </p>
            <a
              href="/admin/help"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <span className="mr-2">❓</span>
              Ver preguntas frecuentes
            </a>
          </div>

          {/* Tips */}
          <div className="bg-green-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              💡 Consejos para una respuesta rápida
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Sé específico en tu consulta</li>
              <li>• Incluye capturas de pantalla si es posible</li>
              <li>• Menciona qué navegador usas</li>
              <li>• Indica los pasos que ya has intentado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
