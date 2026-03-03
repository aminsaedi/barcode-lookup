import { useTranslation } from 'react-i18next'
import { applyDirection, SUPPORTED_LANGS, type SupportedLang } from '../i18n'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language as SupportedLang

  const switchTo = (lang: SupportedLang) => {
    i18n.changeLanguage(lang)
    applyDirection(lang)
  }

  return (
    <div className="flex gap-1 bg-slate-700/60 rounded-lg p-1" data-testid="language-switcher">
      {SUPPORTED_LANGS.map((lang) => (
        <button
          key={lang}
          onClick={() => switchTo(lang)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            currentLang === lang
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-600'
          }`}
          data-testid={`lang-${lang}`}
          aria-pressed={currentLang === lang}
        >
          {lang === 'en' ? 'EN' : 'FA'}
        </button>
      ))}
    </div>
  )
}
