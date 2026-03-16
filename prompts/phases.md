# UniForm Library — Phases

## Phase 1 — Foundation

- [ ] Set up monorepo (library + docs/playground app)
- [ ] Configure TypeScript, ESLint, bundler (tsup or rollup)
- [ ] Define core types (`FieldConfig`, `FieldProps`, `ComponentRegistry`, `AutoFormProps`)
- [ ] Write the schema introspection layer (Zod `_def` walker)
  - [ ] Scalars: `string`, `number`, `boolean`, `date`
  - [ ] `ZodEnum` and `ZodNativeEnum` → select
  - [ ] `ZodObject` → nested object
  - [ ] `ZodArray` → repeatable section
  - [ ] `ZodOptional`, `ZodNullable`, `ZodDefault` unwrapping
  - [ ] `ZodUnion` and `ZodDiscriminatedUnion`
  - [ ] `.meta()` extraction
- [ ] Unit test the introspection layer thoroughly

## Phase 2 — Rendering Engine

- [ ] Build the `FieldRenderer` switch component
- [ ] Implement `ScalarField` with RHF `Controller`
- [ ] Implement `ObjectField` (recursive, namespaced names)
- [ ] Implement `ArrayField` with `useFieldArray` (add/remove rows)
- [ ] Wire up `zodResolver` for validation
- [ ] Build the component registry + lookup chain (meta → field override → form registry → global → default)
- [ ] Build bare-minimum default field components (unstyled HTML inputs)

## Phase 3 — Layout & Styling Hooks

- [ ] Implement `fieldWrapper` render prop
- [ ] Implement `layout` slot props (`formWrapper`, `sectionWrapper`, `submitButton`)
- [ ] Implement `classNames` prop
- [ ] Implement section grouping from `.meta({ section })`
- [ ] Implement field ordering from `.meta({ order })`
- [ ] Implement `hidden` fields and conditional fields (`condition` function + `useWatch`)

## Phase 4 — Customization & DX

- [ ] Build `createAutoForm()` factory for global config
- [ ] Implement per-field overrides via `fields` prop
- [ ] Ensure `onSubmit` is fully typed to the schema's inferred type
- [ ] Add coercion handling (string → number, string → date, etc.)
- [ ] Add support for custom validation messages from Zod

## Phase 5 — Polish & Release

- [ ] Write integration tests (render → fill → submit flow)
- [ ] Build a playground app with real examples
- [ ] Write documentation (API reference + recipes)
- [ ] Set up CI/CD and npm publishing
- [ ] Write a README with quick-start guide

## Phase 6 — Advanced Form Control

- [ ] Programmatic control via ref (`useImperativeHandle`)
  - [ ] Expose `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `clearErrors()`, `focus(fieldName)`
  - [ ] Forward ref from `AutoForm` using `React.forwardRef`
  - [ ] Define `AutoFormHandle` type for the public ref API
  - [ ] Support both `AutoForm` and `createAutoForm` factory
- [ ] Form state persistence
  - [ ] `persistKey` prop — auto-save form values to `localStorage` on change
  - [ ] Restore saved values on mount (merge with `defaultValues`)
  - [ ] `persistDebounce` prop — debounce interval for writes (default 300ms)
  - [ ] `persistStorage` prop — pluggable storage adapter (defaults to `localStorage`)
  - [ ] Clear persisted data on successful submit
- [ ] Array field enhancements
  - [ ] Reorder rows via `move(from, to)` — expose up/down buttons in default UI
  - [ ] Duplicate row via `insert(index, value)`
  - [ ] `minItems` / `maxItems` constraints from Zod `.min()` / `.max()` on arrays
  - [ ] Disable "Add" when at `maxItems`, disable "Remove" when at `minItems`
  - [ ] Collapsible array rows with summary text
  - [ ] Opt-in array features via meta flags (`movable`, `duplicable`, `collapsible`)
  - [ ] Array button `classNames` (`arrayAdd`, `arrayRemove`, `arrayMove`, `arrayDuplicate`, `arrayCollapse`)
  - [ ] Custom array row layout via `layout.arrayRowLayout` — full control over button placement within each row
- [ ] Field dependencies
  - [ ] `meta.depend` — reactive per-field override of `options`, `hidden`, `disabled`, `label`, `placeholder`, `description`
  - [ ] `FieldDependencyResult` type exported publicly
  - [ ] `useFieldDependencies` hook exported publicly
  - [ ] `onValuesChange` prop — fires on every value change for imperative value cascade
  - [ ] Country → state cascade pattern documented in README

## Phase 7 — Per-field Custom Components

- [ ] Extend `FieldMeta.component` to accept a direct `React.ComponentType` in addition to a string key
  - [ ] Type: `component?: string | React.ComponentType<any>` (avoids circular `FieldProps → FieldMeta` reference)
  - [ ] Documented in JSDoc on the type
- [ ] Update `resolveComponent.ts` — 5-step resolution chain
  - [ ] Step 1 (new): `meta.component` is a function → return it directly, bypassing registry
  - [ ] Step 2: `meta.component` is a string key → look up in merged registry
  - [ ] Step 3: field type key in merged registry
  - [ ] Step 4: field type key in default registry
  - [ ] Step 5: warn + return null
- [ ] Update `FieldRenderer.tsx` — bypass `ArrayField`/`ObjectField` routing when `meta.component` is a direct function
  - [ ] When `typeof field.meta.component === 'function'`, skip the `array`/`object` early-return guards
  - [ ] Field falls through to `ScalarField`, which calls `resolveComponent` → direct component
  - [ ] Enables custom components (e.g. multi-select, tag picker) to fully own an `array`-typed field's value
- [ ] Tests 105–107
  - [ ] 105: direct component via Zod schema `.meta({ component: MyComp })`
  - [ ] 106: direct component via `fields` prop override
  - [ ] 107: direct component takes priority over type-keyed registry component
- [ ] Playground Example 16 — two sub-examples side by side
  - [ ] Sub-example A: `MultiAutocomplete` chip tag picker on `z.array(z.string()).min(1)` + `StarRating` — both passed directly as `meta.component`; `ArrayField` row UI completely bypassed
  - [ ] Sub-example B: `ColorPicker` registered in `createAutoForm` factory under `'colorpicker'` key, referenced by string
- [ ] README — updated `FieldMeta.component` type docs, features bullet, and "Per-field Custom Components" recipe with both approaches, resolution priority, and array-field bypass pattern

## Phase 8 — Typed `depend` Values & i18n Label Strings

- [ ] Typed `depend` in `fields` prop
  - [ ] Add `FieldOverride<TValues>` type: `Omit<Partial<FieldMeta>, 'depend'> & { depend?: (values: TValues) => FieldDependencyResult }`
  - [ ] Update `AutoFormProps.fields` to `Record<string, FieldOverride<z.infer<TSchema>>>`
  - [ ] Internal cast in `AutoForm.tsx` when calling `applyFieldOverrides` (no runtime change)
  - [ ] Export `FieldOverride` from `index.ts`
  - [ ] `FieldMetaBase.depend` unchanged (`Record<string, unknown>`)
- [ ] `FormLabels` type and `labels` prop
  - [ ] Add `FormLabels` type with keys: `submit`, `arrayAdd`, `arrayRemove`, `arrayMoveUp`, `arrayMoveDown`, `arrayDuplicate`, `arrayCollapse`, `arrayExpand`
  - [ ] Add `labels?: FormLabels` to `AutoFormProps`
  - [ ] Add `labels?: FormLabels` to `AutoFormConfig`
  - [ ] Add `labels: FormLabels` to `AutoFormContextValue`
  - [ ] Thread `labels` through `AutoForm.tsx` into context
  - [ ] Factory merging in `createAutoForm.tsx` (factory labels + prop labels merge, prop wins)
  - [ ] `DefaultSubmitButton` reads `labels.submit ?? 'Submit'` from context
  - [ ] `ArrayField` reads all array label keys from context with string fallbacks
  - [ ] Export `FormLabels` from `index.ts`
- [ ] Tests 108–115
  - [ ] 108: `fields.depend` callback is called and returns correct override at runtime
  - [ ] 109: `labels.submit` changes submit button text
  - [ ] 110: `labels.arrayAdd` changes array add button text
  - [ ] 111: `labels.arrayRemove` changes array remove button text
  - [ ] 112: `labels.arrayMoveUp` / `labels.arrayMoveDown` change move button texts
  - [ ] 113: `labels.arrayDuplicate` changes duplicate button text
  - [ ] 114: `labels.arrayCollapse` / `labels.arrayExpand` change collapse/expand toggle texts
  - [ ] 115: factory-level labels are overridden by per-instance `labels` prop
- [ ] Playground Example 17 — three sub-examples
  - [ ] Sub-example A: typed `depend` in `fields` prop — `role` enum controls `permissions` field visibility with full type safety on `values.role`
  - [ ] Sub-example B: Spanish-language form — all button/submit labels passed via `labels` prop
  - [ ] Sub-example C: factory-level labels overridden by per-instance prop
- [ ] README — "Customizing UI Text (i18n)" recipe, `labels` prop in API table, typed `depend` note under `meta.depend`
