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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // No mostrar en vista de ruleta o si no es móvil
  if (!isMobile || currentView === 'roulette' || currentView === 'code') {
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
    <div className="fixed-cta-container" id="fixed-cta-bar">
      <button 
        className={buttonConfig.className}
        onClick={buttonConfig.action}
        disabled={buttonConfig.disabled}
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: 0,
          borderRadius: '10px',
          boxShadow: 'none',
          paddingTop: '15px',
          paddingBottom: '15px',
          fontSize: '18px',
          whiteSpace: 'nowrap',
          animation: 'heartbeat 1.5s ease-in-out infinite'
        }}
      >
        {buttonConfig.text}
      </button>
    </div>
  )
}
