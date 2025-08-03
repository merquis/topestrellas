'use client'

import { useState, useEffect, useRef } from 'react'
import { Business } from '@/lib/types'
import { getBrowserLanguage } from '@/lib/utils'
import LanguageSelector from './LanguageSelector'
import RouletteWheel from './RouletteWheel'
import '@/styles/business-review.css'
import { translations as defaultTranslations } from '@/lib/translations';

interface BusinessReviewAppProps {
  business: Business
}

export default function BusinessReviewApp({ business }: BusinessReviewAppProps) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => 
    getBrowserLanguage(business.config.languages)
  )
  const [currentView, setCurrentView] = useState<'initial' | 'form' | 'roulette' | 'code' | 'review'>('initial')
  const [rating, setRating] = useState(0)
  const [prizeWon, setPrizeWon] = useState<any>(null)
  const [watchingCount, setWatchingCount] = useState(Math.floor(Math.random() * 10) + 5)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [privacyPolicy, setPrivacyPolicy] = useState(false)
  const [errors, setErrors] = useState({ name: '', email: '', feedback: '', privacy: '', rating: '' })
  const [rewardCode, setRewardCode] = useState('')

  // Efectos para tema y contador de personas (se mantienen)
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

  useEffect(() => {
    const interval = setInterval(() => {
      setWatchingCount((prev: number) => Math.max(5, Math.min(20, prev + (Math.floor(Math.random() * 3) - 1))))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const getTranslation = (key: string, replacements: Record<string, string> = {}): string => {
    const customTranslations = business.config.customTexts || {};
    const translations = Object.keys(customTranslations).length > 0 ? customTranslations : defaultTranslations;
    
    let text = translations[currentLanguage]?.[key] || translations['es']?.[key] || key;
    
    Object.keys(replacements).forEach(rKey => {
      text = text.replace(`{{${rKey}}}`, replacements[rKey])
    })
    return text
  }

  const handleStarClick = (value: number) => {
    setRating(value)
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
      const starValue = parseInt(star.getAttribute('data-value') || '0', 10);
      if (starValue <= value) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  const handleRateNow = () => {
    if (rating === 0) {
      setErrors(prev => ({ ...prev, rating: getTranslation('selectAtLeastOneStar') }))
      return
    }
    setErrors(prev => ({ ...prev, rating: '' }))
    setCurrentView('form')
  }

  const validateForm = () => {
    const formErrors = { name: '', email: '', feedback: '', privacy: '' };
    let isValid = true;

    if (!name) {
      formErrors.name = getTranslation('requiredField');
      isValid = false;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      formErrors.email = getTranslation('invalidEmail');
      isValid = false;
    }
    if (rating < 5 && !feedback) {
      formErrors.feedback = getTranslation('requiredField');
      isValid = false;
    }
    if (!privacyPolicy) {
      formErrors.privacy = getTranslation('requiredField');
      isValid = false;
    }
    
    setErrors(prevErrors => ({ ...prevErrors, ...formErrors }));
    return isValid;
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (validateForm()) {
      setCurrentView('roulette')
    }
  }

  const handleSpinComplete = (prizeIndex: number) => {
    const prize = business.config.prizes[prizeIndex]
    setPrizeWon(prize)
    const generatedCode = `${business.subdomain.toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`
    setRewardCode(generatedCode)
    
    // Lógica de guardado (simplificada)
    console.log('Saving lead:', { name, email, rating, feedback, prize, code: generatedCode })

    if (rating === 5) {
      setCurrentView('review')
    } else {
      setCurrentView('code')
    }
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

        {/* VISTA INICIAL */}
        <div id="initial-view" className={currentView !== 'initial' ? 'hidden' : ''}>
          <div className="header">
            <p><span>{getTranslation('title_part1')}</span></p>
            <p><span>{getTranslation('title_part2')}</span></p>
            
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

            <p className="prizes-subtitle"><span>{getTranslation('prizes_subtitle')}</span></p>
            <div className="big-prizes-preview">
              {business.config.prizes.slice(0, 3).map((p, i) => (
                <div className="prize-preview-item" key={i}>
                  <span className="prize-icon">{p.translations[currentLanguage]?.emoji || p.translations['es']?.emoji}</span>
                  <span className="prize-text">{p.translations[currentLanguage]?.name || p.translations['es']?.name}</span>
                </div>
              ))}
            </div>
            <div className="more-prizes-text">
              <span>{getTranslation('morePrizes')}</span>
            </div>
          </div>

          <div className="rating-section">
            <p className="rating-instruction">{getTranslation('ratingInstruction')}</p>
            <div className="stars">
              {[1, 2, 3, 4, 5].map(v => (
                <span key={v} className="star" data-value={v} onClick={() => handleStarClick(v)}>★</span>
              ))}
            </div>
            {errors.rating && <div className="rating-error">{errors.rating}</div>}
            <div id="valorarBtnContainer">
              <button className="confirmation-btn premium-btn" onClick={handleRateNow}>
                <span>{getTranslation('rateNow')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* VISTA FORMULARIO */}
        <div id="formulario" className={currentView !== 'form' ? 'hidden' : ''}>
          <form className="form-section premium-form" onSubmit={handleFormSubmit} noValidate>
            <h3 className="form-title-premium"><span>{getTranslation('improveQuestion')}</span></h3>
            <p className="email-warning-text"><span>{getTranslation('emailWarning')}</span></p>
            
            <div className="form-group">
              <input type="text" className={`form-input premium-input ${errors.name ? 'error' : ''}`} placeholder={getTranslation('namePlaceholder')} required value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <input type="email" className={`form-input premium-input ${errors.email ? 'error' : ''}`} placeholder={getTranslation('emailPlaceholder')} required value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
              {errors.email && <div className="field-error">{errors.email}</div>}
            </div>
            <div className="form-group">
              <textarea className={`form-input form-textarea ${errors.feedback ? 'error' : ''}`} placeholder={getTranslation('feedbackPlaceholder')} required value={feedback} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}></textarea>
              {errors.feedback && <div className="field-error">{errors.feedback}</div>}
            </div>
            <div className="form-group privacy-policy-group">
              <div className="privacy-check-wrapper">
                <input type="checkbox" id="privacyPolicy" name="privacyPolicy" required checked={privacyPolicy} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrivacyPolicy(e.target.checked)} />
                <label htmlFor="privacyPolicy">{getTranslation('privacyPolicy')}</label>
              </div>
              {errors.privacy && <div className="field-error">{errors.privacy}</div>}
            </div>
            <button type="submit" className="submit-btn premium-submit">
              <span>{getTranslation('submitBtn')}</span>
            </button>
          </form>
        </div>

        {/* VISTA CÓDIGO */}
        <div id="codigoContainer" className={currentView !== 'code' ? 'hidden' : ''}>
          <div className="reward-code premium-reward">
            <div className="description">
              <span>{getTranslation('rewardCode')}</span>
            </div>
            <div className="code">{rewardCode}</div>
            <div className="expiry-warning">
              <span>{getTranslation('todayOnly')}</span>
            </div>
             <p className="email-message" dangerouslySetInnerHTML={{ __html: getTranslation('prizeByEmail', { email: `<span class="highlight-email">${email}</span>` }) }} />
          </div>
        </div>

        {/* VISTA REVIEW GOOGLE */}
        <div id="resenaBtn" className={currentView !== 'review' ? 'hidden' : ''}>
          <div className="form-section final-step">
            <h3 className="urgent-final"><span>{getTranslation('googleReviewTitle')}</span></h3>
            <div id="googleBtnContainer">
              <a href={business.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="google-btn premium-google">
                <span>{getTranslation('googleBtn')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* VISTA RULETA (PANTALLA COMPLETA) */}
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
