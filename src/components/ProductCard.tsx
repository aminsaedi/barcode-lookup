import { useTranslation } from 'react-i18next'
import type { LookupResult } from '../App'

interface Props {
  result: LookupResult
  onReset: () => void
}

export default function ProductCard({ result, onReset }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'fa'

  const displayName =
    result.found && result.product
      ? (result.product[lang] ?? result.product.en)
      : null

  return (
    <div className="w-full max-w-sm flex flex-col gap-4" data-testid="product-card">
      {result.found ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-xl">
              ✅
            </div>
            <h2 className="text-lg font-semibold text-green-400">{t('product.found')}</h2>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p
              className="text-2xl font-bold text-white leading-snug"
              data-testid="product-name"
            >
              {displayName}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{t('product.barcode')}:</span>
            <span className="text-xs font-mono text-slate-400" data-testid="product-barcode">
              {result.barcode}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-xl">
              ❓
            </div>
            <h2 className="text-lg font-semibold text-yellow-400">{t('product.notFound')}</h2>
          </div>
          <p className="text-slate-400 text-sm" data-testid="not-found-message">
            {t('product.notFoundMessage')}:
          </p>
          <p className="font-mono text-slate-300 text-sm bg-slate-900 rounded-lg px-3 py-2">
            {result.barcode}
          </p>
        </div>
      )}

      <button
        onClick={onReset}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-white font-medium transition-colors"
        data-testid="scan-another"
      >
        {t('product.scanAnother')}
      </button>
    </div>
  )
}
