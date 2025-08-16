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
  businessPhotoUrl?: string;
  planData: {
    key: string;
    name: string;
    recurringPrice: number;
    trialDays?: number;
    interval?: 'month' | 'year';
  };
  clientSecret: string;
  userData?: {
    name: string;
    email: string;
    phone: string;
  };
  addressComponents?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  billingInfo?: {
    customerType: 'autonomo' | 'empresa';
    legalName: string;
    taxId: string;
    email: string;
    phone?: string;
    address: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    };
  };
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ businessId, businessName, businessPhotoUrl, planData, clientSecret, userData, billingInfo, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasTrial = planData.trialDays && planData.trialDays > 0;
  
  // Estados para capturar los valores actualizados de los campos
  const [billingName, setBillingName] = useState(userData?.name || '');
  const [billingEmail, setBillingEmail] = useState(userData?.email || '');
  const [billingPhone, setBillingPhone] = useState(userData?.phone || '');
  
  // Estado para forzar la actualización del LinkAuthenticationElement
  const [linkKey, setLinkKey] = useState(0);

  // Función para actualizar los elementos de Stripe con los datos actuales
  const updateStripeElements = () => {
    if (!elements) return;
    
    try {
      // Actualizar el PaymentElement con los datos de facturación actuales
      const paymentElement = elements.getElement('payment');
      if (paymentElement) {
        paymentElement.update({
          defaultValues: {
            billingDetails: {
              name: billingName,
              email: billingEmail,
              phone: billingPhone,
              address: {
                country: 'ES'
              }
            }
          }
        });
      }
    } catch (error) {
      console.log('Error actualizando elementos de Stripe:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Actualizar elementos de Stripe ANTES de procesar el pago
    updateStripeElements();

    setIsProcessing(true);
    setMessage(null);

    // Confirmar el método de pago (SetupIntent)
    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/admin/subscriptions/payment-success`,
        payment_method_data: {
          billing_details: {
            name: billingName,
            email: billingEmail,
            phone: billingPhone,
            address: {
              country: 'ES'
            }
          }
        }
      },
    });

    if (result.error) {
      // Mostrar error al cliente
      if (result.error.type === 'card_error' || result.error.type === 'validation_error') {
        setMessage(result.error.message || 'Error en el pago');
      } else {
        setMessage('Ha ocurrido un error inesperado.');
      }
    } else if ((result as any).setupIntent?.status === 'succeeded') {
      // Configuración exitosa
      setMessage('¡Pago procesado con éxito!');
      
      // Los datos de facturación ya se enviaron ANTES del pago en preparePayment
      // No es necesario enviarlos de nuevo
      
      // Actualizar el rol del usuario a 'admin' después del pago exitoso
      try {
        // Obtener el email del localStorage si está disponible
        const pendingSubscription = localStorage.getItem('pendingSubscription');
        if (pendingSubscription) {
          const { userEmail } = JSON.parse(pendingSubscription);
          
          // Actualizar el rol del usuario
          await fetch('/api/admin/users/update-role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: userEmail,
              businessId,
              newRole: 'admin',
              paymentCompleted: true,
              registrationStatus: 'complete'
            }),
          });
        }
      } catch (error) {
        console.error('Error actualizando rol del usuario:', error);
      }
      
      // PASO 3: Redirigir directamente al panel con sesión iniciada
      window.location.href = '/admin';
    }

    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header refinado: info del plan sin imagen */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Último paso</h2>
            <p className="text-blue-100 text-sm mt-0.5">
              {businessName}
            </p>
            <p className="text-blue-100/90 text-xs">
              {planData?.name || 'Plan'}
            </p>
          </div>
          <div className="text-right">
            {hasTrial ? (
              <div>
                <div className="text-3xl font-bold">0€</div>
                <div className="text-xs text-blue-100">hoy</div>
                <div className="text-[11px] text-blue-100/90">
                  después {planData.recurringPrice}€/{planData.interval === 'month' ? 'mes' : 'año'}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-bold">{planData.recurringPrice}€</div>
                <div className="text-xs text-blue-100">/{planData.interval === 'month' ? 'mes' : 'año'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de pago */}
      <div className="bg-white p-8 rounded-b-2xl shadow-xl">
        {clientSecret ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Element para la tarjeta */}
            <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-blue-500 transition-colors">
              <PaymentElement 
                options={{
                  layout: 'tabs',
                  paymentMethodOrder: ['card'],
                  defaultValues: {
                    billingDetails: {
                      address: {
                        country: 'ES'
                      }
                    }
                  },
                  fields: {
                    billingDetails: {
                      address: {
                        country: 'never'
                      }
                    }
                  },
                  // Deshabilitar la opción de guardar para pagos futuros
                  wallets: {
                    applePay: 'never',
                    googlePay: 'never'
                  }
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

            {/* Información importante */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💳</span>
                <h4 className="font-semibold text-gray-900">Información importante</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">📅</span>
                  <div>
                    <span className="font-medium text-gray-700">Primer cobro: </span>
                    <span className="text-gray-600">
                      {hasTrial ? (
                        (() => {
                          const firstChargeDate = new Date();
                          firstChargeDate.setDate(firstChargeDate.getDate() + (planData.trialDays || 7));
                          return firstChargeDate.toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          });
                        })()
                      ) : (
                        'Hoy'
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">🔄</span>
                  <div>
                    <span className="font-medium text-gray-700">Renovación automática </span>
                    <span className="text-gray-600">{planData.interval === 'month' ? 'mensual' : 'anual'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">❌</span>
                  <div>
                    <span className="text-gray-600">Cancela cuando quieras sin penalización</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">🔒</span>
                  <div>
                    <span className="text-gray-600">Pago seguro procesado por Stripe</span>
                  </div>
                </div>
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
                ) : hasTrial ? (
                  `Iniciar prueba de ${planData.trialDays} días GRATIS`
                ) : (
                  `Pagar ${planData.recurringPrice}€/${planData.interval === 'month' ? 'mes' : 'año'}`
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

export default function StripePaymentForm({ clientSecret, planData, ...props }: PaymentFormProps) {
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
      <CheckoutForm {...props} clientSecret={clientSecret} planData={planData} />
    </Elements>
  );
}
