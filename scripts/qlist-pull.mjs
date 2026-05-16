#!/usr/bin/env node
// Pulls brands, sub_brands, posts, tags from panel.qlist.ir (public Directus API)
// and downloads all referenced asset binaries to public/qlist-assets.
//
// Idempotent: re-runs overwrite local JSON; asset files are cached by UUID.

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DUMP_DIR = resolve(ROOT, 'data/qlist-dump')
const ASSET_DIR = resolve(ROOT, 'public/qlist-assets')
const PANEL = 'https://panel.qlist.ir'

const COLLECTIONS = [
  ['brands', '*'],
  ['sub_brands', '*'],
  ['posts', '*'],
  ['tags', '*'],
]

mkdirSync(DUMP_DIR, { recursive: true })
mkdirSync(ASSET_DIR, { recursive: true })

async function pullCollection(name, fields) {
  const url = `${PANEL}/items/${name}?fields=${fields}&limit=-1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const body = await res.json()
  const out = resolve(DUMP_DIR, `${name}.json`)
  writeFileSync(out, JSON.stringify(body, null, 2), 'utf-8')
  console.log(`  ${name}: ${body.data?.length ?? 0} records → ${out}`)
  return body.data ?? []
}

async function downloadAsset(uuid, attempt = 1) {
  if (!uuid) return null
  const url = `${PANEL}/assets/${uuid}`
  try {
    const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) })
    if (!head.ok) {
      console.warn(`  ! asset ${uuid}: HTTP ${head.status}`)
      return null
    }
    const ct = head.headers.get('content-type') || ''
    const ext =
      ct.includes('svg') ? 'svg'
      : ct.includes('png') ? 'png'
      : ct.includes('jpeg') ? 'jpg'
      : ct.includes('webp') ? 'webp'
      : 'bin'
    const localName = `${uuid}.${ext}`
    const localPath = resolve(ASSET_DIR, localName)
    if (existsSync(localPath) && statSync(localPath).size > 0) {
      return localName
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) {
      console.warn(`  ! asset ${uuid}: HTTP ${res.status}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(localPath, buf)
    return localName
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      return downloadAsset(uuid, attempt + 1)
    }
    console.warn(`  ! asset ${uuid}: ${err.message || err}`)
    return null
  }
}

async function main() {
  console.log(`📥 Pulling Directus collections from ${PANEL}`)
  const data = {}
  for (const [name, fields] of COLLECTIONS) {
    data[name] = await pullCollection(name, fields)
  }

  console.log(`\n🖼  Downloading assets to ${ASSET_DIR}`)
  const uuids = new Set()
  for (const b of data.brands ?? []) {
    if (b.logo) uuids.add(b.logo)
    if (b.doc_image) uuids.add(b.doc_image)
  }
  for (const s of data.sub_brands ?? []) {
    if (s.logo) uuids.add(s.logo)
  }
  for (const p of data.posts ?? []) {
    if (p.cover) uuids.add(p.cover)
    // Walk EditorJS blocks for inline images.
    const blocks = p.copy?.blocks ?? []
    for (const b of blocks) {
      if (b.type === 'image') {
        const fid = b.data?.file?.fileId
        if (fid) uuids.add(fid)
      }
    }
  }

  let ok = 0, fail = 0
  const manifest = {}
  const uuidList = [...uuids]
  const CONCURRENCY = 8
  const inflight = new Set()
  async function worker(uuid) {
    const local = await downloadAsset(uuid)
    if (local) {
      manifest[uuid] = local
      ok++
    } else {
      fail++
    }
  }
  for (const uuid of uuidList) {
    const p = worker(uuid).finally(() => inflight.delete(p))
    inflight.add(p)
    if (inflight.size >= CONCURRENCY) {
      await Promise.race(inflight)
    }
  }
  await Promise.all(inflight)
  writeFileSync(
    resolve(DUMP_DIR, 'asset-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  )
  console.log(`\n✅ Done: ${ok} assets cached, ${fail} failed`)
}

main().catch((err) => {
  console.error('❌ qlist-pull failed:', err)
  process.exit(1)
})
