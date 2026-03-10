import type { Control } from 'react-hook-form'
import { useFormState } from 'react-hook-form'
import type { FieldConfig } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import { resolveErrorMessage } from '../utils/resolveErrorMessage'
import { ScalarField } from './fields/ScalarField'
import { BooleanField } from './fields/BooleanField'
import { SelectField } from './fields/SelectField'
import { ObjectField } from './fields/ObjectField'
import { ArrayField } from './fields/ArrayField'

export type FieldRendererProps = {
  field: FieldConfig
  control: Control
  namePrefix?: string
  /** Zero-based render index within the parent container (form root / section / object). */
  index?: number
  /** Nesting depth (0 = top-level, 1 = inside object, etc.). */
  depth?: number
}

/**
 * Returns the fully-qualified field name for use with RHF, prepending
 * `namePrefix` when rendering inside a nested object or array context.
 */
function getEffectiveName(field: FieldConfig, namePrefix?: string): string {
  if (!namePrefix) return field.name
  if (!field.name) return namePrefix
  return `${namePrefix}.${field.name}`
}

/**
 * Traverses the RHF `errors` object along a dot-notated `name` path and
 * returns the leaf error object, or `undefined` if no error exists at that path.
 */
function getFieldError(
  errors: Record<string, unknown>,
  name: string,
): { message?: string; type?: string } | undefined {
  const parts = name.split('.')
  let current: unknown = errors
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  if (current && typeof current === 'object' && 'message' in current) {
    return current as { message?: string; type?: string }
  }
  return undefined
}

/**
 * Renders a single form field by delegating to the appropriate field component
 * based on `field.type`. Object and array fields manage their own layout and
 * skip the field wrapper; all other fields are wrapped in the configured
 * `FieldWrapper` with their resolved error message.
 */
export function FieldRenderer({
  field,
  control,
  namePrefix,
  index = 0,
  depth = 0,
}: FieldRendererProps) {
  const { fieldWrapper: FieldWrapper, messages } = useAutoFormContext()
  const { errors } = useFormState({ control })
  const effectiveName = getEffectiveName(field, namePrefix)

  // object and array manage their own layout — unless a direct component overrides
  const hasDirectComponent = typeof field.meta.component === 'function'

  if (field.type === 'object' && !hasDirectComponent) {
    const objectField = (
      effectiveName !== field.name ? { ...field, name: effectiveName } : field
    ) as Extract<FieldConfig, { type: 'object' }>
    return (
      <ObjectField
        field={objectField}
        control={control}
        namePrefix={namePrefix}
        depth={depth}
      />
    )
  }

  if (field.type === 'array' && !hasDirectComponent) {
    const arrayField = (
      effectiveName !== field.name ? { ...field, name: effectiveName } : field
    ) as Extract<FieldConfig, { type: 'array' }>
    return (
      <ArrayField
        field={arrayField}
        control={control}
        effectiveName={effectiveName}
      />
    )
  }

  const effectiveField =
    effectiveName !== field.name ? { ...field, name: effectiveName } : field

  const rawError = getFieldError(
    errors as Record<string, unknown>,
    effectiveName,
  )
  const error = resolveErrorMessage(effectiveName, rawError, messages)

  const renderField = () => {
    if (field.type === 'boolean') {
      return (
        <BooleanField
          field={effectiveField}
          control={control}
          effectiveName={effectiveName}
        />
      )
    }
    if (field.type === 'select') {
      return (
        <SelectField
          field={effectiveField as Extract<FieldConfig, { type: 'select' }>}
          control={control}
          effectiveName={effectiveName}
        />
      )
    }
    if (
      field.type === 'string' ||
      field.type === 'number' ||
      field.type === 'date' ||
      // array/object with a direct meta.component — let ScalarField render it
      hasDirectComponent
    ) {
      return (
        <ScalarField
          field={effectiveField}
          control={control}
          effectiveName={effectiveName}
        />
      )
    }
    // unknown type
    console.warn(
      `[UniForm] Unsupported field type: "${field.type}". Rendering null.`,
    )
    return null
  }

  const rendered = renderField()
  if (rendered === null) return null

  return (
    <FieldWrapper
      field={effectiveField}
      error={error}
      span={field.meta.span}
      index={index}
      depth={depth}
    >
      {rendered}
    </FieldWrapper>
  )
}
