/// <reference types="@cloudflare/workers-types" />

interface Env {
  PRODUCTS_KV: KVNamespace
}

interface ProductData {
  en: string
  fa: string
}

interface OffBrand {
  name: string
  productName?: string
  imageUrl?: string
  categories?: string
}

interface LookupResponse {
  barcode: string
  found: boolean
  product?: ProductData
  off?: OffBrand
}

const OFF_TIMEOUT_MS = 4000

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  const url = new URL(request.url)
  const barcode = url.searchParams.get('barcode')?.trim()

  if (!barcode) {
    return Response.json(
      { error: 'Missing required parameter: barcode' },
      { status: 400, headers: corsHeaders() },
    )
  }

  if (!/^\d{6,14}$/.test(barcode)) {
    return Response.json(
      { error: 'Invalid barcode format' },
      { status: 400, headers: corsHeaders() },
    )
  }

  try {
    // 1. KV exact hit (curated products.csv overrides everything).
    const raw = await env.PRODUCTS_KV.get(barcode)
    if (raw) {
      const body: LookupResponse = {
        barcode,
        found: true,
        product: JSON.parse(raw) as ProductData,
      }
      return Response.json(body, {
        headers: { ...corsHeaders(), 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
      })
    }

    // 2. Open Food Facts fallback. CORS-friendly but server-side avoids hammering OFF.
    const off = await fetchOpenFoodFacts(barcode)

    const body: LookupResponse = {
      barcode,
      found: !!off,
      ...(off ? { off } : {}),
    }
    return Response.json(body, {
      headers: {
        ...corsHeaders(),
        // Shorter cache on OFF hits — their data updates.
        'Cache-Control': off
          ? 'public, max-age=3600, s-maxage=3600'
          : 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err) {
    console.error('lookup error:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() },
    )
  }
}

async function fetchOpenFoodFacts(barcode: string): Promise<OffBrand | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=brands,product_name,product_name_en,image_front_small_url,image_url,categories`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), OFF_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'barcode-lookup/1.0 (https://barcode-lookup.pages.dev)' },
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isOffResponse(data) || data.status !== 1 || !data.product) return null
    const p = data.product
    const brand = (p.brands || '').split(',')[0]?.trim() || ''
    if (!brand && !p.product_name && !p.product_name_en) return null
    return {
      name: brand,
      productName: p.product_name_en || p.product_name || '',
      imageUrl: p.image_front_small_url || p.image_url || '',
      categories: p.categories || '',
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

interface OffResponse {
  status: number
  product?: {
    brands?: string
    product_name?: string
    product_name_en?: string
    image_front_small_url?: string
    image_url?: string
    categories?: string
  }
}

function isOffResponse(d: unknown): d is OffResponse {
  return typeof d === 'object' && d !== null && 'status' in d
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}
