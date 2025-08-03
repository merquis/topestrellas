'use client'

import { useState, useEffect } from 'react'
import { Business } from '@/lib/types'
import { getBrowserLanguage } from '@/lib/utils'
import LanguageSelector from './LanguageSelector'
import RatingSection from './RatingSection'
import LeadForm from './LeadForm'
import RouletteWheel from './RouletteWheel'
import PrizeDisplay from './PrizeDisplay'
import GoogleReviewPrompt from './GoogleReviewPrompt'

interface BusinessReviewAppProps {
  business: Business
}

export default function BusinessReviewApp({ business }: BusinessReviewAppProps) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => 
    getBrowserLanguage(business.config.languages)
  )
  const [currentView, setCurrentView] = useState<'rating' | 'form' | 'roulette' | 'prize' | 'review'>('rating')
  const [rating, setRating] = useState<number>(0)
  const [formData, setFormData] = useState<any>(null)
  const [prizeWon, setPrizeWon] = useState<any>(null)
  const [watchingCount, setWatchingCount] = useState(Math.floor(Math.random() * 5) + 1)

  // Simular contador de personas viendo
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchingCount(prev => {
        const change = Math.floor(Math.random() * 3) - 1
        return Math.max(1, Math.min(5, prev + change))
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const handleRatingConfirmed = (selectedRating: number) => {
    setRating(selectedRating)
    setCurrentView('form')
  }

  const handleFormSubmit = (data: any) => {
    setFormData(data)
    setCurrentView('roulette')
  }

  const handleSpinComplete = async (prizeIndex: number) => {
    const prize = business.config.prizes[prizeIndex]
    const prizeData = {
      index: prizeIndex,
      ...prize.translations[currentLanguage],
      value: prize.value
    }
    
    setPrizeWon(prizeData)
    
    // Enviar datos al backend
    try {
      await fetch('/api/opinions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business._id,
          subdomain: business.subdomain,
          ...formData,
          rating,
          prize: prizeData,
          language: currentLanguage
        })
      })
    } catch (error) {
      console.error('Error saving opinion:', error)
    }
    
    // Mostrar premio y review prompt si es 5 estrellas
    if (rating === 5) {
      setCurrentView('review')
    } else {
      setCurrentView('prize')
    }
  }

  const getTranslation = (key: string): string => {
    // Primero buscar en textos personalizados
    if (business.config.customTexts?.[currentLanguage]?.[key]) {
      return business.config.customTexts[currentLanguage][key]!
    }
    
    // Luego usar traducciones por defecto
    const defaultTranslations: any = {
      es: {
        title_part1: '¡Comparte tu experiencia en 30 segundos! Tu opinión nos ayuda a mejorar. ✨',
        title_part2: '🎁 Gira nuestra ruleta y llévate un regalo seguro por tu visita.',
        prizesLeft: '¡QUEDAN 3 PREMIOS GRANDES HOY!',
        peopleWatching: 'personas viendo esta oferta',
        morePrizes: '🎁 + 5 premios más en la ruleta'
      },
      en: {
        title_part1: 'Share your experience in 30 seconds! Your feedback helps us improve. ✨',
        title_part2: '🎁 Spin our roulette and get a guaranteed gift for your visit.',
        prizesLeft: '3 BIG PRIZES LEFT TODAY!',
        peopleWatching: 'people viewing this offer',
        morePrizes: '🎁 + 5 more prizes on the wheel'
      }
    }
    
    return defaultTranslations[currentLanguage]?.[key] || defaultTranslations['es'][key] || key
  }

  return (
    <div className="main-wrapper">
      <div className="restaurant-title" style={{ 
        background: `linear-gradient(to right, ${business.config.theme.primaryColor}, ${business.config.theme.primaryColor}dd)` 
      }}>
        <h2>{business.name}</h2>
      </div>
      
      <div className="container">
        <LanguageSelector
          languages={business.config.languages}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        
        {currentView === 'rating' && (
          <div className="fade-in">
            <div className="header">
              <p>{getTranslation('title_part1')}</p>
              <p>{getTranslation('title_part2')}</p>
              
              {business.config.features?.showScarcityIndicators && (
                <div className="scarcity-indicators">
                  <div className="scarcity-item">
                    <span className="scarcity-number">3</span>
                    <span>{getTranslation('prizesLeft')}</span>
                  </div>
                  <div className="scarcity-item">
                    <span className="watching-number">{watchingCount}</span>
                    <span>{getTranslation('peopleWatching')}</span>
                  </div>
                </div>
              )}
              
              <div className="big-prizes-preview">
                {business.config.prizes.slice(0, 3).map((prize, index) => (
                  <div key={index} className="prize-preview-item">
                    <span className="prize-icon">{prize.translations[currentLanguage].emoji}</span>
                    <span className="prize-text">{prize.translations[currentLanguage].name}</span>
                  </div>
                ))}
              </div>
              <div className="more-prizes-text">
                <span>{getTranslation('morePrizes')}</span>
              </div>
            </div>
            
            <RatingSection
              onRatingConfirmed={handleRatingConfirmed}
              language={currentLanguage}
              getTranslation={getTranslation}
            />
          </div>
        )}
        
        {currentView === 'form' && (
          <LeadForm
            rating={rating}
            onSubmit={handleFormSubmit}
            language={currentLanguage}
            getTranslation={getTranslation}
          />
        )}
        
        {currentView === 'prize' && prizeWon && (
          <PrizeDisplay
            prize={prizeWon}
            email={formData.email}
            language={currentLanguage}
            getTranslation={getTranslation}
          />
        )}
        
        {currentView === 'review' && prizeWon && (
          <>
            <PrizeDisplay
              prize={prizeWon}
              email={formData.email}
              language={currentLanguage}
              getTranslation={getTranslation}
            />
            <GoogleReviewPrompt
              googleReviewUrl={business.config.googleReviewUrl}
              language={currentLanguage}
              getTranslation={getTranslation}
            />
          </>
        )}
      </div>
      
      {currentView === 'roulette' && (
        <RouletteWheel
          prizes={business.config.prizes}
          language={currentLanguage}
          onSpinComplete={handleSpinComplete}
          getTranslation={getTranslation}
        />
      )}
    </div>
  )
}
