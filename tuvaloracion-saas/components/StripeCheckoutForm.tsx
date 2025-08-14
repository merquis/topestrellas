'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Datos de provincias españolas con detección de Canarias
const spanishProvinces: { [key: string]: { province: string; isCanary: boolean } } = {
  '35': { province: 'Las Palmas', isCanary: true },
  '38': { province: 'Santa Cruz de Tenerife', isCanary: true },
  '01': { province: 'Álava', isCanary: false },
  '02': { province: 'Albacete', isCanary: false },
  '03': { province: 'Alicante', isCanary: false },
  '04': { province: 'Almería', isCanary: false },
  '05': { province: 'Ávila', isCanary: false },
  '06': { province: 'Badajoz', isCanary: false },
  '07': { province: 'Baleares', isCanary: false },
  '08': { province: 'Barcelona', isCanary: false },
  '09': { province: 'Burgos', isCanary: false },
  '10': { province: 'Cáceres', isCanary: false },
  '11': { province: 'Cádiz', isCanary: false },
  '12': { province: 'Castellón', isCanary: false },
  '13': { province: 'Ciudad Real', isCanary: false },
  '14': { province: 'Córdoba', isCanary: false },
  '15': { province: 'A Coruña', isCanary: false },
  '16': { province: 'Cuenca', isCanary: false },
  '17': { province: 'Girona', isCanary: false },
  '18': { province: 'Granada', isCanary: false },
  '19': { province: 'Guadalajara', isCanary: false },
  '20': { province: 'Guipúzcoa', isCanary: false },
  '21': { province: 'Huelva', isCanary: false },
  '22': { province: 'Huesca', isCanary: false },
  '23': { province: 'Jaén', isCanary: false },
  '24': { province: 'León', isCanary: false },
  '25': { province: 'Lleida', isCanary: false },
  '26': { province: 'La Rioja', isCanary: false },
  '27': { province: 'Lugo', isCanary: false },
  '28': { province: 'Madrid', isCanary: false },
  '29': { province: 'Málaga', isCanary: false },
  '30': { province: 'Murcia', isCanary: false },
  '31': { province: 'Navarra', isCanary: false },
  '32': { province: 'Ourense', isCanary: false },
  '33': { province: 'Asturias', isCanary: false },
  '34': { province: 'Palencia', isCanary: false },
  '36': { province: 'Pontevedra', isCanary: false },
  '37': { province: 'Salamanca', isCanary: false },
  '39': { province: 'Cantabria', isCanary: false },
  '40': { province: 'Segovia', isCanary: false },
  '41': { province: 'Sevilla', isCanary: false },
  '42': { province: 'Soria', isCanary: false },
  '43': { province: 'Tarragona', isCanary: false },
  '44': { province: 'Teruel', isCanary: false },
  '45': { province: 'Toledo', isCanary: false },
  '46': { province: 'Valencia', isCanary: false },
  '47': { province: 'Valladolid', isCanary: false },
  '48': { province: 'Vizcaya', isCanary: false },
  '49': { province: 'Zamora', isCanary: false },
  '50': { province: 'Zaragoza', isCanary: false },
  '51': { province: 'Ceuta', isCanary: false },
  '52': { province: 'Melilla', isCanary: false },
};

interface CheckoutFormProps {
  businessId: string;
  businessName: string;
  planData: {
    key: string;
    name: string;
    recurringPrice: number;
    trialDays?: number;
    interval?: 'month' | 'year';
  };
  clientSecret: string;
  userData: {
    name: string;
    email: string;
    phone?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutFormContent({ 
  businessId, 
  businessName, 
  planData, 
  clientSecret, 
  userData, 
  onSuccess, 
  onCancel 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Estados para el formulario
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: userData.name,
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    province: '',
    taxId: '',
    companyName: ''
  });

  const hasTrial = planData.trialDays && planData.trialDays > 0;

  // Auto-detectar ciudad basado en código postal
  useEffect(() => {
    if (billingDetails.postalCode.length >= 2) {
      const prefix = billingDetails.postalCode.substring(0, 2);
      const locationData = spanishProvinces[prefix];
      
      if (locationData) {
        setBillingDetails(prev => ({
          ...prev,
          province: locationData.province
        }));
        
        // Auto-rellenar ciudad para algunas provincias principales
        if (billingDetails.postalCode.length === 5) {
          let city = '';
          if (prefix === '38') {
            if (billingDetails.postalCode.startsWith('380')) {
              city = 'Santa Cruz de Tenerife';
            } else if (billingDetails.postalCode.startsWith('382')) {
              city = 'San Cristóbal de La Laguna';
            } else if (billingDetails.postalCode.startsWith('383')) {
              city = 'Puerto de la Cruz';
            }
          } else if (prefix === '35') {
            if (billingDetails.postalCode.startsWith('350')) {
              city = 'Las Palmas de Gran Canaria';
            }
          } else if (prefix === '28') {
            city = 'Madrid';
          } else if (prefix === '08') {
            city = 'Barcelona';
          }
          
          if (city) {
            setBillingDetails(prev => ({
              ...prev,
              city: city
            }));
          }
        }
      }
    }
  }, [billingDetails.postalCode]);

  // Validar NIF/CIF
  const validateTaxId = (value: string): boolean => {
    const nifRegex = /^[0-9]{8}[A-Z]$/;
    const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
    const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;
    
    return nifRegex.test(value) || nieRegex.test(value) || cifRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validaciones
    if (showAddressForm && !billingDetails.addressLine1) {
      setMessage('Por favor, introduce tu dirección');
      return;
    }

    if (isCompany && !validateTaxId(billingDetails.taxId)) {
      setMessage('Por favor, introduce un NIF/CIF válido');
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    // Preparar datos de facturación para Stripe
    const stripeBillingDetails: any = {
      name: isCompany && billingDetails.companyName ? billingDetails.companyName : billingDetails.name,
      email: userData.email,
    };

    if (showAddressForm) {
      stripeBillingDetails.address = {
        line1: billingDetails.addressLine1,
        line2: billingDetails.addressLine2 || undefined,
        postal_code: billingDetails.postalCode,
        city: billingDetails.city,
        state: billingDetails.province,
        country: 'ES'
      };
    }

    if (userData.phone) {
      stripeBillingDetails.phone = userData.phone;
    }

    // Confirmar el SetupIntent
    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/admin/subscriptions/payment-success`,
        payment_method_data: {
          billing_details: stripeBillingDetails
        }
      },
      redirect: 'if_required'
    });

    if (result.error) {
      if (result.error.type === 'card_error' || result.error.type === 'validation_error') {
        setMessage(result.error.message || 'Error en el pago');
      } else {
        setMessage('Ha ocurrido un error inesperado.');
      }
      setIsProcessing(false);
    } else {
      // SetupIntent confirmado exitosamente
      setMessage('¡Método de pago guardado con éxito!');
      
      // Guardar datos de facturación en la base de datos
      try {
        const response = await fetch('/api/admin/users/update-billing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            businessId,
            billingDetails: {
              ...billingDetails,
              isCompany,
              taxRegime: spanishProvinces[billingDetails.postalCode.substring(0, 2)]?.isCanary ? 'canarias' : 'peninsula'
            },
            setupIntentId: result.setupIntent?.id,
            paymentMethodId: result.setupIntent?.payment_method
          }),
        });

        if (response.ok) {
          onSuccess();
        }
      } catch (error) {
        console.error('Error actualizando datos de facturación:', error);
      }
      
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header con información del plan */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Último paso</h2>
            <p className="text-blue-100 text-sm mt-0.5">{businessName}</p>
            <p className="text-blue-100/90 text-xs">Plan {planData.name}</p>
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de contacto (solo lectura) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de contacto</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-600">Correo electrónico</label>
                  <p className="text-gray-900 font-medium">{userData.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Método de pago</h3>
            <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-blue-500 transition-colors">
              {/* Icono y título de tarjeta */}
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="font-medium text-gray-700">Tarjeta</span>
              </div>

              {/* Stripe Payment Element */}
              <div className="space-y-4">
                <PaymentElement 
                  options={{
                    layout: 'tabs',
                    paymentMethodOrder: ['card'],
                    fields: {
                      billingDetails: {
                        name: 'never',
                        email: 'never',
                        phone: 'never',
                        address: 'never'
                      }
                    }
                  }}
                />

                {/* Nombre del titular */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del titular de la tarjeta
                  </label>
                  <input
                    type="text"
                    value={billingDetails.name}
                    onChange={(e) => setBillingDetails({...billingDetails, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                {/* Dirección de facturación (expandible) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección de facturación
                  </label>
                  
                  {!showAddressForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="w-full text-left px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-500">+ Introducir dirección</span>
                    </button>
                  ) : (
                    <div className="space-y-3 p-3 border border-gray-200 rounded-lg">
                      {/* País (fijo) */}
                      <div>
                        <select 
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                        >
                          <option>España</option>
                        </select>
                      </div>

                      {/* Línea 1 de dirección */}
                      <div className="relative">
                        <input
                          type="text"
                          value={billingDetails.addressLine1}
                          onChange={(e) => setBillingDetails({...billingDetails, addressLine1: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Calle y número"
                          required={showAddressForm}
                        />
                        {billingDetails.addressLine1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setBillingDetails({
                                ...billingDetails,
                                addressLine1: '',
                                addressLine2: '',
                                postalCode: '',
                                city: '',
                                province: ''
                              });
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            Borrar
                          </button>
                        )}
                      </div>

                      {/* Línea 2 de dirección (opcional) */}
                      <input
                        type="text"
                        value={billingDetails.addressLine2}
                        onChange={(e) => setBillingDetails({...billingDetails, addressLine2: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Línea 2 de dirección (opcional)"
                      />

                      {/* Código postal y Ciudad */}
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={billingDetails.postalCode}
                          onChange={(e) => setBillingDetails({...billingDetails, postalCode: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="CP"
                          maxLength={5}
                          required={showAddressForm}
                        />
                        <div className="col-span-2">
                          <select
                            value={billingDetails.city}
                            onChange={(e) => setBillingDetails({...billingDetails, city: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={showAddressForm}
                          >
                            <option value="">Selecciona ciudad</option>
                            {billingDetails.province === 'Santa Cruz de Tenerife' && (
                              <>
                                <option value="Santa Cruz de Tenerife">Santa Cruz de Tenerife</option>
                                <option value="San Cristóbal de La Laguna">San Cristóbal de La Laguna</option>
                                <option value="Arona">Arona</option>
                                <option value="Adeje">Adeje</option>
                                <option value="Granadilla de Abona">Granadilla de Abona</option>
                                <option value="La Orotava">La Orotava</option>
                                <option value="Los Realejos">Los Realejos</option>
                                <option value="Puerto de la Cruz">Puerto de la Cruz</option>
                                <option value="Candelaria">Candelaria</option>
                                <option value="Tacoronte">Tacoronte</option>
                              </>
                            )}
                            {billingDetails.province === 'Las Palmas' && (
                              <>
                                <option value="Las Palmas de Gran Canaria">Las Palmas de Gran Canaria</option>
                                <option value="Telde">Telde</option>
                                <option value="Santa Lucía de Tirajana">Santa Lucía de Tirajana</option>
                                <option value="Arrecife">Arrecife</option>
                                <option value="San Bartolomé de Tirajana">San Bartolomé de Tirajana</option>
                                <option value="Arucas">Arucas</option>
                                <option value="Agüimes">Agüimes</option>
                              </>
                            )}
                            {billingDetails.province && !['Santa Cruz de Tenerife', 'Las Palmas'].includes(billingDetails.province) && (
                              <option value={billingDetails.province}>{billingDetails.province}</option>
                            )}
                            <option value="other">Otra ciudad</option>
                          </select>
                        </div>
                      </div>

                      {/* Mostrar provincia detectada */}
                      {billingDetails.province && (
                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          Provincia detectada: {billingDetails.province}
                          {spanishProvinces[billingDetails.postalCode.substring(0, 2)]?.isCanary && (
                            <span className="ml-2 text-blue-600 font-medium">(IGIC 7%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkbox de empresa */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="isCompany"
                    checked={isCompany}
                    onChange={(e) => setIsCompany(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isCompany" className="text-sm text-gray-700 cursor-pointer">
                    Estoy comprando como empresa
                  </label>
                </div>

                {/* Campos adicionales para empresa */}
                {isCompany && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CIF/NIF de la empresa
                      </label>
                      <input
                        type="text"
                        value={billingDetails.taxId}
                        onChange={(e) => setBillingDetails({...billingDetails, taxId: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="B12345678"
                        required={isCompany}
                      />
                      {billingDetails.taxId && !validateTaxId(billingDetails.taxId) && (
                        <p className="text-red-500 text-xs mt-1">Formato inválido</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Razón social
                      </label>
                      <input
                        type="text"
                        value={billingDetails.companyName}
                        onChange={(e) => setBillingDetails({...billingDetails, companyName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Mi Empresa S.L."
                        required={isCompany}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mensaje de error/éxito */}
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
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
      </div>
    </div>
  );
}

export default function StripeCheckoutForm(props: CheckoutFormProps) {
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
    clientSecret: props.clientSecret,
    appearance,
  };

  if (!props.clientSecret || !stripePromise) {
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
      <CheckoutFormContent {...props} />
    </Elements>
  );
}
