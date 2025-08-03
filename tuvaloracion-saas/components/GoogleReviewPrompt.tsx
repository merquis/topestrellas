'use client'

import { useState, useEffect } from 'react'

interface GoogleReviewPromptProps {
  googleReviewUrl?: string
  language: string
  getTranslation: (key: string) => string
}

export default function GoogleReviewPrompt({ 
  googleReviewUrl, 
  language, 
  getTranslation 
}: GoogleReviewPromptProps) {
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos en segundos

  const defaultTranslations: Record<string, Record<string, string>> = {
    es: {
      googleReviewTitle: '¡Último paso! Completa tu reseña. Recibirás el código de tu premio por email automáticamente',
      googleBtn: 'COMPLETAR MI RESEÑA',
      expired: '¡EXPIRADO!'
    },
    en: {
      googleReviewTitle: 'Last step! Complete your review. You will automatically receive your prize code by email',
      googleBtn: 'COMPLETE MY REVIEW',
      expired: 'EXPIRED!'
    },
    de: {
      googleReviewTitle: 'Letzter Schritt! Vervollständigen Sie Ihre Bewertung. Sie erhalten Ihren Preiscode automatisch per E-Mail',
      googleBtn: 'MEINE BEWERTUNG ABSCHLIESSEN',
      expired: 'ABGELAUFEN!'
    },
    fr: {
      googleReviewTitle: 'Dernière étape ! Complétez votre avis. Vous recevrez automatiquement votre code de prix par e-mail',
      googleBtn: 'COMPLÉTER MON AVIS',
      expired: 'EXPIRÉ !'
    }
  }

  const getLocalTranslation = (key: string): string => {
    return defaultTranslations[language]?.[key] || defaultTranslations['es'][key] || key
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return getLocalTranslation('expired')
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleGoogleReview = () => {
    if (googleReviewUrl) {
      window.open(googleReviewUrl, '_blank')
    }
  }

  return (
    <div className="form-section final-step fade-in mt-6">
      <h3 className="urgent-final text-xl font-bold text-center mb-4">
        {getTranslation('googleReviewTitle') || getLocalTranslation('googleReviewTitle')}
      </h3>
      
      <div 
        className={`google-timer text-3xl font-bold text-center mb-6 ${
          timeLeft <= 60 ? 'text-red-500' : 'text-gray-700'
        }`}
      >
        {formatTime(timeLeft)}
      </div>
      
      <div className="text-center">
        <button 
          className="google-btn premium-google confirmation-btn"
          onClick={handleGoogleReview}
          disabled={!googleReviewUrl}
        >
          {getTranslation('googleBtn') || getLocalTranslation('googleBtn')}
        </button>
      </div>
    </div>
  )
}
