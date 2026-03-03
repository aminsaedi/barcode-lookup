#!/usr/bin/env node
/**
 * Generates PWA icons (192x192 and 512x512 PNGs) using pure Node.js.
 * No external dependencies - uses built-in zlib for PNG deflate compression.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(__dirname, '..', 'public', 'icons')
mkdirSync(iconsDir, { recursive: true })

// ---------- PNG encoder ----------
function uint32BE(n) {
  const b = Buffer.allocUnsafe(4)
  b.writeUInt32BE(n)
  return b
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crc = crc32(Buffer.concat([typeBytes, data]))
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc)])
}

// CRC-32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Creates a PNG with a blue gradient background and white barcode stripes.
 * @param {number} size
 * @returns {Buffer}
 */
function createPng(size) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, 8-bit depth, RGB color type (2)
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // Build raw pixel data with filter byte (0 = None) per scanline
  const rawData = Buffer.allocUnsafe(size * (1 + size * 3))

  const margin = Math.floor(size * 0.15)
  const barcodeTop = Math.floor(size * 0.25)
  const barcodeBottom = Math.floor(size * 0.75)

  // Barcode stripe pattern (relative widths)
  const pattern = [3, 2, 5, 1, 4, 2, 6, 1, 3, 2, 5, 2, 4, 3, 3, 2, 5, 2, 4]
  const patternTotal = pattern.reduce((a, b) => a + b, 0)
  const stripeArea = size - margin * 2

  // Pre-compute which x coords are a dark stripe
  const isStripe = new Uint8Array(size)
  let px = margin
  for (let i = 0; i < pattern.length; i++) {
    const w = Math.round((pattern[i] / patternTotal) * stripeArea)
    if (i % 2 === 0) {
      // dark stripe
      for (let x = px; x < px + w && x < size; x++) isStripe[x] = 1
    }
    px += w
  }

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 3)
    rawData[rowOffset] = 0 // filter type: None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 3
      const inBarcode =
        y >= barcodeTop && y < barcodeBottom && x >= margin && x < size - margin

      if (inBarcode && isStripe[x]) {
        // White barcode stripe
        rawData[pixelOffset] = 255
        rawData[pixelOffset + 1] = 255
        rawData[pixelOffset + 2] = 255
      } else {
        // Blue gradient background  #1e3a8a → #1e40af
        const t = x / size
        rawData[pixelOffset] = Math.round(0x1e + t * (0x1e - 0x1e))         // R: 30
        rawData[pixelOffset + 1] = Math.round(0x3a + t * (0x40 - 0x3a))    // G: 58→64
        rawData[pixelOffset + 2] = Math.round(0x8a + t * (0xaf - 0x8a))    // B: 138→175
      }
    }
  }

  const compressed = deflateSync(rawData, { level: 6 })
  const idat = pngChunk('IDAT', compressed)

  return Buffer.concat([PNG_SIG, pngChunk('IHDR', ihdr), idat, pngChunk('IEND', Buffer.alloc(0))])
}

// Also generate an SVG for favicon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#1e40af"/>
  <rect x="15" y="30" width="5" height="40" fill="white"/>
  <rect x="23" y="30" width="3" height="40" fill="white"/>
  <rect x="29" y="30" width="8" height="40" fill="white"/>
  <rect x="40" y="30" width="4" height="40" fill="white"/>
  <rect x="47" y="30" width="6" height="40" fill="white"/>
  <rect x="56" y="30" width="3" height="40" fill="white"/>
  <rect x="62" y="30" width="8" height="40" fill="white"/>
  <rect x="73" y="30" width="4" height="40" fill="white"/>
  <rect x="80" y="30" width="5" height="40" fill="white"/>
</svg>`

writeFileSync(resolve(iconsDir, 'icon-192.png'), createPng(192))
writeFileSync(resolve(iconsDir, 'icon-512.png'), createPng(512))
writeFileSync(resolve(iconsDir, 'icon.svg'), svg)

console.log('✅ PWA icons generated in public/icons/')
