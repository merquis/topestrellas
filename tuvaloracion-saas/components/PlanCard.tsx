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
    recurringPrice: number;
    currency?: string;
    interval: string;
    trialDays?: number;
    features: string[];
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
  const price = plan.recurringPrice / 100;
  const isFree = price === 0;

  return (
    <div
      className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 transition-all duration-200 ${
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

      {/* Content */}
      <div className="text-center">
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
            <div className={`text-4xl font-bold ${colors.text}`}>
              {isFree ? (
                'GRATIS'
              ) : (
                <>{price}€</>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {isFree && plan.trialDays ? (
                `${plan.trialDays} días de prueba`
              ) : !isFree ? (
                `por ${plan.interval === 'month' ? 'mes' : 'año'}`
              ) : (
                ''
              )}
            </p>
          </div>
        )}
        
        {/* Features */}
        <ul className="space-y-3 mb-6 text-left">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
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
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
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
