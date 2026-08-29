// ---------------------------------------------------------------------------
// SelectOption — shared primitive used by both field and layout types
// ---------------------------------------------------------------------------

/**
 * A single option entry used in `select` / enum fields.
 *
 * The value type defaults to `string | number`. Richer values — a composite key
 * such as `{ col1, col2 }` — are supported at runtime: supply `getOptionKey`
 * (and optionally `isOptionEqual`) on the field's `meta` or globally via
 * `createAutoForm`, and type the option list as `SelectOption<MyValue>`.
 *
 * @template TValue - The value submitted with the form when this option is picked.
 */
export type SelectOption<TValue = string | number> = {
  /** Human-readable text displayed in the dropdown. */
  label: string
  /** The underlying value submitted with the form. */
  value: TValue
}

/**
 * Derives a stable string key for an option.
 *
 * The key is used for React keys and for the DOM `value` attribute — **never**
 * as the submitted value, which stays the option's raw `value`.
 */
export type GetOptionKey = (option: SelectOption<never>) => string

/**
 * Compares the current form value with an option's value to decide which option
 * is selected. Defaults to `Object.is`, then to key equality.
 */
export type IsOptionEqual = (
  formValue: unknown,
  optionValue: unknown,
) => boolean
