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

// Company slug → English description (1–2 sentences, paraphrased from public facts).
// The qlist-specific claims are surfaced in `claim` separately and always attributed.
const COMPANY_EN = {
  nestle: {
    name: 'Nestlé',
    description:
      'Swiss multinational food and beverage company headquartered in Vevey. World\'s largest food company by revenue.',
    claim:
      'Flagged by qlist.ir for ownership of Israeli food maker Osem (now Osem-Nestlé), with some facilities reported in West Bank settlements.',
  },
  cocacola: {
    name: 'The Coca-Cola Company',
    description:
      'American multinational beverage corporation headquartered in Atlanta, Georgia. Best known for its namesake cola.',
    claim:
      'Flagged by qlist.ir over a bottling franchise in Israel since 1968 and listed on consumer-boycott rosters globally.',
  },
  unilever: {
    name: 'Unilever',
    description:
      'British multinational consumer goods company headquartered in London. Operates in foods, home care and personal care.',
    claim:
      'Flagged by qlist.ir over Israeli subsidiary operations; subject of long-running BDS-aligned consumer campaigns.',
  },
  carrefour: {
    name: 'Carrefour',
    description:
      'French multinational retail and wholesaling corporation headquartered in Massy, France. One of the largest hypermarket chains.',
    claim:
      'Flagged by qlist.ir over a 2022 franchise agreement with Israeli retailer Electra Consumer Products, which operates stores including in settlements.',
  },
  danone: {
    name: 'Danone',
    description:
      'French multinational food-products corporation based in Paris. Major presence in dairy, plant-based, waters and specialized nutrition.',
    claim:
      'Flagged by qlist.ir over its joint venture Strauss Group dairy products in Israel.',
  },
  pepsi: {
    name: 'PepsiCo',
    description:
      'American multinational food, snack and beverage corporation headquartered in Harrison, New York.',
    claim:
      'Flagged by qlist.ir over a long-standing bottling and snack manufacturing presence in Israel.',
  },
  'p-and-g': {
    name: 'Procter & Gamble',
    description:
      'American multinational consumer goods corporation headquartered in Cincinnati, Ohio. Owns hygiene, beauty and home-care brands.',
    claim:
      'Flagged by qlist.ir over subsidiary operations and distribution agreements in Israel.',
  },
  hp: {
    name: 'HP Inc.',
    description:
      'American multinational information technology company headquartered in Palo Alto, California. Makes PCs, printers and supplies.',
    claim:
      'Flagged by qlist.ir; HP has historically been targeted by BDS campaigns over IT contracts with Israeli government agencies.',
  },
  siemens: {
    name: 'Siemens',
    description:
      'German multinational technology conglomerate headquartered in Munich.',
    claim:
      'Flagged by qlist.ir (under review) over reported infrastructure projects in Israel.',
  },
  microsoft: {
    name: 'Microsoft',
    description:
      'American multinational technology corporation headquartered in Redmond, Washington.',
    claim:
      'Flagged by qlist.ir over Israeli R&D centers and reported cloud / AI agreements with Israeli government agencies.',
  },
  skechers: {
    name: 'Skechers',
    description:
      'American lifestyle and performance footwear company headquartered in Manhattan Beach, California.',
    claim: 'Flagged by qlist.ir as a US-headquartered brand operating in Israel.',
  },
  nike: {
    name: 'Nike',
    description:
      'American athletic-footwear and apparel corporation headquartered in Beaverton, Oregon.',
    claim: 'Flagged by qlist.ir as a US-headquartered brand operating in Israel.',
  },
  mars: {
    name: 'Mars, Incorporated',
    description:
      'American multinational manufacturer of confectionery, pet food and other food products, headquartered in McLean, Virginia.',
    claim: 'Flagged by qlist.ir over a manufacturing and distribution presence in Israel.',
  },
  apple: {
    name: 'Apple Inc.',
    description:
      'American multinational technology company headquartered in Cupertino, California.',
    claim:
      'Flagged by qlist.ir; Apple operates large R&D centers in Israel via acquisitions including Anobit and PrimeSense.',
  },
  dell: {
    name: 'Dell Technologies',
    description:
      'American multinational technology company headquartered in Round Rock, Texas.',
    claim: 'Flagged by qlist.ir over operations and supply-chain ties in Israel.',
  },
  cisco: {
    name: 'Cisco Systems',
    description:
      'American multinational digital communications technology conglomerate headquartered in San Jose, California.',
    claim: 'Flagged by qlist.ir over R&D operations in Israel.',
  },
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
    const en = COMPANY_EN[b.slug] || { name: b.en_name?.trim() || b.slug, description: '', claim: '' }
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
      description: {
        en: en.description,
        fa: b.description || '',
      },
      claim: { en: en.claim, fa: b.subtitle || 'حامی اسرائیل' },
      status: 'flagged', // every published entry on qlist is flagged
      subBrands,
      dossier: post
        ? {
            slug: post.slug,
            url: `https://qlist.ir/blog/${post.slug}/`,
            title: { en: b.doc_title || post.title, fa: post.title },
            summary: { en: en.claim, fa: post.summary || '' },
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

const out = {
  generatedAt: new Date().toISOString(),
  source: 'https://qlist.ir (via panel.qlist.ir/items/* Directus API)',
  companies,
  categories,
  brandIndex,
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

export interface Company {
  slug: string
  name: { en: string; fa: string }
  country: string
  logo: string | null
  description: { en: string; fa: string }
  claim: { en: string; fa: string }
  status: 'flagged' | 'unflagged'
  subBrands: SubBrand[]
  dossier: Dossier | null
}

export interface Category {
  id: number
  label: string
  icon: string
}

export interface CompaniesData {
  generatedAt: string
  source: string
  companies: Company[]
  categories: Category[]
  brandIndex: Record<string, string>
}

const data: CompaniesData = ${JSON.stringify(out, null, 2)}

export default data
`
writeFileSync(OUT_TS, ts, 'utf-8')

console.log(`✅ Wrote ${OUT_JSON}`)
console.log(`✅ Wrote ${OUT_TS}`)
console.log(`   ${companies.length} companies, ${companies.reduce((n, c) => n + c.subBrands.length, 0)} sub-brands`)
console.log(`   ${Object.keys(brandIndex).length} brand-name index entries`)
