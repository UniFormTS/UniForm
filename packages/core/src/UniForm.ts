import type * as z from 'zod/v4/core'
import type {
  DeepKeys,
  DeepKeysIndexed,
  DeepFieldValue,
  ConditionValues,
  FormMethods,
  FieldDependencyResult,
  FieldRequirement,
} from './types'
import {
  findCycle,
  resolvePropagationOrder,
  type DependencyArgs,
  type DependencyEdge,
} from './utils/dependencyGraph'

/**
 * Context passed to UniForm `setOnChange` handlers. Extends `FormMethods` with
 * `setFieldMeta`, which lets handlers dynamically override per-field UI
 * properties (hidden, disabled, options, label, etc.).
 *
 * @template TSchema - The Zod object schema that defines the form shape.
 */
export type UniFormContext<TSchema extends z.$ZodObject = z.$ZodObject> =
  FormMethods<z.infer<TSchema>> & {
    /**
     * Dynamically override per-field UI metadata from inside a setOnChange handler.
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
) => void | Promise<void>

type Condition = (values: unknown) => boolean

type Requirement = (values: unknown, allValues: unknown) => boolean

/**
 * Declares that `field` derives from one or more other fields.
 *
 * @template TSchema - The Zod object schema that defines the form shape.
 */
export type DependencyConfig<TSchema extends z.$ZodObject> = {
  /** The field(s) whose change should re-resolve this one. */
  dependsOn: DeepKeys<z.infer<TSchema>> | readonly DeepKeys<z.infer<TSchema>>[]
  /** Called whenever any `dependsOn` field changes, directly or transitively. */
  resolve: (
    args: DependencyArgs<UniFormContext<TSchema>>,
  ) => void | Promise<void>
}

/**
 * A type-safe form definition that lives outside React components.
 * Wraps a Zod schema and lets you attach typed `setOnChange` callbacks that fire
 * whenever a specific field's value changes.
 *
 * Callbacks receive the new field value (typed to the schema) and a
 * `UniFormContext` that provides all standard form methods plus `setFieldMeta`
 * for dynamic field overrides.
 *
 * @template TSchema - The Zod object schema that defines the form shape.
 * @template TRegistered - Union of field keys that already have a `setOnChange`
 *   handler registered. Attempting to call `setOnChange` for a key in this set
 *   produces a compile-time error, preventing silent handler replacement.
 *
 * @example
 * const addressForm = new UniForm(addressSchema)
 *   .setOnChange('country', (value, ctx) => {
 *     ctx.setFieldMeta('state', { hidden: value !== 'US' })
 *   })
 *
 * // In component:
 * <AutoForm form={addressForm} onSubmit={handleSubmit} />
 */
export class UniForm<
  TSchema extends z.$ZodObject,
  TRegistered extends string = never,
> {
  readonly schema: TSchema
  private readonly _handlers: Map<string, Handler<TSchema, unknown>[]>
  private readonly _conditions: Map<string, Condition>
  private readonly _requirements: Map<string, Requirement>
  private readonly _dependencies: Map<
    string,
    DependencyEdge<UniFormContext<TSchema>>
  >
  private readonly _dependents: Map<string, Set<string>>

  constructor(schema: TSchema) {
    this.schema = schema
    this._handlers = new Map()
    this._conditions = new Map()
    this._requirements = new Map()
    this._dependencies = new Map()
    this._dependents = new Map()
  }

  /**
   * Set the typed onChange handler for a specific field.
   * Replaces any previously registered handler for that field — only one
   * handler per field is kept. This prevents accidental handler accumulation
   * when called inside a React render cycle.
   *
   * Supports both generic array paths (`"tasks.priority"` — fires for all rows)
   * and indexed paths (`"tasks.0.priority"` — fires only for row 0).
   *
   * Returns `this` for fluent chaining.
   */
  setOnChange<
    K extends Exclude<DeepKeysIndexed<z.infer<TSchema>>, TRegistered>,
  >(
    field: K,
    handler: Handler<TSchema, DeepFieldValue<z.infer<TSchema>, K>>,
  ): UniForm<TSchema, TRegistered | K> {
    this._handlers.set(field, [handler as Handler<TSchema, unknown>])
    return this as unknown as UniForm<TSchema, TRegistered | K>
  }

  /**
   * Add an onChange handler for a field **without** replacing existing ones.
   *
   * Handlers fire in registration order. Use this when composed modules each
   * attach behaviour to the same field — `setOnChange` would silently clobber
   * whichever registered first.
   *
   * Returns `this` for fluent chaining.
   *
   * @example
   * form.addOnChange('country', loadRegions)
   * form.addOnChange('country', trackAnalytics) // both fire, in this order
   */
  addOnChange<K extends DeepKeysIndexed<z.infer<TSchema>>>(
    field: K,
    handler: Handler<TSchema, DeepFieldValue<z.infer<TSchema>, K>>,
  ): this {
    const existing = this._handlers.get(field) ?? []
    this._handlers.set(field, [
      ...existing,
      handler as Handler<TSchema, unknown>,
    ])
    return this
  }

  /**
   * Attach a typed condition for a specific field.
   * The field is shown when the predicate returns `true`, hidden when `false`.
   * Composes with any `condition` set via the `fields` prop (UniForm takes precedence).
   * Returns `this` for fluent chaining.
   */
  setCondition<K extends DeepKeys<z.infer<TSchema>>>(
    field: K,
    predicate: (values: ConditionValues<z.infer<TSchema>, K>) => boolean,
  ): this {
    this._conditions.set(field, predicate as Condition)
    return this
  }

  /**
   * Decide at runtime whether a field is required, based on the current values.
   *
   * The predicate drives the asterisk, `aria-required`, **and** submit
   * validation — an empty value at a field the predicate marks required blocks
   * submission with the configured required message. Mark the field
   * `.optional()` in the schema and put the real rule here, so there is one
   * rule rather than two that can drift.
   *
   * Array-item paths receive the **row** as the first argument (so row-local
   * rules read naturally); everything else receives the full values. The second
   * argument is always the full values.
   *
   * Empty means `undefined`, `null`, `''` or `[]`. `false` and `0` are values.
   *
   * Returns `this` for fluent chaining.
   *
   * @example
   * requisitionForm.setRequired('sectors.orderReason', (row, values) =>
   *   isReasonRequired(values.action, row.sector),
   * )
   */
  setRequired<K extends DeepKeys<z.infer<TSchema>>>(
    field: K,
    predicate: FieldRequirement<
      ConditionValues<z.infer<TSchema>, K>,
      z.infer<TSchema>
    >,
  ): this {
    this._requirements.set(field, predicate as Requirement)
    return this
  }

  /**
   * Declare that a field derives from one or more others.
   *
   * When any `dependsOn` field changes — from a UI edit **or** a programmatic
   * `setValue` — `resolve` runs, and so does every dependency downstream of
   * *this* field, transitively and in dependency order. Express the cascade
   * once; UniForm walks the closure.
   *
   * Cycles are rejected here, at registration time, with the offending path —
   * not discovered as a runtime loop.
   *
   * Returns `this` for fluent chaining.
   *
   * @example
   * // country -> region -> city, each resetting and refetching the next
   * form
   *   .setDependency('region', {
   *     dependsOn: 'country',
   *     resolve: async ({ ctx }) => {
   *       ctx.setValue('region', '')
   *       ctx.setFieldMeta('region', { options: await loadRegions() })
   *     },
   *   })
   *   .setDependency('city', {
   *     dependsOn: 'region',
   *     resolve: ({ ctx }) => ctx.setValue('city', ''),
   *   })
   */
  setDependency<K extends DeepKeys<z.infer<TSchema>>>(
    field: K,
    config: DependencyConfig<TSchema>,
  ): this {
    const dependsOn = (
      Array.isArray(config.dependsOn) ? config.dependsOn : [config.dependsOn]
    ) as string[]

    const previous = this._dependencies.get(field)
    if (previous) {
      for (const upstream of previous.dependsOn) {
        this._dependents.get(upstream)?.delete(field)
      }
    }

    this._dependencies.set(field, {
      dependsOn,
      resolve: config.resolve,
    })
    for (const upstream of dependsOn) {
      const set = this._dependents.get(upstream) ?? new Set<string>()
      set.add(field)
      this._dependents.set(upstream, set)
    }

    const cycle = findCycle(this._dependents, field)
    if (cycle) {
      // Roll back so the instance stays usable after the throw.
      this._dependencies.delete(field)
      if (previous) this._dependencies.set(field, previous)
      for (const upstream of dependsOn) {
        this._dependents.get(upstream)?.delete(field)
      }
      for (const upstream of previous?.dependsOn ?? []) {
        const set = this._dependents.get(upstream) ?? new Set<string>()
        set.add(field)
        this._dependents.set(upstream, set)
      }
      throw new Error(
        `[UniForm] setDependency("${field}") would create a dependency cycle: ` +
          `${cycle.join(' → ')}. Break the loop before registering.`,
      )
    }

    return this
  }

  /**
   * Register several dependencies at once. Equivalent to calling
   * {@link setDependency} for each entry, and rejects cycles the same way.
   *
   * @example
   * form.setDependencies({
   *   region: { dependsOn: 'country', resolve: resetRegion },
   *   city: { dependsOn: 'region', resolve: resetCity },
   * })
   */
  setDependencies(
    graph: Partial<
      Record<DeepKeys<z.infer<TSchema>>, DependencyConfig<TSchema>>
    >,
  ): this {
    for (const [field, config] of Object.entries(graph)) {
      if (config)
        this.setDependency(
          field as DeepKeys<z.infer<TSchema>>,
          config as DependencyConfig<TSchema>,
        )
    }
    return this
  }

  /** @internal Called by AutoForm to fire the handler registered for a field. */
  _fireHandler(
    field: string,
    value: unknown,
    ctx: UniFormContext<TSchema>,
  ): void | Promise<void> {
    const handlers = this._handlers.get(field)
    if (!handlers?.length) return
    for (const handler of handlers) void handler(value, ctx)
  }

  /** @internal Returns all field names that have registered onChange handlers. */
  _getWatchedFields(): string[] {
    return Array.from(this._handlers.keys())
  }

  /** @internal Returns a copy of the conditions map for AutoForm to inject into field meta. */
  _getConditions(): Map<string, Condition> {
    return new Map(this._conditions)
  }

  /** @internal Returns a copy of the requiredness predicates. */
  _getRequirements(): Map<string, Requirement> {
    return new Map(this._requirements)
  }

  /** @internal Fields downstream of `source`, transitively, in dependency order. */
  _getPropagationOrder(source: string): string[] {
    if (!this._dependencies.size) return []
    return resolvePropagationOrder(
      this._dependents,
      this._dependencies as Map<string, DependencyEdge<unknown>>,
      source,
    )
  }

  /** @internal Runs the resolver registered for `field`. */
  _resolveDependency(
    field: string,
    args: DependencyArgs<UniFormContext<TSchema>>,
  ): void | Promise<void> {
    return this._dependencies.get(field)?.resolve(args)
  }

  /** @internal Whether any dependency has been registered. */
  _hasDependencies(): boolean {
    return this._dependencies.size > 0
  }

  /** @internal Every field that something else depends on. */
  _getDependencySources(): string[] {
    return Array.from(this._dependents.keys())
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
