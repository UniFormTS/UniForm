import * as React from 'react'
import { useWatch } from 'react-hook-form'
import type {
  FieldCondition,
  FieldConfig,
  FieldDependencyResult,
  FormMethods,
} from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import { FieldPathContext, useFieldTree } from '../context/FieldTreeContext'
import type { ArrayFieldConfigWithRowMeta } from '../utils/fieldPipeline'
import type { RowAwareOnChange } from '../utils/createRowScopedContext'
import { getAtPath } from './useRegisteredFieldArray'

type ScopedCondition = {
  condition: FieldCondition
  /** Path of the values the condition receives; `''` = the whole form. */
  scope: string
}

type ResolvedField = {
  /** Config ready for `FieldRenderer`, named relative to `namePrefix`. */
  field: FieldConfig
  namePrefix?: string
  /** The field's and its ancestors' conditions. */
  conditions: ScopedCondition[]
}

type Row = { array: ArrayFieldConfigWithRowMeta; index: number }

const ROW_INDEX = /^\d+$/

/** Applies the per-row dynamic meta and row-index binding the built-in array renderer applies. */
function bindToRow(field: FieldConfig, { array, index }: Row): FieldConfig {
  let bound = field
  const override: Partial<FieldDependencyResult> | undefined =
    array._rowDynamicMeta?.[index]?.[field.name]
  if (override) {
    const { options, label, ...meta } = override
    bound = {
      ...bound,
      ...(label !== undefined ? { label } : {}),
      meta: { ...bound.meta, ...meta },
    }
    if (options !== undefined && bound.type === 'select') {
      bound = { ...bound, options }
    }
  }
  const onChange = bound.meta.onChange as RowAwareOnChange | undefined
  if (onChange) {
    bound = {
      ...bound,
      meta: {
        ...bound.meta,
        onChange: (value: unknown, formMethods: FormMethods) =>
          onChange(value, formMethods, index),
      },
    }
  }
  return bound
}

/** Config for a row of a primitive array, labelled like the built-in renderer. */
function primitiveRowConfig(
  array: Extract<FieldConfig, { type: 'array' }>,
  index: number,
): FieldConfig {
  const item = array.itemConfig
  const itemLabel = array.meta.itemLabel ?? item.label
  if (itemLabel) return { ...item, label: itemLabel }
  return {
    ...item,
    label: '',
    meta: { ...item.meta, ariaLabel: `${array.label} ${index + 1}` },
  }
}

/**
 * Walks the resolved field tree to the absolute `path`, collecting every
 * condition on the way with the scope the auto layout evaluates it in (the
 * row for fields inside array rows, otherwise the whole form).
 */
function resolveField(
  fields: FieldConfig[],
  path: string,
  prefix = '',
  conditions: ScopedCondition[] = [],
  row?: Row,
): ResolvedField | undefined {
  for (const field of fields) {
    const absolute = prefix ? `${prefix}.${field.name}` : field.name
    if (absolute !== path && !path.startsWith(`${absolute}.`)) continue

    const chain =
      typeof field.meta.condition === 'function'
        ? [...conditions, { condition: field.meta.condition, scope: prefix }]
        : conditions

    if (absolute === path) {
      return {
        field: row ? bindToRow(field, row) : field,
        namePrefix: prefix || undefined,
        conditions: chain,
      }
    }
    // Object children are named from the same prefix as their parent
    if (field.type === 'object') {
      return resolveField(field.children, path, prefix, chain, row)
    }
    if (field.type !== 'array') return undefined

    const indexSegment = path.slice(absolute.length + 1).split('.')[0]
    if (!ROW_INDEX.test(indexSegment)) return undefined
    const index = Number(indexSegment)
    const rowPath = `${absolute}.${index}`
    if (rowPath === path) {
      const item =
        field.itemConfig.type === 'object'
          ? field.itemConfig
          : primitiveRowConfig(field, index)
      return { field: item, namePrefix: rowPath, conditions: chain }
    }
    if (field.itemConfig.type !== 'object') return undefined
    return resolveField(field.itemConfig.children, path, rowPath, chain, {
      array: field,
      index,
    })
  }
  return undefined
}

/**
 * Resolves `name` (relative to the enclosing container, if any) to the field
 * config the auto layout would render, and whether its conditions currently
 * allow it. Subscribes to form values only when a condition applies.
 */
export function useField(name: string) {
  const { control, formMethods } = useAutoFormContext()
  const { fields } = useFieldTree()
  const base = React.useContext(FieldPathContext)
  const path = base ? `${base}.${name}` : name

  const resolved = React.useMemo(
    () => resolveField(fields, path),
    [fields, path],
  )

  const warned = React.useRef(false)
  React.useEffect(() => {
    if (resolved || warned.current) return
    warned.current = true
    console.warn(
      `[UniForm] <Field name="${path}">: no field exists at this path. Rendering null.`,
    )
  }, [resolved, path])

  const conditions = resolved?.conditions
  const hasConditions = (conditions?.length ?? 0) > 0
  const isVisible = React.useCallback(
    (values: Record<string, unknown>) =>
      (conditions ?? []).every(({ condition, scope }) => {
        const scoped = scope ? getAtPath(values, scope) : values
        return condition((scoped ?? {}) as Record<string, unknown>)
      }),
    [conditions],
  )
  // Re-renders only when visibility flips, not on every value change
  useWatch({ control, disabled: !hasConditions, compute: isVisible })

  if (!resolved) return null

  return {
    control,
    field: resolved.field,
    namePrefix: resolved.namePrefix,
    shouldUnregister: hasConditions,
    visible: !hasConditions || isVisible(formMethods.getValues()),
  }
}
