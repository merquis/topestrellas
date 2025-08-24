// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import { checkAuth } from '@/lib/auth';
import PlanCard from '@/components/PlanCard';
import SubscriptionCard from '@/components/admin/SubscriptionCard';

// Cargar componentes dinámicamente para evitar errores de SSR
const StripePaymentForm = dynamic(
  () => import('@/components/StripePaymentForm'),
  { ssr: false }
);

const CreatePlanModal = dynamic(
  () => import('@/components/admin/CreatePlanModal'),
  { ssr: false }
);

interface SubscriptionPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
  originalPrice?: number;
  setupPrice: number;
  recurringPrice: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
  active: boolean;
  icon: string;
  color: string;
  popular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Subscription {
  businessId: string;
  businessName: string;
  subdomain: string;
  plan: 'trial' | 'basic' | 'premium';
  status: 'active' | 'inactive' | 'suspended';
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  paymentMethod?: 'paypal' | 'stripe' | null;
  lastPayment?: {
    date: Date;
    amount: number;
    method: string;
  };
  color?: string; // Añadir la propiedad color
}

const PLANS = {
  trial: {
    name: 'Prueba Gratis',
    price: 0,
    duration: '7 días',
    color: 'from-green-400 to-emerald-500',
    icon: '🎁',
    features: [
      'Hasta 100 reseñas',
      'Sistema de premios básico',
      'Soporte por email',
      'Sin tarjeta de crédito'
    ],
    popular: false
  },
  basic: {
    name: 'Plan Básico',
    price: process.env.STRIPE_PRICE_BASIC,
    duration: 'mes',
    color: 'from-blue-400 to-indigo-500',
    icon: '🚀',
    features: [
      'Hasta 500 reseñas',
      'Sistema de premios completo',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Personalización básica'
    ],
    popular: false
  },
  premium: {
    name: 'Plan Premium',
    price: process.env.STRIPE_PRICE_PREMIUM,
    duration: 'mes',
    color: 'from-purple-400 to-pink-500',
    icon: '👑',
    features: [
      'Reseñas ilimitadas',
      'Múltiples ubicaciones',
      'API personalizada',
      'Soporte 24/7',
      'Personalización completa',
      'Análisis avanzado',
      'Integración con CRM'
    ],
    popular: true
  }
};

export default function SuperSubscriptionsPage() {
  const [user, setUser] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const authUser = checkAuth();
    console.log('Usuario autenticado:', authUser);
    if (!authUser) {
      router.push('/login');
      return;
    }
    
    // Solo super_admin puede acceder a esta página
    if (authUser.role !== 'super_admin') {
      router.push('/login');
      return;
    }
    
    setUser(authUser);
  }, []);

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPlans();
      if (user.role === 'super_admin') {
        fetchSubscriptionStats();
      }
    }
  }, [user]);

const fetchPlans = async () => {
  try {
    // Construir URL con parámetros del usuario para filtrado
    const params = new URLSearchParams();
    if (user?.email) params.append('userEmail', user.email);
    if (user?.role) params.append('userRole', user.role);
    params.append('active', 'true'); // Solo planes activos
    
    const res = await fetch(`/api/admin/subscription-plans?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar los planes');
    const data = await res.json();
    setSubscriptionPlans(data.plans || []);
  } catch (err) {
    console.error('Error al cargar los planes:', err);
    setToast({ message: 'Error al cargar los planes', type: 'error' });
  }
};

  const loadSubscriptions = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams({
        userEmail: user.email,
        userRole: user.role,
      });
      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setToast({ message: 'Error al cargar las suscripciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (subscription: Subscription, plan: 'basic' | 'premium') => {
    setSelectedSubscription(subscription);
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta suscripción?')) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        setToast({ message: 'Suscripción cancelada correctamente', type: 'success' });
        loadSubscriptions();
      } else {
        throw new Error('Error al cancelar la suscripción');
      }
    } catch (error) {
      setToast({ message: 'Error al cancelar la suscripción', type: 'error' });
    }
  };

  const handlePauseSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que quieres pausar esta suscripción?')) return;

    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/pause`, {
        method: 'POST'
      });

      if (response.ok) {
        setToast({ message: 'Suscripción pausada correctamente', type: 'success' });
        loadSubscriptions();
      } else {
        throw new Error('Error al pausar la suscripción');
      }
    } catch (error) {
      setToast({ message: 'Error al pausar la suscripción', type: 'error' });
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/resume`, {
        method: 'POST'
      });

      if (response.ok) {
        setToast({ message: 'Suscripción reanudada correctamente', type: 'success' });
        loadSubscriptions();
      } else {
        throw new Error('Error al reanudar la suscripción');
      }
    } catch (error) {
      setToast({ message: 'Error al reanudar la suscripción', type: 'error' });
    }
  };

  const handleStripePayment = async () => {
    if (!selectedSubscription || !selectedPlan) return;

    setCreatingPayment(true);
    setToast(null);

    try {
      const authData = localStorage.getItem('authUser');
      const token = authData ? JSON.parse(authData).token : null;

      const response = await fetch('/api/admin/subscriptions/create-payment-intent', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: selectedSubscription.businessId,
          plan: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al preparar el pago con Stripe');
      }

      if (data.clientSecret) {
        setStripeClientSecret(data.clientSecret);
        setPaymentMethod('stripe'); // Mostrar el formulario de Stripe
      } else {
        throw new Error('No se pudo obtener el client secret de Stripe.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Un error desconocido ocurrió';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setCreatingPayment(false);
    }
  };

  const fetchSubscriptionStats = async () => {
    try {
      const response = await fetch('/api/admin/subscription-stats');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStats(data);
      }
    } catch (error) {
      console.error('Error loading subscription stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCreatePlan = async (planData: any) => {
    try {
      // Añadir el email del usuario para tracking
      const planDataWithUser = {
        ...planData,
        userEmail: user?.email
      };

      const response = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planDataWithUser),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ 
          message: '✅ Plan creado y sincronizado con Stripe correctamente', 
          type: 'success' 
        });
        fetchPlans();
        setShowCreatePlanModal(false);
      } else {
        throw new Error(data.error || data.details || 'Error al crear el plan');
      }
    } catch (error: any) {
      console.error('Error creando plan:', error);
      setToast({ 
        message: `❌ ${error.message || 'Error al crear el plan'}`, 
        type: 'error' 
      });
      // No cerrar el modal en caso de error para que el usuario pueda intentar de nuevo
      throw error; // Re-lanzar el error para que el modal lo maneje
    }
  };

  const handleUpdatePlan = async (planId: string, planData: any) => {
    try {
      // Incluir el ID en el body, no en la URL
      const response = await fetch('/api/admin/subscription-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: planId,
          ...planData
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ 
          message: '✅ Plan actualizado y sincronizado con Stripe correctamente', 
          type: 'success' 
        });
        fetchPlans();
        setShowEditPlanModal(false);
        setEditingPlan(null);
      } else {
        throw new Error(data.error || data.details || 'Error al actualizar el plan');
      }
    } catch (error: any) {
      console.error('Error actualizando plan:', error);
      setToast({ 
        message: `❌ ${error.message || 'Error al actualizar el plan'}`, 
        type: 'error' 
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este plan?\n\nEsto también archivará el producto en Stripe.')) return;

    try {
      const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setToast({ 
          message: data.message || '✅ Plan eliminado y archivado en Stripe correctamente', 
          type: 'success' 
        });
        fetchPlans();
      } else {
        throw new Error(data.error || 'Error al eliminar el plan');
      }
    } catch (error: any) {
      console.error('Error eliminando plan:', error);
      setToast({ 
        message: `❌ ${error.message || 'Error al eliminar el plan'}`, 
        type: 'error' 
      });
    }
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          <div className="bg-gray-100 rounded-xl p-4 mt-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-full mt-3"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
          </div>
          <div className="flex gap-3 mt-4">
            <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
            <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          <div className="bg-gray-100 rounded-xl p-4 mt-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-full mt-3"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
          </div>
          <div className="flex gap-3 mt-4">
            <div className="h-12 bg-gray-200 rounded-xl flex-1"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading || !user) {
    return (
      <AdminLayout user={user}>
        {renderSkeleton()}
    </AdminLayout>
  );
}

// Componente para editar un plan existente
function EditPlanModal({ plan, onClose, onSave }: { plan: SubscriptionPlan; onClose: () => void; onSave: (planData: any) => void }) {
  // Convertir features antiguas (strings) a nueva estructura si es necesario
  const convertFeatures = (features: any) => {
    if (!features || features.length === 0) {
      return [{ name: '', included: true }];
    }
    // Si ya es el formato nuevo, usarlo directamente
    if (typeof features[0] === 'object' && 'name' in features[0]) {
      return features;
    }
    // Si es el formato antiguo (array de strings), convertir
    return features.map((f: string) => ({ name: f, included: true }));
  };

  const [formData, setFormData] = useState({
    key: plan.key || '',
    name: plan.name || '',
    description: plan.description || '',
    originalPrice: String(plan.originalPrice || ''),
    setupPrice: String(plan.setupPrice || 0),
    recurringPrice: String(plan.recurringPrice),
    currency: plan.currency || 'EUR',
    interval: plan.interval || 'month',
    trialDays: String(plan.trialDays || 0),
    features: convertFeatures(plan.features),
    active: plan.active !== undefined ? plan.active : true,
    icon: plan.icon || '🚀',
    color: plan.color || 'blue',
    popular: plan.popular || false
  });

  const [errors, setErrors] = useState<any>({});

  // Array de iconos disponibles (igual que en CreatePlanModal)
  const availableIcons = ['🎁', '🚀', '💎', '👑', '⭐', '🔥', '💼', '🏆', '🎯', '📈'];

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.key.trim()) {
      newErrors.key = 'La clave del plan es requerida';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del plan es requerido';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    
    const recurringPrice = parseFloat(formData.recurringPrice);
    if (isNaN(recurringPrice) || recurringPrice < 0) {
      newErrors.recurringPrice = 'El precio debe ser un número válido mayor o igual a 0';
    }
    
    // Validar precio original si se proporciona
    if (formData.originalPrice && formData.originalPrice.trim() !== '') {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice < 0) {
        newErrors.originalPrice = 'El precio original debe ser un número válido mayor o igual a 0';
      } else if (originalPrice <= recurringPrice) {
        newErrors.originalPrice = 'El precio original debe ser mayor que el precio actual';
      }
    }
    
    const setupPrice = parseFloat(formData.setupPrice);
    if (isNaN(setupPrice) || setupPrice < 0) {
      newErrors.setupPrice = 'El precio de configuración debe ser un número válido mayor o igual a 0';
    }
    
    const trialDays = parseInt(formData.trialDays);
    if (isNaN(trialDays) || trialDays < 0) {
      newErrors.trialDays = 'Los días de prueba deben ser un número válido mayor o igual a 0';
    }
    
    const validFeatures = formData.features.filter(f => f.name && f.name.trim() !== '');
    if (validFeatures.length === 0) {
      newErrors.features = 'Debe incluir al menos una característica';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const planData = {
      ...formData,
      originalPrice: formData.originalPrice && formData.originalPrice.trim() !== '' 
        ? parseFloat(formData.originalPrice) 
        : undefined,
      setupPrice: parseFloat(formData.setupPrice),
      recurringPrice: parseFloat(formData.recurringPrice),
      trialDays: parseInt(formData.trialDays),
      features: formData.features.filter(f => f.name && f.name.trim() !== '')
    };
    
    onSave(planData);
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, { name: '', included: true }]
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, field: 'name' | 'included', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">✏️ Editar Plan de Suscripción</h3>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sección: Información Básica */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>📝</span> Información Básica
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clave del Plan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.key ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ej: premium"
                />
                {errors.key && <p className="text-red-500 text-xs mt-1">{errors.key}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Plan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ej: Plan Premium"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Descripción detallada del plan"
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* Sección: Precios y Facturación */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>💰</span> Precios y Facturación
            </h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Original (€) <span className="text-xs text-gray-500">(opcional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.originalPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="500.00"
                />
                {errors.originalPrice && <p className="text-red-500 text-xs mt-1">{errors.originalPrice}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Actual (€) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.recurringPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringPrice: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.recurringPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="350.00"
                />
                {errors.recurringPrice && <p className="text-red-500 text-xs mt-1">{errors.recurringPrice}</p>}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.setupPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.setupPrice && <p className="text-red-500 text-xs mt-1">{errors.setupPrice}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo *
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData(prev => ({ ...prev, interval: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="month">Mensual</option>
                  <option value="quarter">Trimestral</option>
                  <option value="semester">Semestral</option>
                  <option value="year">Anual</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días Prueba
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.trialDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trialDays: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.trialDays ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="7"
                />
                {errors.trialDays && <p className="text-red-500 text-xs mt-1">{errors.trialDays}</p>}
              </div>
            </div>

            <div className="mt-4 bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">💡 Resumen:</span> Los clientes pagarán{' '}
                <span className="font-bold text-blue-600">
                  {formData.recurringPrice || '0'}€
                </span>{' '}
                {formData.interval === 'month' ? 'cada mes' : 
                 formData.interval === 'quarter' ? 'cada 3 meses' :
                 formData.interval === 'semester' ? 'cada 6 meses' : 'cada año'}
                {parseFloat(formData.setupPrice) > 0 && (
                  <span>
                    {' '}+ <span className="font-bold text-orange-600">{formData.setupPrice}€</span> de configuración inicial
                  </span>
                )}
                {parseInt(formData.trialDays) > 0 && (
                  <span>
                    {' '}(con <span className="font-bold text-green-600">{formData.trialDays} días</span> de prueba gratis)
                  </span>
                )}
                {formData.originalPrice && formData.originalPrice.trim() !== '' && parseFloat(formData.originalPrice) > parseFloat(formData.recurringPrice) && (
                  <span className="block mt-2">
                    <span className="text-green-600 font-bold">
                      ¡Ahorro de {(parseFloat(formData.originalPrice) - parseFloat(formData.recurringPrice)).toFixed(2)}€ 
                      ({Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.recurringPrice)) / parseFloat(formData.originalPrice)) * 100)}% de descuento)!
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Sección: Apariencia */}
          <div className="bg-purple-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🎨</span> Apariencia
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icono del Plan
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map(iconOption => (
                    <button
                      key={`icon-${iconOption}`}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, icon: iconOption }));
                      }}
                      className={`p-3 text-2xl rounded-lg border-2 transition-all hover:scale-105 ${
                        formData.icon === iconOption 
                          ? 'border-blue-500 bg-blue-50 scale-110 shadow-lg ring-2 ring-blue-300' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={`Seleccionar ${iconOption}`}
                    >
                      {iconOption}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Icono seleccionado: <span className="text-lg font-bold">{formData.icon}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color del Plan
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="green">🟢 Verde</option>
                  <option value="blue">🔵 Azul</option>
                  <option value="purple">🟣 Morado</option>
                  <option value="orange">🟠 Naranja</option>
                  <option value="red">🔴 Rojo</option>
                  <option value="gray">⚫ Gris</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección: Características */}
          <div className="bg-green-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>✨</span> Características del Plan
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Define las características del plan y marca si están incluidas o no
            </p>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={feature.included}
                    onChange={(e) => updateFeature(index, 'included', e.target.checked)}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => updateFeature(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Hasta 500 reseñas/mes"
                  />
                  <div className="flex items-center justify-center min-w-[40px]">
                    {feature.included ? (
                      <span className="text-green-600 text-2xl font-bold">✓</span>
                    ) : (
                      <span className="text-red-600 text-2xl font-bold">✗</span>
                    )}
                  </div>
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {errors.features && <p className="text-red-500 text-xs mt-1">{errors.features}</p>}
              <button
                type="button"
                onClick={addFeature}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir característica
              </button>
            </div>
          </div>

          {/* Sección: Opciones */}
          <div className="bg-yellow-50 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>⚙️</span> Opciones
            </h4>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-medium">Plan activo</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.popular}
                  onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                  className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-medium">Marcar como popular</span>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold shadow-lg"
            >
              💾 Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


  // Si es super_admin, mostrar solo la gestión de planes
  if (user?.role === 'super_admin') {
    return (
      <AdminLayout user={user}>
        <div className="space-y-6">
          {/* Header para Super Admin */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">🛠️ Gestión de Planes de Suscripción</h1>
                <p className="text-gray-600 mt-2">
                  Administra los planes disponibles para todos los negocios
                </p>
              </div>
              <button
                onClick={() => setShowCreatePlanModal(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2"
              >
                <span>➕</span> Crear Nuevo Plan
              </button>
            </div>
          </div>

          {/* Planes de Suscripción */}
          {subscriptionPlans.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => {
                const planWithDefaults = {
                  ...plan,
                  icon: plan.icon || '📦',
                  color: plan.color || 'blue',
                  interval: plan.interval || 'month'
                };
                
                return (
                  <div key={plan._id} className="relative">
                    <PlanCard
                      plan={planWithDefaults}
                      showPrice={true}
                      actionButton={
                        <div className="space-y-3">
                          {/* Metadata */}
                          <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Estado:</span>
                              <span className={`font-semibold ${plan.active ? 'text-green-600' : 'text-red-600'}`}>
                                {plan.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            {plan.stripeProductId && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Stripe:</span>
                                <span className="font-semibold text-green-600" title={`Product: ${plan.stripeProductId}`}>
                                  ✅ Sincronizado
                                </span>
                              </div>
                            )}
                            {!plan.stripeProductId && plan.key !== 'trial' && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Stripe:</span>
                                <span className="font-semibold text-yellow-600">
                                  ⚠️ No sincronizado
                                </span>
                              </div>
                            )}
                            {plan.trialDays > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Periodo de prueba:</span>
                                <span className="font-semibold">{plan.trialDays} días</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPlan(plan);
                                setShowEditPlanModal(true);
                              }}
                              className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan._id)}
                              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No hay planes de suscripción
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primer plan de suscripción para empezar
              </p>
            </div>
          )}

          {/* Estadísticas de Planes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Estadísticas de Uso</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Negocios</p>
                {loadingStats ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {subscriptionStats?.totalBusinesses || 0}
                  </p>
                )}
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Plan Trial</p>
                {loadingStats ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {subscriptionStats?.trialCount || 0}
                  </p>
                )}
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Plan Básico</p>
                {loadingStats ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {subscriptionStats?.basicCount || 0}
                  </p>
                )}
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Plan Premium</p>
                {loadingStats ? (
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-2xl font-bold text-purple-600">
                    {subscriptionStats?.premiumCount || 0}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Plan Modal */}
        {showCreatePlanModal && (
          <CreatePlanModal
            onClose={() => setShowCreatePlanModal(false)}
            onSave={handleCreatePlan}
          />
        )}

        {/* Edit Plan Modal */}
        {showEditPlanModal && editingPlan && (
          <EditPlanModal
            plan={editingPlan}
            onClose={() => setShowEditPlanModal(false)}
            onSave={(planData) => handleUpdatePlan(editingPlan._id, planData)}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AdminLayout>
    );
  }

  // Vista normal para usuarios admin (no super_admin)
  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">💳 Mis Suscripciones</h1>
              <p className="text-gray-600 mt-2">
                Gestiona los planes de suscripción de tus negocios
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total mensual</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subscriptions.reduce((acc: number, sub: any) => {
                    const plan = subscriptionPlans.find(p => p.key === sub.subscription?.plan);
                    if (sub.subscription?.status === 'active' && plan) {
                      return acc + (plan.recurringPrice || 0);
                    }
                    return acc;
                  }, 0).toFixed(2)}€
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscriptions Grid usando el nuevo componente */}
        <div className="grid gap-6 lg:grid-cols-2">
          {subscriptions.map((subscription: any) => (
            <SubscriptionCard
              key={subscription.businessId}
              business={subscription}
              plans={subscriptionPlans}
              onUpdate={loadSubscriptions}
            />
          ))}
        </div>

        {/* Empty State */}
        {!loading && subscriptions.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Aún no tienes suscripciones activas
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Parece que no tienes ningún negocio con un plan de suscripción. ¡Elige un plan para empezar a disfrutar de todas las ventajas!
            </p>
            <p className="text-gray-500 text-sm">
              Si ya tienes una suscripción y no aparece, contacta con soporte.
            </p>
          </div>
        )}

      </div>

      {/* Upgrade Plan Modal */}
{showUpgradeModal && selectedSubscription && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
  <div className="bg-white rounded-2xl max-w-5xl w-full p-6 my-8">
    <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
      Elige tu nuevo plan
    </h3>
    <p className="text-gray-600 text-center mb-6">
      Selecciona el plan que mejor se adapte a tu negocio
    </p>
    
    <div className="grid md:grid-cols-3 gap-6">
      {subscriptionPlans.length > 0 ? (
        subscriptionPlans.map((plan) => {
          const isCurrentPlan = selectedSubscription.plan === plan.key;
          const planWithDefaults = {
            ...plan,
            icon: plan.icon || '📦',
            color: plan.color || 'blue',
            interval: plan.interval || 'month'
          };
          
          return (
            <PlanCard
              key={plan.key}
              plan={planWithDefaults}
              isCurrentPlan={isCurrentPlan}
              actionButton={
                isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-4 py-3 rounded-xl font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
                  >
                    Plan Actual
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      setSelectedPlan(plan.key);
                      setShowPaymentModal(true);
                    }}
                    className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                      plan.color === 'blue' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                        : plan.color === 'purple'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    }`}
                  >
                    Elegir {plan.name}
                  </button>
                )
              }
            />
          );
        })
      ) : (
        <div className="col-span-3 text-center py-8">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-600 mb-2">No hay planes disponibles para upgrade</p>
          <p className="text-sm text-gray-500">Contacta al administrador para más opciones.</p>
        </div>
      )}
    </div>
    
    <div className="text-center mt-6">
      <button
        onClick={() => setShowUpgradeModal(false)}
        className="text-gray-600 hover:text-gray-800 font-semibold"
      >
        Cancelar
      </button>
    </div>
  </div>
</div>
)}

      {/* Payment Modal - Stripe Elements Integration */}
      {showPaymentModal && selectedSubscription && selectedPlan && paymentMethod === 'stripe' && stripeClientSecret && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="my-8">
            <StripePaymentForm
              businessId={selectedSubscription.businessId}
              businessName={selectedSubscription.businessName}
              plan={selectedPlan}
              clientSecret={stripeClientSecret}
              onSuccess={() => {
                setShowPaymentModal(false);
                setPaymentMethod(null);
                setStripeClientSecret(null);
                setToast({ message: '¡Pago procesado con éxito!', type: 'success' });
                loadSubscriptions();
              }}
              onCancel={() => {
                setShowPaymentModal(false);
                setPaymentMethod(null);
                setStripeClientSecret(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedSubscription && selectedPlan && !paymentMethod && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Selecciona método de pago
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Actualizando <strong>{selectedSubscription.businessName}</strong> a:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{PLANS[selectedPlan]?.name || 'Plan Desconocido'}</p>
                    <p className="text-sm text-gray-500">Facturación mensual</p>
                  </div>
<p className="text-2xl font-bold">
  {(() => {
    const planDb = subscriptionPlans.find(p => p.key === selectedPlan);
    const getIntervalDisplay = (interval) => {
      if (interval === 'year' || interval === 'anual') return 'año';
      if (interval === 'month' || interval === 'mensual') return 'mes';
      return interval;
    };
    if (planDb) {
      return `€${planDb.recurringPrice ?? 0}`;
    }
    return `€${PLANS[selectedPlan]?.price ?? 'N/A'}`;
  })()}
</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {/* Botón de PayPal (funcionalidad futura) */}
              <button
                disabled={true} // Deshabilitado por ahora
                className="w-full p-4 rounded-xl border-2 border-gray-200 transition-all cursor-not-allowed opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">PayPal</p>
                      <p className="text-xs text-gray-500">Próximamente</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={handleStripePayment}
                disabled={creatingPayment}
                className="w-full p-4 rounded-xl border-2 border-purple-500 bg-purple-50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">Tarjeta de crédito/débito</p>
                      <p className="text-xs text-gray-500">Pago seguro con Stripe</p>
                    </div>
                  </div>
                  {creatingPayment ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-700"></div>
                  ) : (
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentMethod(null);
              }}
              className="w-full px-4 py-3 text-gray-600 hover:text-gray-800 font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditPlanModal && editingPlan && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Plan</h3>
            <p className="text-sm text-gray-600 mb-4">Funcionalidad de edición próximamente.</p>
            <button
              onClick={() => setShowEditPlanModal(false)}
              className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
