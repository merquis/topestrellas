'use client'

import { useState } from 'react'
import { isValidEmail, sanitizeInput } from '@/lib/utils'

interface LeadFormProps {
  rating: number
  onSubmit: (data: any) => void
  language: string
  getTranslation: (key: string) => string
}

export default function LeadForm({ 
  rating, 
  onSubmit, 
  language, 
  getTranslation 
}: LeadFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feedback: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false)

  const defaultTranslations: Record<string, Record<string, string>> = {
    es: {
      improveQuestion: '¿Dónde enviamos tu PREMIO? 🎁',
      emailWarning: 'Asegúrate de que tu email es correcto. ¡Ahí recibirás el código de referencia para canjear tu premio!',
      namePlaceholder: 'Tu nombre',
      emailPlaceholder: 'Tu email',
      feedbackPlaceholder: 'Completa tu reseña del negocio',
      privacyPolicy: 'Acepto la política de privacidad',
      privacyLinkText: 'Privacidad',
      submitBtn: 'Continuar',
      requiredField: 'Este campo es obligatorio',
      invalidEmail: 'Email no válido',
      privacyRequired: 'Debes aceptar la política de privacidad'
    },
    en: {
      improveQuestion: 'Where do we send your PRIZE? 🎁',
      emailWarning: 'Make sure your email is correct. You will receive the reference code to redeem your prize there!',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'Your email',
      feedbackPlaceholder: 'Complete your business review',
      privacyPolicy: 'I accept the privacy policy',
      privacyLinkText: 'Privacy',
      submitBtn: 'Continue',
      requiredField: 'This field is required',
      invalidEmail: 'Invalid email',
      privacyRequired: 'You must accept the privacy policy'
    }
  }

  const getLocalTranslation = (key: string): string => {
    return defaultTranslations[language]?.[key] || defaultTranslations['es'][key] || key
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = getLocalTranslation('requiredField')
    }

    if (!formData.email.trim()) {
      newErrors.email = getLocalTranslation('requiredField')
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = getLocalTranslation('invalidEmail')
    }

    if (rating <= 4 && !formData.feedback.trim()) {
      newErrors.feedback = getLocalTranslation('requiredField')
    }

    if (!privacyAccepted) {
      newErrors.privacy = getLocalTranslation('privacyRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Verificar email duplicado
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })
      
      const result = await response.json()
      
      if (!result.available) {
        setErrors({ email: getLocalTranslation('emailAlreadyUsed') || 'Este email ya ha sido utilizado' })
        return
      }
    } catch (error) {
      console.error('Error verifying email:', error)
    }

    onSubmit({
      name: sanitizeInput(formData.name),
      email: formData.email.toLowerCase().trim(),
      feedback: sanitizeInput(formData.feedback)
    })
  }

  return (
    <div className="form-section premium-form fade-in">
      <h3 className="form-title-premium">
        {getTranslation('improveQuestion') || getLocalTranslation('improveQuestion')}
      </h3>
      <p className="email-warning-text text-sm text-gray-600 mb-4">
        {getTranslation('emailWarning') || getLocalTranslation('emailWarning')}
      </p>
      
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group mb-4">
          <input
            type="text"
            className="form-input premium-input"
            placeholder={getTranslation('namePlaceholder') || getLocalTranslation('namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {errors.name && (
            <div className="field-error text-red-500 text-sm mt-1">{errors.name}</div>
          )}
        </div>

        <div className="form-group mb-4">
          <input
            type="email"
            className="form-input premium-input"
            placeholder={getTranslation('emailPlaceholder') || getLocalTranslation('emailPlaceholder')}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          {errors.email && (
            <div className="field-error text-red-500 text-sm mt-1">{errors.email}</div>
          )}
        </div>

        {rating <= 4 && (
          <div className="form-group mb-4">
            <textarea
              className="form-input form-textarea"
              placeholder={getTranslation('feedbackPlaceholder') || getLocalTranslation('feedbackPlaceholder')}
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              rows={4}
              required
            />
            {errors.feedback && (
              <div className="field-error text-red-500 text-sm mt-1">{errors.feedback}</div>
            )}
          </div>
        )}

        <div className="form-group privacy-policy-group mb-4">
          <div className="privacy-check-wrapper flex items-center">
            <input
              type="checkbox"
              id="privacyPolicy"
              name="privacyPolicy"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mr-2"
              required
            />
            <label htmlFor="privacyPolicy" className="text-sm">
              {getTranslation('privacyPolicy') || getLocalTranslation('privacyPolicy')}
            </label>
            <button
              type="button"
              onClick={() => setShowPrivacyPopup(true)}
              className="privacy-link text-blue-500 underline ml-2 text-sm"
            >
              {getTranslation('privacyLinkText') || getLocalTranslation('privacyLinkText')}
            </button>
          </div>
          {errors.privacy && (
            <div className="field-error text-red-500 text-sm mt-1">{errors.privacy}</div>
          )}
        </div>

        <button type="submit" className="submit-btn premium-submit">
          <span>{getTranslation('submitBtn') || getLocalTranslation('submitBtn')}</span>
        </button>
      </form>

      {/* Privacy Popup - simplified version */}
      {showPrivacyPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <button
              onClick={() => setShowPrivacyPopup(false)}
              className="float-right text-2xl font-bold text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Política de Privacidad</h2>
            <p className="text-sm text-gray-600">
              {/* Aquí iría el texto completo de la política de privacidad */}
              Información sobre el tratamiento de datos personales...
            </p>
            <button
              onClick={() => setShowPrivacyPopup(false)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
