import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyDirection } from './i18n'
import ScanView from './components/ScanView'
import BrowseView from './components/BrowseView'
import AboutView from './components/AboutView'
import LanguageSwitcher from './components/LanguageSwitcher'

type Tab = 'scan' | 'browse' | 'about'

export default function App() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('scan')

  useEffect(() => {
    applyDirection(i18n.language)
  }, [i18n.language])

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => setTab('scan')}
          className="flex items-center gap-2"
          aria-label="Home"
        >
          <span className="text-2xl" role="img" aria-label="barcode">
            🛒
          </span>
          <h1 className="text-base font-bold text-blue-400 truncate max-w-[60vw]">
            {t('appName')}
          </h1>
        </button>
        <LanguageSwitcher />
      </header>

      {/* Tab navigation */}
      <nav
        className="flex border-b border-slate-700 bg-slate-800/40 sticky top-[57px] z-10"
        aria-label="Primary"
        data-testid="tab-nav"
      >
        {(
          [
            { id: 'scan', icon: '🔍' },
            { id: 'browse', icon: '📋' },
            { id: 'about', icon: 'ℹ️' },
          ] as { id: Tab; icon: string }[]
        ).map(({ id, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === id
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            data-testid={`tab-${id}`}
          >
            <span aria-hidden="true">{icon}</span>
            {t(`nav.${id}`)}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center p-4 gap-6 w-full">
        {tab === 'scan' && <ScanView />}
        {tab === 'browse' && <BrowseView />}
        {tab === 'about' && <AboutView />}
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 text-xs text-slate-500 text-center border-t border-slate-800">
        Data attributed to{' '}
        <a
          href="https://qlist.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-slate-200 underline"
        >
          qlist.ir
        </a>{' '}
        and{' '}
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-slate-200 underline"
        >
          Open Food Facts
        </a>
      </footer>
    </div>
  )
}
