# UniForm — Phase 2 Prompt for Claude Code

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phase 1 is complete — the monorepo is set up, all core types are defined, and the Zod introspection layer is built and tested.

This prompt covers **Phase 2 only**: the rendering engine. This is the core of the library — the components that take the `FieldConfig[]` produced by the introspection layer and render them as a connected, validated form.

Before writing any code, read the existing types in `packages/core/src/types/index.ts` and the introspection layer in `packages/core/src/introspection/introspect.ts` to make sure everything you build is consistent with what already exists.

---

## What to Build

### File Structure

Add the following to `packages/core/src/`:

```
src/
├── components/
│   ├── AutoForm.tsx          # Top-level form component
│   ├── FieldRenderer.tsx     # Core recursive switch component
│   ├── fields/
│   │   ├── ScalarField.tsx   # Handles string, number, date
│   │   ├── BooleanField.tsx  # Handles boolean (checkbox)
│   │   ├── SelectField.tsx   # Handles select / enum
│   │   ├── ObjectField.tsx   # Handles nested objects (recursive)
│   │   └── ArrayField.tsx    # Handles arrays with add/remove
│   └── defaults/
│       ├── DefaultInput.tsx
│       ├── DefaultCheckbox.tsx
│       ├── DefaultSelect.tsx
│       ├── DefaultFieldWrapper.tsx
│       └── DefaultSubmitButton.tsx
├── registry/
│   ├── defaultRegistry.ts    # Built-in component registry
│   └── mergeRegistries.ts    # Registry merge utility
├── hooks/
│   └── useConditionalFields.ts  # Watches form values, returns visible fields
└── context/
    └── AutoFormContext.tsx   # React context for registry + config
```

---

## Component Specifications

### `AutoFormContext`

Create a React context that makes the following available to all descendant components without prop drilling:

```ts
type AutoFormContextValue = {
  registry: ComponentRegistry
  fieldOverrides: Record<string, Partial<FieldMeta>>
  fieldWrapper: React.ComponentType<FieldWrapperProps>
  layout: Required<LayoutSlots>
  classNames: FormClassNames
  disabled: boolean
}
```

Export a `useAutoFormContext()` hook that throws a helpful error if used outside of `<AutoForm>`.

---

### `AutoForm`

The top-level component. Its responsibilities are:

1. Call `introspectObjectSchema(schema)` to get `FieldConfig[]` — memoize this with `useMemo` since it's pure and potentially expensive
2. Set up `react-hook-form` with `useForm({ resolver: zodResolver(schema), defaultValues })`
3. Merge the provided `components` registry with the default registry
4. Apply `fieldOverrides` from the `fields` prop by merging them into the relevant `FieldConfig`'s meta
5. Provide everything via `AutoFormContext`
6. Render the form using `layout.formWrapper` as the container
7. Map over the top-level `FieldConfig[]` and render a `FieldRenderer` for each
8. Render `layout.submitButton` at the end, passing `isSubmitting` from RHF's `formState`
9. Call `onSubmit` with the fully typed, Zod-parsed values on valid submission

**Important details:**

- `onSubmit` must receive `z.infer<TSchema>` — fully typed, not `unknown`
- The `disabled` prop should disable all fields in the form when true
- `defaultValues` should be deep-merged carefully — Zod's inferred types may have nested objects

```tsx
function AutoForm<TSchema extends z.ZodObject<z.ZodRawShape>>({
  schema,
  onSubmit,
  defaultValues,
  components,
  fields,
  fieldWrapper,
  layout,
  classNames,
  disabled = false,
}: AutoFormProps<TSchema>)
```

---

### `FieldRenderer`

The core recursive switch. Reads a `FieldConfig` and delegates to the appropriate field component. Also responsible for:

- Looking up the component override chain (see below)
- Rendering the `fieldWrapper` around each field
- Passing the `error` message from RHF's `formState.errors` to the wrapper

```tsx
type FieldRendererProps = {
  field: FieldConfig
  control: Control
  namePrefix?: string // for nested paths inside arrays/objects
}
```

**Component lookup chain** (first match wins):

1. `field.meta.component` key looked up in the registry (e.g. `'textarea'`)
2. `field.type` key looked up in the registry (e.g. `'string'`)
3. Built-in default for that type
4. `null` (render nothing, log a warning)

The `fieldWrapper` should wrap every rendered field. It receives the `FieldConfig` and the error string (if any) as props, so it can render labels, descriptions, and error messages however it wants.

**Do not wrap `object` and `array` fields in the `fieldWrapper`** — they manage their own layout since they contain multiple children.

---

### `ScalarField`

Handles `string`, `number`, and `date` types. Uses RHF's `Controller`:

```tsx
<Controller
  name={field.name}
  control={control}
  render={({ field: rhfField, fieldState }) => {
    const Component = resolveComponent(field, registry)
    return (
      <Component
        {...rhfField}
        label={field.label}
        placeholder={field.meta.placeholder}
        description={field.meta.description}
        error={fieldState.error?.message}
        required={field.required}
        disabled={field.meta.disabled ?? contextDisabled}
        meta={field.meta}
      />
    )
  }}
/>
```

**Coercion**: HTML inputs always return strings. Handle coercion before passing to RHF:

- `number` fields: coerce with `parseFloat`, pass `NaN` through (Zod will catch it with a proper message)
- `date` fields: coerce with `new Date(value)`, check for invalid date
- `string` fields: no coercion needed

---

### `BooleanField`

Similar to `ScalarField` but maps to the `boolean` registry entry. The default component renders a `<DefaultCheckbox>`. Pass `checked` instead of `value` to the component.

---

### `SelectField`

Similar to `ScalarField` but maps to the `select` registry entry. Passes `options` (from `field.options`) to the component. The default component renders a `<DefaultSelect>` using a native `<select>` element.

---

### `ObjectField`

Renders a group of child fields. Does **not** use `Controller` — it has no single value. Instead:

1. Map over `field.children`
2. Render a `FieldRenderer` for each child
3. Pass down `namePrefix` so child field names are correctly dot-notated
4. Wrap the group in a `<fieldset>` by default (unstyled), but respect `layout.sectionWrapper` if the object's meta has a `section` key

```tsx
function ObjectField({ field, control, namePrefix }: FieldRendererProps) {
  const children = field.children ?? []
  return (
    <fieldset>
      {field.label && <legend>{field.label}</legend>}
      {children.map((child) => (
        <FieldRenderer
          key={child.name}
          field={child}
          control={control}
          namePrefix={namePrefix}
        />
      ))}
    </fieldset>
  )
}
```

---

### `ArrayField`

The most complex component. Uses RHF's `useFieldArray`:

```tsx
const {
  fields: rows,
  append,
  remove,
} = useFieldArray({
  control,
  name: field.name,
})
```

For each row:

- Render a `FieldRenderer` for `field.itemConfig`
- Pass `namePrefix` as `{field.name}.{index}` so names resolve to e.g. `tags.0` or `addresses.1.street`
- Render a remove button next to each row

Render an add button below all rows that calls `append(getDefaultValue(field.itemConfig))`.

**`getDefaultValue`**: Write a utility that derives a safe empty default for any `FieldConfig`:

- `string` → `''`
- `number` → `0`
- `boolean` → `false`
- `date` → `new Date()`
- `select` → first option's value, or `''`
- `object` → recursively build `{}` from children
- `array` → `[]`

---

### Default Components

These are bare, functional, completely unstyled HTML components. They exist so the library works out of the box without any configuration. They should have no className, no inline styles, no design opinions whatsoever.

**`DefaultInput`** — renders `<input>` with correct `type` attribute derived from `meta.inputType` or field type (`text`, `number`, `date`, `email`, `url`). Forwards all `FieldProps`.

**`DefaultCheckbox`** — renders `<input type="checkbox">` with a `<label>`.

**`DefaultSelect`** — renders a native `<select>` with `<option>` elements from `props.options`.

**`DefaultFieldWrapper`** — renders:

```tsx
<div>
  <label htmlFor={field.name}>
    {field.label}
    {field.required && ' *'}
  </label>
  {children}
  {field.meta.description && <p>{field.meta.description}</p>}
  {error && <span role='alert'>{error}</span>}
</div>
```

**`DefaultSubmitButton`** — renders `<button type="submit" disabled={isSubmitting}>Submit</button>`.

All default components must be accessible:

- Inputs must have `id` matching their `name` so labels are associated
- Error messages must use `role="alert"`
- Required fields must have `aria-required="true"`
- Disabled fields must have `aria-disabled="true"`

---

### Default Registry

```ts
// registry/defaultRegistry.ts
export const defaultRegistry: ComponentRegistry = {
  string: DefaultInput,
  number: DefaultInput,
  date: DefaultInput,
  boolean: DefaultCheckbox,
  select: DefaultSelect,
}
```

---

### `mergeRegistries`

A utility that merges two registries, with the second taking priority:

```ts
function mergeRegistries(
  base: ComponentRegistry,
  overrides?: ComponentRegistry,
): ComponentRegistry
```

Handles `undefined` overrides gracefully — returns base unchanged.

---

### `useConditionalFields`

A hook that takes a `FieldConfig[]` and the RHF `control`, and returns only the fields that should currently be visible:

```ts
function useConditionalFields(
  fields: FieldConfig[],
  control: Control,
): FieldConfig[]
```

- Use `useWatch({ control })` to get the current form values
- For each field, evaluate `field.meta.condition(values)` if it exists
- Filter out fields where `condition` returns `false`
- Filter out fields where `field.meta.hidden === true`
- Sort remaining fields by `field.meta.order ?? Infinity`
- Memoize the result to avoid unnecessary re-renders

---

## Registry & Component Lookup — Full Priority Chain

Implement this as a `resolveComponent` utility used inside `FieldRenderer`:

```
field.meta.component key in registry     (e.g. meta.component = 'textarea')
  → field.type key in registry           (e.g. type = 'string')
    → field.type key in defaultRegistry  (built-in fallback)
      → null + console.warn(...)         (unknown type)
```

---

## Update Public Exports

Update `packages/core/src/index.ts` to also export:

- `AutoForm` component
- `AutoFormContext` and `useAutoFormContext`
- `defaultRegistry`
- `mergeRegistries`
- `useConditionalFields`
- All default components from `defaults/` (so users can extend them)

---

## Integration Tests

Create `packages/core/src/components/AutoForm.test.tsx` using Vitest + React Testing Library.

Cover the following cases:

1. **Basic render** — a simple flat schema renders the correct number of inputs
2. **Label rendering** — field labels are rendered and associated with their inputs
3. **Validation on submit** — submitting an empty required field shows a Zod error message
4. **Successful submit** — filling all fields and submitting calls `onSubmit` with correctly typed and coerced values
5. **Number coercion** — a number field submits as a `number`, not a string
6. **Default values** — `defaultValues` prop pre-fills the form fields correctly
7. **ZodEnum** — a `z.enum` field renders a select with the correct options
8. **Nested object** — a `ZodObject` field renders its children with dot-notated names
9. **Array field** — renders one row by default, add button appends a row, remove button removes it
10. **Conditional field** — a field with `condition: (v) => v.type === 'business'` is hidden/shown correctly as the watched value changes
11. **Hidden field** — `meta.hidden: true` means the field is not rendered
12. **Disabled form** — `disabled` prop disables all inputs
13. **Custom component** — passing a custom `string` component in `components` renders it instead of the default
14. **meta.component override** — a field with `meta.component: 'textarea'` renders the textarea component from the registry
15. **Field order** — fields render in `meta.order` order, not schema definition order
16. **`unknown` type** — an unsupported Zod type renders nothing and logs a warning

---

## Definition of Done for Phase 2

- [ ] `<AutoForm schema={schema} onSubmit={fn} />` renders a working form for any flat Zod object schema
- [ ] Nested objects render correctly with dot-notated field names
- [ ] Array fields support add and remove rows
- [ ] Zod validation errors appear on submit
- [ ] `onSubmit` receives values typed as `z.infer<TSchema>` with correct coercion applied
- [ ] Conditional fields show and hide reactively as form values change
- [ ] All registry customization tiers work (global default → form-level → per-field meta)
- [ ] All default components are accessible (labels, aria attributes, role="alert")
- [ ] All integration tests pass
- [ ] No TypeScript errors in strict mode
- [ ] ESLint passes with no errors
- [ ] The playground app has at least 3 example forms demonstrating: a flat schema, a nested schema, and an array schema

---

## Notes & Constraints

- Do not implement layout/styling hooks (`fieldWrapper` render prop, `layout` slots, `classNames`) in this phase — use the `DefaultFieldWrapper` for everything for now. Those hooks are Phase 3.
- Do not implement `createAutoForm()` factory yet — that is Phase 4.
- Keep all components as pure and composable as possible — avoid putting logic in `AutoForm` that belongs in a child component
- Never import Zod types directly in component files — rely only on the `FieldConfig` types produced by the introspection layer. Components should have zero knowledge of Zod.
- The rendering engine must never throw — if a field type is unrecognised, log a warning and render `null`
