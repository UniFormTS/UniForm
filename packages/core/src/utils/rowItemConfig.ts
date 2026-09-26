import type { FieldConfig, FieldDependencyResult, FormMethods } from '../types'
import type { RowAwareOnChange } from './createRowScopedContext'

/**
 * Creates a copy of the item config with each child's `meta.onChange` wrapped
 * to inject the `rowIndex` as the third argument. This bridges the gap between
 * field components (which call onChange with 2 args) and the `RowAwareOnChange`
 * handlers injected by `injectOnChangeHandlers`.
 */
export function bindRowIndexToItemConfig(
  itemConfig: FieldConfig,
  rowIndex: number,
): FieldConfig {
  if (itemConfig.type !== 'object') return itemConfig

  const children = itemConfig.children.map((child) => {
    if (!child.meta.onChange) return child
    const originalOnChange = child.meta.onChange as RowAwareOnChange
    return {
      ...child,
      meta: {
        ...child.meta,
        onChange: (value: unknown, formMethods: FormMethods) => {
          void originalOnChange(value, formMethods, rowIndex)
        },
      },
    }
  })

  return { ...itemConfig, children }
}

/**
 * Merges per-row dynamic meta overrides into the child field configs of an
 * array item. For each child field that has an override in `rowOverrides`,
 * applies the override properties (hidden, disabled, label, placeholder,
 * description, options) to the child's config.
 */
export function applyRowDynamicMeta(
  itemConfig: FieldConfig,
  rowOverrides: Record<string, Partial<FieldDependencyResult>>,
): FieldConfig {
  if (itemConfig.type !== 'object') return itemConfig

  const children = itemConfig.children.map((child) => {
    const override = rowOverrides[child.name]
    if (!override) return child

    const { options, label, required, ...metaOverrides } = override
    let updated: FieldConfig = {
      ...child,
      ...(label !== undefined ? { label } : {}),
      ...(required !== undefined ? { required } : {}),
      meta: { ...child.meta, ...metaOverrides },
    }

    if (options !== undefined && updated.type === 'select') {
      updated = { ...updated, options }
    }

    return updated
  })

  return { ...itemConfig, children }
}
