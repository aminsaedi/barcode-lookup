import data from '../data/companies.generated'
import type { Company, SubBrand } from '../data/companies.generated'

const { brandIndex, companies } = data

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')
}

// Given a brand string (e.g. from Open Food Facts), find the matching company.
// Returns null if no match.
export function findCompanyByBrand(brand: string | undefined | null): Company | null {
  if (!brand) return null
  // Try the whole string and each comma-separated token (OFF "brands" is comma-joined).
  const candidates = [brand, ...brand.split(',')].map((s) => normalize(s)).filter((s) => s.length >= 2)
  for (const key of candidates) {
    // Exact match
    if (brandIndex[key]) {
      return companies.find((c) => c.slug === brandIndex[key]) || null
    }
    // Substring match — try matching longer index keys that contain or are contained.
    for (const indexKey of Object.keys(brandIndex)) {
      if (indexKey.length < 3) continue
      if (key.includes(indexKey) || indexKey.includes(key)) {
        return companies.find((c) => c.slug === brandIndex[indexKey]) || null
      }
    }
  }
  return null
}

// Given a company, find which sub-brand best matches the brand string.
// Returns null when the brand only matches the parent company name itself —
// in that case there's no specific sub-brand to highlight.
export function findSubBrand(company: Company, brand: string | undefined | null): SubBrand | null {
  if (!brand) return null
  const key = normalize(brand)
  // If the brand IS the parent company name, don't pick a sub-brand.
  if (key === normalize(company.name.en) || key === normalize(company.name.fa)) return null
  // Exact match
  for (const s of company.subBrands) {
    if (normalize(s.name.en) === key || normalize(s.name.fa) === key) return s
  }
  // Substring match — require sub-brand name to be CONTAINED in the brand
  // string (e.g. "Coca-Cola Zero 330ml" → Coca-Cola Zero). Avoid the reverse
  // direction (e.g. "Coca-Cola" → Coca-Cola Zero) which would over-match.
  for (const s of company.subBrands) {
    const en = normalize(s.name.en)
    if (en && en.length >= 4 && key.includes(en)) return s
  }
  return null
}
