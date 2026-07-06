/**
 * Attachment virus-scan provider interface.
 *
 * No provider is bundled: when unconfigured, files are accepted based on MIME
 * and size validation only, and scanForVirus() reports 'not_scanned' — never
 * a fake "clean" result. Wire a real scanner (e.g. ClamAV service or a
 * commercial API) by implementing AttachmentScanProvider.
 */

export type ScanResult = { status: 'clean' | 'infected' | 'not_scanned'; detail?: string }

export interface AttachmentScanProvider {
  readonly name: string
  scan(file: File): Promise<ScanResult>
}

export function getAttachmentScanProvider(): AttachmentScanProvider | null {
  // No scanning provider configured in this environment.
  return null
}

export async function scanForVirus(file: File): Promise<ScanResult> {
  const provider = getAttachmentScanProvider()
  if (!provider) return { status: 'not_scanned' }
  try {
    return await provider.scan(file)
  } catch (error) {
    console.error('Attachment scan failed', error)
    return { status: 'not_scanned', detail: 'scan_error' }
  }
}
