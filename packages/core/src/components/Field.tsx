import * as React from 'react'
import type { FieldConfig, FieldMeta } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import { useFieldPath, joinFieldPath } from '../context/FieldPathContext'
import { resolveFieldAt } from '../utils/resolveFieldAt'
import { FieldRenderer } from './FieldRenderer'

export type FieldComponentProps = {
  /**
   * Dot-notated path. Absolute by default (`'address.city'`,
   * `'lineItems.0.qty'`), or relative to the enclosing container when rendered
   * inside a custom object/array component (`'0.qty'`).
   */
  name: string
  /** Override the component used for this instance only. */
  component?: FieldMeta['component']
  /** Override the resolved label. */
  label?: string
  /** Force the field disabled for this instance only. */
  disabled?: boolean
  /** Extra class name merged onto the field's meta. */
  className?: string
}

/**
 * Render one field at `name` exactly as `<AutoForm>` would — same registry,
 * same resolved config, same wrapper, same error — but wherever you want.
 *
 * Use it to own the layout of a subtree while UniForm keeps registration,
 * validation and error handling for the leaves inside it.
 *
 * @example
 * <UniFormProvider form={form}>
 *   <div className='grid'>
 *     <Field name='firstName' />
 *     <Field name='lastName' />
 *     <Field name='address.city' label='Town' />
 *   </div>
 * </UniFormProvider>
 *
 * @example
 * // Relative path inside a custom component rendered for `lineItems`:
 * <Field name='0.qty' />
 */
export function Field({
  name,
  component,
  label,
  disabled,
  className,
}: FieldComponentProps) {
  const { resolvedFields, control } = useAutoFormContext()
  const basePath = useFieldPath()
  const path = joinFieldPath(basePath, name)

  const resolved = resolveFieldAt(resolvedFields, path)

  React.useEffect(() => {
    if (resolved) return
    console.warn(
      `[UniForm] <Field name="${path}" /> found no field at that path in the schema. ` +
        'Nothing was rendered — check the path spelling.',
    )
  }, [path, resolved])

  if (!resolved) return null

  const { config, namePrefix } = resolved
  const overridden: FieldConfig =
    component === undefined &&
    label === undefined &&
    disabled === undefined &&
    className === undefined
      ? config
      : {
          ...config,
          ...(label !== undefined ? { label } : {}),
          meta: {
            ...config.meta,
            ...(component !== undefined ? { component } : {}),
            ...(disabled !== undefined ? { disabled } : {}),
            ...(className !== undefined ? { className } : {}),
          },
        }

  return (
    <FieldRenderer
      field={overridden}
      control={control as never}
      namePrefix={namePrefix || undefined}
    />
  )
}
