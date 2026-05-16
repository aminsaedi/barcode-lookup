// Convert an ISO 3166-1 alpha-2 code to a flag emoji.
// 'us' → 🇺🇸. Falls back to a square symbol when input is invalid.
export function countryFlag(code: string | undefined | null): string {
  if (!code) return '🏳️'
  const cc = code.trim().toLowerCase()
  if (cc.length !== 2 || !/^[a-z]{2}$/.test(cc)) return '🏳️'
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc].map((c) => A + (c.charCodeAt(0) - 'a'.charCodeAt(0))))
}

export const COUNTRY_NAME: Record<string, string> = {
  ch: 'Switzerland',
  us: 'United States',
  gb: 'United Kingdom',
  fr: 'France',
  de: 'Germany',
  nl: 'Netherlands',
  it: 'Italy',
  es: 'Spain',
}

export function countryName(code: string | undefined | null): string {
  if (!code) return ''
  return COUNTRY_NAME[code.toLowerCase()] || code.toUpperCase()
}
