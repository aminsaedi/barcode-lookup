import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyDirection } from './i18n'
import BarcodeScanner from './components/BarcodeScanner'
import ProductCard from './components/ProductCard'
import LanguageSwitcher from './components/LanguageSwitcher'

export interface ProductInfo {
  en: string
  fa: string
}

export interface LookupResult {
  barcode: string
  found: boolean
  product?: ProductInfo
}

type AppState = 'idle' | 'scanning' | 'loading' | 'result' | 'error'

export default function App() {
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<AppState>('idle')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    applyDirection(i18n.language)
  }, [i18n.language])

  const handleBarcodeDetected = async (barcode: string) => {
    setState('loading')
    try {
      const res = await fetch(`/api/lookup?barcode=${encodeURIComponent(barcode)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: LookupResult = await res.json()
      setResult(data)
      setState('result')
    } catch {
      setErrorMsg(t('error.api'))
      setState('error')
    }
  }

  const handleReset = () => {
    setResult(null)
    setErrorMsg('')
    setState('idle')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="barcode">
            📦
          </span>
          <h1 className="text-lg font-bold text-blue-400">{t('appName')}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="text-6xl" role="img" aria-label="scan">
              🔍
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{t('appName')}</h2>
              <p className="text-slate-400">{t('tagline')}</p>
            </div>
            <button
              onClick={() => setState('scanning')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-2xl text-white font-semibold text-lg transition-colors shadow-lg shadow-blue-900/40"
              data-testid="scan-button"
            >
              {t('scan.button')}
            </button>
          </div>
        )}

        {state === 'scanning' && (
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onCancel={handleReset}
          />
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4" data-testid="loading">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">{t('scan.scanning')}</p>
          </div>
        )}

        {state === 'result' && result && (
          <ProductCard result={result} onReset={handleReset} />
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4 text-center" data-testid="error-state">
            <div className="text-5xl">⚠️</div>
            <p className="text-red-400">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
            >
              {t('product.scanAnother')}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
