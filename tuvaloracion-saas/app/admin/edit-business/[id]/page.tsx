'use client';

import { useRouter } from 'next/navigation';

export default function EditBusinessPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Editar Negocio</h1>
        <p className="text-gray-600 mb-6">
          La funcionalidad de edición estará disponible próximamente.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          ID del negocio: {params.id}
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Volver al Panel
        </button>
      </div>
    </div>
  );
}
