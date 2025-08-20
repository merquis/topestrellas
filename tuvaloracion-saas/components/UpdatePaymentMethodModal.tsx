'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface UpdatePaymentMethodFormProps {
  businessId: string;
  businessName: string;
  clientSecret: string;
  customerInfo?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

function UpdatePaymentMethodForm({ 
  businessId, 
  businessName, 
  clientSecret,
  customerInfo,
  onSuccess, 
  onCancel 
}: UpdatePaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirmar el SetupIntent con CardElement
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerInfo?.name || undefined,
            email: customerInfo?.email || undefined,
          }
        }
      });

      if (error) {
        console.error('Error confirmando SetupIntent:', error);
        setErrorMessage(error.message || 'Error procesando el método de pago');
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // El método de pago se guardó correctamente
        console.log('SetupIntent exitoso:', setupIntent.id);
        onSuccess();
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setErrorMessage('Error inesperado al procesar el método de pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">💳</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Actualizar método de pago</h4>
            <p className="text-sm text-gray-600">
              Para <strong>{businessName}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  fontSmoothing: 'antialiased',
                },
                invalid: {
                  color: '#9e2146',
                  iconColor: '#9e2146'
                },
              },
              hidePostalCode: false,
            }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Los datos de tu tarjeta están seguros y encriptados
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600">⚠️</span>
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Procesando...
            </>
          ) : (
            <>
              <span>💳</span>
              Actualizar Método de Pago
            </>
          )}
        </button>
      </div>
    </form>
  );
}

interface UpdatePaymentMethodModalProps {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdatePaymentMethodModal({
  businessId,
  businessName,
  onClose,
  onSuccess
}: UpdatePaymentMethodModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // Empezar cargando
  const [error, setError] = useState<string | null>(null);

  // Crear SetupIntent automáticamente al abrir el modal
  const createSetupIntent = async () => {
    try {
      const authData = localStorage.getItem('authUser');
      const user = authData ? JSON.parse(authData) : null;

      if (!user || !user.email) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch('/api/admin/subscriptions/update-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          businessId,
          userEmail: user.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error preparando la actualización del método de pago');
      }

      setClientSecret(data.clientSecret);
      setCustomerInfo(data.customerInfo);
    } catch (error: any) {
      console.error('Error creando SetupIntent:', error);
      setError(error.message || 'Error preparando la actualización del método de pago');
    } finally {
      setIsLoading(false);
    }
  };

  // Ejecutar automáticamente al montar el componente
  React.useEffect(() => {
    createSetupIntent();
  }, []);

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Método de Pago</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>


        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparando formulario...</p>
          </div>
        )}

        {error && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-red-900 mb-2">Error</h4>
              <p className="text-red-600 text-sm mb-6">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={createSetupIntent}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {clientSecret && (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#3b82f6',
                }
              }
            }}
          >
            <UpdatePaymentMethodForm
              businessId={businessId}
              businessName={businessName}
              clientSecret={clientSecret}
              customerInfo={customerInfo}
              onSuccess={handleSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
