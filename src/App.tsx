import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyDirection } from './i18n'
import ScanView from './components/ScanView'
import BrowseView from './components/BrowseView'
import AboutView from './components/AboutView'
import BlogView from './components/BlogView'
import LanguageSwitcher from './components/LanguageSwitcher'

type Tab = 'scan' | 'browse' | 'about'

const HASH_BLOG_PREFIX = '#/blog/'

function readBlogSlugFromHash(): string | null {
  const h = window.location.hash
  if (h && h.startsWith(HASH_BLOG_PREFIX)) {
    return h.slice(HASH_BLOG_PREFIX.length).replace(/\/$/, '')
  }
  return null
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('scan')
  const [blogSlug, setBlogSlug] = useState<string | null>(() => readBlogSlugFromHash())

  useEffect(() => {
    applyDirection(i18n.language)
  }, [i18n.language])

  useEffect(() => {
    const onHash = () => setBlogSlug(readBlogSlugFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Cross-component navigation: CompanyCard fires a custom event so it can
  // remain presentational. Avoids prop-drilling a navigation handler.
  useEffect(() => {
    const onOpenBlog = (e: Event) => {
      const slug = (e as CustomEvent).detail as string
      if (typeof slug === 'string' && slug.length > 0) {
        window.location.hash = `/blog/${slug}`
        setBlogSlug(slug)
        window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener('open-blog', onOpenBlog as EventListener)
    return () => window.removeEventListener('open-blog', onOpenBlog as EventListener)
  }, [])

  const closeBlog = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setBlogSlug(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => {
            if (blogSlug) closeBlog()
            setTab('scan')
          }}
          className="flex items-center gap-2"
          aria-label="Home"
        >
          <span className="text-2xl" role="img" aria-label="brand">
            🛒
          </span>
          <h1 className="text-base font-bold text-blue-400 truncate max-w-[60vw]">
            {t('appName')}
          </h1>
        </button>
        <LanguageSwitcher />
      </header>

      {/* Tab navigation — hidden while reading a blog post */}
      {!blogSlug && (
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
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center p-4 gap-6 w-full">
        {blogSlug ? (
          <BlogView slug={blogSlug} onBack={closeBlog} />
        ) : (
          <>
            {tab === 'scan' && <ScanView />}
            {tab === 'browse' && <BrowseView />}
            {tab === 'about' && <AboutView />}
          </>
        )}
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
