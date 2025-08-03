'use client'

import { useState } from 'react'

interface RatingSectionProps {
  onRatingConfirmed: (rating: number) => void
  language: string
  getTranslation: (key: string) => string
}

export default function RatingSection({ 
  onRatingConfirmed, 
  language, 
  getTranslation 
}: RatingSectionProps) {
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (selectedRating === 0) {
      setError(getTranslation('selectAtLeastOneStar') || 'Por favor, selecciona al menos una estrella para valorar.')
      return
    }
    onRatingConfirmed(selectedRating)
  }

  const defaultTranslations: Record<string, Record<string, string>> = {
    es: {
      ratingInstruction: '¿Qué tal ha sido tu experiencia?',
      confirmRating: 'SÍ, QUIERO MI REGALO',
      selectAtLeastOneStar: 'Por favor, selecciona al menos una estrella para valorar.'
    },
    en: {
      ratingInstruction: 'How was your experience?',
      confirmRating: 'YES, I WANT MY GIFT',
      selectAtLeastOneStar: 'Please select at least one star to rate.'
    },
    de: {
      ratingInstruction: 'Wie war Ihre Erfahrung?',
      confirmRating: 'JA, ICH MÖCHTE MEIN GESCHENK',
      selectAtLeastOneStar: 'Bitte wählen Sie mindestens einen Stern zum Bewerten aus.'
    },
    fr: {
      ratingInstruction: 'Comment était votre expérience ?',
      confirmRating: 'OUI, JE VEUX MON CADEAU',
      selectAtLeastOneStar: 'Veuillez sélectionner au moins une étoile pour évaluer.'
    }
  }

  const getLocalTranslation = (key: string): string => {
    return defaultTranslations[language]?.[key] || defaultTranslations['es'][key] || key
  }

  return (
    <div className="rating-section">
      <p className="rating-instruction">
        {getTranslation('ratingInstruction') || getLocalTranslation('ratingInstruction')}
      </p>
      
      <div className="stars">
        {[1, 2, 3, 4, 5].map((rating) => (
          <span
            key={rating}
            className={`star ${selectedRating >= rating || hoveredRating >= rating ? 'active' : ''}`}
            onClick={() => {
              setSelectedRating(rating)
              setError('')
            }}
            onMouseEnter={() => setHoveredRating(rating)}
            onMouseLeave={() => setHoveredRating(0)}
          >
            ★
          </span>
        ))}
      </div>

      {error && (
        <div className="rating-error text-red-500 text-sm mt-2 text-center">
          {error}
        </div>
      )}

      <div className="mt-6">
        <button 
          className="confirmation-btn premium-btn"
          onClick={handleConfirm}
        >
          <span>
            {getTranslation('confirmRating') || getLocalTranslation('confirmRating')}
          </span>
        </button>
      </div>
    </div>
  )
}
