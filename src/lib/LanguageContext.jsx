import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from './translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ initialLang = 'en', initialLogo = null, children }) {
  const [lang, setLang]   = useState(initialLang)
  const [logo, setLogo]   = useState(initialLogo)

  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) ||
           (translations['en'] && translations['en'][key]) ||
           key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, logo, setLogo }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
