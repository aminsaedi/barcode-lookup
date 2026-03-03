/**
 * Unit tests for the API lookup Pages Function logic.
 * We test the business logic in isolation by simulating the function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------- Helpers to replicate Pages Function logic ----------
interface ProductData {
  en: string
  fa: string
}

function isValidBarcode(barcode: string): boolean {
  return /^\d{6,14}$/.test(barcode)
}

async function lookupProduct(
  barcode: string | null,
  kvGet: (key: string) => Promise<string | null>,
): Promise<{ status: number; body: unknown }> {
  if (!barcode?.trim()) {
    return { status: 400, body: { error: 'Missing required parameter: barcode' } }
  }
  const trimmed = barcode.trim()
  if (!isValidBarcode(trimmed)) {
    return { status: 400, body: { error: 'Invalid barcode format' } }
  }
  try {
    const raw = await kvGet(trimmed)
    if (raw) {
      return {
        status: 200,
        body: { barcode: trimmed, found: true, product: JSON.parse(raw) as ProductData },
      }
    }
    return { status: 200, body: { barcode: trimmed, found: false } }
  } catch {
    return { status: 500, body: { error: 'Internal server error' } }
  }
}

// ---------- Tests ----------
describe('Barcode lookup logic', () => {
  let kvGet: ReturnType<typeof vi.fn>

  beforeEach(() => {
    kvGet = vi.fn()
  })

  it('returns 400 when barcode is null', async () => {
    const { status, body } = await lookupProduct(null, kvGet)
    expect(status).toBe(400)
    expect(body).toMatchObject({ error: expect.stringContaining('Missing') })
    expect(kvGet).not.toHaveBeenCalled()
  })

  it('returns 400 when barcode is empty string', async () => {
    const { status } = await lookupProduct('', kvGet)
    expect(status).toBe(400)
    expect(kvGet).not.toHaveBeenCalled()
  })

  it('returns 400 for non-numeric barcode', async () => {
    const { status, body } = await lookupProduct('abc123', kvGet)
    expect(status).toBe(400)
    expect(body).toMatchObject({ error: expect.stringContaining('Invalid') })
    expect(kvGet).not.toHaveBeenCalled()
  })

  it('returns 400 for barcode that is too short', async () => {
    const { status } = await lookupProduct('12345', kvGet)
    expect(status).toBe(400)
  })

  it('returns 400 for barcode that is too long', async () => {
    const { status } = await lookupProduct('123456789012345', kvGet)
    expect(status).toBe(400)
  })

  it('returns found=true with product when barcode exists in KV', async () => {
    const product = { en: 'Coca-Cola 330ml', fa: 'کوکاکولا ۳۳۰ میلی‌لیتر' }
    kvGet.mockResolvedValueOnce(JSON.stringify(product))

    const { status, body } = await lookupProduct('5449000000996', kvGet)
    expect(status).toBe(200)
    expect(body).toMatchObject({
      barcode: '5449000000996',
      found: true,
      product,
    })
    expect(kvGet).toHaveBeenCalledWith('5449000000996')
  })

  it('returns found=false when barcode does not exist in KV', async () => {
    kvGet.mockResolvedValueOnce(null)

    const { status, body } = await lookupProduct('0000000000000', kvGet)
    expect(status).toBe(200)
    expect(body).toMatchObject({ barcode: '0000000000000', found: false })
  })

  it('returns 500 when KV throws', async () => {
    kvGet.mockRejectedValueOnce(new Error('KV unavailable'))

    const { status } = await lookupProduct('5449000000996', kvGet)
    expect(status).toBe(500)
  })

  it('trims whitespace from barcode before lookup', async () => {
    kvGet.mockResolvedValueOnce(null)
    await lookupProduct('  5449000000996  ', kvGet)
    expect(kvGet).toHaveBeenCalledWith('5449000000996')
  })
})

describe('Barcode validation', () => {
  it('accepts 13-digit EAN-13 barcodes', () => {
    expect(isValidBarcode('5449000000996')).toBe(true)
  })
  it('accepts 12-digit UPC-A barcodes', () => {
    expect(isValidBarcode('012345678912')).toBe(true)
  })
  it('accepts 8-digit EAN-8 barcodes', () => {
    expect(isValidBarcode('12345678')).toBe(true)
  })
  it('rejects alphabetic strings', () => {
    expect(isValidBarcode('ABC123456789')).toBe(false)
  })
  it('rejects strings shorter than 6 digits', () => {
    expect(isValidBarcode('12345')).toBe(false)
  })
  it('rejects strings longer than 14 digits', () => {
    expect(isValidBarcode('123456789012345')).toBe(false)
  })
})
