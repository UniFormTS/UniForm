// ---------------------------------------------------------------------------
// Label derivation
// ---------------------------------------------------------------------------

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
