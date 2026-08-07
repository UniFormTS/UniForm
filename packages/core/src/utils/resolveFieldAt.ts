import type { FieldConfig } from '../types'

export type ResolvedField = {
  /** The field config that describes the leaf or container at the path. */
  config: FieldConfig
  /**
   * The prefix to pass to `FieldRenderer` so that
   * `getEffectiveName(config, namePrefix)` reproduces the absolute path.
   */
  namePrefix: string
}

/**
 * Finds the `FieldConfig` for an absolute dot-notated path, descending through
 * nested objects and array rows (`sectors.0.orderReason`, `groups.0.emails.1`).
 *
 * Returns the config together with the render prefix, because array rows shift
 * the naming base: item configs are introspected relative to the row, not the
 * form root.
 */
export function resolveFieldAt(
  fields: FieldConfig[],
  path: string,
  prefix = '',
): ResolvedField | undefined {
  for (const field of fields) {
    if (field.name === path) return { config: field, namePrefix: prefix }
    if (!path.startsWith(`${field.name}.`)) continue

    if (field.type === 'object') {
      // Object children carry fully-qualified names within the same prefix.
      const found = resolveFieldAt(field.children, path, prefix)
      if (found) return found
      continue
    }

    if (field.type === 'array') {
      const rest = path.slice(field.name.length + 1)
      const match = /^(\d+)(?:\.(.*))?$/.exec(rest)
      if (!match) continue

      const rowBase = prefix ? `${prefix}.${field.name}` : field.name
      const rowPrefix = `${rowBase}.${match[1]}`
      const sub = match[2]

      if (sub === undefined) {
        return { config: field.itemConfig, namePrefix: rowPrefix }
      }
      if (field.itemConfig.type === 'object') {
        const found = resolveFieldAt(field.itemConfig.children, sub, rowPrefix)
        if (found) return found
      }
      continue
    }
  }
  return undefined
}
