#!/usr/bin/env node
// Normalizes data/qlist-dump/*.json into data/companies.json
// and src/data/companies.generated.ts — bundled into the frontend.
//
// Editorial choices baked in here:
//   - Status: 'flagged' only for entries qlist.ir labels as Israel-supporting.
//     We drop the "American-only" boycott label per request.
//   - All claims are attributed to qlist.ir + linked dossier; we don't assert
//     them in the app's own voice.
//   - English content: hand-curated from public knowledge for company/sub-brand
//     names + categories; the long-form dossier text remains qlist's (linked).

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DUMP = resolve(ROOT, 'data/qlist-dump')
const OUT_JSON = resolve(ROOT, 'data/companies.json')
const OUT_TS = resolve(ROOT, 'src/data/companies.generated.ts')

// ── Helpers ──────────────────────────────────────────────────────────────
const read = (f) => JSON.parse(readFileSync(resolve(DUMP, f), 'utf-8')).data ?? []
const manifest = JSON.parse(
  readFileSync(resolve(DUMP, 'asset-manifest.json'), 'utf-8'),
)
const assetPath = (uuid) => (uuid && manifest[uuid] ? `/qlist-assets/${manifest[uuid]}` : null)

// ── Editorial content (English) ──────────────────────────────────────────
// Category tag id → English label + emoji icon.
const CATEGORY_EN = {
  23: { label: 'Food', icon: '🍔' },
  25: { label: 'Drinking water', icon: '💧' },
  24: { label: 'Baby food', icon: '🍼' },
  26: { label: 'Hygiene', icon: '🧼' },
  9:  { label: 'Cosmetics', icon: '💄' },
  27: { label: 'Retail', icon: '🛒' },
  30: { label: 'Electronics', icon: '⚡' },
  28: { label: 'Beverage', icon: '☕' },
  29: { label: 'Supplements', icon: '🥣' },
  31: { label: 'Technology', icon: '💻' },
  32: { label: 'Household', icon: '🧺' },
  33: { label: 'Apparel', icon: '👕' },
  // 'file' type tags (skipped — for download page only)
  35: null,
  34: null,
  // newer tag ids we've seen on certain sub-brands (97, 98 etc) fall through to null
}

// English company name (Latin script). All other content — the status label
// and the long-form "why it's listed" reason — comes directly from qlist.ir
// (brand.subtitle and brand.description respectively).
//
// CLAIM_EN is a faithful translation of qlist.ir's Persian brand.description.
// Companies that have an empty description on qlist.ir get an empty string
// here — we will NOT invent reasons for them. The only signal those carry on
// qlist.ir is the status badge, which is preserved verbatim.
const COMPANY_EN = {
  nestle:      { name: 'Nestlé' },
  cocacola:    { name: 'The Coca-Cola Company' },
  unilever:    { name: 'Unilever' },
  carrefour:   { name: 'Carrefour' },
  danone:      { name: 'Danone' },
  pepsi:       { name: 'PepsiCo' },
  'p-and-g':   { name: 'Procter & Gamble' },
  hp:          { name: 'HP Inc.' },
  siemens:     { name: 'Siemens' },
  microsoft:   { name: 'Microsoft' },
  skechers:    { name: 'Skechers' },
  nike:        { name: 'Nike' },
  mars:        { name: 'Mars, Incorporated' },
  apple:       { name: 'Apple Inc.' },
  dell:        { name: 'Dell Technologies' },
  cisco:       { name: 'Cisco Systems' },
}

// Faithful English translations of qlist.ir's Persian brand.description.
// Only the 4 companies that have a description on qlist.ir get an English
// translation; the rest stay empty (we do NOT fabricate reasoning).
const CLAIM_EN = {
  nestle:
    "Nestlé, the Swiss food and beverage giant, is one of the major supporters of the Israeli regime. By acquiring 100% of the shares of one of Israel's largest food companies — Osem — the company, in addition to substantial investment, has significantly helped expand Osem's export markets through technology transfer. Some Osem factories are located in Zionist settlements. According to The Jewish Standard (a subsidiary of The Times of Israel), in 1998 Nestlé received the \"Jubilee\" award from the Israeli Prime Minister in recognition of its efforts to strengthen the Israeli regime's economy.",
  unilever:
    "Unilever, an Anglo-Dutch multinational corporation with revenue exceeding $59 billion in 2023, operates in 190 countries including Iran and Israel. Through extensive investments in Israel — such as buying stakes in Israeli companies like Vitco and Strauss, and operating in Zionist settlements — it has contributed to the expansion of Israel's economy. Unilever also owns eight companies under the \"Unilever Israel\" name. The company has consistently been criticised by pro-Palestinian movements for supporting Israel and operating in occupied territories. Even its subsidiary brand Ben & Jerry's, which tried to halt sales in occupied settlements, faced opposition from Unilever and pressure from Israel and was ultimately sold to an Israeli company. Unilever has also directly supported settlement-building in the past by purchasing shares of settlement-based companies.",
  carrefour:
    "Carrefour, the French retail-chain giant, is one of the major supporters of the Israeli regime. By opening 50 stores in Israel through a partnership with the Zionist company \"Electra\", the company is complicit in Zionist settlement-building in Palestine. \"Electra\" has been on the United Nations sanctions list for years because of its active participation in settlement-building. Carrefour, with its broad supply chain, has also lowered the cost of supplying goods in Israel and helped improve Israeli citizens' purchasing power. Carrefour is present in the Iranian market through a partnership with the Emirati holding company \"Majid Al Futtaim\", under the \"Hyperstar\" and \"MyliMarket\" brands.",
  danone:
    "Danone, the multinational food-products giant — which we in Iran know by products such as \"Danette\", \"Aptamil\" and \"Bebelac\" — is one of the best-known supporters of the Israeli regime. Through investments in Israeli start-ups and partnerships with large Israeli companies such as \"Strauss\", the company has made a significant contribution to the expansion of Israel's economy. Danone has had a strong presence in the Iranian market for years through subsidiaries such as \"Danone Lebani Pars\" and \"Nutricia MMP\".",
}

// Faithful English translations of qlist.ir's status badge (brand.subtitle).
const SUBTITLE_EN = {
  'حامی اسرائیل': 'Supports Israel',
  'شرکت آمریکایی': 'American company',
  'آمریکایی': 'American company',
}

// Sub-brand id → { subtitle, categories } (English).
// qlist.ir's homepage uses a Directus tag-relation that isn't fully exposed
// via /items/tags (most IDs >33 are hidden by permissions), so we derive
// the same 12 category buckets locally from sub-brand identity.
//
// Categories must match the labels in CATEGORY_EN.
const SUB_EN = {
  // Nestlé family ───────────────────────────────────────────
  6:  { subtitle: 'Instant coffee',              categories: ['Beverage', 'Food'] },
  38: { subtitle: 'Coffee machines',             categories: ['Beverage', 'Household'] },
  44: { subtitle: 'Infant formula',              categories: ['Baby food'] },
  47: { subtitle: 'Health & nutrition research', categories: ['Supplements'] },
  48: { subtitle: 'Fortified infant milk',       categories: ['Baby food'] },
  52: { subtitle: 'Nutritional supplement',      categories: ['Supplements'] },
  5:  { subtitle: 'Infant formula',              categories: ['Baby food'] },
  7:  { subtitle: 'Chocolate',                   categories: ['Food'] },
  9:  { subtitle: 'Creamer',                     categories: ['Beverage', 'Food'] },
  37: { subtitle: 'Cocoa powder',                categories: ['Beverage', 'Food'] },
  46: { subtitle: 'Weight-management products',  categories: ['Supplements'] },
  8:  { subtitle: 'Mineral water',               categories: ['Drinking water'] },
  13: { subtitle: 'Infant cereal',               categories: ['Baby food'] },
  39: { subtitle: 'Breakfast cereal',            categories: ['Food'] },
  49: { subtitle: 'Infant formula',              categories: ['Baby food'] },
  // Coca-Cola family ────────────────────────────────────────
  18: { subtitle: 'Lemon-lime soda',             categories: ['Beverage'] },
  19: { subtitle: 'Mineral water',               categories: ['Drinking water'] },
  17: { subtitle: 'Sugar-free cola',             categories: ['Beverage'] },
  16: { subtitle: 'Orange soda',                 categories: ['Beverage'] },
  72: { subtitle: 'Ginger ale',                  categories: ['Beverage'] },
  73: { subtitle: 'Juice drink',                 categories: ['Beverage'] },
  74: { subtitle: 'Non-alcoholic malt beverage', categories: ['Beverage'] },
  // Unilever family ─────────────────────────────────────────
  28: { subtitle: 'Toothpaste',                  categories: ['Hygiene'] },
  27: { subtitle: 'Fabric softener',             categories: ['Household'] },
  31: { subtitle: 'Anti-dandruff shampoo',       categories: ['Hygiene', 'Cosmetics'] },
  29: { subtitle: 'Shampoo & hair care',         categories: ['Hygiene', 'Cosmetics'] },
  30: { subtitle: 'Toothpaste',                  categories: ['Hygiene'] },
  22: { subtitle: 'Soap & toiletries',           categories: ['Hygiene'] },
  23: { subtitle: "Men's body spray",            categories: ['Cosmetics'] },
  25: { subtitle: 'Bleach & cleaner',            categories: ['Household'] },
  24: { subtitle: 'Dish soap',                   categories: ['Household'] },
  26: { subtitle: 'Laundry detergent',           categories: ['Household'] },
  43: { subtitle: 'Deodorant & antiperspirant',  categories: ['Cosmetics', 'Hygiene'] },
  21: { subtitle: 'Skin & hair care',            categories: ['Cosmetics'] },
  70: { subtitle: 'Skincare',                    categories: ['Cosmetics'] },
  // Carrefour family ────────────────────────────────────────
  4:  { subtitle: 'Hypermarket chain',           categories: ['Retail'] },
  12: { subtitle: 'Online grocery',              categories: ['Retail'] },
  // Danone family ───────────────────────────────────────────
  10: { subtitle: 'Infant formula',              categories: ['Baby food'] },
  11: { subtitle: 'Infant & toddler nutrition',  categories: ['Baby food'] },
  3:  { subtitle: 'Dairy dessert',               categories: ['Food'] },
  45: { subtitle: 'Dairy dessert',               categories: ['Food'] },
  // Pepsi family ────────────────────────────────────────────
  61: { subtitle: 'Citrus soda',                 categories: ['Beverage'] },
  58: { subtitle: 'Sugar-free cola',             categories: ['Beverage'] },
  59: { subtitle: 'Orange soda',                 categories: ['Beverage'] },
  60: { subtitle: 'Lemon-lime soda',             categories: ['Beverage'] },
  62: { subtitle: 'Mineral water',               categories: ['Drinking water'] },
  63: { subtitle: 'Tea',                         categories: ['Beverage'] },
  // P&G family ──────────────────────────────────────────────
  53: { subtitle: 'Toothpaste',                  categories: ['Hygiene'] },
  54: { subtitle: 'Oral care',                   categories: ['Hygiene'] },
  33: { subtitle: 'Diapers',                     categories: ['Baby food', 'Hygiene'] },
  34: { subtitle: 'Feminine care',               categories: ['Hygiene'] },
  35: { subtitle: 'Small appliances',            categories: ['Household', 'Electronics'] },
  36: { subtitle: 'Razors',                      categories: ['Hygiene'] },
  42: { subtitle: 'Hair care',                   categories: ['Cosmetics', 'Hygiene'] },
  41: { subtitle: "Women's razors",              categories: ['Hygiene', 'Cosmetics'] },
  71: { subtitle: 'Dish soap',                   categories: ['Household'] },
  // HP family ───────────────────────────────────────────────
  65: { subtitle: 'Gaming peripherals',          categories: ['Electronics', 'Technology'] },
  67: { subtitle: 'Gaming laptops',              categories: ['Electronics', 'Technology'] },
  66: { subtitle: 'Gaming PCs',                  categories: ['Electronics', 'Technology'] },
  68: { subtitle: 'Workstations',                categories: ['Electronics', 'Technology'] },
  // Microsoft family ────────────────────────────────────────
  80: { subtitle: 'Surface devices',             categories: ['Electronics', 'Technology'] },
  81: { subtitle: 'Gaming consoles',             categories: ['Electronics', 'Technology'] },
  // Dell family ─────────────────────────────────────────────
  78: { subtitle: 'Gaming hardware',             categories: ['Electronics', 'Technology'] },
  // Mars family ─────────────────────────────────────────────
  85: { subtitle: 'Confectionery',               categories: ['Food'] },
}

// ── Build ────────────────────────────────────────────────────────────────
const brands = read('brands.json')
const subs = read('sub_brands.json')
const posts = read('posts.json')
const tags = read('tags.json')

// Map post slug → post (used by brand.doc_link like '/blog/nestle/')
const postBySlug = Object.fromEntries(posts.map((p) => [p.slug, p]))
const subById = Object.fromEntries(subs.map((s) => [s.id, s]))
const tagById = Object.fromEntries(tags.map((t) => [t.id, t]))

function slugFromEn(en) {
  return (en || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// We don't use the Directus tag IDs directly any more (most are hidden by
// permissions). Categories come from SUB_EN below; this helper is retained
// only to gracefully handle parent-company-level tagging if present.
function tagsToCategoriesFallback(tagIds) {
  return (tagIds || [])
    .map((id) => CATEGORY_EN[id])
    .filter(Boolean)
    .map((c) => c.label)
}

const companies = brands
  .filter((b) => b.status === 'published')
  .sort((a, b) => (a.sort ?? Number.MAX_SAFE_INTEGER) - (b.sort ?? Number.MAX_SAFE_INTEGER))
  .map((b) => {
    const en = COMPANY_EN[b.slug] || { name: b.en_name?.trim() || b.slug }
    const subtitleFa = (b.subtitle || '').trim()
    const subtitleEn = SUBTITLE_EN[subtitleFa] || subtitleFa
    // Status drives the badge colour: 'supports-israel' is the strong claim
    // with a full description; 'american' is a lighter qlist label.
    const status =
      subtitleFa.includes('اسرائیل') ? 'supports-israel'
      : subtitleFa.includes('آمریکا') ? 'american'
      : 'flagged'
    const claimFa = (b.description || '').trim()
    const claimEn = CLAIM_EN[b.slug] || ''
    const subBrands = (b.sub_brands || [])
      .map((id) => subById[id])
      .filter(Boolean)
      .filter((s) => !s.is_brand) // drop the self-referential parent row
      .map((s) => {
        const enName = (s.en_name || '').trim()
        const meta = SUB_EN[s.id] || { subtitle: '', categories: [] }
        // Combine our explicit categories with any visible public tag.
        const cats = new Set([...meta.categories, ...tagsToCategoriesFallback(s.tags)])
        return {
          slug: slugFromEn(enName) || `sub-${s.id}`,
          id: s.id,
          name: { en: enName || s.name, fa: s.name },
          logo: assetPath(s.logo),
          subtitle: { en: meta.subtitle, fa: s.subtitle || '' },
          categories: [...cats],
        }
      })

    const dossierSlug = (b.doc_link || '').replace(/\/blog\//, '').replace(/\/$/, '')
    const post = postBySlug[dossierSlug]

    return {
      slug: b.slug,
      name: { en: en.name, fa: b.name },
      country: (b.country || '').toLowerCase(),
      logo: assetPath(b.logo),
      // Status badge text — qlist.ir's brand.subtitle, translated.
      qlistStatus: { en: subtitleEn, fa: subtitleFa || '' },
      status, // 'supports-israel' | 'american' | 'flagged'
      // Long-form reason — qlist.ir's brand.description, translated. May be
      // empty when qlist has no description for this brand.
      claim: { en: claimEn, fa: claimFa },
      subBrands,
      dossier: post
        ? {
            slug: post.slug,
            url: `https://qlist.ir/blog/${post.slug}/`,
            title: { en: b.doc_title || post.title, fa: post.title },
            summary: { en: claimEn, fa: post.summary || '' },
            cover: assetPath(post.cover),
          }
        : null,
    }
  })

// Build a brand-name → company-slug index (used by frontend to match OFF results)
const brandIndex = {}
function addToIndex(name, slug) {
  if (!name) return
  const key = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')
  if (key.length < 2) return
  if (!brandIndex[key]) brandIndex[key] = slug
}
for (const c of companies) {
  addToIndex(c.name.en, c.slug)
  addToIndex(c.name.fa, c.slug)
  for (const s of c.subBrands) {
    addToIndex(s.name.en, c.slug)
    addToIndex(s.name.fa, c.slug)
  }
}

const categories = Object.entries(CATEGORY_EN)
  .filter(([, v]) => v)
  .map(([id, v]) => ({ id: Number(id), label: v.label, icon: v.icon }))

// ── Posts (dossiers) ─────────────────────────────────────────────────────
// We pass the full EditorJS body through and rewrite inline image URLs so
// they point at our local /qlist-assets/ copies. Translations live in
// data/blog-translations/<slug>.json and are merged here when present.
import { existsSync as _existsSync } from 'fs'
const TRANS_DIR = resolve(ROOT, 'data/blog-translations')

function rewriteBlocks(blocks) {
  return blocks.map((b) => {
    if (b.type !== 'image') return b
    const fid = b.data?.file?.fileId
    const local = assetPath(fid)
    if (!local) return b
    return {
      ...b,
      data: {
        ...b.data,
        file: { ...(b.data.file || {}), fileId: fid, url: local },
      },
    }
  })
}

const postsOut = posts
  .filter((p) => p.status === 'published')
  .map((p) => {
    const transPath = resolve(TRANS_DIR, `${p.slug}.json`)
    let trans = null
    if (_existsSync(transPath)) {
      try {
        trans = JSON.parse(readFileSync(transPath, 'utf-8'))
      } catch {
        trans = null
      }
    }
    // Match the post to its company so the blog view can deep-link back.
    const company = brands.find((b) =>
      (b.posts || []).includes(p.id) || (b.doc_link || '').includes(`/blog/${p.slug}/`),
    )
    return {
      slug: p.slug,
      sourceUrl: `https://qlist.ir/blog/${p.slug}/`,
      companySlug: company?.slug || null,
      title: {
        en: trans?.title || '',
        fa: p.title || '',
      },
      summary: {
        en: trans?.summary || '',
        fa: p.summary || '',
      },
      cover: assetPath(p.cover),
      body: { time: p.copy?.time, version: p.copy?.version, blocks: rewriteBlocks(p.copy?.blocks || []) },
      bodyEn: trans?.body || null,
    }
  })

// Build an asset manifest (UUID → /qlist-assets/<file>) so the renderer
// can resolve any inline reference at runtime.
const flatManifest = { ...manifest }

const out = {
  generatedAt: new Date().toISOString(),
  source: 'https://qlist.ir (via panel.qlist.ir/items/* Directus API)',
  companies,
  categories,
  brandIndex,
  posts: postsOut,
  assetManifest: flatManifest,
}

mkdirSync(dirname(OUT_JSON), { recursive: true })
mkdirSync(dirname(OUT_TS), { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), 'utf-8')

const ts = `// AUTO-GENERATED by scripts/qlist-normalize.mjs — do not edit by hand.
// Source: ${out.source}
// Generated at: ${out.generatedAt}

export interface SubBrand {
  slug: string
  id: number
  name: { en: string; fa: string }
  logo: string | null
  subtitle: { en: string; fa: string }
  categories: string[]
}

export interface Dossier {
  slug: string
  url: string
  title: { en: string; fa: string }
  summary: { en: string; fa: string }
  cover: string | null
}

export type QlistStatus = 'supports-israel' | 'american' | 'flagged'

export interface Company {
  slug: string
  name: { en: string; fa: string }
  country: string
  logo: string | null
  // Faithful translation of qlist.ir's brand.subtitle ("supports Israel" or
  // "American company"). Shown as the status badge.
  qlistStatus: { en: string; fa: string }
  // Machine-friendly form of the same.
  status: QlistStatus
  // Faithful translation of qlist.ir's brand.description — the long-form
  // "why it's listed" reason. Empty string when qlist has no description.
  claim: { en: string; fa: string }
  subBrands: SubBrand[]
  dossier: Dossier | null
}

export interface Category {
  id: number
  label: string
  icon: string
}

export interface EditorJSBlock {
  id?: string
  type: string
  data: Record<string, unknown>
}

export interface EditorJSDoc {
  time?: number
  version?: string
  blocks: EditorJSBlock[]
}

export interface Post {
  slug: string
  sourceUrl: string
  companySlug: string | null
  title: { en: string; fa: string }
  summary: { en: string; fa: string }
  cover: string | null
  // Persian original (EditorJS body) — guaranteed to be present.
  body: EditorJSDoc
  // English translation — null when not yet translated.
  bodyEn: EditorJSDoc | null
}

export interface CompaniesData {
  generatedAt: string
  source: string
  companies: Company[]
  categories: Category[]
  brandIndex: Record<string, string>
  posts: Post[]
  assetManifest: Record<string, string>
}

const data: CompaniesData = ${JSON.stringify(out, null, 2)}

export default data
`
writeFileSync(OUT_TS, ts, 'utf-8')

console.log(`✅ Wrote ${OUT_JSON}`)
console.log(`✅ Wrote ${OUT_TS}`)
console.log(`   ${companies.length} companies, ${companies.reduce((n, c) => n + c.subBrands.length, 0)} sub-brands`)
console.log(`   ${Object.keys(brandIndex).length} brand-name index entries`)
