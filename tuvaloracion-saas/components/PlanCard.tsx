'use client';

import React from 'react';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCardProps {
  plan: {
    _id?: string;
    key: string;
    name: string;
    description?: string;
    icon: string;
    originalPrice?: number;
    recurringPrice: number;
    currency?: string;
    interval: string;
    trialDays?: number;
    features: (string | { name: string; included: boolean })[];
    color: string;
    popular?: boolean;
    active?: boolean;
  };
  isSelected?: boolean;
  isCurrentPlan?: boolean;
  onSelect?: () => void;
  actionButton?: React.ReactNode;
  showPrice?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isSelected = false,
  isCurrentPlan = false,
  onSelect,
  actionButton,
  showPrice = true
}) => {
  // Determinar colores basados en el plan
  const getColorClasses = () => {
    switch (plan.color) {
      case 'green':
        return {
          border: isSelected ? 'border-green-500' : 'border-gray-200',
          bg: isSelected ? 'bg-green-50' : 'bg-white',
          text: 'text-green-600',
          checkmark: 'text-green-500',
          button: 'bg-green-500 hover:bg-green-600',
          badge: 'bg-green-500'
        };
      case 'blue':
        return {
          border: isSelected ? 'border-blue-500' : 'border-gray-200',
          bg: isSelected ? 'bg-blue-50' : 'bg-white',
          text: 'text-blue-600',
          checkmark: 'text-blue-500',
          button: 'bg-blue-500 hover:bg-blue-600',
          badge: 'bg-blue-500'
        };
      case 'purple':
        return {
          border: isSelected ? 'border-purple-500' : 'border-gray-200',
          bg: isSelected ? 'bg-purple-50' : 'bg-white',
          text: 'text-purple-600',
          checkmark: 'text-purple-500',
          button: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
          badge: 'bg-gradient-to-r from-purple-500 to-pink-500'
        };
      default:
        return {
          border: isSelected ? 'border-gray-500' : 'border-gray-200',
          bg: isSelected ? 'bg-gray-50' : 'bg-white',
          text: 'text-gray-600',
          checkmark: 'text-gray-500',
          button: 'bg-gray-500 hover:bg-gray-600',
          badge: 'bg-gray-500'
        };
    }
  };

  const colors = getColorClasses();
  const price = plan.recurringPrice;
  const isFree = price === 0;
  
  // Calcular el porcentaje de descuento si hay precio original
  const discountPercentage = plan.originalPrice && plan.originalPrice > price
    ? Math.round(((plan.originalPrice - price) / plan.originalPrice) * 100)
    : 0;

  return (
    <div
      className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 transition-all duration-200 h-full flex flex-col ${
        onSelect ? 'cursor-pointer hover:shadow-lg' : ''
      } ${isSelected ? 'shadow-lg' : ''}`}
      onClick={onSelect}
    >
      {/* Badges */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span className={`${colors.badge} text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide`}>
            Tu Plan Actual
          </span>
        </div>
      )}
      
      {plan.popular && !isCurrentPlan && (
        <div className="absolute -top-3 right-4 z-10">
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
            Más Popular
          </span>
        </div>
      )}

      {/* Badge de descuento */}
      {discountPercentage > 0 && !isCurrentPlan && (
        <div className="absolute -top-3 left-4 z-10">
          <span className={`${
            discountPercentage >= 50 
              ? 'bg-gradient-to-r from-red-500 to-orange-500' 
              : discountPercentage >= 30 
              ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
              : 'bg-gradient-to-r from-green-500 to-emerald-500'
          } text-white px-3 py-1 rounded-full text-xs font-bold uppercase animate-pulse`}>
            -{discountPercentage}% OFF
          </span>
        </div>
      )}

      {/* Content */}
      <div className="text-center flex flex-col h-full">
        {/* Icon */}
        <div className="text-5xl mb-4">{plan.icon || '📦'}</div>
        
        {/* Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        
        {/* Description */}
        {plan.description && (
          <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
        )}
        
        {/* Price */}
        {showPrice && (
          <div className="mb-6">
            {/* Precio original tachado si existe */}
            {plan.originalPrice && plan.originalPrice > price && !isFree && (
              <div className="text-lg text-gray-400 line-through mb-1">
                {plan.originalPrice}€
              </div>
            )}
            
            {/* Precio actual */}
            <div className={`text-4xl font-bold ${colors.text}`}>
              {isFree ? (
                'GRATIS'
              ) : (
                <>{plan.recurringPrice}€</>
              )}
            </div>
            
            {/* Texto descriptivo del intervalo */}
            <p className="text-sm text-gray-500 mt-1">
              {isFree && plan.trialDays ? (
                `${plan.trialDays} días de prueba`
              ) : !isFree ? (
                <>
                  por {plan.interval === 'month' ? 'mes' : 
                       plan.interval === 'quarter' ? '3 meses' :
                       plan.interval === 'semester' ? '6 meses' : 
                       'año'}
                  {discountPercentage > 0 && (
                    <span className="ml-2 text-green-600 font-semibold">
                      ¡Ahorra {(plan.originalPrice! - price).toFixed(0)}€!
                    </span>
                  )}
                </>
              ) : (
                ''
              )}
            </p>
          </div>
        )}
        
        {/* Features */}
        <ul className="space-y-3 mb-6 text-left flex-grow">
          {plan.features.map((feature, index) => {
            // Manejar tanto strings como objetos para compatibilidad
            const isIncluded = typeof feature === 'string' ? true : feature.included;
            const featureName = typeof feature === 'string' ? feature : feature.name;
            
            return (
              <li key={index} className="flex items-start gap-2">
                {isIncluded ? (
                  // Checkmark verde para características incluidas
                  <svg 
                    className={`w-5 h-5 ${colors.checkmark} mt-0.5 flex-shrink-0`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                ) : (
                  // X gris para características no incluidas
                  <svg 
                    className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
                <span className={`text-sm ${isIncluded ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                  {featureName}
                </span>
              </li>
            );
          })}
        </ul>
        
        {/* Action Button */}
        {actionButton && (
          <div className="mt-auto">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanCard;
