import { useTranslation } from 'react-i18next'
import data from '../data/companies.generated'

export default function AboutView() {
  const { t } = useTranslation()
  const date = new Date(data.generatedAt).toISOString().slice(0, 10)

  return (
    <section
      className="w-full max-w-2xl mx-auto flex flex-col gap-6 text-slate-200"
      data-testid="about-view"
    >
      <header>
        <h2 className="text-2xl font-bold text-white">{t('about.title')}</h2>
      </header>

      <p className="leading-relaxed">{t('about.intro')}</p>

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">{t('about.stance')}</h3>
        <p className="leading-relaxed text-slate-300">{t('about.stanceBody')}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">{t('about.scope')}</h3>
        <p className="leading-relaxed text-slate-300">{t('about.scopeBody')}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-2">{t('about.data')}</h3>
        <p className="leading-relaxed text-slate-300">{t('about.dataBody', { date })}</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="https://qlist.ir"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium transition-colors"
        >
          qlist.ir ↗
        </a>
        <a
          href="https://github.com/aminsaedi/barcode-lookup"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium transition-colors"
        >
          {t('about.openSource')} ↗
        </a>
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium transition-colors"
        >
          Open Food Facts ↗
        </a>
      </div>
    </section>
  )
}
