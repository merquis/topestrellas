import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Tu Valoración
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Sistema de reseñas y fidelización para negocios
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            ¿Eres un negocio?
          </h2>
          <p className="text-gray-600 mb-6">
            Aumenta tus reseñas positivas y fideliza a tus clientes con nuestro sistema de premios
          </p>
          <Link
            href="/admin"
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Acceder al Panel de Administración
          </Link>
        </div>
        
        <div className="text-gray-500">
          <p>¿Buscas dejar una reseña?</p>
          <p className="text-sm mt-2">
            Accede usando el enlace proporcionado por el establecimiento
          </p>
        </div>
      </div>
    </div>
  )
}
