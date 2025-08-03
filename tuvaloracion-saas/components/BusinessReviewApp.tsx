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

  // Aplicar colores personalizados al cargar
  useEffect(() => {
    const root = document.documentElement
    const theme = business.config.theme
    
    // Colores de fondo
    if (theme.bgPrimary) root.style.setProperty('--bg-primary', theme.bgPrimary)
    if (theme.bgSecondary) root.style.setProperty('--bg-secondary', theme.bgSecondary)
    
    // Colores principales
    if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor)
    if (theme.secondaryColor) root.style.setProperty('--primary-color-dark', theme.secondaryColor)
    
    // Colores de botones
    if (theme.buttonPrimary) root.style.setProperty('--button-primary', theme.buttonPrimary)
    if (theme.buttonSecondary) root.style.setProperty('--button-secondary', theme.buttonSecondary)
    
    // Colores de la ruleta
    if (business.config.rouletteColors) {
      business.config.rouletteColors.forEach((color, index) => {
        root.style.setProperty(`--roulette-color-${index}`, color)
      })
    }
  }, [business])

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
    
    // Enviar datos al backend o webhook
    try {
      // Si hay webhook configurado, usar ese
      if (business.config.webhooks?.saveLeadUrl) {
        await fetch(business.config.webhooks.saveLeadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            rating,
            review: formData.feedback,
            premio: prizeData.name,
            codigoPremio: `${business.subdomain.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
            lang: currentLanguage,
            businessName: business.name,
            subdomain: business.subdomain
          })
        })
      } else {
        // Si no, usar la API interna
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
      }
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
        morePrizes: '🎁 + 5 premios más en la ruleta',
        prizes_subtitle: 'Estos son algunos de nuestros premios:',
        ratingInstruction: '¿Qué tal ha sido tu experiencia?',
        confirmRating: 'SÍ, QUIERO MI REGALO',
        improveQuestion: '¿Dónde enviamos tu PREMIO? 🎁',
        emailWarning: 'Asegúrate de que tu email es correcto. ¡Ahí recibirás el código de referencia para canjear tu premio!',
        namePlaceholder: 'Tu nombre',
        emailPlaceholder: 'Tu email',
        feedbackPlaceholder: 'Tu opinión es muy importante para nosotros. 😊',
        privacyPolicy: 'Acepto la política de privacidad',
        privacyLink: 'Privacidad',
        submitBtn: 'CONTINUAR',
        rewardCode: '🎁 TU PREMIO',
        todayOnly: '⏰ VÁLIDO SOLO HOY',
        googleReviewTitle: '¡Último paso! Completa tu reseña. Recibirás el código de tu premio por email automáticamente',
        googleBtn: 'Completar mi reseña',
        whichPrize: '¿Cuál será tu premio?',
        spinBtn: 'GIRAR LA RULETA'
      },
      en: {
        title_part1: 'Share your experience in 30 seconds! Your feedback helps us improve. ✨',
        title_part2: '🎁 Spin our roulette and get a guaranteed gift for your visit.',
        prizesLeft: '3 BIG PRIZES LEFT TODAY!',
        peopleWatching: 'people viewing this offer',
        morePrizes: '🎁 + 5 more prizes on the wheel',
        prizes_subtitle: 'These are some of our prizes:',
        ratingInstruction: 'How was your experience?',
        confirmRating: 'YES, I WANT MY GIFT',
        improveQuestion: 'Where should we send your PRIZE? 🎁',
        emailWarning: 'Make sure your email is correct. You will receive the reference code to redeem your prize there!',
        namePlaceholder: 'Your name',
        emailPlaceholder: 'Your email',
        feedbackPlaceholder: 'Your opinion is very important to us. 😊',
        privacyPolicy: 'I accept the privacy policy',
        privacyLink: 'Privacy',
        submitBtn: 'CONTINUE',
        rewardCode: '🎁 YOUR PRIZE',
        todayOnly: '⏰ VALID TODAY ONLY',
        googleReviewTitle: 'Last step! Complete your review. You will receive your prize code by email automatically',
        googleBtn: 'Complete my review',
        whichPrize: 'What will be your prize?',
        spinBtn: 'SPIN THE WHEEL'
      }
    }
    
    return defaultTranslations[currentLanguage]?.[key] || defaultTranslations['es'][key] || key
  }

  return (
    <div className="main-wrapper">
      <div className="restaurant-title">
        <h2>{business.name}</h2>
      </div>
      
      <div className="container">
        <LanguageSelector
          languages={business.config.languages}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        
        {currentView === 'rating' && (
          <div id="initial-view" className="fade-in">
            <div className="header">
              <p>{getTranslation('title_part1')}</p>
              <p>{getTranslation('title_part2')}</p>
              
              {business.config.features?.showScarcityIndicators !== false && (
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
              
              <p className="prizes-subtitle">{getTranslation('prizes_subtitle')}</p>
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
              business={business}
            />
          </div>
        )}
        
        {currentView === 'form' && (
          <LeadForm
            rating={rating}
            onSubmit={handleFormSubmit}
            language={currentLanguage}
            getTranslation={getTranslation}
            business={business}
          />
        )}
        
        {currentView === 'prize' && prizeWon && (
          <PrizeDisplay
            prize={prizeWon}
            email={formData.email}
            language={currentLanguage}
            getTranslation={getTranslation}
            business={business}
          />
        )}
        
        {currentView === 'review' && prizeWon && (
          <>
            <PrizeDisplay
              prize={prizeWon}
              email={formData.email}
              language={currentLanguage}
              getTranslation={getTranslation}
              business={business}
            />
            <GoogleReviewPrompt
              googleReviewUrl={business.googleReviewUrl}
              language={currentLanguage}
              getTranslation={getTranslation}
            />
          </>
        )}
      </div>
      
      {currentView === 'roulette' && (
        <div className="roulette-screen">
          <RouletteWheel
            prizes={business.config.prizes}
            language={currentLanguage}
            onSpinComplete={handleSpinComplete}
            getTranslation={getTranslation}
          />
        </div>
      )}
    </div>
  )
}
