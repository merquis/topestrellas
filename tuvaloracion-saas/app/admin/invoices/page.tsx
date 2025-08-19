'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Invoice {
  id: string;
  number: string | null;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string;
  hosted_invoice_url: string;
  subscription: string;
  description?: string;
  payment_intent?: {
    status: string;
  };
  next_payment_attempt?: number;
  lines?: {
    data: Array<{
      description: string;
      amount: number;
    }>;
  };
}

interface InvoicesResponse {
  invoices: Invoice[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
  unpaidCount?: number;
  unpaidAmount?: number;
  error?: string;
  message?: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<number>(0);
  const [unpaidAmount, setUnpaidAmount] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const ITEMS_PER_PAGE = 24;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchInvoices();
  }, [selectedYear, currentPage]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(selectedYear !== 'all' && { year: selectedYear })
      });

      const response = await fetch(`/api/admin/invoices?${params}`);
      const data: InvoicesResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar las facturas');
      }

      setInvoices(data.invoices);
      setHasMore(data.hasMore);
      setUnpaidInvoices(data.unpaidCount || 0);
      setUnpaidAmount(data.unpaidAmount || 0);
      
      // Calcular páginas totales
      if (data.totalCount) {
        setTotalPages(Math.ceil(data.totalCount / ITEMS_PER_PAGE));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'uncollectible':
      case 'void':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '✅ Pagada';
      case 'open':
        return '⏳ Pendiente';
      case 'uncollectible':
        return '❌ Impagada';
      case 'void':
        return '🚫 Anulada';
      case 'draft':
        return '📝 Borrador';
      default:
        return status;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank');
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank');
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleUpdatePaymentMethod = () => {
    router.push('/admin/subscriptions');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span>📄</span> Mis Facturas
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona y descarga todas tus facturas de los últimos 5 años
          </p>
        </div>

        {/* Alerta de facturas impagadas */}
        {unpaidInvoices > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800">
                    ATENCIÓN: Tienes {unpaidInvoices} factura{unpaidInvoices > 1 ? 's' : ''} pendiente{unpaidInvoices > 1 ? 's' : ''} de pago
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Importe total pendiente: {formatAmount(unpaidAmount)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedYear('all')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  💳 Pagar Ahora
                </button>
                <button
                  onClick={handleUpdatePaymentMethod}
                  className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  🔄 Actualizar Método de Pago
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Total Facturas</p>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Facturas Pagadas</p>
            <p className="text-2xl font-bold text-green-600">
              {invoices.filter(i => i.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{unpaidInvoices}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Total Pendiente</p>
            <p className="text-2xl font-bold text-red-600">{formatAmount(unpaidAmount)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Filtrar por año:</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedYear('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedYear === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year.toString());
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedYear === year.toString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de facturas */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando facturas...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p>❌ {error}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p>No se encontraron facturas para el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factura N°
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de la Factura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {invoices.map((invoice, index) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.number || invoice.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(invoice.created)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(invoice.period_end || invoice.created + 2592000)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatAmount(invoice.amount_paid || invoice.amount_due)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {invoice.status === 'paid' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-green-700 font-medium">Pagada</span>
                            </div>
                          ) : invoice.status === 'open' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-sm text-yellow-700 font-medium">Pendiente</span>
                            </div>
                          ) : invoice.status === 'uncollectible' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-red-700 font-medium">Impagada</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              <span className="text-sm text-gray-700 font-medium">Anulada</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            {invoice.status === 'open' && (
                              <button
                                onClick={() => handlePayInvoice(invoice)}
                                className="text-yellow-600 hover:text-yellow-800 font-medium text-sm"
                                title="Pagar factura"
                              >
                                Pagar
                              </button>
                            )}
                            {invoice.status === 'uncollectible' && (
                              <button
                                onClick={() => handlePayInvoice(invoice)}
                                className="text-red-600 hover:text-red-800 font-medium text-sm animate-pulse"
                                title="Resolver pago"
                              >
                                Resolver
                              </button>
                            )}
                            <button
                              onClick={() => handleViewInvoice(invoice)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              title="Ver factura"
                            >
                              Ver
                            </button>
                            {invoice.status === 'paid' && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDownloadInvoice(invoice)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                  title="Descargar PDF"
                                >
                                  Descargar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {!loading && invoices.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                ← Anterior
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={!hasMore}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !hasMore
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de pago (placeholder) */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Pagar Factura</h2>
            <p className="text-gray-600 mb-4">
              Factura: {selectedInvoice.number || selectedInvoice.id.slice(-8)}
            </p>
            <p className="text-2xl font-bold mb-6">
              {formatAmount(selectedInvoice.amount_due)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Aquí iría la lógica de pago
                  setShowPaymentModal(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Proceder al Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
