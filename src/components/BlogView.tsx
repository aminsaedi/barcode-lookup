import { useTranslation } from 'react-i18next'
import data from '../data/companies.generated'
import EditorJSRenderer from './EditorJSRenderer'
import type { EditorJSDoc } from './EditorJSRenderer'

interface Props {
  slug: string
  onBack: () => void
}

export default function BlogView({ slug, onBack }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'fa' ? 'fa' : 'en'
  const post = data.posts?.find((p) => p.slug === slug)

  if (!post) {
    return (
      <section className="w-full max-w-3xl mx-auto flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="self-start px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          ← {t('blog.back')}
        </button>
        <p className="text-slate-400">{t('blog.notFound')}</p>
      </section>
    )
  }

  const title = post.title[lang] || post.title.fa
  const summary = post.summary[lang] || post.summary.fa
  // If we have a translated body, prefer it; otherwise fall back to original Persian.
  const body: EditorJSDoc =
    (lang === 'en' && post.bodyEn) || post.body || { blocks: [] }
  const usingFallback = lang === 'en' && !post.bodyEn && !!post.body
  const bodyDir = lang === 'en' && post.bodyEn ? 'ltr' : 'rtl'

  return (
    <article
      className="w-full max-w-3xl mx-auto flex flex-col gap-5"
      data-testid="blog-view"
      data-blog-slug={slug}
    >
      <button
        type="button"
        onClick={onBack}
        className="self-start px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2"
        data-testid="blog-back"
      >
        ← {t('blog.back')}
      </button>

      <header className="flex flex-col gap-3">
        {post.cover && (
          <img
            src={post.cover}
            alt=""
            className="w-full max-h-72 object-cover rounded-xl"
          />
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{title}</h1>
        {summary && <p className="text-slate-400 text-base leading-relaxed">{summary}</p>}
        <p className="text-xs text-slate-500">
          {t('blog.attribution')}{' '}
          <a
            className="underline hover:text-slate-300"
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            qlist.ir/blog/{post.slug}/ ↗
          </a>
        </p>
      </header>

      {usingFallback && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {t('blog.pendingTranslation')}
        </div>
      )}

      <EditorJSRenderer doc={body} assetManifest={data.assetManifest} dir={bodyDir} />
    </article>
  )
}
