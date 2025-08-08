// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AdminLayout from '@/components/admin/AdminLayout';
import Toast from '@/components/Toast';
import { checkAuth } from '@/lib/auth';
import PlanCard from '@/components/PlanCard';

// Cargar el componente de Stripe dinámicamente para evitar errores de SSR
const StripePaymentForm = dynamic(
  () => import('@/components/StripePaymentForm'),
  { ssr: false }
);

interface SubscriptionPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
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
    price: 29,
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
    price: 59,
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

export default function SubscriptionsPage() {
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
      router.push('/admin');
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
      
      const res = await fetch(`/api/admin/subscription-plans?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar los planes');
      const data = await res.json();
      setSubscriptionPlans(data);
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
      const response = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        setToast({ message: 'Plan creado correctamente', type: 'success' });
        fetchPlans();
        setShowCreatePlanModal(false);
      } else {
        throw new Error('Error al crear el plan');
      }
    } catch (error) {
      setToast({ message: 'Error al crear el plan', type: 'error' });
    }
  };

  const handleUpdatePlan = async (planId: string, planData: any) => {
    try {
      const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        setToast({ message: 'Plan actualizado correctamente', type: 'success' });
        fetchPlans();
        setShowEditPlanModal(false);
        setEditingPlan(null);
      } else {
        throw new Error('Error al actualizar el plan');
      }
    } catch (error) {
      setToast({ message: 'Error al actualizar el plan', type: 'error' });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este plan?')) return;

    try {
      const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setToast({ message: 'Plan eliminado correctamente', type: 'success' });
        fetchPlans();
      } else {
        throw new Error('Error al eliminar el plan');
      }
    } catch (error) {
      setToast({ message: 'Error al eliminar el plan', type: 'error' });
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
  const [formData, setFormData] = useState({
    key: plan.key || '',
    name: plan.name || '',
    description: plan.description || '',
    recurringPrice: String(plan.recurringPrice / 100), // Convertir de centavos a euros
    currency: plan.currency || 'EUR',
    interval: plan.interval || 'month',
    trialDays: String(plan.trialDays || 0),
    features: plan.features || [''],
    active: plan.active !== undefined ? plan.active : true,
    icon: plan.icon || '🚀',
    color: plan.color || 'blue',
    popular: plan.popular || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planData = {
      ...formData,
      recurringPrice: parseInt(formData.recurringPrice) * 100, // Convertir a centavos
      setupPrice: 0,
      trialDays: parseInt(formData.trialDays),
      features: formData.features.filter(f => f.trim() !== '')
    };
    onSave(planData);
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
<div className="fixed inset-0 bg-black/50] flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 my-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Editar Plan</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave del Plan
              </label>
              <input
                type="text"
                required
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: premium"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Plan
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: Plan Premium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Descripción del plan"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio (€)
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.recurringPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, recurringPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="29"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo
              </label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData(prev => ({ ...prev, interval: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="month">Mensual</option>
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
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icono
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="🚀"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="green">Verde</option>
                <option value="blue">Azul</option>
                <option value="purple">Morado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Características
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Característica del plan"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Añadir característica
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="mr-2"
              />
              Plan activo
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.popular}
                onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                className="mr-2"
              />
              Plan popular
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente para crear un nuevo plan
function CreatePlanModal({ onClose, onSave }: { onClose: () => void; onSave: (planData: any) => void }) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    recurringPrice: '',
    currency: 'EUR',
    interval: 'month',
    trialDays: '0',
    features: [''],
    active: true,
    icon: '🚀',
    color: 'blue',
    popular: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planData = {
      ...formData,
      recurringPrice: parseInt(formData.recurringPrice) * 100, // Convertir a centavos
      setupPrice: 0,
      trialDays: parseInt(formData.trialDays),
      features: formData.features.filter(f => f.trim() !== '')
    };
    onSave(planData);
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
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 my-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Plan</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave del Plan
              </label>
              <input
                type="text"
                required
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: premium"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Plan
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ej: Plan Premium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Descripción del plan"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio (€)
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.recurringPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, recurringPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="29"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo
              </label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData(prev => ({ ...prev, interval: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="month">Mensual</option>
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
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icono
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="🚀"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="green">Verde</option>
                <option value="blue">Azul</option>
                <option value="purple">Morado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Características
            </label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Característica del plan"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Añadir característica
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="mr-2"
              />
              Plan activo
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.popular}
                onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                className="mr-2"
              />
              Plan popular
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Crear Plan
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
                  €{subscriptions.reduce((acc: number, sub: Subscription) => {
                    if (sub.status === 'active' && sub.plan !== 'trial') {
                      return acc + PLANS[sub.plan].price;
                    }
                    return acc;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {subscriptions.map((subscription: Subscription) => (
            <div key={subscription.businessId} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              {/* Header con gradiente según el plan */}
              <div className={`h-2 bg-gradient-to-r ${PLANS[subscription.plan].color}`}></div>
              
              <div className="p-6">
                {/* Business Info */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{subscription.businessName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{subscription.subdomain}.topestrellas.com</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    subscription.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : subscription.status === 'suspended'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {subscription.status === 'active' && <><span className="mr-1.5">●</span> Activo</>}
                    {subscription.status === 'suspended' && <><span className="mr-1.5">⚠</span> Suspendido</>}
                    {subscription.status === 'inactive' && <><span className="text-red-500 mr-1.5">●</span> Inactivo</>}
                  </span>
                </div>

                {/* Plan Details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{PLANS[subscription.plan].icon}</span>
                      <div>
                        <p className="font-bold text-lg text-gray-900">{PLANS[subscription.plan].name}</p>
                        {subscription.plan !== 'trial' && (
                          <p className="text-2xl font-bold text-gray-900">
                  {(() => {
                    const planDb = subscriptionPlans.find(p => p.key === subscription.plan);
                    if (planDb) {
                      return (
                        <>
                          €{planDb.recurringPrice ? planDb.recurringPrice / 100 : 0}
                          <span className="text-sm text-gray-500 font-normal">/{planDb.interval === 'year' ? 'año' : 'mes'}</span>
                        </>
                      );
                    }
                    return (
                      <>
                        €{PLANS[subscription.plan].price}
                        <span className="text-sm text-gray-500 font-normal">/{PLANS[subscription.plan].duration}</span>
                      </>
                    );
                  })()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trial Warning */}
                  {subscription.plan === 'trial' && subscription.trialEndsAt && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">⏰</span>
                        <p className="text-sm text-yellow-800">
                          <strong>Periodo de prueba termina en {getDaysRemaining(subscription.trialEndsAt)} días</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {PLANS[subscription.plan].features.slice(0, 3).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Info */}
                  {subscription.paymentMethod && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Método de pago:</span>
                        <div className="flex items-center gap-2">
                          {subscription.paymentMethod === 'paypal' ? (
                            <>
                              <span className="text-blue-600 font-bold">PayPal</span>
                              <span className="text-xl">💳</span>
                            </>
                          ) : (
                            <>
                              <span className="text-purple-600 font-bold">Stripe</span>
                              <span className="text-xl">💳</span>
                            </>
                          )}
                        </div>
                      </div>
                      {subscription.autoRenew && (
                        <div className="flex items-center gap-1 mt-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-600">Renovación automática activa</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  {subscription.plan === 'trial' ? (
                    <>
                      <button
                        onClick={() => handleCancelSubscription(subscription.businessId)}
                        className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                      >
                        Cancelar Suscripción
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowUpgradeModal(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Actualizar Plan
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Botón de actualizar a Premium solo para plan básico */}
                      {subscription.plan === 'basic' && (
                        <button
                          onClick={() => handleUpgrade(subscription, 'premium')}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-3 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          Actualizar a Premium
                        </button>
                      )}
                      
                      {/* Botones de pausar/reanudar según el estado */}
                      {subscription.paymentMethod === 'stripe' && (
                        <>
                          {subscription.status === 'active' ? (
                            <button
                              onClick={() => handlePauseSubscription(subscription.businessId)}
                              className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-3 rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              ⏸️ Pausar
                            </button>
                          ) : subscription.status === 'suspended' || subscription.status === 'paused' ? (
                            <button
                              onClick={() => handleResumeSubscription(subscription.businessId)}
                              className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-3 rounded-xl hover:from-green-500 hover:to-emerald-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              ▶️ Reanudar
                            </button>
                          ) : null}
                        </>
                      )}
                      
                      {/* Botón de cancelar siempre disponible */}
                      <button
                        onClick={() => handleCancelSubscription(subscription.businessId)}
                        className="flex-1 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl hover:bg-red-50 transition-all duration-200 font-semibold"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
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
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-gray-600">Cargando planes disponibles...</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
                    <p className="font-bold text-lg">{PLANS[selectedPlan].name}</p>
                    <p className="text-sm text-gray-500">Facturación mensual</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const planDb = subscriptionPlans.find(p => p.key === selectedPlan);
                      if (planDb) {
                        return `€${planDb.recurringPrice ? planDb.recurringPrice / 100 : 0}`;
                      }
                      return `€${PLANS[selectedPlan].price}`;
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
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
