#!/usr/bin/env node
/**
 * Seed script: reads data/products.csv and bulk-uploads to Cloudflare KV.
 *
 * Required env vars:
 *   CLOUDFLARE_API_TOKEN  - CF API token with KV:Edit permission
 *   CLOUDFLARE_ACCOUNT_ID - CF account ID
 *   KV_NAMESPACE_ID       - Target KV namespace ID
 *
 * Usage:
 *   node scripts/seed.mjs
 *   # or with wrangler (local dev):
 *   KV_NAMESPACE_ID=preview node scripts/seed.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---------- Simple CSV parser (no external deps) ----------
function parseCsv(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    // Handle commas inside quoted fields
    const cols = []
    let cur = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    cols.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

// ---------- Load CSV ----------
const csvPath = resolve(ROOT, 'data', 'products.csv')
const csvText = readFileSync(csvPath, 'utf-8')
const records = parseCsv(csvText)

// Build KV bulk payload: [{ key, value }]
const kvData = records
  .filter((r) => r.barcode && r.name_en)
  .map((r) => ({
    key: r.barcode,
    value: JSON.stringify({ en: r.name_en, fa: r.name_fa || r.name_en }),
  }))

console.log(`📦 Loaded ${kvData.length} products from CSV`)

// ---------- Upload to Cloudflare KV ----------
const apiToken = process.env.CLOUDFLARE_API_TOKEN
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const namespaceId = process.env.KV_NAMESPACE_ID

if (!apiToken || !accountId || !namespaceId) {
  console.error(
    '❌ Missing required env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, KV_NAMESPACE_ID',
  )
  process.exit(1)
}

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`

console.log(`🚀 Uploading to KV namespace: ${namespaceId}`)

const resp = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(kvData),
})

const result = await resp.json()

if (!resp.ok || !result.success) {
  console.error('❌ Upload failed:', JSON.stringify(result, null, 2))
  process.exit(1)
}

console.log(`✅ Successfully seeded ${kvData.length} products into KV!`)
