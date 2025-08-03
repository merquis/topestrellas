'use client'

import Image from 'next/image'

interface LanguageSelectorProps {
  languages: string[]
  currentLanguage: string
  onLanguageChange: (lang: string) => void
}

const languageFlags: Record<string, string> = {
  es: 'https://flagcdn.com/w20/es.png',
  en: 'https://flagcdn.com/w20/gb.png',
  de: 'https://flagcdn.com/w20/de.png',
  fr: 'https://flagcdn.com/w20/fr.png',
  it: 'https://flagcdn.com/w20/it.png',
  pt: 'https://flagcdn.com/w20/pt.png'
}

const languageNames: Record<string, string> = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português'
}

export default function LanguageSelector({ 
  languages, 
  currentLanguage, 
  onLanguageChange 
}: LanguageSelectorProps) {
  return (
    <div className="language-selector-container">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange(lang)}
          className={`language-flag ${currentLanguage === lang ? 'active' : ''}`}
          title={languageNames[lang] || lang}
        >
          <Image
            src={languageFlags[lang] || languageFlags.en}
            alt={languageNames[lang] || lang}
            width={32}
            height={24}
            className="flag-image"
          />
        </button>
      ))}
    </div>
  )
}
