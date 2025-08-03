'use client'

import { useState } from 'react'
import { Business } from '@/lib/types'

interface LeadFormProps {
  rating: number
  onSubmit: (data: any) => void
  language: string
  getTranslation: (key: string) => string
  business?: Business
}

export default function LeadForm({ 
  rating, 
  onSubmit, 
  language, 
  getTranslation,
  business 
}: LeadFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feedback: ''
  })
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    feedback: '',
    privacy: ''
  })
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false)

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = {
      name: '',
      email: '',
      feedback: '',
      privacy: ''
    }
    
    // Validaciones
    if (!formData.name.trim()) {
      newErrors.name = language === 'es' ? 'Por favor, ingresa tu nombre' : 'Please enter your name'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = language === 'es' ? 'Por favor, ingresa tu email' : 'Please enter your email'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = language === 'es' ? 'Por favor, ingresa un email válido' : 'Please enter a valid email'
    }
    
    if (rating <= 3 && !formData.feedback.trim()) {
      newErrors.feedback = language === 'es' 
        ? 'Por favor, cuéntanos cómo podemos mejorar' 
        : 'Please tell us how we can improve'
    }
    
    if (!privacyAccepted) {
      newErrors.privacy = language === 'es' 
        ? 'Debes aceptar la política de privacidad' 
        : 'You must accept the privacy policy'
    }
    
    setErrors(newErrors)
    
    // Si hay errores, no continuar
    if (Object.values(newErrors).some(error => error !== '')) {
      return
    }
    
    // Verificar email si hay webhook configurado
    if (business?.config.webhooks?.verifyEmailUrl) {
      try {
        const response = await fetch(business.config.webhooks.verifyEmailUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email,
            businessName: business.name
          })
        })
        
        const data = await response.json()
        if (data.exists) {
          setErrors({
            ...errors,
            email: language === 'es' 
              ? 'Este email ya ha sido utilizado' 
              : 'This email has already been used'
          })
          return
        }
      } catch (error) {
        console.error('Error verificando email:', error)
      }
    }
    
    onSubmit(formData)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    setErrors({ ...errors, [field]: '' })
  }

  return (
    <>
      <div id="formulario" className="form-section premium-form">
        <h3 className="form-title-premium">
          <span>{getTranslation('improveQuestion')}</span>
        </h3>
        <p className="email-warning-text">
          <span>{getTranslation('emailWarning')}</span>
        </p>
        
        <form id="feedbackForm" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <input 
              type="text" 
              className={`form-input premium-input ${errors.name ? 'error' : ''}`}
              placeholder={getTranslation('namePlaceholder')}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>
          
          <div className="form-group">
            <input 
              type="email" 
              className={`form-input premium-input ${errors.email ? 'error' : ''}`}
              placeholder={getTranslation('emailPlaceholder')}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          
          {rating <= 3 && (
            <div className="form-group" id="feedback-group">
              <textarea 
                className={`form-input form-textarea ${errors.feedback ? 'error' : ''}`}
                placeholder={getTranslation('feedbackPlaceholder')}
                value={formData.feedback}
                onChange={(e) => handleInputChange('feedback', e.target.value)}
                required
              />
              {errors.feedback && <div className="field-error">{errors.feedback}</div>}
            </div>
          )}
          
          <div className="form-group privacy-policy-group">
            <div className="privacy-check-wrapper">
              <input 
                type="checkbox" 
                id="privacyPolicy" 
                name="privacyPolicy"
                checked={privacyAccepted}
                onChange={(e) => {
                  setPrivacyAccepted(e.target.checked)
                  setErrors({ ...errors, privacy: '' })
                }}
                required
              />
              <label htmlFor="privacyPolicy" id="privacyPolicyLabel">
                {getTranslation('privacyPolicy')}
              </label>
              <a 
                href="#" 
                id="openPrivacyPopup" 
                className="privacy-link"
                onClick={(e) => {
                  e.preventDefault()
                  setShowPrivacyPopup(true)
                }}
              >
                {getTranslation('privacyLink')}
              </a>
            </div>
            {errors.privacy && <div id="privacy-error" className="field-error">{errors.privacy}</div>}
          </div>
          
          <button type="submit" className="submit-btn premium-submit">
            <span id="submitText">{getTranslation('submitBtn')}</span>
          </button>
        </form>
      </div>

      {/* Popup de Política de Privacidad */}
      {showPrivacyPopup && (
        <div id="privacyPopup" className="popup-overlay">
          <div className="popup-content">
            <button 
              id="closePrivacyPopup" 
              className="popup-close"
              onClick={() => setShowPrivacyPopup(false)}
            >
              &times;
            </button>
            <div id="privacyPopupContent">
              <h2>{language === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}</h2>
              <p>
                {language === 'es' 
                  ? 'Al proporcionar tu información, aceptas que podamos contactarte para informarte sobre tu premio y futuras promociones.'
                  : 'By providing your information, you agree that we may contact you to inform you about your prize and future promotions.'}
              </p>
              <h3>{language === 'es' ? 'Uso de datos' : 'Data Usage'}</h3>
              <p>
                {language === 'es'
                  ? 'Tus datos serán utilizados únicamente para gestionar tu premio y enviarte información relevante sobre nuestros servicios.'
                  : 'Your data will only be used to manage your prize and send you relevant information about our services.'}
              </p>
            </div>
            <button 
              className="popup-close-text-btn"
              onClick={() => setShowPrivacyPopup(false)}
            >
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
