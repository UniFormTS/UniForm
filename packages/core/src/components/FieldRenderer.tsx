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
}

function getEffectiveName(field: FieldConfig, namePrefix?: string): string {
  if (!namePrefix) return field.name
  if (!field.name) return namePrefix
  return `${namePrefix}.${field.name}`
}

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

export function FieldRenderer({
  field,
  control,
  namePrefix,
}: FieldRendererProps) {
  const { fieldWrapper: FieldWrapper, messages } = useAutoFormContext()
  const { errors } = useFormState({ control })
  const effectiveName = getEffectiveName(field, namePrefix)
  const effectiveField =
    effectiveName !== field.name ? { ...field, name: effectiveName } : field

  // object and array manage their own layout — unless a direct component overrides
  const hasDirectComponent = typeof field.meta.component === 'function'

  if (field.type === 'object' && !hasDirectComponent) {
    return (
      <ObjectField
        field={effectiveField}
        control={control}
        namePrefix={namePrefix}
      />
    )
  }

  if (field.type === 'array' && !hasDirectComponent) {
    return (
      <ArrayField
        field={effectiveField}
        control={control}
        effectiveName={effectiveName}
      />
    )
  }

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
          field={effectiveField}
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
    <FieldWrapper field={effectiveField} error={error} span={field.meta.span}>
      {rendered}
    </FieldWrapper>
  )
}
