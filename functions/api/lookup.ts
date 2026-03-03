/// <reference types="@cloudflare/workers-types" />

interface Env {
  PRODUCTS_KV: KVNamespace
}

interface ProductData {
  en: string
  fa: string
}

interface LookupResponse {
  barcode: string
  found: boolean
  product?: ProductData
}

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

  // Basic validation: barcodes are numeric strings, 8–14 digits
  if (!/^\d{6,14}$/.test(barcode)) {
    return Response.json(
      { error: 'Invalid barcode format' },
      { status: 400, headers: corsHeaders() },
    )
  }

  try {
    const raw = await env.PRODUCTS_KV.get(barcode)

    const body: LookupResponse = raw
      ? { barcode, found: true, product: JSON.parse(raw) as ProductData }
      : { barcode, found: false }

    return Response.json(body, {
      headers: {
        ...corsHeaders(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('KV lookup error:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() },
    )
  }
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
