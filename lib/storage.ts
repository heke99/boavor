export const PROFILE_DOCUMENTS_BUCKET = 'profile-documents'
export const LISTING_IMAGES_BUCKET = 'listing-images'
export const MAX_LISTING_IMAGE_SIZE = 10 * 1024 * 1024
export const MAX_PROFILE_DOCUMENT_SIZE = 15 * 1024 * 1024

const LISTING_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const PROFILE_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export function sanitizeStorageFileName(fileName: string) {
  const [name = 'file', ...extensionParts] = fileName.split('.')
  const extension = extensionParts.length ? `.${extensionParts.pop()}` : ''
  const safeName = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  return `${safeName || 'file'}${extension.toLowerCase()}`
}

export function toStorageUri(bucket: string, path: string) {
  return `storage:${bucket}/${path}`
}

export function validateListingImage(file: File) {
  if (!LISTING_IMAGE_MIME_TYPES.has(file.type)) return 'Bilden måste vara jpg, png, webp eller gif.'
  if (file.size > MAX_LISTING_IMAGE_SIZE) return 'Bilden får vara max 10 MB.'
  return null
}

export function validateProfileDocument(file: File) {
  if (!PROFILE_DOCUMENT_MIME_TYPES.has(file.type)) return 'Dokumentet måste vara pdf, bild, doc eller docx.'
  if (file.size > MAX_PROFILE_DOCUMENT_SIZE) return 'Dokumentet får vara max 15 MB.'
  return null
}

export function parseStorageUri(value: string | null | undefined) {
  if (!value?.startsWith('storage:')) return null
  const withoutScheme = value.slice('storage:'.length)
  const separatorIndex = withoutScheme.indexOf('/')
  if (separatorIndex === -1) return null

  return {
    bucket: withoutScheme.slice(0, separatorIndex),
    path: withoutScheme.slice(separatorIndex + 1),
  }
}
