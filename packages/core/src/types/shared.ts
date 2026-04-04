// ---------------------------------------------------------------------------
// SelectOption — shared primitive used by both field and layout types
// ---------------------------------------------------------------------------

/**
 * A single option entry used in `select` / enum fields.
 */
export type SelectOption = {
  /** Human-readable text displayed in the dropdown. */
  label: string
  /** The underlying value submitted with the form. */
  value: string | number
}
