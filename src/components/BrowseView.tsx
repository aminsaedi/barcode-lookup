import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import data from '../data/companies.generated'
import CompanyCard from './CompanyCard'

export default function BrowseView() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'fa' ? 'fa' : 'en'
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)

  const { companies, categories } = data

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return companies
      .map((c) => {
        if (cat) {
          const filteredSubs = c.subBrands.filter((s) => s.categories.includes(cat))
          if (filteredSubs.length === 0) return null
          return { ...c, subBrands: filteredSubs }
        }
        return c
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .filter((c) => {
        if (!needle) return true
        const haystacks = [
          c.name.en,
          c.name.fa,
          c.slug,
          ...c.subBrands.flatMap((s) => [s.name.en, s.name.fa]),
        ]
        return haystacks.some((h) => h.toLowerCase().includes(needle))
      })
  }, [q, cat, companies])

  const totalSubs = filtered.reduce((n, c) => n + c.subBrands.length, 0)

  return (
    <section className="w-full max-w-3xl mx-auto flex flex-col gap-4" data-testid="browse-view">
      <header>
        <h2 className="text-2xl font-bold text-white">{t('browse.title')}</h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('browse.subtitle', { n: filtered.length, m: totalSubs })}
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-3 flex items-center text-slate-500 pointer-events-none"
        >
          🔎
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('browse.searchPlaceholder')}
          className="w-full ps-10 pe-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="browse-search"
          dir={lang === 'fa' ? 'rtl' : 'ltr'}
        />
      </div>

      {/* Category chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
        data-testid="category-chips"
      >
        <button
          type="button"
          onClick={() => setCat(null)}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            cat === null
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          data-testid="chip-all"
        >
          {t('browse.filterAll')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(cat === c.label ? null : c.label)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              cat === c.label
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            data-testid={`chip-${c.id}`}
          >
            <span aria-hidden="true">{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center text-slate-500 py-12" data-testid="browse-empty">
          {t('browse.noResults')}
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="browse-results">
          {filtered.map((c) => (
            <CompanyCard key={c.slug} company={c} compact />
          ))}
        </div>
      )}
    </section>
  )
}
