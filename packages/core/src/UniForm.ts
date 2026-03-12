import type * as z from 'zod/v4/core'
import type {
  DeepKeys,
  DeepFieldValue,
  FormMethods,
  FieldDependencyResult,
} from './types'

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
     * Meta keys are stored and merged into the rendered field config.
     */
    setFieldMeta: <K extends DeepKeys<z.infer<TSchema>>>(
      field: K,
      meta: Partial<FieldDependencyResult>,
    ) => void
  }

type Handler<TSchema extends z.$ZodObject, TValue> = (
  value: TValue,
  ctx: UniFormContext<TSchema>,
) => void

type Condition<TSchema extends z.$ZodObject> = (
  values: z.infer<TSchema>,
) => boolean

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
  private readonly _conditions: Map<string, Condition<TSchema>>

  constructor(schema: TSchema) {
    this.schema = schema
    this._handlers = new Map()
    this._conditions = new Map()
  }

  /**
   * Attach a typed onChange handler for a specific field.
   * Multiple handlers on the same field are all called in registration order.
   * Returns `this` for fluent chaining.
   */
  onChange<K extends DeepKeys<z.infer<TSchema>>>(
    field: K,
    handler: Handler<TSchema, DeepFieldValue<z.infer<TSchema>, K>>,
  ): this {
    const list = this._handlers.get(field) ?? []
    this._handlers.set(field, [...list, handler as Handler<TSchema, unknown>])
    return this
  }

  /**
   * Attach a typed condition for a specific field.
   * The field is shown when the predicate returns `true`, hidden when `false`.
   * Composes with any `condition` set via the `fields` prop (UniForm takes precedence).
   * Returns `this` for fluent chaining.
   */
  condition<K extends DeepKeys<z.infer<TSchema>>>(
    field: K,
    predicate: Condition<TSchema>,
  ): this {
    this._conditions.set(field, predicate)
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

  /** @internal Returns a copy of the conditions map for AutoForm to inject into field meta. */
  _getConditions(): Map<string, Condition<TSchema>> {
    return new Map(this._conditions)
  }
}

/**
 * Creates a new `UniForm` instance for the given Zod object schema.
 */
export function createForm<TSchema extends z.$ZodObject>(
  schema: TSchema,
): UniForm<TSchema>

/**
 * Creates a `UniForm` directly from a `z.discriminatedUnion` schema.
 *
 * `AutoForm` automatically flattens the variant fields and attaches show/hide
 * conditions based on the discriminator value — no manual `.condition()` calls
 * needed. The union schema is used by `zodResolver` for strict per-variant
 * validation on submit.
 *
 * @example
 * const notificationForm = createForm(
 *   z.discriminatedUnion('channel', [
 *     z.object({ channel: z.literal('email'), email: z.string().email() }),
 *     z.object({ channel: z.literal('sms'), phone: z.string() }),
 *   ])
 * )
 */
export function createForm(
  schema: z.$ZodDiscriminatedUnion,
): UniForm<z.$ZodObject>

export function createForm(
  schema: z.$ZodObject | z.$ZodDiscriminatedUnion,
): UniForm<z.$ZodObject> {
  return new UniForm(schema as unknown as z.$ZodObject)
}
