'use client'

import { useEffect, useState } from 'react'

interface MobileStickyBarProps {
  currentView: 'initial' | 'form' | 'roulette' | 'code' | 'review'
  onRateNow: () => void
  onSubmitForm: () => void
  onGoToReview: () => void
  getTranslation: (key: string) => string
  isFormValid?: boolean
}

export default function MobileStickyBar({ 
  currentView, 
  onRateNow, 
  onSubmitForm, 
  onGoToReview, 
  getTranslation,
  isFormValid = true
}: MobileStickyBarProps) {
  const [isMobile, setIsMobile] = useState(true) // Inicializar como true para evitar flash

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    // Ejecutar inmediatamente
    checkMobile()
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // No mostrar en vista de ruleta o código
  if (currentView === 'roulette' || currentView === 'code') {
    return null
  }

  // En desktop, no mostrar
  if (!isMobile) {
    return null
  }

  const getButtonConfig = () => {
    switch (currentView) {
      case 'initial':
        return {
          text: getTranslation('rateNow'),
          action: onRateNow,
          className: 'confirmation-btn premium-btn'
        }
      case 'form':
        return {
          text: getTranslation('submitBtn'),
          action: onSubmitForm,
          className: 'confirmation-btn premium-submit',
          disabled: !isFormValid
        }
      case 'review':
        return {
          text: getTranslation('googleBtn'),
          action: onGoToReview,
          className: 'confirmation-btn premium-google'
        }
      default:
        return null
    }
  }

  const buttonConfig = getButtonConfig()
  if (!buttonConfig) return null

  return (
    <div 
      className="fixed-cta-container" 
      id="fixed-cta-bar"
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        width: '100%',
        padding: '15px',
        background: '#181E37',
        zIndex: 1000,
        boxShadow: '0 -5px 15px rgba(0, 0, 0, 0.2)',
        display: 'block'
      }}
    >
      <button 
        className={buttonConfig.className}
        onClick={buttonConfig.action}
        disabled={buttonConfig.disabled}
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: 0,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #f39c12, #e67e22)',
          border: 'none',
          color: 'white',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          cursor: 'pointer',
          paddingTop: '15px',
          paddingBottom: '15px',
          fontSize: '18px',
          whiteSpace: 'nowrap',
          animation: 'heartbeat 1.5s ease-in-out infinite',
          display: 'block'
        }}
      >
        {buttonConfig.text}
      </button>
    </div>
  )
}
