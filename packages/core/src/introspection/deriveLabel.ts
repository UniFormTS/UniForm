// ---------------------------------------------------------------------------
// Label derivation
// ---------------------------------------------------------------------------

/**
 * Derives a human-readable label from a field name or dot-notated path.
 *
 * Rules applied (in order):
 * 1. Only the last segment of a dot-notated path is used (e.g. `"address.streetName"` → `"streetName"`).
 * 2. `camelCase` is split on word boundaries (e.g. `"streetName"` → `"Street Name"`).
 * 3. Underscores and hyphens are replaced with spaces (e.g. `"first_name"` → `"First Name"`).
 * 4. Each word is title-cased.
 *
 * @param name - The raw field name or dot-notated path.
 * @returns A title-cased, human-readable label string.
 *
 * @example
 * deriveLabel('firstName')       // → 'First Name'
 * deriveLabel('address.zipCode') // → 'Zip Code'
 * deriveLabel('phone_number')    // → 'Phone Number'
 */
export function deriveLabel(name: string): string {
  // Use only the last segment of a dot-notated path
  const segment = name.split('.').pop() ?? name
  if (!segment) return ''

  return segment
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/[_-]+/g, ' ') // replace underscores/hyphens with spaces
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
