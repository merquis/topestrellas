'use client'

interface LanguageSelectorProps {
  languages: string[]
  currentLanguage: string
  onLanguageChange: (lang: string) => void
}

const flagUrls: Record<string, string> = {
  es: 'https://flagcdn.com/w40/es.png',
  en: 'https://flagcdn.com/w40/gb.png',
  de: 'https://flagcdn.com/w40/de.png',
  fr: 'https://flagcdn.com/w40/fr.png',
  it: 'https://flagcdn.com/w40/it.png',
  pt: 'https://flagcdn.com/w40/pt.png'
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
          className={`language-flag-btn ${currentLanguage === lang ? 'active' : ''}`}
          onClick={() => onLanguageChange(lang)}
          style={{
            backgroundImage: `url(${flagUrls[lang] || flagUrls.es})`
          }}
          aria-label={`Change language to ${lang}`}
        />
      ))}
    </div>
  )
}
