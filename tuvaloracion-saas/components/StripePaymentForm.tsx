'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// IMPORTANTE: La clave pública debe estar disponible en el cliente
// Asegúrate de que NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY esté configurada en Easypanel
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PaymentFormProps {
  businessId: string;
  businessName: string;
  plan: 'basic' | 'premium';
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ businessId, businessName, plan, clientSecret, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [planData, setPlanData] = useState<{name: string, price: number} | null>(null);

  useEffect(() => {
    // Obtener datos del plan desde la base de datos
    const fetchPlanData = async () => {
      try {
        const response = await fetch('/api/admin/subscription-plans');
        if (response.ok) {
          const plans = await response.json();
          const currentPlan = plans.find((p: any) => p.key === plan);
          if (currentPlan) {
            setPlanData({
              name: currentPlan.name,
              price: currentPlan.recurringPrice
            });
          }
        }
      } catch (error) {
        console.error('Error fetching plan data:', error);
        // Fallback a valores por defecto
        setPlanData({
          name: plan === 'basic' ? 'Plan Básico' : 'Plan Premium',
          price: plan === 'basic' ? 1 : 90
        });
      }
    };

    fetchPlanData();
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    // Confirmar el pago
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/admin/subscriptions/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      // Mostrar error al cliente
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'Error en el pago');
      } else {
        setMessage('Ha ocurrido un error inesperado.');
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Pago exitoso
      setMessage('¡Pago procesado con éxito!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header con información del plan */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
        <h2 className="text-2xl font-bold mb-2">Completar Suscripción</h2>
        <p className="text-blue-100">
          Actualizando <strong>{businessName}</strong> al {planData?.name || 'Plan'}
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold">€{planData?.price || 0}</span>
          <span className="text-blue-100">/mes</span>
        </div>
      </div>

      {/* Formulario de pago */}
      <div className="bg-white p-8 rounded-b-2xl shadow-xl">
        {clientSecret ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Element de Stripe */}
            <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-blue-500 transition-colors">
              <PaymentElement 
                options={{
                  layout: 'tabs',
                  paymentMethodOrder: ['card', 'sepa_debit'],
                }}
              />
            </div>

            {/* Mensaje de error */}
            {message && (
              <div className={`p-4 rounded-lg text-sm font-medium ${
                message.includes('éxito') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Información de seguridad */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Pago seguro con Stripe</p>
                <p>Tu información de pago está encriptada y nunca se almacena en nuestros servidores.</p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Procesando...
                  </span>
                ) : (
                  `Pagar €${planData?.price || 0}/mes`
                )}
              </button>
            </div>

            {/* Términos y condiciones */}
            <p className="text-xs text-gray-500 text-center">
              Al confirmar tu suscripción, aceptas nuestros{' '}
              <a href="#" className="text-blue-600 hover:underline">términos de servicio</a> y{' '}
              <a href="#" className="text-blue-600 hover:underline">política de privacidad</a>.
              Puedes cancelar en cualquier momento.
            </p>
          </form>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StripePaymentForm({ clientSecret, ...props }: PaymentFormProps) {
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  if (!clientSecret || !stripePromise) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm {...props} clientSecret={clientSecret} />
    </Elements>
  );
}
