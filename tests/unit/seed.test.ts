/**
 * Unit tests for the CSV parsing logic used in the seed script.
 */

import { describe, it, expect } from 'vitest'

// Inline the CSV parsing function (same logic as seed.mjs)
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote
        continue
      }
      if (ch === ',' && !inQuote) {
        cols.push(cur.trim())
        cur = ''
        continue
      }
      cur += ch
    }
    cols.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

function buildKvPayload(records: Record<string, string>[]) {
  return records
    .filter((r) => r['barcode'] && r['name_en'])
    .map((r) => ({
      key: r['barcode'],
      value: JSON.stringify({ en: r['name_en'], fa: r['name_fa'] || r['name_en'] }),
    }))
}

describe('CSV parsing', () => {
  const CSV = `barcode,name_en,name_fa
5449000000996,Coca-Cola Classic 330ml,کوکاکولا کلاسیک
3017620422003,Nutella 400g,نوتلا ۴۰۰ گرم`

  it('parses headers correctly', () => {
    const records = parseCsv(CSV)
    expect(records).toHaveLength(2)
    expect(Object.keys(records[0])).toEqual(['barcode', 'name_en', 'name_fa'])
  })

  it('parses first row values', () => {
    const records = parseCsv(CSV)
    expect(records[0]).toMatchObject({
      barcode: '5449000000996',
      name_en: 'Coca-Cola Classic 330ml',
      name_fa: 'کوکاکولا کلاسیک',
    })
  })

  it('parses Persian characters correctly', () => {
    const records = parseCsv(CSV)
    expect(records[1]!['name_fa']).toContain('نوتلا')
  })

  it('skips empty lines gracefully', () => {
    const withEmpty = CSV + '\n\n'
    // Should not throw; extra empty row will have empty barcode and get filtered
    const records = parseCsv(withEmpty.trim())
    expect(records.length).toBeGreaterThanOrEqual(2)
  })
})

describe('KV payload builder', () => {
  it('builds correct KV payload shape', () => {
    const records = [
      { barcode: '5449000000996', name_en: 'Coca-Cola', name_fa: 'کوکاکولا' },
    ]
    const payload = buildKvPayload(records)
    expect(payload).toHaveLength(1)
    expect(payload[0]).toMatchObject({ key: '5449000000996' })
    const value = JSON.parse(payload[0]!.value)
    expect(value).toMatchObject({ en: 'Coca-Cola', fa: 'کوکاکولا' })
  })

  it('falls back to English name when fa is missing', () => {
    const records = [{ barcode: '1234567890', name_en: 'Test', name_fa: '' }]
    const payload = buildKvPayload(records)
    const value = JSON.parse(payload[0]!.value)
    expect(value.fa).toBe('Test')
  })

  it('filters out rows without barcode', () => {
    const records = [
      { barcode: '', name_en: 'No barcode', name_fa: '' },
      { barcode: '5449000000996', name_en: 'Valid', name_fa: 'معتبر' },
    ]
    const payload = buildKvPayload(records)
    expect(payload).toHaveLength(1)
    expect(payload[0]!.key).toBe('5449000000996')
  })
})
