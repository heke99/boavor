#!/usr/bin/env node
/**
 * Generates the PWA PNG icons (gradient rounded square + white house
 * silhouette) without any native image dependencies. Run once when the
 * brand changes: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256).map((_, n) => {
      let c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      return c
    })
  }
  let crc = -1
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0 // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Renders the icon at the given size; maskable icons skip the rounded mask. */
function renderIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const radius = maskable ? 0 : size * 0.22
  // Gradient endpoints (brand: #5b3df5 → #0ea5a4).
  const from = [0x5b, 0x3d, 0xf5]
  const to = [0x0e, 0xa5, 0xa4]

  // House silhouette geometry (relative units). Maskable icons shrink the
  // glyph into the 80% safe zone.
  const glyphScale = maskable ? 0.8 : 1
  const cx = size / 2
  const roofTopY = size * (0.5 - 0.24 * glyphScale)
  const roofBaseY = size * (0.5 - 0.02 * glyphScale)
  const roofHalf = size * 0.26 * glyphScale
  const bodyHalf = size * 0.17 * glyphScale
  const bodyBottom = size * (0.5 + 0.24 * glyphScale)
  const doorHalf = size * 0.045 * glyphScale
  const doorTop = size * (0.5 + 0.09 * glyphScale)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4

      // Rounded-rect alpha mask.
      let inside = true
      if (radius > 0) {
        const dx = Math.max(radius - x, x - (size - 1 - radius), 0)
        const dy = Math.max(radius - y, y - (size - 1 - radius), 0)
        inside = dx * dx + dy * dy <= radius * radius
      }
      if (!inside) continue // transparent

      const t = (x + y) / (2 * (size - 1))
      let r = Math.round(from[0] + (to[0] - from[0]) * t)
      let g = Math.round(from[1] + (to[1] - from[1]) * t)
      let b = Math.round(from[2] + (to[2] - from[2]) * t)

      // House silhouette in white.
      let glyph = false
      if (y >= roofTopY && y <= roofBaseY) {
        const progress = (y - roofTopY) / (roofBaseY - roofTopY)
        if (Math.abs(x - cx) <= roofHalf * progress) glyph = true
      } else if (y > roofBaseY && y <= bodyBottom) {
        if (Math.abs(x - cx) <= bodyHalf) glyph = true
        // Door cut-out keeps the mark from being a plain blob.
        if (Math.abs(x - cx) <= doorHalf && y >= doorTop) glyph = false
      }
      if (glyph) {
        r = 0xff
        g = 0xff
        b = 0xff
      }

      rgba[offset] = r
      rgba[offset + 1] = g
      rgba[offset + 2] = b
      rgba[offset + 3] = 0xff
    }
  }
  return encodePng(size, size, rgba)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', renderIcon(192))
writeFileSync('public/icons/icon-512.png', renderIcon(512))
writeFileSync('public/icons/icon-maskable-512.png', renderIcon(512, { maskable: true }))
console.log('icons written to public/icons/')
