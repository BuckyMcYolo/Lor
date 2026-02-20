/**
 * Formats a phone number string as "(555) 123-4567" (US 10-digit)
 * or "+1 (555) 123-4567" (US 11-digit with country code).
 * Returns the original string if it can't be parsed.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return value
}

/**
 * Converts a phone number string to E.164 format (e.g. "+15551234567").
 * Assumes US country code (+1) if a 10-digit number is provided.
 * Returns null if the number can't be normalized.
 */
export function formatPhoneE164(value: string): string | null {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 10) {
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`
  }
  return null
}

/**
 * Strips all non-digit characters from a phone number string.
 */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "")
}
