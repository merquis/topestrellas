'use client';

import { useState } from 'react';
import Toast from '@/components/Toast';

interface CreatePlanModalProps {
  onClose: () => void;
  onSave: (planData: any) => Promise<void>;
}

export default function CreatePlanModal({ onClose, onSave }: CreatePlanModalProps) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    originalPrice: '', // Nuevo campo para precio original
    recurringPrice: '',
    setupPrice: '0',
    currency: 'EUR',
    interval: 'month',
    trialDays: '0',
    features: [''],
    active: true,
    icon: '🚀',
    color: 'blue',
    popular: false,
    syncToStripe: true // Nueva opción para sincronizar con Stripe
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const availableIcons = ['🎁', '🚀', '💎', '👑', '⭐', '🔥', '💼', '🏆', '🎯', '📈'];
  const availableColors = [
    { value: 'green', label: 'Verde', class: 'bg-green-500' },
    { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
    { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
    { value: 'red', label: 'Rojo', class: 'bg-red-500' },
    { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-500' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
    { value: 'gray', label: 'Gris', class: 'bg-gray-500' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSyncStatus('syncing');

    try {
      const planData = {
        ...formData,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        recurringPrice: parseFloat(formData.recurringPrice),
        setupPrice: parseFloat(formData.setupPrice),
        trialDays: parseInt(formData.trialDays),
        features: formData.features.filter(f => f.trim() !== '')
      };

      // Validaciones
      if (planData.recurringPrice < 0) {
        throw new Error('El precio no puede ser negativo');
      }
      if (planData.originalPrice && planData.originalPrice <= planData.recurringPrice) {
        throw new Error('El precio original debe ser mayor que el precio actual');
      }
      if (planData.features.length === 0) {
        throw new Error('Debes añadir al menos una característica');
      }
      if (!planData.key.match(/^[a-z0-9_]+$/)) {
        throw new Error('La clave del plan solo puede contener letras minúsculas, números y guiones bajos');
      }

      await onSave(planData);
      setSyncStatus('success');
      
      // Cerrar el modal después de un breve delay para mostrar el éxito
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setSyncStatus('error');
      setError(err.message || 'Error al crear el plan');
      setLoading(false);
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Crear Nuevo Plan</h3>
            <p className="text-sm text-gray-500 mt-1">
              El plan se sincronizará automáticamente con Stripe
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status de sincronización */}
        {syncStatus !== 'idle' && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            syncStatus === 'syncing' ? 'bg-blue-50 text-blue-700' :
            syncStatus === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {syncStatus === 'syncing' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Sincronizando con Stripe...</span>
              </>
            )}
            {syncStatus === 'success' && (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>¡Plan creado y sincronizado con Stripe exitosamente!</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Error al sincronizar con Stripe</span>
              </>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-700">Información Básica</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clave del Plan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ej: premium_plus"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones bajos</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Plan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ej: Plan Premium Plus"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Descripción detallada del plan y sus beneficios"
                disabled={loading}
              />
            </div>
          </div>

          {/* Precios y facturación */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-700">Precios y Facturación</h4>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Original (€)
                  <span className="text-xs text-gray-500 ml-1">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Actual (€) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.recurringPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="350"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Setup (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.setupPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, setupPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData(prev => ({ ...prev, interval: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="month">Mensual</option>
                  <option value="quarter">Trimestral</option>
                  <option value="semester">Semestral</option>
                  <option value="year">Anual</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días de Prueba
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.trialDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trialDays: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Apariencia */}
          <div className="bg-purple-50 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-700">Apariencia</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icono
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                        formData.icon === icon 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={loading}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {availableColors.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center ${
                        formData.color === color.value 
                          ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={loading}
                      title={color.label}
                    >
                      <div className={`w-6 h-6 rounded ${color.class}`}></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="bg-green-50 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-700">
              Características <span className="text-red-500">*</span>
            </h4>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Característica del plan"
                    required={index === 0}
                    disabled={loading}
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir característica
              </button>
            </div>
          </div>

          {/* Opciones */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-3">Opciones</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium">Plan activo</span>
                  <p className="text-xs text-gray-500">El plan estará disponible para los usuarios</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.popular}
                  onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium">Plan popular</span>
                  <p className="text-xs text-gray-500">Destacar este plan como recomendado</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.syncToStripe}
                  onChange={(e) => setFormData(prev => ({ ...prev, syncToStripe: e.target.checked }))}
                  className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium">Sincronizar con Stripe</span>
                  <p className="text-xs text-gray-500">Crear automáticamente el producto y precio en Stripe</p>
                </div>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creando Plan...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Crear Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
