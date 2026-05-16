import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Company, SubBrand } from '../data/companies.generated'
import { countryFlag, countryName } from '../lib/flag'

interface Props {
  company: Company
  highlightSubBrand?: SubBrand | null
  compact?: boolean
}

export default function CompanyCard({ company, highlightSubBrand, compact }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'fa' ? 'fa' : 'en'
  const [expanded, setExpanded] = useState(!compact)

  return (
    <article
      className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
      data-testid="company-card"
      data-company-slug={company.slug}
    >
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-slate-700">
        {company.logo ? (
          <img
            src={company.logo}
            alt=""
            className="w-16 h-16 object-contain bg-white rounded-lg p-1 flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
            {company.name.en.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate" data-testid="company-name">
            {company.name[lang] || company.name.en}
          </h2>
          <p className="text-sm text-slate-400 flex items-center gap-2 mt-0.5">
            <span aria-hidden="true">{countryFlag(company.country)}</span>
            <span>{countryName(company.country)}</span>
          </p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 whitespace-nowrap"
          data-testid="status-pill"
        >
          {t('result.flagged')}
        </span>
      </header>

      {/* Why / claim */}
      {company.claim[lang] && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-slate-700">
          <p className="text-xs uppercase tracking-wide text-amber-300/80 font-semibold mb-1">
            {t('company.why')}
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">{company.claim[lang]}</p>
        </div>
      )}

      {/* Description */}
      {company.description[lang] && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">
            {t('company.description')}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{company.description[lang]}</p>
        </div>
      )}

      {/* Sub-brands */}
      {company.subBrands.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              {t('company.subBrands')} · {company.subBrands.length}
            </p>
            <span className="text-slate-500 text-sm">{expanded ? '▾' : '▸'}</span>
          </button>
          {expanded && (
            <ul
              className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3"
              data-testid="sub-brand-grid"
            >
              {company.subBrands.map((s) => {
                const isHighlight = highlightSubBrand?.slug === s.slug
                return (
                  <li
                    key={s.slug}
                    className={`rounded-lg p-2 flex flex-col items-center gap-1 text-center ${
                      isHighlight
                        ? 'bg-blue-600/20 ring-2 ring-blue-400'
                        : 'bg-slate-900/60 ring-1 ring-slate-700'
                    }`}
                    data-testid="sub-brand-tile"
                  >
                    {s.logo ? (
                      <img
                        src={s.logo}
                        alt=""
                        className="w-12 h-12 object-contain bg-white rounded p-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-700 rounded" />
                    )}
                    <span className="text-xs font-semibold text-slate-100 line-clamp-1">
                      {s.name.en || s.name.fa}
                    </span>
                    {s.subtitle[lang] && (
                      <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {s.subtitle[lang]}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Dossier link */}
      {company.dossier && (
        <footer className="px-4 py-3">
          <a
            href={company.dossier.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 bg-slate-900/60 hover:bg-slate-900 rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors"
            data-testid="dossier-link"
          >
            <span className="line-clamp-2">{t('result.viewDossier')}</span>
            <span aria-hidden="true" className="text-slate-500">↗</span>
          </a>
        </footer>
      )}
    </article>
  )
}
