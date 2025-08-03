'use client'

import { useState, useEffect, useRef } from 'react'
import { Business, Prize } from '@/lib/types'
import { getBrowserLanguage } from '@/lib/utils'
import LanguageSelector from './LanguageSelector'
import RouletteWheel from './RouletteWheel'
import ScarcityIndicators from './ScarcityIndicators'
import RatingSection from './RatingSection'
import GoogleTimer from './GoogleTimer'
import '@/styles/business-review.css'
import { translations as defaultTranslations } from '@/lib/translations';

interface BusinessReviewAppProps {
  business: Business
}

interface ErrorState {
  name: string;
  email: string;
  feedback: string;
  privacy: string;
  rating: string;
}

const ORIGINAL_PRIZES: Prize[] = [
    { index: 0, translations: { 
        es: { name: 'CENA (VALOR 60€)', emoji: '🍽️' },
        en: { name: 'DINNER (VALUE 60€)', emoji: '🍽️' },
        de: { name: 'ABENDESSEN (WERT 60€)', emoji: '🍽️' },
        fr: { name: 'DÎNER (VALEUR 60€)', emoji: '🍽️' }
    }},
    { index: 1, translations: { 
        es: { name: '30€ DESCUENTO', emoji: '💰' },
        en: { name: '30€ DISCOUNT', emoji: '💰' },
        de: { name: '30€ RABATT', emoji: '💰' },
        fr: { name: '30€ DE RÉDUCTION', emoji: '💰' }
    }},
    { index: 2, translations: { 
        es: { name: 'BOTELLA VINO', emoji: '🍾' },
        en: { name: 'BOTTLE OF WINE', emoji: '🍾' },
        de: { name: 'FLASCHE WEIN', emoji: '🍾' },
        fr: { name: 'BOUTEILLE DE VIN', emoji: '🍾' }
    }},
    { index: 3, translations: { 
        es: { name: 'HELADO', emoji: '🍦' },
        en: { name: 'ICE CREAM', emoji: '🍦' },
        de: { name: 'EIS', emoji: '🍦' },
        fr: { name: 'GLACE', emoji: '🍦' }
    }},
    { index: 4, translations: { 
        es: { name: 'CERVEZA', emoji: '🍺' },
        en: { name: 'BEER', emoji: '🍺' },
        de: { name: 'BIER', emoji: '🍺' },
        fr: { name: 'BIÈRE', emoji: '🍺' }
    }},
    { index: 5, translations: { 
        es: { name: 'REFRESCO', emoji: '🥤' },
        en: { name: 'SOFT DRINK', emoji: '🥤' },
        de: { name: 'ERFRISCHUNGSGETRÄNK', emoji: '🥤' },
        fr: { name: 'BOISSON GAZEUSE', emoji: '🥤' }
    }},
    { index: 6, translations: { 
        es: { name: 'MOJITO', emoji: '🍹' },
        en: { name: 'MOJITO', emoji: '🍹' },
        de: { name: 'MOJITO', emoji: '🍹' },
        fr: { name: 'MOJITO', emoji: '🍹' }
    }},
    { index: 7, translations: { 
        es: { name: 'CHUPITO', emoji: '🥃' },
        en: { name: 'SHOT', emoji: '🥃' },
        de: { name: 'SCHNAPS', emoji: '🥃' },
        fr: { name: 'SHOT', emoji: '🥃' }
    }},
];

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
  const [errors, setErrors] = useState<ErrorState>({ name: '', email: '', feedback: '', privacy: '', rating: '' })
  const [rewardCode, setRewardCode] = useState('')
  const [ratingFace, setRatingFace] = useState('🤔')

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

  const getFaceForRating = (value: number) => {
    switch (value) {
      case 0: return '🤔';
      case 1: return '😞';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😊';
      default: return '🤔';
    }
  }

  const handleStarClick = (value: number) => {
    setRating(value)
    setRatingFace(getFaceForRating(value))
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
      
      // En móviles, hacer scroll hasta las estrellas para que el usuario las vea
      if (window.innerWidth <= 768) {
        const starsElement = document.querySelector('.stars')
        if (starsElement) {
          starsElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          
          // Después del scroll, hacer que las estrellas parpadeen como latido del corazón
          setTimeout(() => {
            const stars = document.querySelectorAll('.star')
            stars.forEach(star => {
              star.classList.add('heartbeat-pulse')
            })
            
            // Quitar el efecto después de 3 segundos
            setTimeout(() => {
              stars.forEach(star => {
                star.classList.remove('heartbeat-pulse')
              })
            }, 3000)
          }, 500) // Esperar 500ms para que termine el scroll
        }
      }
      return
    }
    setErrors(prev => ({ ...prev, rating: '' }))
    // Guardar el rating en localStorage para que la ruleta pueda acceder a él
    localStorage.setItem('currentRating', rating.toString())
    
    // Preparar el formulario según el rating (lógica del código original)
    prepareFormForRating(rating)
    
    setCurrentView('form')
  }

  const prepareFormForRating = (rating: number) => {
    // Usar setTimeout para asegurar que el DOM esté listo
    setTimeout(() => {
      const feedbackTextarea = document.querySelector('#formulario textarea') as HTMLTextAreaElement
      const feedbackGroup = feedbackTextarea?.closest('.form-group') as HTMLElement
      
      if (feedbackTextarea && feedbackGroup) {
        if (rating < 5) {
          // Mostrar textarea para ratings < 5
          feedbackGroup.style.display = 'block'
          feedbackTextarea.required = true
          feedbackTextarea.placeholder = getTranslation('feedbackPlaceholder')
        } else {
          // Ocultar textarea para rating = 5
          feedbackGroup.style.display = 'none'
          feedbackTextarea.required = false
          // Limpiar el feedback si se oculta
          setFeedback('')
        }
      }
    }, 100)
  }

  // useEffect para manejar la visibilidad del textarea cuando cambia la vista
  useEffect(() => {
    if (currentView === 'form' && rating > 0) {
      prepareFormForRating(rating)
    }
  }, [currentView, rating])

  // useEffect para manejar la barra sticky móvil como en el código original
  useEffect(() => {
    const updateFixedCta = (view: string) => {
      const fixedCtaBar = document.getElementById('fixed-cta-bar')
      const fixedCtaBtn = document.getElementById('fixed-cta-btn')
      const fixedCtaBtnForm = document.getElementById('fixed-cta-btn-form')
      const fixedCtaBtnReview = document.getElementById('fixed-cta-btn-review')
      
      if (!fixedCtaBar) return

      // Ocultar todos los botones originales en móvil
      const valorarBtnContainer = document.getElementById('valorarBtnContainer')
      const googleBtnContainer = document.getElementById('googleBtnContainer')
      const submitBtn = document.querySelector('#formulario button[type="submit"]') as HTMLElement

      if (window.innerWidth <= 768) {
        // Mostrar la barra sticky
        fixedCtaBar.classList.remove('hidden')
        
        // Ocultar botones originales
        if (valorarBtnContainer) valorarBtnContainer.style.display = 'none'
        if (googleBtnContainer) googleBtnContainer.style.display = 'none'
        if (submitBtn) submitBtn.style.display = 'none'

        // Mostrar solo el botón correspondiente a la vista actual
        if (fixedCtaBtn) fixedCtaBtn.style.display = view === 'initial' ? 'block' : 'none'
        if (fixedCtaBtnForm) fixedCtaBtnForm.style.display = view === 'form' ? 'block' : 'none'
        if (fixedCtaBtnReview) fixedCtaBtnReview.style.display = view === 'review' ? 'block' : 'none'
      } else {
        // Ocultar la barra sticky en desktop
        fixedCtaBar.classList.add('hidden')
        
        // Mostrar botones originales
        if (valorarBtnContainer) valorarBtnContainer.style.display = 'block'
        if (googleBtnContainer) googleBtnContainer.style.display = 'block'
        if (submitBtn) submitBtn.style.display = 'block'
      }
    }

    // Actualizar cuando cambie la vista
    updateFixedCta(currentView)

    // Listener para cambios de tamaño de ventana
    const handleResize = () => updateFixedCta(currentView)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [currentView])

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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Verificar email con el webhook si está configurado
    if (business.config.webhooks?.verifyEmailUrl) {
      try {
        const response = await fetch(business.config.webhooks.verifyEmailUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() })
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.existe === true) {
            setErrors(prev => ({ ...prev, email: getTranslation('emailAlreadyUsed') }));
            return;
          }
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        // Opcional: mostrar un error genérico
      }
    }
    
    setCurrentView('roulette');
  }

  const handleSpinComplete = async (prizeIndex: number) => {
    const prize = ORIGINAL_PRIZES[prizeIndex];
    setPrizeWon(prize);
    
    // Generar código como en la versión original: EURO-XXXX donde el último dígito es el rating
    const randomPart = Math.random().toString().slice(2, 5); // 3 dígitos aleatorios
    const generatedCode = `EURO-${randomPart}${rating}`;
    setRewardCode(generatedCode);

    const leadData = {
      name,
      email,
      rating,
      review: feedback,
      premio: prize.translations[currentLanguage]?.name || prize.translations['es']?.name,
      codigoPremio: generatedCode,
      lang: currentLanguage,
      businessName: business.name,
      subdomain: business.subdomain
    };

    // Guardar lead con el webhook si está configurado
    if (business.config.webhooks?.saveLeadUrl) {
      try {
        await fetch(business.config.webhooks.saveLeadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData)
        });
      } catch (error) {
        console.error('Error saving lead via webhook:', error);
      }
    } else {
      // Fallback a la API interna si no hay webhook
      console.log('Saving lead via internal API:', leadData);
    }

    if (rating === 5) {
      setCurrentView('review');
    } else {
      setCurrentView('code');
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
              {ORIGINAL_PRIZES.slice(0, 3).map((p, i) => (
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
              <span className="rating-face">{ratingFace}</span>
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
              <span>🎁 {getTranslation('rewardCode')}</span>
            </div>
            {prizeWon && (
              <div className="premio-grande">
                <span style={{ fontSize: '3rem', marginRight: '10px' }}>
                  {prizeWon.translations[currentLanguage]?.emoji || prizeWon.translations['es']?.emoji}
                </span>
                {prizeWon.translations[currentLanguage]?.name || prizeWon.translations['es']?.name}
              </div>
            )}
            <div style={{ 
              fontSize: '14px', 
              color: '#fff', 
              marginBottom: '10px',
              opacity: 0.9 
            }}>
              Se va a generar el código de tu premio. Lo recibirás en <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{email}</span> en unos minutos, con formato <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{rewardCode}</span>. Preséntalo en el local para obtener tu regalo.
            </div>
            <div className="expiry-warning">
              <span>⏰ {getTranslation('todayOnly')}</span>
            </div>
          </div>
        </div>

        {/* VISTA REVIEW GOOGLE */}
        <div id="resenaBtn" className={currentView !== 'review' ? 'hidden' : ''}>
          <div className="reward-code premium-reward">
            <div className="description">
              <span>🎁 {getTranslation('rewardCode')}</span>
            </div>
            {prizeWon && (
              <div className="premio-grande">
                <span style={{ fontSize: '3rem', marginRight: '10px' }}>
                  {prizeWon.translations[currentLanguage]?.emoji || prizeWon.translations['es']?.emoji}
                </span>
                {prizeWon.translations[currentLanguage]?.name || prizeWon.translations['es']?.name}
              </div>
            )}
            <div className="expiry-warning">
              <span>⏰ {getTranslation('todayOnly')}</span>
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#fff', 
              marginBottom: '10px',
              opacity: 0.9 
            }}>
              Se va a generar el código de tu premio. Lo recibirás en <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{email}</span> en unos minutos, con formato <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{rewardCode}</span>. Preséntalo en el local para obtener tu regalo.
            </div>
          </div>
          <div className="form-section final-step">
            <h3 className="urgent-final"><span>{getTranslation('googleReviewTitle')}</span></h3>
            <GoogleTimer getTranslation={getTranslation} />
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
            prizes={ORIGINAL_PRIZES}
            language={currentLanguage}
            onSpinComplete={handleSpinComplete}
            getTranslation={getTranslation}
          />
        </div>
      )}

      {/* BARRA STICKY MÓVIL - ESTRUCTURA ORIGINAL */}
      <div className="fixed-cta-container hidden" id="fixed-cta-bar">
        <button className="confirmation-btn" id="fixed-cta-btn" onClick={handleRateNow}>
          {getTranslation('rateNow')}
        </button>
        <button className="confirmation-btn" id="fixed-cta-btn-form" onClick={() => {
          const form = document.querySelector('#formulario form') as HTMLFormElement;
          if (form) {
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
          }
        }}>
          {getTranslation('submitBtn')}
        </button>
        <button className="confirmation-btn" id="fixed-cta-btn-review" onClick={() => {
          if (business.googleReviewUrl) {
            window.open(business.googleReviewUrl, '_blank');
          }
        }}>
          {getTranslation('googleBtn')}
        </button>
      </div>
    </div>
  )
}
