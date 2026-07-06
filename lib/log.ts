/**
 * Privacy-safe logging helpers.
 *
 * Log lines must never contain personal data: no e-mail addresses, phone
 * numbers or personnummer. sanitizeForLog() masks known PII patterns and
 * redacts values under sensitive keys; logError() applies it to context
 * objects before writing to stderr.
 */

const SENSITIVE_KEY_PATTERN =
  /(email|e_mail|phone|telefon|personnummer|personal_identity|ssn|password|secret|token|authorization|first_name|last_name|full_name)/i

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g
// Personnummer: 6 or 8 digits, optional separator, 4 digits.
const PERSONNUMMER_PATTERN = /\b(\d{8}|\d{6})[-+]?\d{4}\b/g
// Swedish phone numbers (very permissive on purpose; false positives are fine in logs).
const PHONE_PATTERN = /\+?\d[\d\s()-]{7,}\d/g

export function maskPiiInText(text: string): string {
  return text
    .replace(EMAIL_PATTERN, '[email]')
    .replace(PERSONNUMMER_PATTERN, '[personnummer]')
    .replace(PHONE_PATTERN, '[phone]')
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return maskPiiInText(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Error) {
    return { name: value.name, message: maskPiiInText(value.message) }
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, depth + 1))
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeForLog(entry, depth + 1)
    }
    return result
  }
  return String(value)
}

/** console.error with PII-masked message and context. */
export function logError(scope: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[${scope}]`, sanitizeForLog(error), context ? sanitizeForLog(context) : '')
}
