import { describe, expect, it } from 'vitest'
import { parseStorageUri, sanitizeStorageFileName, toStorageUri, validateListingImage, validateProfileDocument } from './storage'

describe('storage helpers', () => {
  it('sanitizes file names', () => {
    expect(sanitizeStorageFileName('Min Lönespecifikation APRIL.PDF')).toBe('min-lo-nespecifikation-april.pdf')
  })

  it('roundtrips storage URIs', () => {
    const uri = toStorageUri('profile-documents', 'user/file.pdf')
    expect(parseStorageUri(uri)).toEqual({ bucket: 'profile-documents', path: 'user/file.pdf' })
  })

  it('validates listing image mime and size', () => {
    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    expect(validateListingImage(file)).toBeNull()
    expect(validateListingImage(new File(['x'], 'cover.txt', { type: 'text/plain' }))).toMatch(/Bilden/)
  })

  it('validates profile documents', () => {
    expect(validateProfileDocument(new File(['x'], 'doc.pdf', { type: 'application/pdf' }))).toBeNull()
    expect(validateProfileDocument(new File(['x'], 'doc.exe', { type: 'application/x-msdownload' }))).toMatch(/Dokumentet/)
  })
})
