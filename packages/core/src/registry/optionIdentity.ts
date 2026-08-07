import type { GetOptionKey, IsOptionEqual, SelectOption } from '../types'

/**
 * Default key derivation.
 *
 * Scalars stringify to themselves — unchanged behaviour. Object values have no
 * meaningful default: `String({})` is `"[object Object]"`, which would collapse
 * every option onto one key and silently break selection. Those must supply
 * `getOptionKey`.
 */
export function defaultOptionKey(value: unknown): string | undefined {
  if (value === null || value === undefined) return ''
  const type = typeof value
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return String(value as string | number | boolean)
  }
  return undefined
}

export type OptionIdentity = {
  /** Stable key for React and the DOM `value` attribute. */
  keyOf: (option: SelectOption<never>) => string
  /** Finds the option matching a raw form value. */
  find: (
    options: readonly SelectOption<never>[],
    value: unknown,
  ) => SelectOption<never> | undefined
}

/**
 * Builds the key/equality layer for one field's options, honouring per-field
 * `meta.getOptionKey` / `meta.isOptionEqual` and the factory-level defaults.
 *
 * Throws in development when an object-valued option has no key function, and
 * when two options collapse onto the same key — both are silent-selection bugs
 * otherwise.
 */
export function createOptionIdentity(
  fieldName: string,
  options: readonly SelectOption<never>[] | undefined,
  getOptionKey?: GetOptionKey,
  isOptionEqual?: IsOptionEqual,
): OptionIdentity {
  const keyOf = (option: SelectOption<never>): string => {
    if (getOptionKey) return getOptionKey(option)
    const derived = defaultOptionKey(option.value)
    if (derived === undefined) {
      throw new Error(
        `[UniForm] Field "${fieldName}" has an option whose value is not a string, ` +
          'number or boolean, and no getOptionKey was provided. Add ' +
          "`getOptionKey` to the field's meta (or to createAutoForm) so options " +
          'can be identified without stringifying the value.',
      )
    }
    return derived
  }

  if (options) assertUniqueKeys(fieldName, options, keyOf)

  const find = (
    list: readonly SelectOption<never>[],
    value: unknown,
  ): SelectOption<never> | undefined => {
    if (isOptionEqual) {
      return list.find((option) => isOptionEqual(value, option.value))
    }
    const direct = list.find((option) => Object.is(option.value, value))
    if (direct) return direct

    // Fall back to key equality. Values arrive from the store as clones, so
    // reference identity is not enough for anything but scalars.
    let valueKey: string | undefined
    try {
      valueKey = getOptionKey
        ? getOptionKey({ label: '', value } as SelectOption<never>)
        : defaultOptionKey(value)
    } catch {
      return undefined
    }
    if (valueKey === undefined) return undefined

    return list.find((option) => {
      try {
        return keyOf(option) === valueKey
      } catch {
        return false
      }
    })
  }

  return { keyOf, find }
}

function assertUniqueKeys(
  fieldName: string,
  options: readonly SelectOption<never>[],
  keyOf: (option: SelectOption<never>) => string,
) {
  const seen = new Set<string>()
  for (const option of options) {
    const key = keyOf(option)
    if (seen.has(key)) {
      throw new Error(
        `[UniForm] Field "${fieldName}" has two options with the same key "${key}". ` +
          'Option keys must be unique — selection is ambiguous otherwise. ' +
          'Provide a `getOptionKey` that distinguishes them.',
      )
    }
    seen.add(key)
  }
}
