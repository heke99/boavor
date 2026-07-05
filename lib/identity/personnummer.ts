/**
 * Swedish personal identity number (personnummer) utilities.
 *
 * Numbers are validated and normalized to 12 digits (YYYYMMDDNNNN), used to
 * derive the birth date, and then immediately hashed — the raw number is never
 * persisted by Bovaro.
 */

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

/** Luhn checksum over the 10-digit form (YYMMDDNNNC). */
function luhnIsValid(tenDigits: string) {
  let sum = 0
  for (let i = 0; i < 10; i += 1) {
    let digit = Number(tenDigits[i])
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12) return false
  // Coordination numbers (samordningsnummer) add 60 to the day.
  const normalizedDay = day > 60 ? day - 60 : day
  if (normalizedDay < 1) return false
  const date = new Date(Date.UTC(year, month - 1, normalizedDay))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === normalizedDay
  )
}

/**
 * Normalizes a personnummer to 12 digits (YYYYMMDDNNNN).
 * Returns null when the input is not a valid personnummer.
 */
export function normalizePersonalIdentityNumber(input: string, now: Date = new Date()): string | null {
  const digits = onlyDigits(input)

  let twelve: string
  if (digits.length === 12) {
    twelve = digits
  } else if (digits.length === 10) {
    // Century inference: pick the century that puts the birth year in the past.
    // A "+" separator in the raw input means the person is over 100 years old.
    const yy = Number(digits.slice(0, 2))
    const currentYear = now.getFullYear()
    const currentCentury = Math.floor(currentYear / 100) * 100
    let year = currentCentury + yy
    if (year > currentYear) year -= 100
    if (input.includes('+')) year -= 100
    twelve = `${year}${digits.slice(2)}`
  } else {
    return null
  }

  const year = Number(twelve.slice(0, 4))
  const month = Number(twelve.slice(4, 6))
  const day = Number(twelve.slice(6, 8))

  if (year < 1900 || year > now.getFullYear()) return null
  if (!isValidDateParts(year, month, day)) return null
  if (!luhnIsValid(twelve.slice(2))) return null

  return twelve
}

export function isValidPersonalIdentityNumber(input: string, now: Date = new Date()) {
  return normalizePersonalIdentityNumber(input, now) !== null
}

/** Derives the birth date (as YYYY-MM-DD) from a normalized 12-digit number. */
export function getBirthDate(normalized: string): string | null {
  if (!/^\d{12}$/.test(normalized)) return null
  const year = normalized.slice(0, 4)
  const month = normalized.slice(4, 6)
  let day = Number(normalized.slice(6, 8))
  if (day > 60) day -= 60 // coordination number
  return `${year}-${month}-${String(day).padStart(2, '0')}`
}

export function getAgeFromBirthDate(birthDate: string, now: Date = new Date()): number {
  const [year, month, day] = birthDate.split('-').map(Number)
  let age = now.getFullYear() - year
  const beforeBirthday =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)
  if (beforeBirthday) age -= 1
  return age
}
