import type * as z from 'zod/v4/core'
import type {
  FieldConfig,
  FieldCondition,
  FieldMeta,
  FormMethods,
  FieldDependencyResult,
} from '../types'
import type { UniForm, UniFormContext } from '../UniForm'

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
    const updated = override
      ? { ...field, meta: { ...field.meta, ...override } }
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
      for (const key of handlerKeys) {
        if (key.startsWith(prefix)) itemKeys.add(key.slice(prefix.length))
      }
      if (itemKeys.size) {
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
 * Merges event-driven `dynamicMeta` overrides into the field configs.
 * Only fields with entries in `overrides` are cloned.
 */
export function applyDynamicMeta(
  fields: FieldConfig[],
  overrides: Record<string, Partial<FieldDependencyResult>>,
): FieldConfig[] {
  if (!Object.keys(overrides).length) return fields
  return fields.map((field) => {
    const override = overrides[field.name]
    if (!override) return field
    const { options, label, ...metaOverrides } = override
    return {
      ...field,
      ...(label !== undefined ? { label } : {}),
      ...(options !== undefined ? { options } : {}),
      meta: { ...field.meta, ...metaOverrides },
    }
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
