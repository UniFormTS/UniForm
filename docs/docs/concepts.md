---
title: How UniForm Works
sidebar_position: 3
description: A conceptual overview of UniForm's data model, rendering pipeline, and the role of createForm.
---

# How UniForm Works

This page explains the core concepts behind UniForm. You do not need to read this before using the library, but it will help you reason about what is happening under the hood and make better decisions when building complex forms.

## The two building blocks

UniForm is built around two objects:

- **`UniForm`** — created by `createForm(schema)`. Lives outside React. Holds the Zod schema and any field-level reactive behaviour you define (`setOnChange`, `setCondition`).
- **`<AutoForm>`** — a React component. Reads the `UniForm`, introspects the schema, and renders the form.

The separation is intentional: `createForm` is called once at module level (or in a stable outer scope), while `<AutoForm>` is rendered as many times as you need.

```ts
// Defined once — outside any component
const userForm = createForm(schema)
userForm.setOnChange('country', loadRegions)
userForm.setCondition('vatNumber', (v) => v.isBusinessAccount)

// Used anywhere
function Page() {
  return <AutoForm form={userForm} onSubmit={save} />
}
```

## Schema → fields pipeline

When `<AutoForm>` mounts, it walks the Zod schema and builds an ordered list of **field descriptors**. For each field it determines:

1. **Type key** — derived from the Zod type (`z.string()` → `"string"`, `z.enum(...)` → `"select"`, `z.boolean()` → `"boolean"`, etc.)
2. **Required** — whether the field is optional or nullable in the schema
3. **Options** — for enum/nativeEnum fields, the list of valid values
4. **Default value** — from `.default(...)` in the schema, or from the `defaultValues` prop

## Component resolution

For each field, UniForm picks the component to render in this order:

1. The `component` value in `fields[fieldName]` — if it is a React component, use it directly; if it is a string, look it up in the registry
2. The type key in the `components` registry provided to `<AutoForm>`
3. The same type key in the built-in `defaultRegistry`
4. A plain `<DefaultInput>` as a last resort

This means you can override at three levels of granularity: globally (registry), per-type (registry key), or per-field (`fields` prop).

## Rendering pipeline

```
Zod schema
   │
   ▼
Field descriptors (type key, label, required, options, …)
   │
   ├─ Apply field overrides from `fields` prop
   ├─ Evaluate `condition` / `setCondition` → hide/show fields
   ├─ Apply `order` and `section` grouping
   │
   ▼
For each visible field:
   └─ Resolve component from registry
   └─ Wrap in `fieldWrapper`
   └─ Render inside section (if any) → `sectionWrapper`

Wrap everything in `formWrapper` + `submitButton`
```

## How `createForm` differs from inline schema

You can pass a plain Zod object directly as `form` if you do not need reactive behaviour:

```tsx
// Minimal usage — no createForm needed if you only need onSubmit
<AutoForm form={{ schema }} onSubmit={save} />
```

`createForm` becomes necessary when you need:

- **`setOnChange`** — react to a field change and update other fields (e.g., load dependent options from an API)
- **`setCondition`** — show or hide a field based on other values, set up once outside the component

Both capabilities require stable references that survive re-renders, which is why `createForm` is designed to be called at module scope.

## Validation

UniForm uses `zodResolver` from `@hookform/resolvers` to run Zod validation through React Hook Form. Validation runs on submit by default. Errors from Zod are mapped back to field names and displayed via the `error` prop on each field component.

The `messages` prop lets you replace Zod's default English strings without modifying the schema. See [Validation & Error Messages](./guides/validation) for details.

## The headless contract

UniForm ships zero CSS and zero styled components. Every structural element — the form wrapper, section headings, the submit button, array row controls — has a default that renders semantic HTML, but is designed to be replaced.

The library divides the UI into two layers:

| Layer | How to replace |
|---|---|
| **Field components** (inputs, selects, checkboxes) | `components` prop / `createAutoForm` |
| **Structural chrome** (form wrapper, section wrapper, submit button, array row) | `layout` prop |

You can also add CSS classes to every structural element via `classNames` without replacing the components at all. See [Layout & Styling](./guides/layout).

## Conditional fields and form state

When a field is hidden (by `condition` or `setCondition`), UniForm **unregisters** it from React Hook Form. This has two consequences:

- Its value is excluded from the object passed to `onSubmit`
- Its validation rules do not run — the form can submit successfully without it

When the field becomes visible again, it is re-registered with its last known value restored.

## `createAutoForm` — baking in design-system defaults

If you have many forms across an application, `createAutoForm` lets you define your component registry, layout slots, class names, and default labels once and export a pre-configured form component:

```ts
export const AppForm = createAutoForm({
  components: myRegistry,
  layout: { formWrapper: Card, submitButton: PrimaryButton },
  classNames: { fieldWrapper: 'field', label: 'label', error: 'field-error' },
  labels: { submit: 'Save' },
})
```

Per-instance props shallow-merge on top of these defaults. Component registries are deep-merged, so you can override a single type without replacing the whole registry.
