import { useWatch, type FieldPath, type FieldPathValue } from 'react-hook-form'
import type * as z from 'zod/v4/core'
import { useOptionalAutoFormContext } from '../context/AutoFormContext'

type FormLike<TSchema extends z.$ZodObject> = { readonly schema: TSchema }

/**
 * Resolves the control from the live instance when one is passed, falling back
 * to the surrounding provider. Not a hook boundary — always called once.
 */
function useResolvedControl(form: unknown, label: string) {
  const ctx = useOptionalAutoFormContext(form)
  if (!ctx) {
    throw new Error(
      `[UniForm] Cannot read "${label}" — no form context. Render this component ` +
        'inside <AutoForm> / <UniFormProvider>, or pass the useUniForm() result as the first argument.',
    )
  }
  return ctx.control
}

/**
 * Reactively read a single field value from anywhere under `<AutoForm>` or
 * `<UniFormProvider>`. Re-renders only when the watched path changes.
 *
 * Pass the form as the first argument to infer the value type from the schema
 * with **zero casts** — this is the recommended form. Passing the live
 * `useUniForm()` result also works above the provider, in the component that
 * created the instance.
 *
 * @example
 * const sectors = useFormValue(requisitionForm, 'sectors')
 * //    ^? Sector[]
 *
 * @example
 * // Index paths work too:
 * const firstRow = useFormValue(requisitionForm, 'sectors.0')
 *
 * @example
 * // Without a form to hand, annotate the value yourself:
 * const email = useFormValue<string>('email')
 */
export function useFormValue<
  TSchema extends z.$ZodObject,
  K extends FieldPath<z.infer<TSchema>>,
>(form: FormLike<TSchema>, name: K): FieldPathValue<z.infer<TSchema>, K>
export function useFormValue<TValue = unknown>(name: string): TValue
export function useFormValue(formOrName: unknown, maybeName?: string): unknown {
  const isBare = typeof formOrName === 'string'
  const name = (isBare ? formOrName : maybeName) as string
  const control = useResolvedControl(isBare ? undefined : formOrName, name)
  return useWatch({ control, name: name as never })
}

/**
 * Reactively read the whole values object. Prefer {@link useFormValue} when you
 * only need one path — this hook re-renders on every change.
 *
 * @example
 * const values = useFormValues(requisitionForm)
 * //    ^? RequisitionValues
 */
export function useFormValues<TSchema extends z.$ZodObject>(
  form: FormLike<TSchema>,
): z.infer<TSchema>
export function useFormValues<TValues = Record<string, unknown>>(): TValues
export function useFormValues(form?: unknown): unknown {
  const control = useResolvedControl(form, '<all values>')
  return useWatch({ control })
}
