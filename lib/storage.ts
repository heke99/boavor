export const PROFILE_DOCUMENTS_BUCKET = 'profile-documents'
export const LISTING_IMAGES_BUCKET = 'listing-images'

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
