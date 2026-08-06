---
description: 'Implement the API additions and bug fixes that close the gaps reported by two production adopters of @uniform-ts/core (REVIEW-1.md, REVIEW-2.md). Use when the user wants to act on the production feedback, add headless/escape-hatch APIs, fix useArrayField, support primitive arrays, or add runtime requiredness.'
name: 'Close UniForm Adoption Gaps'
argument-hint: 'Optionally name a phase (1–5) or a single work item (W1–W14) to scope the run'
agent: 'agent'
---

Implement the fixes and API additions that close every gap reported by two teams running `@uniform-ts/core@0.1.3` in production. Both reports are in this repo:

- [REVIEW-1.md](../../REVIEW-1.md) — the Flow team (Hebrew/RTL ERP). 11 numbered problems (P1–P11) plus two cross-cutting notes. This team is **actively removing the library**; their report is the harder constraint.
- [REVIEW-2.md](../../REVIEW-2.md) — a backend-driven process-forms app. 5 numbered gaps (R1–R5), mostly overlapping but adding option identity and dependency-graph concerns.

The two reports share one root cause: **UniForm only supports "AutoForm renders everything." There is no supported middle ground between that and "render it all yourself."** Every work item below either widens that middle ground or removes a reason to leave it.

If `$ARGUMENTS` names a phase or work item, implement only that scope and skip the rest.

## Execution model

**Implement one phase per run.** All 14 items in a single pass will exhaust context and produce shallow work. If `$ARGUMENTS` is empty, implement **Phase 1 only**, then stop and report which phase is next — do not continue into Phase 2.

At the start of a run, create a todo list with one entry per work item in scope, plus one entry per sub-step of the per-item workflow (implement / test / docs). Mark each complete as you go.

**Verify claims against this repo before acting on them.** Both reviews describe `@uniform-ts/core@0.1.3` against their own dependency versions; this repo pins different ones (e.g. the lockfile has **react-hook-form 7.71.2**, while REVIEW-1 tested 7.83.0). Treat every review-supplied root cause as a hypothesis: reproduce it with a failing test first, and if the described mechanism does not match what you observe, diagnose it fresh and record the corrected explanation for the closing summary. Do not implement a fix for a bug you have not reproduced.

## Ground rules

1. **Read before writing.** Read the source of truth listed under "Source of truth" first. If a file cannot be read, stop and say which one — do not infer API shapes.
2. **Additive and backwards compatible.** No breaking changes to `AutoForm`, `createForm`, `createAutoForm`, `FieldProps`, or the component registry. Existing playground examples and tests must keep passing untouched. If an item genuinely cannot be done additively, stop and propose the breaking change to the user before implementing it.
3. **Per-item workflow** (from [CLAUDE.md](../../CLAUDE.md)) — do all four for every item, before moving to the next:
   1. Implement in `packages/core/src/`.
   2. Add tests in the relevant test file; run `pnpm test` and confirm the whole suite passes.
   3. Update the affected guide(s) in `docs/docs/guides/` and/or `docs/docs/api/`.
   4. Keep [README.md](../../README.md) and [packages/core/README.md](../../packages/core/README.md) **byte-identical**.
4. **New public API must be exported** from [packages/core/src/index.ts](../../packages/core/src/index.ts) with a JSDoc block and at least one `@example`.
5. **Every regression fix gets a regression test** that fails against the current code. Write the failing test first.
6. **Add a playground example** in `apps/playground/src/examples/` for each new user-facing API (W1–W9), so the pattern is verified against the real build.
7. **No dead ends.** If a work item's proposed API in the review conflicts with the actual architecture, implement the _intent_ with a design that fits, and record the deviation for the closing summary.

## Source of truth

Read all of these before starting:

- [packages/core/src/UniForm.ts](../../packages/core/src/UniForm.ts) — `UniForm`, `createForm`, `setOnChange`, `setCondition`, `UniFormContext`.
- [packages/core/src/components/AutoForm.tsx](../../packages/core/src/components/AutoForm.tsx) — form construction, `formMethods`, `setFieldMeta`, `dynamicMeta`, context assembly.
- [packages/core/src/context/AutoFormContext.tsx](../../packages/core/src/context/AutoFormContext.tsx) — `AutoFormContextValue`, `useAutoFormContext`.
- [packages/core/src/hooks/useArrayField.ts](../../packages/core/src/hooks/useArrayField.ts) — the P1 bug.
- [packages/core/src/components/fields/ArrayField.tsx](../../packages/core/src/components/fields/ArrayField.tsx) — the internal `useFieldArray` owner.
- [packages/core/src/components/FieldRenderer.tsx](../../packages/core/src/components/FieldRenderer.tsx) — name resolution and error lookup.
- [packages/core/src/introspection/introspect.ts](../../packages/core/src/introspection/introspect.ts) — `itemConfig` construction for arrays.
- [packages/core/src/types/field.ts](../../packages/core/src/types/field.ts) — `FieldProps`, `FieldConfig`, `FieldMeta`, `FieldDependencyResult`.
- [packages/core/src/types/form.ts](../../packages/core/src/types/form.ts) — `FormMethods`, `AutoFormProps`, `PersistStorage`.
- [packages/core/src/types/utils.ts](../../packages/core/src/types/utils.ts) — `DeepKeys`, `DeepKeysIndexed`, `DeepFieldValue`, `ConditionValues`.
- [packages/core/src/hooks/useFormPersistence.ts](../../packages/core/src/hooks/useFormPersistence.ts) — the storage default.
- The guides in [docs/docs/guides](../../docs/docs/guides) and the API reference in [docs/docs/api](../../docs/docs/api).

## Phases

| Phase | Work items       | Theme                                    |
| ----- | ---------------- | ---------------------------------------- |
| 1     | W1, W2           | Broken behaviour — ship first            |
| 2     | W3, W4, W5       | The headless middle ground               |
| 3     | W6, W7           | Runtime requiredness and errors          |
| 4     | W8, W9, W10, W11 | Reactivity, writes, options, persistence |
| 5     | W12, W13, W14    | Docs, packaging, API-surface hygiene     |

---

# Phase 1 — Broken behaviour

## W1 · Fix `useArrayField` (REVIEW-1 P1) — blocker

**Problem.** `useArrayField(name)` mounts a _second_ `useFieldArray` on a name already owned by the internal `ArrayField`. In react-hook-form 7.83, `control._setFieldArray` emits on `_subjects.state` but not `_subjects.array`, so the two hooks never sync: `append()` mutates a detached copy and **no row renders**. An adopter shipped this as a P1 bug and deleted UniForm from that dialog.

**Evidence.** [packages/core/src/hooks/useArrayField.ts](../../packages/core/src/hooks/useArrayField.ts) calls `useFieldArray({ control, name: fieldName })`; [packages/core/src/components/fields/ArrayField.tsx](../../packages/core/src/components/fields/ArrayField.tsx) already calls `useFieldArray({ control, name: effectiveName })` for the same path.

**The existing tests confirm the blind spot the reviewer predicted.** The `describe('useArrayField')` block in [packages/core/src/components/AutoForm.test.tsx](../../packages/core/src/components/AutoForm.test.tsx) asserts only `rowCount` — a value read back from the hook's _own detached_ `useFieldArray` copy. It never asserts that a row appeared in the DOM, so it passes while the feature is broken. Extend this block rather than starting a new one, and make the DOM assertion the primary one.

Note the same block renders its harness inside `layout.formWrapper` — the structural inversion REVIEW-1 P3 complains about. Once W3 lands, rewrite it to mount the harness outside the form.

**What to add.**

- A registry of live array-field actions on the AutoForm context — e.g. `arrayFields: React.RefObject<Map<string, ArrayFieldActions>>` plus a register/unregister callback. `ArrayField` registers its own `append` / `remove` / `insert` / `move` / `swap` / `replace` / `fields` on mount, keyed by `effectiveName`, and unregisters on unmount.
- `useArrayField(name)` reads from that registry and returns the **live** actions. It must stay reactive to row count — subscribe via `useWatch`/`useFormState` on the array path rather than reading a stale snapshot.
- Fall back to a fresh `useFieldArray` only when no `ArrayField` is mounted for that path (an array rendered by a fully custom component, or `hidden`).
- Keep the existing return shape (`fields`, `append`, `remove`, `move`, `insert`, `rowCount`, `canAdd`, `atMin`) so no consumer breaks. `minItems`/`maxItems` continue to come from `findArrayConfig`.
- Emit a `console.warn` in dev when `useArrayField` is called with a name that is neither a mounted `ArrayField` nor an array in `fieldConfigs` — the silent no-op is what cost the adopter an afternoon.

**Acceptance criteria.**

- A regression test that mounts `<AutoForm>` with a rendered array **and** an external `useArrayField('items')` button, clicks the button, and asserts a new row appears in the DOM. This test must fail before the fix.
- The mirrored test for `remove`, `move`, and `insert` from outside.
- A test for the fallback path: `useArrayField` on an array whose field is `hidden` still appends to the RHF store.
- A test for the dev warning on an unknown path.
- The array docs stop recommending the broken path: update [docs/docs/guides/arrays.md](../../docs/docs/guides/arrays.md) and the [useArrayField API page](../../docs/docs/api/use-array-field.md).

## W2 · Render arrays of primitives (REVIEW-1 P6, REVIEW-2 R2)

**Problem.** `z.array(z.string())` is not rendered as repeating rows; the docs tell users to model tags/emails/serials/SKUs as `z.array(z.object({ value: z.string() }))`. That distorts the storage shape to satisfy the render layer, and forces mapping at the payload boundary. Both teams hit it independently; one dropped to `useState`, the other built custom scalar-array selects outside the array machinery.

**Evidence.** `introspectSchema` **already** produces a scalar `itemConfig` for primitive arrays ([packages/core/src/introspection/introspect.ts](../../packages/core/src/introspection/introspect.ts) — confirmed by `introspect.test.ts` "produces type array with correct scalar itemConfig"). The gap is in rendering: `ArrayField` branches on `isObjectItems`, and `FieldRenderer.getEffectiveName` must resolve a nameless scalar item to the bare `items.0` path.

**What to add.**

- `ArrayField` renders a scalar `itemConfig` as one registered input per row at path `${effectiveName}.${index}`, resolved through the registry by the item's `FieldType` exactly like any leaf (`string` → the registered `string` component, `select` → the registered `select` component with the enum's options).
- Item-level schema constraints are honoured (`.max()`, `.email()`, `.min()` etc. flow through `itemConfig.schema` / `required`), and `minItems` / `maxItems` on the array still gate add/remove.
- Row buttons work: add, remove, and `movable` reordering. `collapsible` and `duplicable` may stay object-only — if so, document that explicitly rather than failing silently.
- Per-row errors resolve at `items.0` and render through the field wrapper.
- `getDefaultValue` produces a sensible empty item for each scalar type when `append()` is called with no argument.
- Row labels: default to no per-row label for scalar rows (the array's own label carries it); allow an override via the array field's `meta`.

**Acceptance criteria.**

- Tests for `z.array(z.string())`, `z.array(z.number())`, and `z.array(z.enum([...]))`: rows render, typing updates the value at the right index, add/remove work, min/max gate the buttons, and a per-item validation failure shows on the right row.
- A test that `useArrayField` (post-W1) drives a primitive array from outside.
- Remove the "Array rows must be `z.object(...)`" limitation from [docs/docs/guides/arrays.md](../../docs/docs/guides/arrays.md) and replace it with the primitive-array section.
- A playground example covering a `string[]` tag list.

---

# Phase 2 — The headless middle ground

> This phase is the one that would have changed the Flow team's decision. Treat W3–W5 as a single coherent design: an app must be able to own the layout of a subtree while UniForm still owns registration, components, validation and errors for the leaves inside it.

## W3 · Headless container mode — external form instance (REVIEW-1 P3, cross-cutting note A)

**Problem.** `useAutoFormContext()` only works _inside_ `<AutoForm>`. To read the form from their page chrome, the adopter had to smuggle their entire application root — header, sidebar, dialogs, providers — _inside_ the form through `layout.formWrapper`, which is documented as a styling slot. Their whole opt-out block (`onSubmit={() => {}}`, `submitButton: null`, passthrough `fieldWrapper`, one field fully replaced) is a request for one thing: give me the state container, the registration and the resolver; I'll render everything.

**What to add.**

- `useUniForm(form, options)` — a hook that builds the RHF instance, the resolver, the introspected `fieldConfigs`, the registry and the persistence wiring, and returns a form object usable **above** `<AutoForm>`. Options mirror the relevant `AutoFormProps` (`defaultValues`, `components`, `fields`, `coercions`, `messages`, `persistKey`, `persistDebounce`, `persistStorage`, `labels`, `disabled`).
- `<AutoForm form={instance}>` accepts either a `UniForm` (today's behaviour, unchanged) **or** a `useUniForm` result. When given an instance, `AutoForm` must not create a second `useForm` — it renders into the provided one.

  **Design constraint — do not solve this with a conditional hook call.** [AutoForm.tsx](../../packages/core/src/components/AutoForm.tsx) calls `useForm` unconditionally at the top; branching on the prop type there violates the rules of hooks. Split the component instead: extract everything from `useForm` down through context assembly into `useUniForm`, extract the rendering half (sections, `FieldRenderer`, layout slots, submit) into an inner component that consumes the context, and make `AutoForm` a thin dispatcher that renders **one of two sibling components** — one that calls `useUniForm` then the renderer, one that renders the renderer directly. Each branch is its own component, so each hook call stays unconditional.

  Give the `useUniForm` result a brand (e.g. a non-enumerable symbol property) so the dispatcher's type guard is reliable and so `UniForm` instances and hook results are distinguishable at both compile time and runtime.

- `<UniFormProvider form={instance}>` — publishes the same context `AutoForm` publishes, so hooks work in any subtree with no `AutoForm` rendered at all. `<AutoForm>` internally renders this provider, so a nested `AutoForm` inside a provider is a no-op re-provide, not a second store.
- Every hook in this document (`useArrayField`, `useFormValue`, `useFieldError`, `useField`, `useAutoFormContext`) must work under `UniFormProvider` without `AutoForm`.

**Target usage** (from the review, adapt names to fit the codebase):

```tsx
const form = useUniForm(requisitionForm, { defaultValues })

<PageChrome form={form}>
  <AutoForm form={form} fields={{ sectors: { component: SectorsField } }} />
</PageChrome>
```

**Acceptance criteria.**

- Tests: hooks resolve under `UniFormProvider` with no `AutoForm`; `AutoForm` given a `useUniForm` result creates exactly one RHF store (assert values written from outside are visible inside and vice versa); submit, validation and persistence behave identically in both modes.
- A new guide `docs/docs/guides/headless.md`, linked from the sidebar, that presents this as the supported mode for bespoke forms — and explicitly states that hosting application chrome in `layout.formWrapper` is no longer necessary.
- A playground example that renders a page header and an external submit button outside `<AutoForm>` and drives the form from there.

## W4 · Typed access to form state (REVIEW-1 P2, P3)

**Problem.** `AutoFormContextValue` exposes `control: Control` and `formMethods: FormMethods` defaulting to `FieldValues` (`Record<string, any>`). The hook takes no type parameter and the context carries no schema generic, so recovering the schema's type requires `control as unknown as Control<RequisitionFormValues>` — a double cast, twice, described as "the single ugliest line in the feature." The adopter then imported `useWatch` and `Control` straight from `react-hook-form`, leaking the peer dependency into their app.

**What to add.**

- Make the context hook generic: `useAutoFormContext<TValues extends FieldValues = FieldValues>(): AutoFormContextValue<TValues>`, with `AutoFormContextValue<TValues>` threading the generic into `control`, `formMethods` and `errors`. Default type argument keeps every existing call site compiling.
- **Preferred, inference-based overload:** `useAutoFormContext(form)` where `form` is the `UniForm` instance or `useUniForm` result — real inference, no assertion at all. Ship both; document the inference form as the recommended one.
- `useFormValue(name)` — a typed, reactive read of one path, usable from any component in the tree:

  ```ts
  function useFormValue<TSchema, K extends DeepKeys<z.infer<TSchema>>>(
    name: K,
  ): DeepFieldValue<z.infer<TSchema>, K>
  ```

  Support the same inference-by-instance overload (`useFormValue(form, 'sectors')`). `DeepKeys` / `DeepFieldValue` already exist in [packages/core/src/types/utils.ts](../../packages/core/src/types/utils.ts) — this is exposure, not new type machinery. Index paths (`sectors.0.rows`) must work; extend with `DeepKeysIndexed` where needed.

- `useFormValues()` — typed reactive read of the whole values object, for the coarse case.
- Both hooks must be genuinely reactive (`useWatch` under the hood) and must not re-render on unrelated field changes.

**Acceptance criteria.**

- A type-level test (`expectTypeOf` / `assertType`) proving `useFormValue(form, 'sectors')` returns the schema-typed value with **zero** casts, and that an unknown path is a compile error.
- Runtime tests: the hook re-renders on change of the watched path and does not re-render on an unrelated path.
- Docs: a "reading form state" section in the new headless guide, plus API pages for `useFormValue` / `useFormValues`, and an update to [docs/docs/api/use-auto-form-context.md](../../docs/docs/api/use-auto-form-context.md) for the generic and the instance overload.
- Zero `as unknown as` casts required in the playground example that consumes these hooks.

## W5 · Renderable subtrees — the escape hatch (REVIEW-1 P4)

**Problem.** `FieldProps<Value>` is right for a leaf and insufficient for a container. A custom component that replaces an array field receives one opaque value: no way to render a child through UniForm, no per-path write (so every keystroke rebuilds the whole array and pushes one giant value change), no per-row validation state. The moment one field needs bespoke UI, _everything below it leaves the library_.

**What to add.**

- `<Field name="sectors.0.orderReason" />` — a component that renders a single leaf at an absolute path using the form's registry, resolved `FieldConfig`, wrapper and error, exactly as `AutoForm` would. Accepts optional per-instance overrides (`component`, `label`, `disabled`, `className`) that merge over the introspected config.
- `useField(path)` — returns the fully-resolved `FieldProps` for a leaf (value, onChange, onBlur, ref, label, error, required, disabled, options, meta, schema), so an app can wire its own input with UniForm's registration and validation intact. This is the primitive behind `<Field>`.
- Relative-path resolution: inside a custom component rendered for `sectors`, `<Field name="0.orderReason" />` resolves against the owning path. Provide the current path via context (e.g. a `FieldPathProvider` that `ArrayField` and `ObjectField` already have the information to publish), and expose `useFieldPath()` for components that need it explicitly.
- Extend the props given to **container** components — a `FieldProps` superset for `object` / `array` fields carrying: `path`, `itemConfig` / `children` configs, `rowCount`, per-row array actions, and a `setPath(subPath, value, options?)` writer that performs a targeted RHF write instead of replacing the whole container value.
- Document `FieldConfig` construction as _not_ the public path; `<Field>` / `useField` are.

**Acceptance criteria.**

- A test that mounts a custom component for an array field which renders its own layout but delegates each cell to a relative `<Field>` (e.g. `name` of `0.qty`), and asserts: the leaf registers with RHF, validation errors appear on it, the registered component from `components` is used, and typing writes only that path (assert the sibling rows' objects are referentially untouched).
- A test that `useField` outside any `AutoForm` but inside `UniFormProvider` works.
- A new guide section (in `docs/docs/guides/custom-components.md` plus the headless guide) titled around "own the layout, keep the plumbing," with the array-subtree example.
- A playground example: a custom table layout for an array field whose cells are `<Field>`s.

---

# Phase 3 — Requiredness and errors

## W6 · Runtime requiredness (REVIEW-1 P11, REVIEW-2 R1)

**Problem.** UniForm's model is "the schema is static, the form is derived from it": `required` is a boolean read off the schema, and `condition` (visibility) is the only runtime lever. Both teams need requiredness to be a **function of current values** — one from a `(action × sector × orderReason)` lookup matrix, one from backend "REQUIRE" conditions. Both were forced to mark every field `.optional()` in Zod and re-implement all real validation in a top-level `superRefine`, with **no way to reflect required state in the UI** (no asterisk, no `aria-required`). `FieldDependencyResult` has `options`/`hidden`/`disabled`/`label`/`placeholder`/`description` — but no `required`.

**What to add.**

- `required?: boolean` on `FieldDependencyResult` ([packages/core/src/types/field.ts](../../packages/core/src/types/field.ts)), applied through `applyDynamicMeta` so `ctx.setFieldMeta(field, { required: true })` flips `FieldProps.required` live.
- `UniForm.setRequired(path, predicate)` — the declarative form, mirroring `setCondition`:

  ```ts
  requisitionForm.setRequired('sectors.orderReason', (row, values) =>
    isRequired(values.action, row.sector, row.orderReason),
  )
  ```

  Typed with `DeepKeys` and the same `ConditionValues` convention `setCondition` uses (array-item paths receive the row; everything else receives the full values), plus the full values as a second argument for row-local predicates that need cross-form context.

- **The predicate must drive validation, not just the asterisk.** Compose a resolver: wrap the `zodResolver(schema)` currently passed to `useForm` in [AutoForm.tsx](../../packages/core/src/components/AutoForm.tsx) with one that awaits the Zod result, then evaluates the registered required predicates against the current values and merges an error into `errors` at each path whose predicate is `true` and whose value is empty. Use the `messages.required` override / configured locale for the message, and preserve any error Zod already reported at that path rather than overwriting it. This is the entire point — an asterisk that doesn't block submit re-creates the duplicate-rules problem in W7.
- Empty-value semantics must be explicit and documented: `undefined`, `null`, `''`, and `[]` count as empty; `false` and `0` do not.
- `required` also drives `aria-required` on the default components and the asterisk in `DefaultFieldWrapper`.

**Acceptance criteria.**

- Tests: predicate flips the asterisk live as sibling values change; submit is blocked with the right message when a dynamically-required field is empty; submit passes when the predicate is false; the predicate works for array-row paths and fires per-row.
- A test that `setFieldMeta(field, { required })` and `setRequired` compose (last write wins, documented).
- New section in [docs/docs/guides/conditional-fields.md](../../docs/docs/guides/conditional-fields.md) or a new `dynamic-requiredness` guide, stating plainly that `.optional()` in the schema + `setRequired` is the supported pattern for runtime-decided requiredness.
- A playground example driven by a lookup matrix.

## W7 · Error tree access (REVIEW-1 P5, REVIEW-2 R5)

**Problem.** Cross-field rules live in `superRefine` with paths like `['sectors', index]`. There is nowhere to render them: `FieldProps.error` is a single string on a leaf, an issue at `sectors.0` targets an array element with no UniForm-rendered wrapper, and `ValidationMessages` maps field → message _text_, not field → display _location_. The adopter now validates twice — once in `superRefine` for submit, once in plain functions for display — and the two can drift. The second team removed `setErrors`/`AutoFormHandle` entirely because backend issues aren't shaped like flat field-name-keyed errors.

**What to add.**

- Expose the resolved error tree on the context: `errors` (RHF `formState.errors`), typed to the schema under W4.
- `useFieldError(path)` — returns the error message at any path, **including non-leaf paths** (`sectors`, `sectors.0`) and the form root (`''` or a `ROOT` sentinel). Must be reactive and must not require the path to be a rendered field.
- `useFieldErrors(path)` — all errors at or beneath a path, as `Array<{ path, message, code }>`, so a container component can render a summary for its subtree.
- Root-level and cross-entity issues: accept `superRefine` issues whose path is empty, and let `formMethods.setIssues(issues)` push an array of `{ path, message }` — including paths that are not fields — into the same tree, so backend `/validate` responses can be anchored anywhere. Keep the existing `setError`/`setErrors` working.
- A `<FormErrorSummary>` (or documented recipe) that lists unanchored/root errors, since by definition they have no field to render on.

**Acceptance criteria.**

- A test with a `superRefine` issuing at `['sectors', 0]`: `useFieldError('sectors.0')` returns the message and it survives re-validation.
- A test for a root-path issue and for `setIssues` with a non-field path.
- A test that `useFieldErrors('sectors.0')` collects nested leaf errors.
- Docs in [docs/docs/guides/validation.md](../../docs/docs/guides/validation.md): a "cross-field and array-index errors" section that replaces the current duplicate-the-rules workaround.

---

# Phase 4 — Reactivity, writes, options, persistence

## W8 · `setValue` options and batched `setValues` (REVIEW-1 P7)

**Problem.** `formMethods.setValue` hard-codes `{ shouldValidate: true, shouldDirty: true }` ([packages/core/src/components/AutoForm.tsx](../../packages/core/src/components/AutoForm.tsx)). For a container write on every keystroke that means a **full-schema Zod validation of the entire draft per keystroke**, including a `superRefine` that walks every row through a config matrix — measurable at ~20 rows, with no way to say "just write the value." `setValues` loops `setValue` per key: N validations for one logical update.

**What to add.**

- `setValue(name, value, options?)` accepting RHF's `SetValueConfig`, with the current values as defaults (so behaviour is unchanged when omitted).
- `setValues(values, options?)` performing **one** update — a single `reset({ ...getValues(), ...values }, { keepDirty, keepErrors, ... })` or an equivalent batched write — and validating at most once.
- Same signature change on `UniFormContext` so `setOnChange` handlers get it too, and on `AutoFormHandle`.

**Acceptance criteria.**

- A test counting resolver invocations: `setValue(name, v, { shouldValidate: false })` triggers zero validations; `setValues` with N keys triggers exactly one.
- A test that omitting `options` preserves today's `shouldValidate: true, shouldDirty: true`.
- Update [docs/docs/guides/programmatic-control.md](../../docs/docs/guides/programmatic-control.md) and the `FormMethods` API reference.

## W9 · Declarative dependency graph (REVIEW-2 R4)

**Problem.** `setOnChange` fires only from real UI `onChange`, **not from programmatic `setValue`**, and only one handler per field is kept. An app cascading resets across chained dependencies (A→B→C) must compute the transitive closure itself and walk it by hand — exactly what the second team built.

**What to add.**

- A declarative dependency API on `UniForm`, e.g. `setDependency(field, { dependsOn, resolve })` or `setDependencies(graph)`, where changing a field automatically propagates to its dependents **transitively**, with cycle detection that throws a clear error at registration time rather than looping at runtime.
- Programmatic writes participate: a `setValue` performed inside a handler (or from outside) triggers dependents, with a documented, bounded propagation model (single pass over the topologically-sorted closure per logical change; no unbounded re-entrancy).
- Allow **multiple** handlers per field — keep `setOnChange`'s replace-one semantics for backwards compatibility, and add an explicit additive registration (e.g. `addOnChange`) so composed modules stop silently clobbering each other.
- The resolver for a dependent receives the changed field's path and value plus the full context, so option-refetch and reset-to-empty cascades are expressible once.

**Acceptance criteria.**

- A test for an A→B→C chain: changing A resets/refetches both B and C, from a UI change **and** from a programmatic `setValue`.
- A test that a cycle is rejected at registration with a named-path error message.
- A test that two `addOnChange` handlers on the same field both fire, in registration order.
- New section in [docs/docs/guides/conditional-fields.md](../../docs/docs/guides/conditional-fields.md) (or a `dependencies` guide) with the cascading-select example.

## W10 · Rich option identity (REVIEW-2 R3)

**Problem.** Select values are pushed toward string/number identity. Anything richer — the reporting app's composite `{col1, col2}` IDs — needs a hand-rolled key/equality layer built entirely outside the library, plus care not to conflate a derived key with the raw value.

**What to add.**

- Generic option values: `SelectOption<TValue = string | number>` with `value: TValue`, and a way to supply identity — `getOptionKey?: (option) => string` and/or `isOptionEqual?: (a, b) => boolean` — settable per field (via `meta`) and globally (via `createAutoForm` config).
- Default behaviour unchanged for scalar values; the default key function is `String(value)` for scalars and must **not** silently `String()` an object (fall back to a documented stable serialization, or require `getOptionKey` and throw a clear error naming the field when an object value has no key function).
- The registry's select components and `DefaultSelect` use the key for React keys and DOM `value`, and the raw value for `onChange` — never conflate the two.
- Works for the primitive-array selects from W2 and for multi-select values.

**Acceptance criteria.**

- Tests: a select whose options are objects round-trips the raw object through `onChange` and re-selects correctly on re-render; a duplicate key throws a clear dev error naming the field; scalar options behave exactly as before.
- Docs in [docs/docs/guides/custom-components.md](../../docs/docs/guides/custom-components.md) plus the `SelectOption` API entry.

## W11 · Persistence beyond a single `<AutoForm>` (REVIEW-2 R5)

**Problem.** `persistKey` assumes one form's lifetime and one storage. A multi-step flow spanning routes needs cross-route lifetime and **schema migrations**, so the team built a versioned persisted Zustand store instead and left `persistKey` unused.

**What to add.**

- `persistVersion` + `persistMigrate(persisted, fromVersion)` on the persistence options, so a stored draft from an older schema is migrated rather than silently discarded or half-restored. Corrupt/unmigratable data must be dropped with a dev warning — today [useFormPersistence.ts](../../packages/core/src/hooks/useFormPersistence.ts) swallows parse failures silently.
- Persistence usable from `useUniForm` (W3), so the draft's lifetime is the _instance's_, not a mounted `<AutoForm>`'s — this is what makes multi-step flows work.
- An async-capable `PersistStorage` (allow `Promise` returns) so IndexedDB / AsyncStorage adapters are first-class, with restoration gated behind the existing loading fallback.
- Expose `clearPersistedData` (and a `hasPersistedDraft` read) on the public form methods, not just internally.

**Acceptance criteria.**

- Tests: a stored draft at version 1 is migrated to version 2 on restore; an unmigratable draft is discarded with a warning and the form starts from defaults; an async storage adapter restores correctly.
- A multi-step example or documented recipe in [docs/docs/guides/persistence.md](../../docs/docs/guides/persistence.md).

---

# Phase 5 — Docs, packaging, API hygiene

## W12 · Document and stratify `useAutoFormContext` (REVIEW-1 P8)

**Problem.** It is the load-bearing API for any non-trivial integration and the adopter found it by reading `dist/index.d.ts`. It _is_ covered in [docs/docs/api/use-auto-form-context.md](../../docs/docs/api/use-auto-form-context.md) — verify what's actually missing before writing, and fix the real gap: it is absent from the README, and `AutoFormContextValue` mixes supported surface (`control`, `formMethods`, `labels`, `disabled`, and the new `errors`) with internals (`setDynamicMeta`, `fieldConfigs`, `registry`, `fieldOverrides`) with no signal about what is stable.

**What to add.**

- Move the internal half behind an explicit `_internal` key (keeping the current top-level keys as deprecated aliases for one minor version, with `@deprecated` JSDoc pointing at the replacement) so semver intent is legible.
- A README section covering context access and the new headless hooks.
- Mark each context member `@public` or `@internal` in JSDoc.

**Acceptance criteria.** README and `packages/core/README.md` updated identically; API page lists supported vs internal; a test asserts the deprecated aliases still resolve.

## W13 · Packaging and the bare side-effect import (REVIEW-1 P10)

**Problem.** `import '@uniform-ts/core'` sits in the adopter's app entry with no comment and no one can say whether it's required. It presumably exists for the `declare module 'zod'` `GlobalMeta` augmentation — but type-only augmentations need no runtime import, and importing the barrel pulls the whole library into the entry chunk on routes that never render a form.

**What to add.**

- A `./zod-augmentation` export subpath in [packages/core/package.json](../../packages/core/package.json), types-only and zero runtime cost, referenceable from `vite-env.d.ts`.
- An explicit statement in the installation docs and README: whether any import is needed at all, and if so exactly which one and where.
- Verify `sideEffects: false` still holds and that the augmentation in [packages/core/src/zod-augmentation.d.ts](../../packages/core/src/zod-augmentation.d.ts) applies without a runtime import; if it does, say so and tell users to delete the bare import.

**Acceptance criteria.** A minimal type-check fixture proving `.meta()` autocomplete works via the subpath reference alone, with no runtime import.

## W14 · Documentation truth pass (REVIEW-1 P9, cross-cutting note B)

**Problem A.** The `persistStorage` JSDoc in [packages/core/src/types/form.ts](../../packages/core/src/types/form.ts) says `default: localStorage`; the implementation defaults to `sessionStorage` ([useFormPersistence.ts](../../packages/core/src/hooks/useFormPersistence.ts)). For a drafts feature that is the difference between surviving a tab close and not. The adopter's words: "one-line fix, but it cost trust — after finding it we started verifying every default against `dist/`."

**Problem B.** Teams driving Zod messages through a global `z.config({ localeError })` end up with two parallel message systems for one language: the global locale and UniForm's per-field `messages`.

**What to add.**

- Fix the JSDoc to `sessionStorage`, and **audit every other documented default in `types/` against the implementation** — that's the trust repair, not the one-line fix. Report every mismatch found.
- Document the precedence rule explicitly: the schema/global Zod locale wins and `messages` is for per-form exceptions (or implement delegation so a `messages` entry can fall through to the configured locale). Pick one, implement it, and state it in [docs/docs/guides/localization.md](../../docs/docs/guides/localization.md) and [docs/docs/guides/validation.md](../../docs/docs/guides/validation.md).
- Note in the localization guide that RTL/Hebrew via the `he` locale pack + `dir="rtl"` is a verified working path — the adopter confirmed it.

**Acceptance criteria.** A test asserting the actual persistence default; a test for the documented message-precedence rule; both READMEs in sync.

---

## Cross-cutting requirements

- **Type-level tests.** W4, W5 and W6 are type-surface work. Add `expectTypeOf`/`assertType` coverage — a runtime-green implementation with an `any`-shaped public type does not close these gaps.
- **No new peer-dependency leakage.** After this work, an app must never need to import `useWatch`, `Control`, or `useFieldArray` from `react-hook-form` directly. Grep the playground examples to confirm none do.
- **Dev-mode diagnostics over silence.** Every new API warns clearly when used on a path that does not exist. The single most expensive bug in these reports (W1) was expensive because it failed silently.
- **Bundle size.** New hooks must be tree-shakeable; keep `sideEffects: false` valid.
- **Version and changelog.** Note every addition, deprecation and behaviour change in the changelog/release notes with the review ID it closes.

## Do not

- Do not break `AutoForm`'s current "renders everything" behaviour or change any existing default.
- Do not "fix" W1 by removing `useArrayField`; both reports treat external array control as a required capability.
- Do not implement W6 as an asterisk-only cosmetic flag — a required marker that doesn't block submit re-creates the duplicated-rules problem from W7.
- Do not add a second message/localization system; W14 must reduce the number of message layers, not increase it.
- Do not create summary markdown files reporting on this work. Report in the closing message.

## Before finishing

1. From the repo root, run `pnpm test`, `pnpm lint`, `pnpm build`, and — when docs changed — `pnpm docs:build`. Report each result. All four must pass; do not report the work complete with a red suite.
2. Confirm [README.md](../../README.md) and [packages/core/README.md](../../packages/core/README.md) are identical.
3. Deliver a closing summary containing:
   - A table mapping every review item **in the implemented scope** (**P1–P11**, **REVIEW-1 notes A/B**, **R1–R5**) → work item → status (`done` / `partial` / `deferred`) → the files that changed.
   - Every deviation from the API shapes proposed in the reviews, with the reason.
   - Every case where a review's stated root cause did not match what you observed in this repo, with the corrected diagnosis.
   - Every doc-vs-implementation mismatch found during the W14 audit.
   - Anything that could not be done additively, listed as a proposed breaking change for the next major.
   - The next phase to run, so the following session can pick up cleanly.
