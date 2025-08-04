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

// Premios por defecto como fallback si no hay premios configurados
const DEFAULT_PRIZES: Prize[] = [
    { index: 0, value: '60€', translations: { 
        es: { name: 'CENA PARA 2', emoji: '🍽️' },
        en: { name: 'DINNER FOR 2', emoji: '🍽️' },
        de: { name: 'ABENDESSEN FÜR 2', emoji: '🍽️' },
        fr: { name: 'DÎNER POUR 2', emoji: '🍽️' }
    }},
    { index: 1, value: '30€', translations: { 
        es: { name: '30€ DESCUENTO', emoji: '💸' },
        en: { name: '30€ DISCOUNT', emoji: '💸' },
        de: { name: '30€ RABATT', emoji: '💸' },
        fr: { name: '30€ DE REMISE', emoji: '💸' }
    }},
    { index: 2, value: '25€', translations: { 
        es: { name: 'BOTELLA VINO', emoji: '🍷' },
        en: { name: 'WINE BOTTLE', emoji: '🍷' },
        de: { name: 'WEINFLASCHE', emoji: '🍷' },
        fr: { name: 'BOUTEILLE DE VIN', emoji: '🍷' }
    }},
    { index: 3, value: '10€', translations: { 
        es: { name: 'HELADO', emoji: '🍦' },
        en: { name: 'ICE CREAM', emoji: '🍦' },
        de: { name: 'EIS', emoji: '🍦' },
        fr: { name: 'GLACE', emoji: '🍦' }
    }},
    { index: 4, value: '5€', translations: { 
        es: { name: 'CERVEZA', emoji: '🍺' },
        en: { name: 'BEER', emoji: '🍺' },
        de: { name: 'BIER', emoji: '🍺' },
        fr: { name: 'BIÈRE', emoji: '🍺' }
    }},
    { index: 5, value: '3€', translations: { 
        es: { name: 'REFRESCO', emoji: '🥤' },
        en: { name: 'SOFT DRINK', emoji: '🥤' },
        de: { name: 'ERFRISCHUNGSGETRÄNK', emoji: '🥤' },
        fr: { name: 'SODA', emoji: '🥤' }
    }},
    { index: 6, value: '8€', translations: { 
        es: { name: 'MOJITO', emoji: '🍹' },
        en: { name: 'MOJITO', emoji: '🍹' },
        de: { name: 'MOJITO', emoji: '🍹' },
        fr: { name: 'MOJITO', emoji: '🍹' }
    }},
    { index: 7, value: '2€', translations: { 
        es: { name: 'CHUPITO', emoji: '🥃' },
        en: { name: 'SHOT', emoji: '🥃' },
        de: { name: 'SHOT', emoji: '🥃' },
        fr: { name: 'SHOOTER', emoji: '🥃' }
    }},
];

export default function BusinessReviewApp({ business }: BusinessReviewAppProps) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => 
    getBrowserLanguage(business.config.languages)
  )
  const [currentView, setCurrentView] = useState<'initial' | 'form' | 'roulette' | 'code' | 'review'>('initial')
  const [rating, setRating] = useState(0)
  const [prizeWon, setPrizeWon] = useState<any>(null)
  const [watchingCount, setWatchingCount] = useState(Math.floor(Math.random() * 4) + 1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [privacyPolicy, setPrivacyPolicy] = useState(false)
  const [errors, setErrors] = useState<ErrorState>({ name: '', email: '', feedback: '', privacy: '', rating: '' })
  const [rewardCode, setRewardCode] = useState('')
  const [ratingFace, setRatingFace] = useState('🤔')
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false)
  const [buttonText, setButtonText] = useState('')

  // Usar los premios del negocio o fallback a los por defecto
  const businessPrizes = business.config.prizes && business.config.prizes.length > 0 
    ? business.config.prizes 
    : DEFAULT_PRIZES

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
      setWatchingCount((prev: number) => Math.max(1, Math.min(4, prev + (Math.floor(Math.random() * 3) - 1))))
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
      case 5: return '😍';
      default: return '🤔';
    }
  }

  const updateButtonText = () => {
    let text;
    if (rating > 0) {
      if (rating === 1) {
        // Para 1 estrella, usar singular
        const starWord = currentLanguage === 'es' ? 'ESTRELLA' : 
                         currentLanguage === 'en' ? 'STAR' :
                         currentLanguage === 'de' ? 'STERN' :
                         currentLanguage === 'fr' ? 'ÉTOILE' : 'ESTRELLA';
        text = `VALORAR CON 1 ${starWord}`;
        if (currentLanguage === 'en') text = `RATE WITH 1 ${starWord}`;
        if (currentLanguage === 'de') text = `MIT 1 ${starWord} BEWERTEN`;
        if (currentLanguage === 'fr') text = `ÉVALUER AVEC 1 ${starWord}`;
      } else {
        // Para múltiples estrellas, usar plural
        const starWord = currentLanguage === 'es' ? 'ESTRELLAS' : 
                         currentLanguage === 'en' ? 'STARS' :
                         currentLanguage === 'de' ? 'STERNEN' :
                         currentLanguage === 'fr' ? 'ÉTOILES' : 'ESTRELLAS';
        text = `VALORAR CON ${rating} ${starWord}`;
        if (currentLanguage === 'en') text = `RATE WITH ${rating} ${starWord}`;
        if (currentLanguage === 'de') text = `MIT ${rating} ${starWord} BEWERTEN`;
        if (currentLanguage === 'fr') text = `ÉVALUER AVEC ${rating} ${starWord}`;
      }
    } else {
      text = getTranslation('rateNow');
    }
    setButtonText(text);
    console.log('Button text updated:', text, 'Rating:', rating); // Debug
  }

  // useEffect para actualizar el texto del botón cuando cambie el rating
  useEffect(() => {
    updateButtonText();
  }, [rating, currentLanguage])

  // useEffect para inicializar el texto del botón
  useEffect(() => {
    updateButtonText();
  }, [])

  const handleStarHover = (value: number) => {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
      const starValue = parseInt(star.getAttribute('data-value') || '0', 10);
      if (starValue <= value) {
        star.classList.add('hover');
      } else {
        star.classList.remove('hover');
      }
    });
    // Cambiar la carita según el hover
    setRatingFace(getFaceForRating(value));
  }

  const handleStarLeave = () => {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
      star.classList.remove('hover');
    });
    // Volver a la carita del rating actual (o la carita por defecto si no hay rating)
    setRatingFace(getFaceForRating(rating));
  }

  const handleStarClick = (value: number) => {
    setRating(value)
    setRatingFace(getFaceForRating(value))
    // Limpiar el error de rating cuando se selecciona una estrella
    setErrors(prev => ({ ...prev, rating: '' }))
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
      const starValue = parseInt(star.getAttribute('data-value') || '0', 10);
      if (starValue <= value) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
      // Quitar el efecto de parpadeo cuando se selecciona una estrella
      star.classList.remove('heartbeat-pulse');
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
            // Las estrellas seguirán parpadeando hasta que se seleccione una
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
    const prize = businessPrizes[prizeIndex];
    setPrizeWon(prize);
    
    // Generar código como en la versión original: PR-XXXX donde el último dígito es el rating
    const randomPart = Math.random().toString().slice(2, 5); // 3 dígitos aleatorios
    const generatedCode = `PR-${randomPart}${rating}`;
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
              {businessPrizes.filter(p => p.index === 0 || p.index === 1 || p.index === 2).map((p, i) => (
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
                <span 
                  key={v} 
                  className="star" 
                  data-value={v} 
                  onClick={() => handleStarClick(v)}
                  onMouseEnter={() => handleStarHover(v)}
                  onMouseLeave={handleStarLeave}
                >★</span>
              ))}
              <span className="rating-face">{ratingFace}</span>
            </div>
            {errors.rating && <div className="rating-error">{errors.rating}</div>}
            <div id="valorarBtnContainer">
              <button className="confirmation-btn premium-btn" onClick={handleRateNow}>
                <span>{buttonText}</span>
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
              <a href="#" className="privacy-link" onClick={(e) => { e.preventDefault(); setShowPrivacyPopup(true); }}>
                {getTranslation('privacyLinkText')}
              </a>
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
            {prizeWon && (
              <div className="premio-grande">
                <span style={{ fontSize: '3rem', marginRight: '10px' }}>
                  {prizeWon.translations[currentLanguage]?.emoji || prizeWon.translations['es']?.emoji}
                </span>
                {prizeWon.translations[currentLanguage]?.name || prizeWon.translations['es']?.name}
              </div>
            )}
            <div className="email-message">
              {getTranslation('prizeCodeMessage1')}
              <span className="highlight-email">{email}</span>
              {getTranslation('prizeCodeMessage2')}
              <span className="codigo-premio">PR‑XXXX</span>
              {getTranslation('prizeCodeMessage3')}
            </div>
          </div>
        </div>

        {/* VISTA REVIEW GOOGLE */}
        <div id="resenaBtn" className={currentView !== 'review' ? 'hidden' : ''}>
          <div className="reward-code premium-reward">
            <div className="description">
              <span>{getTranslation('rewardCode')}</span>
            </div>
            {prizeWon && (
              <div className="premio-grande">
                <span style={{ fontSize: '3rem', marginRight: '10px' }}>
                  {prizeWon.translations[currentLanguage]?.emoji || prizeWon.translations['es']?.emoji}
                </span>
                {prizeWon.translations[currentLanguage]?.name || prizeWon.translations['es']?.name}
              </div>
            )}
            <div className="email-message">
              {getTranslation('prizeCodeMessage1')}
              <span className="highlight-email">{email}</span>
              {getTranslation('prizeCodeMessage2')}
              <span className="codigo-premio">PR‑XXXX</span>
              <br />
              {getTranslation('prizeCodeMessage3')}
            </div>
          </div>
          <div className="form-section final-step">
            <h3 className="urgent-final"><span>{getTranslation('googleReviewTitle')}</span></h3>
            <GoogleTimer getTranslation={getTranslation} startTimer={currentView === 'review'} />
            <div id="googleBtnContainer">
              <a href={business.config?.reviewPlatform === 'tripadvisor' ? business.config?.tripadvisorReviewUrl : business.config?.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="google-btn premium-google">
                <span>{getTranslation('reviewBtn')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* VISTA RULETA (PANTALLA COMPLETA) */}
      {currentView === 'roulette' && (
        <div className="roulette-screen">
          <RouletteWheel
            prizes={businessPrizes}
            language={currentLanguage}
            onSpinComplete={handleSpinComplete}
            getTranslation={getTranslation}
          />
        </div>
      )}

      {/* POPUP DE POLÍTICA DE PRIVACIDAD */}
      {showPrivacyPopup && (
        <div className="popup-overlay" onClick={() => setShowPrivacyPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowPrivacyPopup(false)}>
              &times;
            </button>
            <div dangerouslySetInnerHTML={{ __html: getTranslation('privacyPolicyFullText') }} />
            <button className="popup-close-text-btn" onClick={() => setShowPrivacyPopup(false)}>
              {getTranslation('closePrivacyPopupBtn')}
            </button>
          </div>
        </div>
      )}

      {/* BARRA STICKY MÓVIL - ESTRUCTURA ORIGINAL */}
      <div className="fixed-cta-container hidden" id="fixed-cta-bar">
        <button className="confirmation-btn" id="fixed-cta-btn" onClick={handleRateNow}>
          {buttonText}
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
          const reviewUrl = business.config?.reviewPlatform === 'tripadvisor' ? business.config?.tripadvisorReviewUrl : business.config?.googleReviewUrl;
          if (reviewUrl) {
            window.open(reviewUrl, '_blank');
          }
        }}>
          {getTranslation('reviewBtn')}
        </button>
      </div>
    </div>
  )
}
