import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BarcodeScanner from './BarcodeScanner'
import CompanyCard from './CompanyCard'
import { findCompanyByBrand, findSubBrand } from '../lib/brandMatch'
import type { Company, SubBrand } from '../data/companies.generated'

interface OffData {
  name: string
  productName?: string
  imageUrl?: string
  categories?: string
}

interface LookupResponse {
  barcode: string
  found: boolean
  product?: { en: string; fa: string }
  off?: OffData
}

type ScanState = 'idle' | 'scanning' | 'manual' | 'loading' | 'result' | 'error'

interface Match {
  barcode: string
  company: Company | null
  subBrand: SubBrand | null
  source: 'kv' | 'off' | 'none'
  product?: { en: string; fa: string }
  off?: OffData
}

export default function ScanView() {
  const { t } = useTranslation()
  const [state, setState] = useState<ScanState>('idle')
  const [match, setMatch] = useState<Match | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Test hook for E2E
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string
      if (detail) handleBarcodeDetected(detail)
    }
    window.addEventListener('__test_scan__', handler as EventListener)
    return () => window.removeEventListener('__test_scan__', handler as EventListener)
  }, [])

  async function handleBarcodeDetected(barcode: string) {
    setState('loading')
    try {
      const res = await fetch(`/api/lookup?barcode=${encodeURIComponent(barcode)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as LookupResponse

      const brandCandidate = data.product?.en || data.off?.name || ''
      const company = findCompanyByBrand(brandCandidate)
      const subBrand = company ? findSubBrand(company, brandCandidate) : null
      const source: Match['source'] = data.product ? 'kv' : data.off ? 'off' : 'none'

      setMatch({
        barcode: data.barcode,
        company,
        subBrand,
        source,
        product: data.product,
        off: data.off,
      })
      setState('result')
    } catch {
      setErrorMsg(t('error.api'))
      setState('error')
    }
  }

  function handleReset() {
    setMatch(null)
    setErrorMsg('')
    setManualInput('')
    setState('idle')
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = manualInput.trim()
    if (!/^\d{6,14}$/.test(v)) {
      setErrorMsg(t('error.api'))
      setState('error')
      return
    }
    handleBarcodeDetected(v)
  }

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-6" data-testid="scan-idle">
        <div className="text-6xl" role="img" aria-label="scan">
          🔍
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('appName')}</h2>
          <p className="text-slate-400 max-w-md">{t('tagline')}</p>
        </div>
        <button
          type="button"
          onClick={() => setState('scanning')}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-2xl text-white font-semibold text-lg transition-colors shadow-lg shadow-blue-900/40"
          data-testid="scan-button"
        >
          📷 {t('scan.button')}
        </button>
        <button
          type="button"
          onClick={() => setState('manual')}
          className="text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
          data-testid="manual-button"
        >
          {t('scan.manualEntry')}
        </button>
      </div>
    )
  }

  if (state === 'scanning') {
    return <BarcodeScanner onDetected={handleBarcodeDetected} onCancel={handleReset} />
  }

  if (state === 'manual') {
    return (
      <form
        onSubmit={handleManualSubmit}
        className="w-full max-w-md flex flex-col gap-3"
        data-testid="manual-form"
      >
        <label htmlFor="manual-barcode" className="text-sm text-slate-300 font-medium">
          {t('scan.manualEntry')}
        </label>
        <input
          id="manual-barcode"
          type="text"
          inputMode="numeric"
          autoFocus
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ''))}
          placeholder={t('scan.manualPlaceholder')}
          className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={manualInput.length < 6}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-white font-medium transition-colors"
          >
            {t('scan.submit')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
          >
            {t('scan.stop')}
          </button>
        </div>
      </form>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4" data-testid="loading">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">{t('scan.scanning')}</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 text-center" data-testid="error-state">
        <div className="text-5xl">⚠️</div>
        <p className="text-red-400">{errorMsg}</p>
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
        >
          {t('result.scanAnother')}
        </button>
      </div>
    )
  }

  // state === 'result'
  if (!match) return null

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4" data-testid="scan-result">
      {match.company ? (
        <CompanyCard company={match.company} highlightSubBrand={match.subBrand} />
      ) : (
        <NoFlagCard match={match} />
      )}

      {/* Source attribution */}
      <p className="text-xs text-slate-500 text-center" data-testid="match-source">
        {t('result.matchedVia')}:{' '}
        {match.source === 'kv'
          ? t('result.kv')
          : match.source === 'off'
            ? t('result.off')
            : '—'}{' '}
        · {t('result.scanAnother').toLowerCase()}: {match.barcode}
      </p>

      <button
        type="button"
        onClick={handleReset}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-white font-medium transition-colors"
        data-testid="scan-another"
      >
        {t('result.scanAnother')}
      </button>
    </div>
  )
}

function NoFlagCard({ match }: { match: Match }) {
  const { t } = useTranslation()
  const productLabel = match.product?.en || match.off?.productName || match.off?.name
  return (
    <div
      className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4"
      data-testid="no-flag-card"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-xl">
          ✅
        </div>
        <h2 className="text-lg font-semibold text-emerald-400">
          {productLabel ? t('result.unflagged') : t('result.notFound')}
        </h2>
      </div>
      {productLabel ? (
        <>
          <div className="flex items-center gap-3">
            {match.off?.imageUrl && (
              <img
                src={match.off.imageUrl}
                alt=""
                className="w-16 h-16 object-contain bg-white rounded-lg p-1"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-white" data-testid="product-name">
                {productLabel}
              </p>
              {match.off?.name && (
                <p className="text-sm text-slate-400">{match.off.name}</p>
              )}
            </div>
          </div>
          <p className="text-xs font-mono text-slate-400" data-testid="product-barcode">
            {match.barcode}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-400" data-testid="not-found-message">
          {t('result.notFoundMessage', { barcode: match.barcode })}
        </p>
      )}
    </div>
  )
}
