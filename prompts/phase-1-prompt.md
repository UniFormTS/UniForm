# UniForm — Phase 1 Prompt for Claude Code

## Project Overview

You are helping build **UniForm**, a React library that accepts a Zod V4 schema and automatically renders a fully customizable form. The library should be headless (zero default styles), generic, and support deep customization at every level.

This prompt covers **Phase 1 only**: project scaffolding, core type definitions, and the Zod schema introspection layer.

---

## Repository Structure

Set up a monorepo with the following structure:

```
uniform/
├── packages/
│   └── core/                  # The library itself
│       ├── src/
│       │   ├── types/         # All core TypeScript types
│       │   ├── introspection/ # Zod schema walker
│       │   ├── defaults/      # Default bare HTML components
│       │   └── index.ts       # Public exports
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   └── playground/            # Vite + React app for manual testing
│       ├── src/
│       └── package.json
├── package.json               # Root workspace config
└── tsconfig.base.json
```

Use **pnpm workspaces**. Use **tsup** for bundling the library. Use **Vite** for the playground app.

---

## Tooling & Configuration

### Root `package.json`

- pnpm workspaces pointing to `packages/*` and `apps/*`
- Scripts: `dev`, `build`, `test`, `lint` that delegate to workspaces

### `packages/core`

- **Bundler**: tsup, output both `esm` and `cjs`, generate `.d.ts` declaration files
- **TypeScript**: strict mode, `moduleResolution: bundler`, target ES2020
- **ESLint**: with `@typescript-eslint` and `eslint-plugin-react-hooks`
- **Vitest**: for unit tests, configured inside the core package
- **Peer dependencies**: `react@^19`, `react-hook-form@^7`, `zod@^3.25` (Zod V4 ships under this version range)
- **Dependencies**: `@hookform/resolvers`

### `apps/playground`

- Vite + React + TypeScript
- References `@uniform/core` via workspace protocol
- Has a simple page that renders a few `AutoForm` examples with different schemas

---

## Core Type Definitions

Create `packages/core/src/types/index.ts` with the following types. Think carefully about generics and extensibility.

### `FieldType`

A union of all supported field types:

```ts
type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select' // ZodEnum / ZodNativeEnum
  | 'object' // ZodObject (nested)
  | 'array' // ZodArray
  | 'union' // ZodUnion
  | 'unknown' // fallback for unsupported types
```

### `SelectOption`

```ts
type SelectOption = {
  label: string
  value: string | number
}
```

### `FieldCondition`

A function that receives the current form values and returns whether the field should be visible:

```ts
type FieldCondition<TValues = Record<string, unknown>> = (
  values: TValues,
) => boolean
```

### `FieldMeta`

Everything a user can attach via `.meta()` on a Zod schema:

```ts
type FieldMeta = {
  label?: string
  placeholder?: string
  description?: string // helper text below the field
  section?: string // grouping key
  order?: number // render order within its level
  span?: number // layout hint (e.g. grid column span, 1–12)
  hidden?: boolean
  disabled?: boolean
  condition?: FieldCondition // dynamic visibility
  component?: string // explicit component override key e.g. 'textarea'
  [key: string]: unknown // allow arbitrary user-defined metadata
}
```

### `FieldConfig`

The normalized descriptor for a single field, produced by the introspection layer:

```ts
type FieldConfig = {
  name: string // dot-notated path e.g. "address.street"
  type: FieldType
  label: string // derived from name if not in meta (capitalize, de-camelCase)
  required: boolean
  meta: FieldMeta
  options?: SelectOption[] // populated for 'select' type
  children?: FieldConfig[] // populated for 'object' type
  itemConfig?: FieldConfig // populated for 'array' type (describes each item)
  // For union types:
  unionVariants?: FieldConfig[]
  discriminatorKey?: string
}
```

### `FieldProps`

The props passed to every registered field component:

```ts
type FieldProps = {
  name: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  label: string
  placeholder?: string
  description?: string
  error?: string
  required: boolean
  disabled?: boolean
  options?: SelectOption[] // for select fields
  meta: FieldMeta // full meta for any custom needs
}
```

### `ComponentRegistry`

A map from field type (or custom string key) to a React component:

```ts
type ComponentRegistry = {
  string?: React.ComponentType<FieldProps>
  number?: React.ComponentType<FieldProps>
  boolean?: React.ComponentType<FieldProps>
  date?: React.ComponentType<FieldProps>
  select?: React.ComponentType<FieldProps>
  textarea?: React.ComponentType<FieldProps> // accessed via meta.component = 'textarea'
  [key: string]: React.ComponentType<FieldProps> | undefined
}
```

### `AutoFormProps<TSchema>`

The top-level props for the `<AutoForm>` component (to be implemented in Phase 2, but define the type now):

```ts
type AutoFormProps<TSchema extends z.ZodObject<z.ZodRawShape>> = {
  schema: TSchema
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  defaultValues?: Partial<z.infer<TSchema>>
  components?: ComponentRegistry
  fields?: Record<string, Partial<FieldMeta>> // per-field meta overrides
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
}
```

### `FieldWrapperProps`

```ts
type FieldWrapperProps = {
  children: React.ReactNode
  field: FieldConfig
  error?: string
}
```

### `LayoutSlots`

```ts
type LayoutSlots = {
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper?: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  submitButton?: React.ComponentType<{ isSubmitting: boolean }>
}
```

### `FormClassNames`

```ts
type FormClassNames = {
  form?: string
  fieldWrapper?: string
  label?: string
  description?: string
  error?: string
}
```

---

## Schema Introspection Layer

Create `packages/core/src/introspection/introspect.ts`.

This is the most important part of Phase 1. The function signature should be:

```ts
function introspectSchema(
  schema: z.ZodTypeAny,
  name?: string,
  parentPath?: string,
): FieldConfig
```

And a convenience wrapper:

```ts
function introspectObjectSchema(
  schema: z.ZodObject<z.ZodRawShape>,
): FieldConfig[]
```

### Rules for the walker

**Unwrapping**: Before inspecting a schema's type, always unwrap the following transparently (they don't produce their own field, they modify the inner field):

- `ZodOptional` → mark `required: false`, continue with inner type
- `ZodNullable` → mark `required: false`, continue with inner type
- `ZodDefault` → extract default value if needed, continue with inner type
- `ZodEffects` (`.transform()`, `.refine()`) → continue with inner type

**Type mapping**:

- `ZodString` → type `'string'`. Check `._def.checks` for `kind: 'email'`, `'url'`, `'uuid'` — store in meta as `inputType` hint
- `ZodNumber` → type `'number'`
- `ZodBoolean` → type `'boolean'`
- `ZodDate` → type `'date'`
- `ZodEnum` → type `'select'`, extract `.options` as `SelectOption[]` (value = option, label = capitalize(option))
- `ZodNativeEnum` → type `'select'`, extract entries from the enum object, filter out numeric reverse-mappings
- `ZodObject` → type `'object'`, recursively introspect each key in `.shape` to populate `children[]`
- `ZodArray` → type `'array'`, recursively introspect `._def.type` (the element schema) to populate `itemConfig`
- `ZodUnion` → type `'union'`, introspect each `.options` variant into `unionVariants[]`
- `ZodDiscriminatedUnion` → type `'union'`, set `discriminatorKey` from `._def.discriminator`, introspect each variant
- Anything else → type `'unknown'`

**Label derivation**: If no `meta.label` is present, derive a human-readable label from the field name:

- Split on camelCase boundaries and underscores
- Capitalize the first word
- e.g. `firstName` → `"First Name"`, `billing_address` → `"Billing Address"`

**Meta extraction**: Zod V4 stores `.meta()` data in `schema._def.metadata`. Extract it and merge with any defaults.

**Path construction**: When recursing into objects and arrays, build the dot-notated path:

- Object field `street` inside `address` → name is `address.street`
- Array items → name is `items` (the array field itself handles indexing at render time)

---

## Unit Tests

Create thorough unit tests in `packages/core/src/introspection/introspect.test.ts` using Vitest.

Cover the following cases:

1. **Scalar types** — string, number, boolean, date each produce the correct `type`
2. **Optional and nullable** — `z.string().optional()` produces `required: false`
3. **ZodDefault** — is unwrapped correctly
4. **ZodEnum** — produces type `'select'` with correct `options` array
5. **ZodNativeEnum** — produces type `'select'`, does not include reverse numeric mappings
6. **ZodObject** — produces type `'object'` with correct `children` array, names are correct
7. **Nested ZodObject** — deep nesting produces correctly dot-notated names
8. **ZodArray of scalars** — produces type `'array'` with correct scalar `itemConfig`
9. **ZodArray of objects** — `itemConfig` has type `'object'` with correct children
10. **ZodEffects** — `.refine()` and `.transform()` are unwrapped
11. **Label derivation** — camelCase and snake_case names produce correct labels
12. **Meta extraction** — `.meta({ label: 'Custom', span: 6 })` is reflected in output
13. **ZodDiscriminatedUnion** — `discriminatorKey` is set correctly
14. **ZodString email check** — `._def.checks` email kind is reflected in meta
15. **Deeply nested optional object** — all wrappings are correctly stripped

---

## Public Exports

`packages/core/src/index.ts` should export:

- All types from `types/index.ts`
- `introspectSchema` and `introspectObjectSchema` from the introspection layer
- Nothing else yet (rendering comes in Phase 2)

---

## Definition of Done for Phase 1

- [ ] pnpm monorepo installs cleanly with `pnpm install`
- [ ] `pnpm build` in `packages/core` produces `dist/` with esm, cjs, and `.d.ts` files
- [ ] `pnpm test` runs all introspection unit tests and they all pass
- [ ] The playground app runs with `pnpm dev` (even if it just renders a blank page for now)
- [ ] No TypeScript errors in strict mode across the entire monorepo
- [ ] ESLint passes with no errors

---

## Notes & Constraints

- Do not implement any React components or rendering logic in this phase
- Do not install or configure react-hook-form yet — that comes in Phase 2
- Keep the introspection layer pure (no React imports, no side effects) so it can be tested without a DOM
- Prefer explicit `instanceof` checks over `._def.typeName` string comparisons where possible — it's more type-safe
- The introspection layer should never throw — unknown or unsupported types should gracefully return `type: 'unknown'`
