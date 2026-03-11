import type * as z from 'zod/v4/core'
import type { FormMethods, FieldDependencyResult } from './types'

/**
 * Context passed to UniForm `onChange` handlers. Extends `FormMethods` with
 * `setFieldMeta`, which lets handlers dynamically override per-field UI
 * properties (hidden, disabled, options, label, etc.).
 *
 * @template TSchema - The Zod object schema that defines the form shape.
 */
export type UniFormContext<TSchema extends z.$ZodObject = z.$ZodObject> =
  FormMethods<z.infer<TSchema>> & {
    /**
     * Dynamically override per-field UI metadata from inside an onChange handler.
     * Changes are applied synchronously and trigger a re-render.
     *
     * - Meta keys (`hidden`, `disabled`, `options`, `label`, `placeholder`,
     *   `description`) are stored and merged into the rendered field config.
     * - The `value` key immediately calls `setValue` on the form field —
     *   use it to programmatically reset or derive a field's value.
     */
    setFieldMeta: (field: string, meta: Partial<FieldDependencyResult>) => void
  }

type Handler<TSchema extends z.$ZodObject, TValue> = (
  value: TValue,
  ctx: UniFormContext<TSchema>,
) => void

/**
 * A type-safe form definition that lives outside React components.
 * Wraps a Zod schema and lets you attach typed `onChange` callbacks that fire
 * whenever a specific field's value changes.
 *
 * Callbacks receive the new field value (typed to the schema) and a
 * `UniFormContext` that provides all standard form methods plus `setFieldMeta`
 * for dynamic field overrides.
 *
 * @template TSchema - The Zod object schema that defines the form shape.
 *
 * @example
 * const addressForm = new UniForm(addressSchema)
 *   .onChange('country', (value, ctx) => {
 *     ctx.setFieldMeta('state', { hidden: value !== 'US' })
 *   })
 *
 * // In component:
 * <AutoForm form={addressForm} onSubmit={handleSubmit} />
 */
export class UniForm<TSchema extends z.$ZodObject> {
  readonly schema: TSchema
  private readonly _handlers: Map<string, Array<Handler<TSchema, unknown>>>

  constructor(schema: TSchema) {
    this.schema = schema
    this._handlers = new Map()
  }

  /**
   * Attach a typed onChange handler for a specific field.
   * Multiple handlers on the same field are all called in registration order.
   * Returns `this` for fluent chaining.
   */
  onChange<K extends keyof z.infer<TSchema> & string>(
    field: K,
    handler: Handler<TSchema, z.infer<TSchema>[K]>,
  ): this {
    const list = this._handlers.get(field) ?? []
    this._handlers.set(field, [...list, handler as Handler<TSchema, unknown>])
    return this
  }

  /** @internal Called by AutoForm to fire all handlers registered for a field. */
  _fireHandlers(
    field: string,
    value: unknown,
    ctx: UniFormContext<TSchema>,
  ): void {
    for (const h of this._handlers.get(field) ?? []) {
      h(value, ctx)
    }
  }

  /** @internal Returns all field names that have registered onChange handlers. */
  _getWatchedFields(): string[] {
    return Array.from(this._handlers.keys())
  }
}
