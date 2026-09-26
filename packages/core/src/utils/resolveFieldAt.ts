import type { FieldConfig } from '../types'
import type { ArrayFieldConfigWithRowMeta } from './fieldPipeline'
import { applyRowDynamicMeta, bindRowIndexToItemConfig } from './rowItemConfig'

/** One config on the way down to a resolved path. */
export type FieldChainLink = {
  config: FieldConfig
  /** Path of the values its `condition` is evaluated against (`''` = form root). */
  scope: string
}

export type ResolvedField = {
  /** The field config that describes the leaf or container at the path. */
  config: FieldConfig
  /**
   * The prefix to pass to `FieldRenderer` so that
   * `getEffectiveName(config, namePrefix)` reproduces the absolute path.
   */
  namePrefix: string
  /** Every config from the form root down to `config`, inclusive. */
  chain: FieldChainLink[]
}

/**
 * Finds the `FieldConfig` for an absolute dot-notated path, descending through
 * nested objects and array rows (`sectors.0.orderReason`, `groups.0.emails.1`).
 *
 * Returns the config together with the render prefix, because array rows shift
 * the naming base: item configs are introspected relative to the row, not the
 * form root. Row configs are bound to their row exactly as `ArrayField` binds
 * them, so row-aware handlers and per-row dynamic meta apply.
 */
export function resolveFieldAt(
  fields: FieldConfig[],
  path: string,
  prefix = '',
  chain: FieldChainLink[] = [],
): ResolvedField | undefined {
  for (const field of fields) {
    const link = [...chain, { config: field, scope: prefix }]
    if (field.name === path) {
      return { config: field, namePrefix: prefix, chain: link }
    }
    if (!path.startsWith(`${field.name}.`)) continue

    if (field.type === 'object') {
      // Object children carry fully-qualified names within the same prefix.
      const found = resolveFieldAt(field.children, path, prefix, link)
      if (found) return found
      continue
    }

    if (field.type === 'array') {
      const rest = path.slice(field.name.length + 1)
      const match = /^(\d+)(?:\.(.*))?$/.exec(rest)
      if (!match) continue

      const index = Number(match[1])
      const rowBase = prefix ? `${prefix}.${field.name}` : field.name
      const rowPrefix = `${rowBase}.${match[1]}`
      const sub = match[2]

      const rowMeta = (field as ArrayFieldConfigWithRowMeta)._rowDynamicMeta?.[
        index
      ]
      const itemConfig = bindRowIndexToItemConfig(
        rowMeta
          ? applyRowDynamicMeta(field.itemConfig, rowMeta)
          : field.itemConfig,
        index,
      )

      if (sub === undefined) {
        return { config: itemConfig, namePrefix: rowPrefix, chain: link }
      }
      if (itemConfig.type === 'object') {
        const found = resolveFieldAt(itemConfig.children, sub, rowPrefix, link)
        if (found) return found
      }
      continue
    }
  }
  return undefined
}

/** The values at `scope`, or the whole form when `scope` is the root. */
export function valuesAtScope(
  values: unknown,
  scope: string,
): Record<string, unknown> {
  let cursor: unknown = values
  if (scope) {
    for (const segment of scope.split('.')) {
      if (cursor == null || typeof cursor !== 'object') return {}
      cursor = (cursor as Record<string, unknown>)[segment]
    }
  }
  return cursor && typeof cursor === 'object'
    ? (cursor as Record<string, unknown>)
    : {}
}

/** Whether any config on the path carries a value-dependent `condition`. */
export function chainHasCondition(chain: FieldChainLink[]): boolean {
  return chain.some((link) => typeof link.config.meta.condition === 'function')
}

/**
 * Whether every `condition` on the path currently holds — the same test the
 * auto-rendered form applies level by level.
 *
 * `meta.hidden` is deliberately ignored: it removes a field from the
 * auto-rendered form so the app can place it itself.
 */
export function isChainVisible(
  chain: FieldChainLink[],
  values: unknown,
): boolean {
  return chain.every(({ config, scope }) => {
    const condition = config.meta.condition
    return (
      typeof condition !== 'function' || condition(valuesAtScope(values, scope))
    )
  })
}
