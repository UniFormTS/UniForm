# UniForm in production — usage report & feedback

> **For:** an agent/maintainer working in the `@uniform-ts/core` repository.
> **From:** the Flow team (`Reshet-Team/Flow`), a Hebrew/RTL internal ERP front end
> that adopted UniForm for its largest form.
> **Version under test:** `@uniform-ts/core@0.1.3`, `react-hook-form@7.83.0`,
> `zod@4.4.3`, `react@19.2.8`, TypeScript 6.0.3, Vite.

This document has three parts:

1. [How we use UniForm](#1-how-we-use-uniform) — the real integration, with code.
2. [Problems we hit](#2-problems-we-hit) — 11 issues, each with root cause and workaround.
3. [What would make the library better](#3-what-would-make-the-library-better) — concrete API proposals.

Everything below is grounded in shipped code and in the published `dist/` of
`0.1.3` (line references are to `dist/index.mjs` / `dist/field-*.d.ts` of that
version).

---

## 1. How we use UniForm

### 1.1 The form

One screen — "create requisition" (יצירת דרישה) — is a purchase-requisition
builder. The user picks an action, searches a material catalogue, and every
chosen material lands in an accordion card grouped by supply sector. Each card
has header fields that cascade into its rows, and each row has its own editable
columns. **Which fields exist is decided at runtime** by a matrix keyed on
`(action × sector × orderReason)`, so the visible field set changes as the user
types.

Shape of the schema (abridged from
`frontend/src/features/createRequisition/forms/requisition.schema.ts`):

```ts
export const requisitionSchema = z
  .object({
    action: z.enum(REQUISITION_ACTION_VALUES).nullable(),
    sectors: z.array(
      z.object({
        sector: z.string(),
        sectorDesc: z.string(),
        headline: z.string().trim().max(40).optional(),
        orderReason: z.string().trim().optional(),
        receivingStorageLocation: z
          .custom<StorageLocation | null>()
          .nullable()
          .optional(),
        // ~10 more optional, runtime-decided header fields
        rows: z.array(
          z.object({
            requisitionItem: z.string(),
            material: z.string(),
            materialDetails: z.custom<Material>(),
            quantity: z.number().nullable(),
            serials: z.array(z.string()).optional(),
            // ~18 more optional, runtime-decided row fields
          }),
        ),
      }),
    ),
  })
  .superRefine(({ action, sectors }, ctx) => {
    sectors.forEach((sector, index) => {
      if (!isSectorComplete(sector, action)) {
        ctx.addIssue({
          code: 'custom',
          message: 'יש להשלים את כל שדות החובה לכל מק"ט',
          path: ['sectors', index],
        })
      }
    })
  })

export const requisitionForm = createForm(requisitionSchema)
```

The key property: **requiredness is not static**. A field is required only for a
particular `(action, sector, orderReason)` triple, so it cannot be expressed as
`z.string().min(1)` — it has to be a `superRefine` that consults a lookup table.

### 1.2 The render layer — the whole app, in one component

```tsx
// frontend/src/routes/_has-locations/create-requisition/route.tsx
function RouteComponent() {
  return (
    <AutoForm
      form={requisitionForm}
      defaultValues={{ action: null, sectors: [] }}
      onSubmit={() => {}}
      fieldWrapper={({ children }) => children}
      layout={{ formWrapper: RequisitionLayout, submitButton: null }}
      fields={{
        action: { hidden: true },
        sectors: { component: SectorsField },
      }}
    />
  )
}
```

That is the **entire** UniForm surface we use. Read it as a list of opt-outs:

| Prop                        | What it says                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| `onSubmit={() => {}}`       | the form does not own submission                                           |
| `submitButton: null`        | the form does not render a submit control                                  |
| `fieldWrapper` passthrough  | the form does not render labels, errors or spacing                         |
| `action: { hidden: true }`  | a field that exists only as state, never rendered                          |
| `sectors: { component: … }` | the one real field is replaced wholesale by our own component              |
| `layout.formWrapper`        | the entire page — header, sidebar, dialogs — is smuggled _inside_ the form |

`RequisitionLayout` is not a wrapper in any visual sense; it is the whole page,
placed inside the form purely so it can call `useAutoFormContext()`:

```tsx
export function RequisitionLayout({ children }: FormWrapperProps) {
  return (
    <RequisitionItemsProvider>
      <RequisitionPageShell>{children}</RequisitionPageShell>
    </RequisitionItemsProvider>
  )
}
```

### 1.3 Reading and writing the form

```tsx
// frontend/src/features/createRequisition/context/requisitionItemsContext.tsx
const { control, formMethods } = useAutoFormContext()

const sectors =
  (useWatch({
    control: control as unknown as Control<RequisitionFormValues>,
    name: 'sectors',
  }) as RequisitionSectorValue[] | undefined) ?? []

const setSectors = (next: RequisitionSectorValue[]) =>
  formMethods.setValue('sectors', next as RequisitionFormValues['sectors'])
```

Two `as unknown as Control<…>` casts and a `useWatch` imported straight from
`react-hook-form` — see [P2](#p2-useautoformcontext-is-untyped) and
[P3](#p3-no-typed-reactive-read-of-a-subtree).

### 1.4 The one custom field

```tsx
export function SectorsField({ value, onChange }: FieldProps<RequisitionSectorValue[]>) {
  const { isSectorOpen, setSectorOpen, sectorError, action } = useRequisitionItems()
  const sectors = value ?? []

  const replaceSector = (index: number, next: RequisitionSectorValue) =>
    onChange(sectors.map((sector, i) => (i === index ? next : sector)))

  return sectors.map((sector, index) => (
    <SectorDrawer key={sector.sectorDesc} sector={sector} … />
  ))
}
```

Every input below this line — text fields, selects, switches, date pickers,
tables — is our own design system, wired by hand. UniForm registers nothing
inside `SectorsField`; it holds a single opaque array value.

### 1.5 What we do **not** use

`components` registry · `sections` · `span` / `order` · `condition` /
`setCondition` · `setOnChange` / `setFieldMeta` · array rendering
(`arrayRowLayout`, `arrayButtons`, `movable`, `collapsible`) · `messages` ·
`labels` / locale packs · `coercions` · `persistKey` · `AutoFormHandle` ref ·
`introspectSchema`.

The honest summary: **we adopted UniForm and then opted out of every part of it
except the RHF state container.** The rest of this document is about why, and
what would have kept us in.

---

## 2. Problems we hit

Ordered by how much they cost us.

### P1 · `useArrayField` silently does nothing (shipped as a P1 bug in our QA report)

**Severity: high — this made a user-facing feature unusable and we had to remove
UniForm from that dialog entirely.**

**Symptom.** A serials dialog rendered `z.array(z.object({ serial: z.string() }))`
inside an `<AutoForm>` and used `useArrayField('serials')` for an external
"Add" button. Clicking Add cleared the input (so the handler ran) and rendered
**zero** rows. `append()` was a no-op. The whole feature was dead.

**Root cause.** `useArrayField` mounts a _second_ `useFieldArray` on the same
`name` as the one the internal `ArrayField` already owns:

```js
// dist/index.mjs:896 — internal ArrayField
const {
  fields: rows,
  append,
  remove,
  move,
  insert,
} = useFieldArray({ control, name: effectiveName })

// dist/index.mjs:2070 — useArrayField
const result = useFieldArray({ control, name: fieldName })
```

In react-hook-form 7.83.0, `control._setFieldArray` emits on `_subjects.state`
but **not** on `_subjects.array`. Two `useFieldArray` hooks bound to the same
name therefore never sync: `useArrayField`'s `append` mutates its own copy, and
the `ArrayField` that actually renders the rows never hears about it.

**What we ruled out first** (a full afternoon): schema `.transform()` /
`.superRefine()` wrappers, `fields['serials.serial'].disabled`, implicit form
submit from the Add button. All innocent.

**Our workaround.** Deleted the `AutoForm` from that dialog and kept the list in
`useState`. The dialog no longer uses UniForm at all.

**Suggested fixes**

- Do not open a second `useFieldArray`. Publish the internal `ArrayField`'s
  actions on the AutoForm context (`arrayFields: Record<string, ArrayActions>`,
  registered by `ArrayField` on mount) and have `useArrayField(name)` read from
  there. Fall back to a fresh `useFieldArray` only when no `ArrayField` is
  mounted for that path.
- Add a regression test that mounts `<AutoForm>` with a rendered array **and** an
  external `useArrayField` button, clicks it, and asserts a new row appears. The
  current tests presumably exercise one or the other, not both.
- Until it's fixed, put a warning in the docs. As written, section 6 of the docs
  actively recommends the broken path.

---

### P2 · `useAutoFormContext()` is untyped

`AutoFormContextValue` exposes `control: Control` and `formMethods: FormMethods`
— both defaulting to `FieldValues`, i.e. `Record<string, any>`. There is no way
to recover the schema's type, because the hook takes no type parameter and the
context carries no schema generic.

Consequence, in our code, twice:

```ts
control as unknown as Control<RequisitionFormValues>
```

A double cast — `as Control<T>` alone doesn't compile. This is the single
ugliest line in the feature, and it is unavoidable with today's API.

**Suggested fix.** Make the hook generic and let the caller assert once:

```ts
declare function useAutoFormContext<
  TValues extends FieldValues = FieldValues,
>(): AutoFormContextValue<TValues>
```

Even without genuine inference (the context can't know the schema at the call
site), `useAutoFormContext<RequisitionFormValues>()` would remove both casts and
give `formMethods.setValue` a checked field path. A stricter option: have
`createForm(schema)` return a branded token and offer
`useAutoFormContext(requisitionForm)` for real inference.

---

### P3 · No typed, reactive read of a subtree

`AutoFormHandle` is imperative — `getValues()`, `watch()` — and only reachable
via a ref from outside. `useAutoFormContext()` is reactive-capable but only
inside the tree, and untyped ([P2](#p2-useautoformcontext-is-untyped)).

Neither gives what a real app needs: **"subscribe to `sectors` from a component
of my choosing, typed."** So we reached past UniForm into its peer dependency:

```ts
import { useWatch, type Control } from 'react-hook-form'
```

That is a leak. We now depend on RHF's API surface directly, and a UniForm
upgrade that swaps or wraps RHF would break us silently.

Worse, it forced a structural inversion. Because the hook only works inside
`<AutoForm>`, our page header, sidebar, submit button and dialogs all had to be
moved **inside** the form via `layout.formWrapper`, so that
`RequisitionItemsProvider` could read the form it lives in. `formWrapper` is
documented as a styling slot; we use it as the application root.

**Suggested fix.** Ship a typed selector hook:

```ts
function useFormValue<TSchema, K extends DeepKeys<z.infer<TSchema>>>(
  name: K,
): DeepFieldValue<z.infer<TSchema>, K>
```

and/or let `<AutoForm>` accept an external form instance so the provider can be
created _above_ it:

```tsx
const form = useUniForm(requisitionForm, { defaultValues })
<PageChrome form={form}>
  <AutoForm form={form} />
</PageChrome>
```

`DeepKeys` / `DeepFieldValue` already exist in the type surface — they just
aren't exposed through a hook.

---

### P4 · `FieldProps` is too thin for a real custom container

`FieldProps<Value>` gives `value` / `onChange` / `onBlur` / `ref` / `label` /
`error` / `meta` / `schema`. For a leaf input that is exactly right. For a
**container** — an array field replaced by a custom component — it is not enough:

- No way to render children through UniForm. Our `SectorsField` receives an
  opaque `RequisitionSectorValue[]`; to render a row's `orderReason` with a
  registered component we'd have to call `FieldRenderer` ourselves with a
  hand-built `FieldConfig` and a `namePrefix`. `FieldRenderer` is exported, but
  `FieldConfig` construction is not documented as a public path.
- No `dispatch`-friendly update. Every edit rebuilds the entire `sectors` array
  and calls `onChange` with the whole thing — no per-path writes, so RHF sees one
  giant value change per keystroke.
- No access to per-row validation state.

So the moment one field needs bespoke UI, **everything below it leaves the
library**. There is no gradient between "AutoForm renders it" and "you render all
of it".

**Suggested fix.** A `renderField(path)` (or `<Field name="sectors.0.orderReason" />`)
escape hatch available to custom components, so an app can own the _layout_ of a
subtree while UniForm still owns _registration, components and errors_ for the
leaves inside it. That single API would have kept our entire row table on
UniForm.

---

### P5 · Cross-field / array-index errors have nowhere to go

Our completeness rule is inherently cross-field: a sector is valid only relative
to the active `action` and each row's effective `orderReason`. It lives in
`superRefine` with `path: ['sectors', index]`.

There is no documented way to render that. `FieldProps.error` is a single string
on the field itself; an issue at `sectors.0` targets an array element that has no
UniForm-rendered wrapper. `ValidationMessages` maps field → message text, not
field → _display location_.

**Our workaround.** We validate a second time, outside the schema, and route the
message ourselves:

```ts
const sectorError = (sector: RequisitionSectorValue) => {
  if (!isTriedToSubmit) return undefined
  const [formatError] = getSectorFormatErrors(sector)
  if (formatError) return formatError
  return isSectorComplete(sector, action)
    ? undefined
    : 'יש להשלים את כל שדות החובה לכל מק"ט'
}
```

The same rules are now implemented twice — once in `superRefine` for submit,
once in plain functions for display. They can drift, and reconciling them is a
standing item in our refactor plan.

**Suggested fix.** Expose the resolved error tree (`errors` from RHF `formState`,
keyed by dot path) on the AutoForm context, plus a `useFieldError(path)` hook
that works for non-leaf paths such as `sectors.0` and for the form root. Custom
components could then render schema-authored errors instead of re-deriving them.

---

### P6 · Arrays of primitives aren't supported

> "Array rows must be `z.object(...)`. Arrays of primitives (`z.array(z.string())`)
> are not rendered as repeating fields — use a custom component for those."

Our serials list is genuinely `string[]`. Modelling it as
`z.array(z.object({ serial: z.string() }))` just to satisfy the renderer means
the _storage shape_ is distorted by the _render layer_ — the exact coupling the
docs elsewhere tell you to avoid — and we then map back and forth at the payload
boundary.

**Suggested fix.** Render primitive arrays as repeating single-input rows, with
the item schema introspected as usual (`string` → the registered `string`
component, `.max()` honoured). It is the most common array shape in the wild:
tags, emails, serials, SKUs.

---

### P7 · `formMethods.setValue` hard-codes its options

```js
// dist/index.mjs:1740
setValue: (name, value) =>
  setValue(name, value, { shouldValidate: true, shouldDirty: true })
```

Not configurable. For us, `setValue('sectors', next)` on every keystroke means a
**full-schema Zod validation of the entire draft on every keystroke**, including
the `superRefine` that walks every sector and every row through the field-config
matrix. With ~20 rows that is measurable, and there is no way to say
"just write the value".

Same for `setValues`, which loops `setValue` per key — N validations for one
logical update instead of one.

**Suggested fix.** Accept RHF's `SetValueConfig` as an optional third argument
(`setValue(name, value, options?)`), keeping the current values as defaults. And
make `setValues` a single `reset({...getValues(), ...values}, { keepDirty… })`
or at least validate once at the end.

---

### P8 · `useAutoFormContext` is exported but undocumented

It is a public export of the package and the only route to `control` /
`formMethods` from inside the tree — i.e. **the load-bearing API for any
non-trivial integration** — yet it appears nowhere in the README or the docs we
were given. We found it by reading `dist/index.d.ts`.

`AutoFormContextValue` also exposes internals with no guidance on what is stable:
`setDynamicMeta`, `fieldConfigs`, `registry`, `fieldOverrides`. We don't know
which of those we're allowed to touch.

**Suggested fix.** Document it, and split the value into a supported surface
(`control`, `formMethods`, `labels`, `disabled`) and an explicitly internal one
(`setDynamicMeta`, `fieldConfigs`, `registry`) — e.g. under an `_internal` key,
so semver intent is legible.

---

### P9 · `persistStorage` docs contradict the implementation

```ts
/** Custom storage adapter (default: localStorage) */
persistStorage?: PersistStorage
```

```js
// dist/index.mjs:1281
getItem: (key) => sessionStorage.getItem(key),
```

The JSDoc in `AutoFormProps` says `localStorage`; the implementation uses
`sessionStorage` (the prose docs say `sessionStorage` too). For a drafts feature
this is the difference between "survives a tab close" and "doesn't" — exactly the
question you consult that JSDoc to answer. One-line fix, but it cost trust: after
finding it we started verifying every default against `dist/`.

---

### P10 · The bare side-effect import is unexplained

```ts
// frontend/src/main.tsx
import '@uniform-ts/core'
```

This sits in our app entry with no comment, and no one on the team can say
whether it is required. Presumably it exists to pull in the
`declare module 'zod'` / `'zod/v4/core'` `GlobalMeta` augmentation — but type-only
augmentations don't need a runtime import, and a runtime import of the barrel
pulls the whole library into the entry chunk even on routes that never render a
form.

**Suggested fix.** State it plainly in the docs: whether the augmentation
requires anything at all, and if a `types` entry is needed, ship it as a
dedicated `@uniform-ts/core/zod-augmentation` subpath that can be referenced
from `vite-env.d.ts` with zero runtime cost.

---

### P11 · No story for runtime-decided requiredness

This is the design-level version of [P5](#p5-cross-field--array-index-errors-have-nowhere-to-go),
and it's the reason we ended up using so little of the library.

UniForm's model is: **the schema is static, the form is derived from it.**
`introspectSchema` walks the Zod tree once and produces `FieldConfig[]`;
`required` is a boolean read off the schema; `condition` can hide a field, but
hiding is the only runtime lever, and a hidden field is simply unregistered.

Our model is: **the field set and its requiredness are a function of the current
values.** Given `(action, sector, orderReason)`, a lookup table returns which
fields render (header vs row level) and which are mandatory. Every field is
therefore `.optional()` in Zod — the type is honest, the constraint isn't — and
all real validation happens in `superRefine` against the table.

The gap: `condition` controls **visibility**, and there is no equivalent for
**requiredness**. A field can be visible-and-optional or hidden-and-absent, but
not "visible, and required only because of what's in these three other fields".
`setFieldMeta` can flip `hidden` / `disabled` / `options` / `label` at runtime,
but not `required`, and it can't attach a validation rule.

We would have stayed on the library for at least the row table if we could have
written something like:

```ts
requisitionForm.setRequired('sectors.orderReason', (row, values) =>
  isRequired(values.action, row.sector, row.orderReason),
)
```

with the predicate feeding both the asterisk **and** the resolver.

**Where this lands us.** A refactor now in flight removes `AutoForm` from the
route and drops both `@uniform-ts/core` and `react-hook-form`, replacing them
with a `useReducer` draft. Our own written justification:

> `AutoForm` is used with `onSubmit={() => {}}`, `submitButton: null`, a
> passthrough `fieldWrapper`, `action` hidden and `sectors` fully replaced by a
> custom component. It contributes no field registration, no RHF validation, no
> error wiring and no submit handling — it is a state container, paid for with two
> `as unknown as Control<…>` casts, `setValue` calls that bypass the RHF
> lifecycle, and a `formWrapper` that hosts a provider so it can read its own form.

The schema stays. `createForm` goes. That sentence is the most useful piece of
feedback in this document: for a form of this shape, UniForm's cost is the
casts and the inversion, and its benefit rounds to zero — **not because the
library is bad, but because there is no supported middle ground between "let
AutoForm render everything" and "render it all yourself".** P3, P4 and P11 are
that middle ground.

---

## 3. What would make the library better

Ranked by what would have changed our decision.

| #   | Proposal                                                                                                                                              | Fixes   | Impact     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| 1   | **Fix `useArrayField`** — share the internal `ArrayField` actions through context instead of a second `useFieldArray`; add a regression test          | P1      | 🔴 blocker |
| 2   | **Renderable subtrees** — `<Field name="a.0.b" />` / `renderField(path)` usable from a custom component, so apps own layout while UniForm owns leaves | P4, P11 | 🔴 high    |
| 3   | **Typed, external form access** — `useUniForm(form)` above `<AutoForm>`, or a typed `useFormValue(path)` / generic `useAutoFormContext<T>()`          | P2, P3  | 🔴 high    |
| 4   | **Runtime requiredness** — `setRequired(path, predicate)` driving both the asterisk and validation                                                    | P11     | 🟠 high    |
| 5   | **Error tree access** — `useFieldError(path)` for non-leaf paths and the form root, so `superRefine` messages can be rendered                         | P5      | 🟠 medium  |
| 6   | **Primitive arrays** — render `z.array(z.string())` as repeating single inputs                                                                        | P6      | 🟠 medium  |
| 7   | **`setValue(name, value, options?)`** — stop forcing `shouldValidate` on every write; batch `setValues`                                               | P7      | 🟡 medium  |
| 8   | **Document `useAutoFormContext`** and mark the internal half of `AutoFormContextValue`                                                                | P8      | 🟡 medium  |
| 9   | **Fix the `persistStorage` JSDoc** (`sessionStorage`, not `localStorage`)                                                                             | P9      | 🟢 trivial |
| 10  | **Explain / remove the bare side-effect import**; ship the Zod augmentation as a types-only subpath                                                   | P10     | 🟢 trivial |

### Two cross-cutting notes

**A "headless container" mode would be the killer feature.** Our whole opt-out
block (`onSubmit` noop, `submitButton: null`, passthrough `fieldWrapper`) is us
asking for one thing: _give me the state container, the registration and the
resolver; I'll render everything._ Make that a first-class mode —
`<FormProvider form={f}>` + `useField(path)` returning `FieldProps` for a leaf —
and UniForm becomes usable for the 20% of forms that are too bespoke for
`AutoForm` but still want the plumbing. Right now those forms leave.

**RTL / Hebrew went fine — one gap.** The `he` locale pack and `dir="rtl"` from
our provider worked without incident. The one friction is that we drive Zod's
messages through a global `z.config({ localeError })` (Hebrew, grammatically
inflected per issue code and per `origin`), while UniForm's `messages` prop is a
parallel, per-field override layer. Two message systems for one language. A
`messages` entry that could delegate to Zod's configured locale — or a documented
"the schema/global locale wins, `messages` is for per-form exceptions" — would
remove the ambiguity.

---

## Appendix — every UniForm reference in our codebase

Six call sites, for a 40k-line front end:

| File                                                                                | API used                         |
| ----------------------------------------------------------------------------------- | -------------------------------- |
| `src/routes/_has-locations/create-requisition/route.tsx`                            | `AutoForm`                       |
| `src/features/createRequisition/forms/requisition.schema.ts`                        | `createForm`                     |
| `src/features/createRequisition/context/requisitionItemsContext.tsx`                | `useAutoFormContext` (+ 2 casts) |
| `src/features/createRequisition/forms/fields/SectorsField.tsx`                      | `FieldProps<T>` (type only)      |
| `src/features/createRequisition/components/RequisitionLayout/RequisitionLayout.tsx` | `FormWrapperProps` (type only)   |
| `src/main.tsx`                                                                      | bare side-effect import          |

A seventh — the serials dialog — was removed after [P1](#p1--usearrayfield-silently-does-nothing-shipped-as-a-p1-bug-in-our-qa-report).
