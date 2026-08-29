import type * as z from 'zod/v4/core'
import type {
  FieldConfig,
  FieldCondition,
  FieldMeta,
  FieldRequirement,
  FormMethods,
  FieldDependencyResult,
  GetOptionKey,
  IsOptionEqual,
} from '../types'
import type { UniForm, UniFormContext } from '../UniForm'
import { createRowScopedContext } from './createRowScopedContext'
import type { RowAwareOnChange } from './createRowScopedContext'

/**
 * Recursively merges `overrides` (keyed by field name) into the `fields` tree,
 * applying each override to the matching field's `meta`. Descends into
 * `children` (object fields) and `itemConfig.children` (array-of-object fields).
 *
 * For array fields, keys prefixed with `"<arrayFieldName>."` are stripped before
 * matching against item children, so `"items.qty"` targets every row's `qty` field.
 */
export function applyFieldOverrides(
  fields: FieldConfig[],
  overrides: Record<string, Partial<FieldMeta>>,
): FieldConfig[] {
  return fields.map((field) => {
    const override = overrides[field.name]
    // `label` and `options` are read off the config, not off meta, so they have
    // to be promoted — merging them into meta alone would silently do nothing.
    const updated: FieldConfig = override
      ? ({
          ...field,
          ...(typeof override.label === 'string'
            ? { label: override.label }
            : {}),
          ...(field.type === 'select' && Array.isArray(override.options)
            ? { options: override.options }
            : {}),
          meta: { ...field.meta, ...override },
        } as FieldConfig)
      : field

    if (updated.type === 'object') {
      const newChildren = applyFieldOverrides(updated.children, overrides)
      if (newChildren !== updated.children)
        return { ...updated, children: newChildren }
    }

    if (updated.type === 'array' && updated.itemConfig.type === 'object') {
      const prefix = `${updated.name}.`
      const strippedOverrides: Record<string, Partial<FieldMeta>> = {}
      for (const [key, value] of Object.entries(overrides)) {
        if (key.startsWith(prefix))
          strippedOverrides[key.slice(prefix.length)] = value
      }
      const newItemChildren = applyFieldOverrides(
        updated.itemConfig.children,
        strippedOverrides,
      )
      if (newItemChildren !== updated.itemConfig.children) {
        return {
          ...updated,
          itemConfig: { ...updated.itemConfig, children: newItemChildren },
        }
      }
    }

    return updated
  })
}

/**
 * Injects UniForm onChange handlers into each field's `meta.onChange`, recursing
 * into object children and array itemConfig with prefix-stripping for array fields.
 */
export function injectOnChangeHandlers<TSchema extends z.$ZodObject>(
  fields: FieldConfig[],
  uniForm: UniForm<TSchema>,
  ctx: UniFormContext<TSchema>,
  handlerKeys: Set<string> = new Set(uniForm._getWatchedFields()),
): FieldConfig[] {
  if (!handlerKeys.size) return fields

  return fields.map((field) => {
    let updated: FieldConfig = field

    if (handlerKeys.has(field.name)) {
      const existingOnChange = field.meta.onChange
      updated = {
        ...field,
        meta: {
          ...field.meta,
          onChange: (value: unknown, formMethods: FormMethods) => {
            void existingOnChange?.(value, formMethods)
            void uniForm._fireHandler(field.name, value, ctx)
          },
        },
      }
    }

    if (updated.type === 'object') {
      const newChildren = injectOnChangeHandlers(
        updated.children,
        uniForm,
        ctx,
        handlerKeys,
      )
      if (newChildren !== updated.children)
        updated = { ...updated, children: newChildren }
    } else if (updated.type === 'array') {
      const prefix = field.name + '.'
      const itemKeys = new Set<string>()
      // Collect row-specific indexed keys (e.g. "0.priority" from "tasks.0.priority")
      const indexedKeys = new Set<string>()
      for (const key of handlerKeys) {
        if (key.startsWith(prefix)) {
          const remainder = key.slice(prefix.length)
          // Check if it's an indexed path like "0.priority"
          const indexMatch = remainder.match(/^(\d+)\.(.+)$/)
          if (indexMatch) {
            indexedKeys.add(remainder)
            // Also ensure the child field gets a handler injected
            itemKeys.add(indexMatch[2])
          } else {
            itemKeys.add(remainder)
          }
        }
      }
      if (itemKeys.size && updated.itemConfig.type === 'object') {
        // Derive sibling field names from the array's itemConfig
        const itemFieldNames = new Set<string>(
          updated.itemConfig.children.map((c) => c.name),
        )
        const arrayName = field.name

        // Inject row-aware onChange handlers into item children
        const newChildren = updated.itemConfig.children.map((child) => {
          if (!itemKeys.has(child.name)) return child

          const existingOnChange = child.meta.onChange
          const rowAwareHandler: RowAwareOnChange = (
            value: unknown,
            formMethods: FormMethods,
            rowIndex: number,
          ) => {
            void existingOnChange?.(value, formMethods)
            // Create a row-scoped context for this specific row
            const rowCtx = createRowScopedContext(
              ctx,
              arrayName,
              rowIndex,
              itemFieldNames,
              () => {
                const allValues = ctx.getValues()
                const arrayValues = (allValues as Record<string, unknown>)?.[
                  arrayName
                ]
                if (Array.isArray(arrayValues)) {
                  return (
                    (arrayValues[rowIndex] as Record<string, unknown>) ?? {}
                  )
                }
                return {}
              },
            )
            // Fire the generic handler (e.g. "tasks.priority") if registered
            void uniForm._fireHandler(
              `${arrayName}.${child.name}`,
              value,
              rowCtx,
            )
            // Fire the row-specific handler (e.g. "tasks.0.priority") if registered
            const indexedKey = `${rowIndex}.${child.name}`
            if (indexedKeys.has(indexedKey)) {
              void uniForm._fireHandler(
                `${arrayName}.${indexedKey}`,
                value,
                rowCtx,
              )
            }
          }
          return {
            ...child,
            meta: {
              ...child.meta,
              // Cast to FieldMeta onChange type — ArrayField's bindRowIndexToItemConfig
              // will call this with the rowIndex third argument at render time.
              onChange:
                rowAwareHandler as unknown as typeof child.meta.onChange,
            },
          }
        })

        const newItemConfig = {
          ...updated.itemConfig,
          children: newChildren,
        }
        if (newItemConfig !== updated.itemConfig)
          updated = { ...updated, itemConfig: newItemConfig }
      } else if (itemKeys.size) {
        // Non-object array items: fall back to the original remapped approach
        const remappedUniForm = {
          _getWatchedFields: () => Array.from(itemKeys),
          _fireHandlers: (
            name: string,
            value: unknown,
            c: UniFormContext<TSchema>,
          ) => uniForm._fireHandler(`${field.name}.${name}`, value, c),
        } as unknown as UniForm<TSchema>
        const newItemConfig = injectOnChangeHandlers(
          [updated.itemConfig],
          remappedUniForm,
          ctx,
          itemKeys,
        )[0]
        if (newItemConfig !== updated.itemConfig)
          updated = { ...updated, itemConfig: newItemConfig }
      }
    }

    return updated
  })
}

/**
 * Injects UniForm conditions into field configs, recursing into object children
 * and array itemConfig with prefix-stripping for array fields.
 */
export function injectConditions(
  fields: FieldConfig[],
  conditions: Map<string, FieldCondition>,
): FieldConfig[] {
  if (!conditions.size) return fields

  return fields.map((field) => {
    const condition = conditions.get(field.name)
    let updated: FieldConfig = condition
      ? { ...field, meta: { ...field.meta, condition } }
      : field

    if (updated.type === 'object') {
      const newChildren = injectConditions(updated.children, conditions)
      if (newChildren !== updated.children)
        updated = { ...updated, children: newChildren }
    } else if (updated.type === 'array') {
      const prefix = field.name + '.'
      const itemConditions = new Map<string, FieldCondition>()
      for (const [key, cond] of conditions) {
        if (key.startsWith(prefix))
          itemConditions.set(key.slice(prefix.length), cond)
      }
      if (itemConditions.size) {
        const newItemConfig = injectConditions(
          [updated.itemConfig],
          itemConditions,
        )[0]
        if (newItemConfig !== updated.itemConfig)
          updated = { ...updated, itemConfig: newItemConfig }
      }
    }

    return updated
  })
}

/**
 * Applies form-wide option identity as a fallback on every field, so a select
 * rendered anywhere — including one that replaces an object or array — can
 * identify non-scalar option values. Per-field `meta` always wins.
 */
export function injectOptionIdentity(
  fields: FieldConfig[],
  getOptionKey?: GetOptionKey,
  isOptionEqual?: IsOptionEqual,
): FieldConfig[] {
  if (!getOptionKey && !isOptionEqual) return fields

  return fields.map((field) => {
    let updated: FieldConfig = {
      ...field,
      meta: {
        ...field.meta,
        getOptionKey: field.meta.getOptionKey ?? getOptionKey,
        isOptionEqual: field.meta.isOptionEqual ?? isOptionEqual,
      },
    }

    if (updated.type === 'object') {
      updated = {
        ...updated,
        children: injectOptionIdentity(
          updated.children,
          getOptionKey,
          isOptionEqual,
        ),
      }
    } else if (updated.type === 'array') {
      updated = {
        ...updated,
        itemConfig: injectOptionIdentity(
          [updated.itemConfig],
          getOptionKey,
          isOptionEqual,
        )[0],
      }
    }

    return updated
  })
}

/**
 * Wraps `meta.onChange` on every field that something else depends on, so a UI
 * edit starts the same propagation a programmatic `setValue` does.
 *
 * Recurses into nested objects; dependency paths are absolute, so array rows
 * are not addressed here.
 */
export function injectDependencyPropagation(
  fields: FieldConfig[],
  sources: Set<string>,
  propagate: (name: string, value: unknown) => void,
): FieldConfig[] {
  if (!sources.size) return fields

  return fields.map((field) => {
    let updated: FieldConfig = field

    if (sources.has(field.name)) {
      const existing = field.meta.onChange
      updated = {
        ...field,
        meta: {
          ...field.meta,
          onChange: (value: unknown, formMethods: FormMethods) => {
            void existing?.(value, formMethods)
            propagate(field.name, value)
          },
        },
      }
    }

    if (updated.type === 'object') {
      const newChildren = injectDependencyPropagation(
        updated.children,
        sources,
        propagate,
      )
      if (newChildren !== updated.children)
        updated = { ...updated, children: newChildren }
    }

    return updated
  })
}

/**
 * Injects UniForm requiredness predicates into `meta.requiredWhen`, recursing
 * into object children and array itemConfig with prefix-stripping, exactly as
 * `injectConditions` does.
 */
export function injectRequirements(
  fields: FieldConfig[],
  requirements: Map<string, FieldRequirement>,
): FieldConfig[] {
  if (!requirements.size) return fields

  return fields.map((field) => {
    const requiredWhen = requirements.get(field.name)
    let updated: FieldConfig = requiredWhen
      ? { ...field, meta: { ...field.meta, requiredWhen } }
      : field

    if (updated.type === 'object') {
      const newChildren = injectRequirements(updated.children, requirements)
      if (newChildren !== updated.children)
        updated = { ...updated, children: newChildren }
    } else if (updated.type === 'array') {
      const prefix = field.name + '.'
      const itemRequirements = new Map<string, FieldRequirement>()
      for (const [key, predicate] of requirements) {
        if (key.startsWith(prefix))
          itemRequirements.set(key.slice(prefix.length), predicate)
      }
      if (itemRequirements.size) {
        const newItemConfig = injectRequirements(
          [updated.itemConfig],
          itemRequirements,
        )[0]
        if (newItemConfig !== updated.itemConfig)
          updated = { ...updated, itemConfig: newItemConfig }
      }
    }

    return updated
  })
}

// ---------------------------------------------------------------------------
// Internal type for array fields carrying per-row dynamic meta (not public API)
// ---------------------------------------------------------------------------

/**
 * Internal extension of the array FieldConfig that carries per-row dynamic meta
 * overrides as a transient property. Consumed by ArrayField at render time.
 */
export type ArrayFieldConfigWithRowMeta = Extract<
  FieldConfig,
  { type: 'array' }
> & {
  _rowDynamicMeta?: Record<
    number,
    Record<string, Partial<FieldDependencyResult>>
  >
}

/** Regex to match row-indexed keys: "{arrayName}.{digit(s)}.{childField}" */
const ROW_KEY_PATTERN = /^(.+?)\.(\d+)\.(.+)$/

/**
 * Merges event-driven `dynamicMeta` overrides into the field configs.
 * Only fields with entries in `overrides` are cloned.
 *
 * For array fields, overrides matching the pattern "{arrayName}.{index}.{childField}"
 * are grouped by row index into a `_rowDynamicMeta` transient property on the array
 * field config. Non-row-indexed overrides continue to apply to the array field as before.
 */
export function applyDynamicMeta(
  fields: FieldConfig[],
  overrides: Record<string, Partial<FieldDependencyResult>>,
): FieldConfig[] {
  if (!Object.keys(overrides).length) return fields
  return fields.map((field) => {
    // Apply top-level (non-row-indexed) override for this field
    const override = overrides[field.name]
    let updated: FieldConfig = field

    if (override) {
      const { options, label, required, ...metaOverrides } = override
      updated = {
        ...field,
        ...(label !== undefined ? { label } : {}),
        ...(options !== undefined ? { options } : {}),
        ...(required !== undefined ? { required } : {}),
        meta: { ...field.meta, ...metaOverrides },
      }
    }

    // For array fields, extract row-indexed overrides and attach as _rowDynamicMeta
    if (updated.type === 'array') {
      const prefix = `${updated.name}.`
      let rowDynamicMeta:
        | Record<number, Record<string, Partial<FieldDependencyResult>>>
        | undefined

      for (const [key, value] of Object.entries(overrides)) {
        if (!key.startsWith(prefix)) continue

        const match = ROW_KEY_PATTERN.exec(key)
        if (!match) continue

        const [, matchedArrayName, indexStr, childField] = match
        if (matchedArrayName !== updated.name) continue

        const rowIndex = Number(indexStr)
        if (!rowDynamicMeta) rowDynamicMeta = {}
        if (!rowDynamicMeta[rowIndex]) rowDynamicMeta[rowIndex] = {}
        rowDynamicMeta[rowIndex][childField] = value
      }

      if (rowDynamicMeta) {
        updated = {
          ...updated,
          _rowDynamicMeta: rowDynamicMeta,
        } as ArrayFieldConfigWithRowMeta
      }
    }

    return updated
  })
}

/** Generate sensible empty defaults so RHF starts with '' instead of undefined */
export function buildDefaults(fields: FieldConfig[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    const key = field.name
    switch (field.type) {
      case 'string':
        result[key] = ''
        break
      case 'number':
        result[key] = ''
        break
      case 'boolean':
        result[key] = false
        break
      case 'select':
        result[key] = field.options?.[0]?.value ?? ''
        break
      case 'array':
        result[key] = []
        break
      case 'object':
        result[key] = {}
        break
      default:
        break
    }
  }
  return result
}
