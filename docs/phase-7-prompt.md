# UniForm — Phase 7 Prompt: Per-field Custom Components

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phases 1–6 are complete — there are 104 passing tests (34 introspection + 70 AutoForm), a recursive field renderer, unstyled default components, a component registry with a resolution chain, conditional fields, section grouping, layout slots, CSS class name threading, a `createAutoForm()` factory, pluggable coercion, custom validation messages, deep field overrides, programmatic control via ref, form state persistence, enhanced array fields (reorder, duplicate, collapsible, minItems/maxItems), custom array row layout, field dependencies (`meta.depend`), and value cascade.

This prompt covers **Phase 7 only**: per-field custom components — the ability to pass a React component directly on a per-field basis, either inline in the Zod schema meta or via the `fields` prop override, and also the ability to register arbitrary custom components in the factory/registry under user-defined string keys.

Before writing any code, read the existing types in `packages/core/src/types/index.ts`, `resolveComponent.ts`, `AutoForm.tsx`, `createAutoForm.tsx`, and `index.ts` (public exports) to make sure everything you build is consistent with what already exists.

---

## Current State (What Already Exists)

### Component Registry

```ts
type ComponentRegistry = {
  string?: React.ComponentType<FieldProps>
  number?: React.ComponentType<FieldProps>
  boolean?: React.ComponentType<FieldProps>
  date?: React.ComponentType<FieldProps>
  select?: React.ComponentType<FieldProps>
  [key: string]: React.ComponentType<FieldProps> | undefined
}
```

The registry already supports arbitrary string keys (via the index signature). A consumer can register `{ autocomplete: MyAutoComplete }` and the resolution chain will pick it up when `field.meta.component === 'autocomplete'`.

### `FieldMeta.component` (BEFORE phase 7)

```ts
component?: string
```

Only accepts a **string key** that is looked up in the registry.

### `resolveComponent.ts` (BEFORE phase 7) — 4-step chain

1. `meta.component` key in the merged registry
2. `field.type` key in the merged registry
3. `field.type` key in the default registry
4. Returns `null` + warns if nothing found

### `createAutoForm()` factory

Already accepts `components: ComponentRegistry` — consumers can bake in custom-keyed components at factory-creation time.

---

## What to Build

### 1. Allow direct React components in `meta.component`

Extend `FieldMeta.component` to also accept a `React.ComponentType<FieldProps>` directly:

```ts
component?: string | React.ComponentType<FieldProps>
```

This lets consumers embed a one-off custom component right in the Zod schema or in the `fields` prop without needing to register and name it:

```ts
// In the Zod schema — scalar field
const schema = z.object({
  rating: z.number().meta({ component: StarRating }),
  city: z.string().meta({ component: AutocompleteInput, suggestions: ['Paris', 'London'] }),
})

// In the Zod schema — array field with a custom multi-value widget
const schema = z.object({
  tags: z.array(z.string()).min(1).meta({
    component: TagPicker, // bypasses ArrayField row-by-row UI
    suggestions: ['React', 'TypeScript', 'Zod'],
  }),
})

// …or via the fields prop override
<AutoForm
  schema={schema}
  onSubmit={handleSubmit}
  fields={{ rating: { component: StarRating } }}
/>
```

### 2. Update `resolveComponent.ts` — 5-step chain

Add a new **first step** before the existing string-key lookup:

```
1. meta.component is a function → return it directly (bypasses registry)
2. meta.component is a string key in the merged registry → return registry[key]
3. field.type key in merged registry
4. field.type key in default registry
5. return null + warn
```

Implementation:

```ts
export function resolveComponent(
  field: FieldConfig,
  registry: ComponentRegistry,
): React.ComponentType<FieldProps> | null {
  // 1. meta.component as a direct React component (bypasses registry)
  if (field.meta.component && typeof field.meta.component === 'function') {
    return field.meta.component as React.ComponentType<FieldProps>
  }
  // 2. meta.component as a string key in the merged registry
  if (
    typeof field.meta.component === 'string' &&
    registry[field.meta.component]
  ) {
    return registry[field.meta.component]!
  }
  // 3. field.type key in the merged registry
  if (registry[field.type]) {
    return registry[field.type]!
  }
  // 4. field.type key in the default registry
  if (defaultRegistry[field.type]) {
    return defaultRegistry[field.type]!
  }
  // 5. Unknown — render nothing
  console.warn(
    `[UniForm] No component found for field type "${field.type}"${
      field.meta.component
        ? ` with meta.component "${String(field.meta.component)}"`
        : ''
    }. Rendering null.`,
  )
  return null
}
```

### 3. Update `FieldRenderer.tsx` — bypass `ArrayField`/`ObjectField` for direct components

The current `FieldRenderer` short-circuits to `ArrayField` for any `array`-typed field (and similarly for `object`). When `meta.component` is a direct function, this early-return must be skipped so the field falls through to `ScalarField`, which calls `resolveComponent` and returns the direct component.

```ts
// Before routing to ArrayField / ObjectField, check for a direct component override
const hasDirectComponent = typeof field.meta.component === 'function'

if (field.type === 'object' && !hasDirectComponent) {
  return <ObjectField ... />
}

if (field.type === 'array' && !hasDirectComponent) {
  return <ArrayField ... />
}

// ... scalar path now also includes any type with hasDirectComponent:
if (
  field.type === 'string' ||
  field.type === 'number' ||
  field.type === 'date' ||
  hasDirectComponent            // <-- new
) {
  return <ScalarField ... />
}
```

This means a `z.array(z.string())` field with `meta.component: TagPicker` will:

1. Skip the `ArrayField` row-rendering UI
2. Be passed to `ScalarField` as a Controller
3. Receive the whole array as `value`, and write back the whole array via `onChange`
4. Still be validated by Zod (`.min(1)` etc. work normally)

### 4. No changes required for `createAutoForm()` or `AutoForm`

The factory already passes `components` through to the registry. Custom string-keyed components (e.g. `{ colorpicker: ColorPicker }`) in the factory config already work via step 2 of the resolution chain. No new API surface is needed.

### 5. Tests

Add **3 new tests** (105–107):

- **105**: `meta.component` as a direct React component in the Zod schema (`z.string().meta({ component: MyComp })`) — the component is rendered.
- **106**: `meta.component` as a direct React component via the `fields` prop override — the component is rendered with the correct props.
- **107**: A direct component in `meta.component` takes priority over a component registered under the same field type in the registry.

### 6. Playground (Example 16)

Add **Example 16: Per-field Custom Components** to `apps/playground/src/App.tsx`:

**Sub-example A — Direct component on an array field (multi-value autocomplete):**  
Define a `MultiAutocomplete` chip-based tag picker and a `StarRating` click-widget. Use `z.array(z.string()).min(1)` for the languages field with `meta.component: MultiAutocomplete` — the `ArrayField` row UI is completely bypassed. Zod still validates `.min(1)`. Also add `StarRating` on a `z.number()` difficulty field.

**Sub-example B — Custom component registered in factory, referenced by string key:**  
Define a `ColorPicker` component. Call `createAutoForm({ components: { colorpicker: ColorPicker } })`. In the schema, set `meta.component: 'colorpicker'`. This demonstrates the registry-key approach for team-wide shared components.

### 7. README

Update **`FieldMeta.component`** in the API reference to document both forms:

```ts
component?: string | React.ComponentType<FieldProps>
//          ^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//          registry lookup  direct component (bypasses registry)
```

Add a **"Per-field Custom Components"** recipe section with:

- Option 1: direct React component (scalar and array fields)
- Option 2: named registry key via `createAutoForm`
- The array-field bypass pattern (tag picker / multi-select)
- Resolution priority table

---

## Acceptance Criteria

- [ ] `FieldMeta.component` accepts `string | React.ComponentType<any>` without TypeScript errors
- [ ] Passing a direct React component in `meta.component` (via Zod meta or `fields` prop) renders that component
- [ ] Direct component takes priority over both the registry string-key lookup and the type-based lookup
- [ ] `FieldRenderer` skips `ArrayField`/`ObjectField` routing when `meta.component` is a direct function
- [ ] A `z.array(...)` field with a direct `meta.component` passes the full array as `value` and validates normally
- [ ] Passing `meta.component: 'myKey'` with a factory-registered component still works (regression-free)
- [ ] All 107 tests pass
- [ ] Playground Example 16 renders both approaches side-by-side
- [ ] README documents the feature with examples, including the array bypass pattern

---

## What NOT to Do

- Do **not** change `ComponentRegistry` — the existing `[key: string]` index signature already covers custom keys.
- Do **not** modify `BooleanField`, `SelectField`, or `ObjectField` directly — they benefit from the updated resolution chain automatically.
- Do **not** add runtime validation for components passed via `meta.component` — trust the TypeScript type.
- Do **not** add any CSS or default styling to the new components in the playground — UniForm is headless.
