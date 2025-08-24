'use client';

import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, CreditCard, Shield, CheckCircle } from 'lucide-react';

// Cargar Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  subscriptionId?: string;
  businessId: string;
  planDetails: {
    name: string;
    price: number;
    setupFee?: number;
    currency: string;
    interval?: string;
    trialDays?: number; // Añadido para detectar prueba
  };
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentForm({ 
  clientSecret, 
  subscriptionId,
  businessId,
  planDetails, 
  onSuccess, 
  onError 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'express'>('card');

  // Manejar el evento de clic en Express Checkout (PayPal, Apple Pay, etc.)
  const handleExpressCheckoutClick = async (event: any) => {
    if (!stripe || !elements) return;
    
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage(submitError.message || 'Error al procesar el pago');
      return;
    }

    setIsProcessing(true);
    setPaymentMethod('express');
  };

  // Confirmar el setup después del Express Checkout
  const handleExpressCheckoutConfirm = async (event: any) => {
    if (!stripe || !elements) return;

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/admin/subscriptions/payment-success?setup_intent_client_secret=${clientSecret}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Error al guardar el método de pago');
      onError(error.message || 'Error al guardar el método de pago');
      setIsProcessing(false);
    } else if (setupIntent && setupIntent.status === 'succeeded') {
      await handlePaymentSuccess(setupIntent.id);
    }
  };

  // Manejar el envío del formulario de tarjeta
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Confirmar el SetupIntent con tarjeta
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/admin/subscriptions/payment-success?setup_intent_client_secret=${clientSecret}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Mostrar error al cliente
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'Error al guardar el método de pago');
        } else {
          setMessage('Ha ocurrido un error inesperado.');
        }
        onError(error.message || 'Error al guardar el método de pago');
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        await handlePaymentSuccess(setupIntent.id);
      }
    } catch (error) {
      console.error('Error procesando el método de pago:', error);
      setMessage('Error procesando el método de pago');
      onError('Error procesando el método de pago');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manejar el éxito del guardado del método de pago
  const handlePaymentSuccess = async (setupIntentId: string) => {
    setMessage('¡Método de pago guardado exitosamente! Creando su suscripción...');
    
    // La creación de la suscripción ahora es manejada por el webhook.
    // El frontend solo necesita esperar y luego redirigir.
    // La página de éxito puede mostrar un mensaje de "procesando"
    // y luego redirigir al dashboard cuando la suscripción esté activa.
    
    onSuccess();
  };

  const hasTrial = planDetails.trialDays && planDetails.trialDays > 0;
  const total = planDetails.price + (planDetails.setupFee || 0);

  return (
    <div className="space-y-6">
      {/* Resumen del plan */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
        <h3 className="font-semibold text-lg text-gray-900">
          Resumen de tu suscripción
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Plan:</span>
            <span className="font-medium">{planDetails.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">
              Precio {planDetails.interval === 'month' ? 'mensual' : 'anual'}:
            </span>
            <span className="font-medium">
              {planDetails.price}€/{planDetails.interval === 'month' ? 'mes' : 'año'}
            </span>
          </div>
          
          {planDetails.setupFee && planDetails.setupFee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Configuración inicial:</span>
              <span className="font-medium">{planDetails.setupFee}€</span>
            </div>
          )}

          {hasTrial && (
            <div className="flex justify-between text-green-600">
              <span className="font-semibold">Período de prueba:</span>
              <span className="font-semibold">{planDetails.trialDays} días gratis</span>
            </div>
          )}
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total a pagar hoy:</span>
              <span className="text-blue-600">0,00€</span>
            </div>
            {hasTrial && (
              <p className="text-xs text-gray-500 mt-1">
                Se guardará tu método de pago sin coste. El primer cobro de {planDetails.price}€ se realizará después de los {planDetails.trialDays} días de prueba.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Express Checkout Element (PayPal, Apple Pay, Google Pay) */}
      <div className="border rounded-lg p-6 bg-white">
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          Pago rápido con:
        </h4>
        <ExpressCheckoutElement 
          options={{
            buttonHeight: 50,
            buttonTheme: {
              applePay: 'black',
              googlePay: 'black',
              paypal: 'gold'
            }
            // No usar mode: 'subscription' - ese es para Checkout Sessions, no para Elements
          }}
          onClick={handleExpressCheckoutClick}
          onConfirm={handleExpressCheckoutConfirm}
        />
      </div>

      {/* Separador */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 text-gray-500">O paga con tarjeta</span>
        </div>
      </div>

      {/* Formulario de tarjeta */}
      <form onSubmit={handleCardSubmit} className="space-y-6">
        {/* Payment Element de Stripe para tarjetas */}
        <div className="border rounded-lg p-6 bg-white">
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card'],
              fields: {
                billingDetails: {
                  address: 'never' // No requerir dirección para que PayPal funcione mejor
                }
              }
            }}
          />
        </div>

        {/* Mensaje de error o éxito */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('exitosamente') 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Botón de pago con tarjeta */}
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
            isProcessing || !stripe || !elements
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Guardando método de pago...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <CreditCard className="mr-2 h-5 w-5" />
              {hasTrial ? `Iniciar prueba de ${planDetails.trialDays} días` : 'Guardar método de pago'}
            </span>
          )}
        </button>
      </form>

      {/* Información de seguridad */}
      <div className="flex items-center justify-center text-sm text-gray-500">
        <Shield className="h-4 w-4 mr-1" />
        <span>Pago seguro procesado por Stripe</span>
      </div>
    </div>
  );
}

interface StripePaymentElementProps {
  clientSecret: string;
  subscriptionId?: string;
  businessId: string;
  planDetails: {
    name: string;
    price: number;
    setupFee?: number;
    currency: string;
    interval?: string;
    trialDays?: number; // Añadido para detectar prueba
  };
  onSuccess: () => void;
  onError: (error: string) => void;
  appearance?: any;
}

export default function StripePaymentElement({
  clientSecret,
  subscriptionId,
  businessId,
  planDetails,
  onSuccess,
  onError,
  appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  }
}: StripePaymentElementProps) {
  const options = {
    clientSecret,
    appearance,
    loader: 'auto' as const,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        clientSecret={clientSecret}
        subscriptionId={subscriptionId}
        businessId={businessId}
        planDetails={planDetails}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
