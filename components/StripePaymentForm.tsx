'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

/**
 * Carga Stripe en runtime.
 * Si la clave pública no está incrustada en el build (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
 * intenta obtenerla desde un endpoint público del servidor.
 */
let stripePromiseCache: Promise<any> | null = null;

function getStripePromise(): Promise<any> {
  if (stripePromiseCache) return stripePromiseCache;

  const buildTimeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (buildTimeKey && buildTimeKey.startsWith('pk_')) {
    stripePromiseCache = loadStripe(buildTimeKey);
    return stripePromiseCache;
  }

  // Fallback a runtime para entornos donde la variable pública no se inyectó en el build
  stripePromiseCache = fetch('/api/public/stripe-publishable-key')
    .then((res) => res.json())
    .then((data) => {
      if (data?.publishableKey && typeof data.publishableKey === 'string') {
        return loadStripe(data.publishableKey);
      }
      console.error('Stripe publishable key no configurada');
      return null;
    })
    .catch((err) => {
      console.error('No se pudo obtener la clave pública de Stripe en runtime:', err);
      return null;
    });

  return stripePromiseCache;
}

const intervalPerLabel = { month: 'mes', quarter: '3 meses', semester: '6 meses', year: 'año' } as const;
const intervalRenewalLabel = { month: 'mensual', quarter: 'trimestral', semester: 'semestral', year: 'anual' } as const;

interface PaymentFormProps {
  businessId: string;
  businessName: string;
  businessPhotoUrl?: string;
  planData: {
    key: string;
    name: string;
    recurringPrice: number;
    trialDays?: number;
    interval?: 'month' | 'quarter' | 'semester' | 'year';
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
  onPreparePayment?: () => Promise<void>; // Nueva prop para preparar el pago
}

function CheckoutForm({ businessId, businessName, businessPhotoUrl, planData, clientSecret, userData, billingInfo, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const hasTrial = planData.trialDays && planData.trialDays > 0;
  const intervalKey = (planData.interval || 'month') as keyof typeof intervalPerLabel;
  
  // Estados para capturar los valores actualizados de los campos
  const [billingName, setBillingName] = useState(userData?.name || '');
  const [billingEmail, setBillingEmail] = useState(userData?.email || '');
  const [billingPhone, setBillingPhone] = useState(userData?.phone || '');
  
  // Estado para forzar la actualización del LinkAuthenticationElement
  const [linkKey, setLinkKey] = useState(0);

  // Detectar cuando el PaymentElement está listo
  useEffect(() => {
    if (!elements) return;
    
    const checkElementReady = () => {
      const paymentElement = elements.getElement('payment');
      if (paymentElement) {
        setIsElementReady(true);
      }
    };
    
    // Verificar inmediatamente y después de un pequeño delay
    checkElementReady();
    const timer = setTimeout(checkElementReady, 1000);
    
    return () => clearTimeout(timer);
  }, [elements]);

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
                  después {planData.recurringPrice}€/{intervalPerLabel[intervalKey]}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-bold">{planData.recurringPrice}€</div>
                <div className="text-xs text-blue-100">/{intervalPerLabel[intervalKey]}</div>
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
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">
                Información de pago
              </div>
              
              <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-blue-500 transition-colors min-h-[200px] relative">
                {!isElementReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-xl">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Cargando formulario de pago...</p>
                      <p className="text-xs text-gray-500 mt-1">Por favor, espera un momento</p>
                    </div>
                  </div>
                )}
                
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
                  onReady={() => setIsElementReady(true)}
                  onLoadError={(error) => {
                    console.error('Error cargando PaymentElement:', error);
                    setMessage('Error al cargar el formulario de pago. Por favor, recarga la página.');
                    setIsElementReady(true); // Marcar como listo para mostrar el error
                  }}
                />
              </div>
              
              {/* Mensaje de ayuda si no se carga */}
              {!isElementReady && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <p className="text-yellow-800">
                    <span className="font-semibold">⚠️ Nota:</span> Si el formulario de pago no aparece después de unos segundos, 
                    verifica tu conexión a internet o intenta recargar la página.
                  </p>
                </div>
              )}
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
                    <span className="text-gray-600">{intervalRenewalLabel[intervalKey]}</span>
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
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Procesando...
                  </span>
                ) : hasTrial ? (
                  `Iniciar prueba de ${planData.trialDays} días GRATIS`
                ) : (
                  `Pagar ${planData.recurringPrice}€/${intervalPerLabel[intervalKey]}`
                )}
              </button>
            </div>

            {/* Términos y condiciones */}
            <p className="text-xs text-gray-500 text-center">
              Al confirmar tu suscripción, aceptas nuestros{' '}
              <a href="#" className="text-blue-600 hover:underline cursor-pointer">términos de servicio</a> y{' '}
              <a href="#" className="text-blue-600 hover:underline cursor-pointer">política de privacidad</a>.
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

  // Cargar Stripe en runtime (con fallback) y mantener una promesa estable para &lt;Elements&gt;
  const [runtimeStripePromise, setRuntimeStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    let active = true;
    getStripePromise().then((p) => {
      if (active) setRuntimeStripePromise(p);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!clientSecret || !runtimeStripePromise) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={runtimeStripePromise as any} options={options}>
      <CheckoutForm {...props} clientSecret={clientSecret} planData={planData} />
    </Elements>
  );
}
