# 02 — Container components and `<Field>`

## 2.1 Object and array container components

### Problem

A component set on an `object` or `array` field (`fields={{ lines: { component: LinesTable } }}`, or a registry key) is currently rendered like a leaf and receives only `FieldProps`. It cannot lay out the subtree while UniForm keeps registration, validation and errors for the leaves inside it.

### Requirements

- An `object` / `array` field with a component override renders that component **in place of** its whole subtree.
- Props are the `FieldProps` superset:
  - `path` — the container's absolute path.
  - `setPath(subPath, value, options?)` — targeted write relative to the container (`setPath('0.qty', 3)` writes `lines.0.qty`; `''` targets the container itself). `options` are `SetValueOptions` (spec 05).
  - Object containers: `fields` — the child `FieldConfig`s.
  - Array containers: `itemConfig`, `rows` (each with a stable `id`), `rowCount`, `canAdd`, `atMin`, and the row operations `append` / `prepend` / `insert` / `remove` / `move` / `swap` / `update` / `replace`.
- An array container is backed by a real field array, registered as in spec 01 §1.1, so `useArrayField(path)` drives it. Its row operations re-key row overrides as in §1.3.
- `onChange(nextArray)` from an array container goes through the field array's `replace`, so `rows` / `rowCount` stay in step. It does **not** clear row overrides (a whole-array write of edited cells should keep per-row options).
- A leaf edited inside the container writes only its own path — the container's `onChange` is not called.
- A container honours `condition` like any field: not rendered when false, value unregistered while hidden.
- Registry type: `[key: string]: ComponentType<FieldProps> | ComponentType<ObjectContainerProps> | ComponentType<ArrayContainerProps> | undefined`.
- Export `ContainerFieldProps`, `ObjectContainerProps`, `ArrayContainerProps`.

### Acceptance

- A table component renders each cell with `<Field name={`${i}.sku`} />`; cells register, validate, show per-row errors and submit.
- Cells use the registered component for their type.
- Typing in a cell never calls the container's `onChange`.
- Container `append` / `remove` update rows; `setPath('0.sku', 'X')` writes the leaf.
- Container `onChange([...3 rows])` updates `rowCount` to 3.
- `useArrayField('lines')` in a sibling drives an array rendered by a container component.

## 2.2 `<Field>`

### Purpose

Render one field exactly as `<AutoForm>` would — same registry, resolved config, wrapper and error — anywhere **inside** the `<AutoForm>` tree: container components, layout slots, custom wrappers.

### API

```tsx
<Field
  name='address.city'
  component={MyInput}
  label='Town'
  disabled
  className='wide'
/>
```

- `name` — required.
- `component`, `label`, `disabled` — per-instance overrides.
- `className` — appended to `meta.className` (both apply), not substituted.
- `FieldComponentProps` is exported.

### Requirements

- **Paths.** Absolute by default (`'address.city'`, `'lines.0.qty'`). Inside a container component, relative to the container's path (`'0.qty'`) — every container sets a field-path context for its subtree.
- **Array rows.** A field resolved inside an array row gets the same row binding the built-in array renderer applies:
  - row-scoped `setOnChange` handlers receive the correct row index — their `ctx.getValues()` returns that row, and `ctx.setFieldMeta(sibling, …)` is scoped to that row;
  - per-row dynamic meta for that row applies.
- **Visibility.** Honours every `condition` / `setCondition` on the path, including ancestors', each evaluated in the scope the auto-rendered form uses (the row for fields inside array rows, otherwise the whole form).
  - Renders nothing while any condition is false.
  - Unregisters its value while hidden (same as a conditional field in `<AutoForm>`).
  - **Ignores `meta.hidden`** — `hidden` is how a field is removed from the auto layout so the app can place it with `<Field>`. Document this.
- **Required marker.** Follows `setRequired` / `requiredWhen` (spec 03) live, including `aria-required`.
- **Unknown path.** Warn once, render nothing.
- **Cost.** Subscribe to form values only when the path has a condition or `requiredWhen` — a plain `<Field>` must not re-render on every change.
- **Rendering the same path twice** (with `<Field>` and via the auto layout) is a user error; document hiding it from the auto layout with `fields={{ x: { hidden: true } }}`.
- `useField(path)` is the internal hook behind `<Field>`. **Not exported.**

### Acceptance

- `<Field name='lines.1.sku' />` fires a `setOnChange('lines.sku', …)` handler whose `ctx.getValues()` is row 1.
- A `<Field>` for a field with `setCondition` appears and disappears as values change; its value is excluded from submit while hidden.
- `<Field>` for a field with a `requiredWhen` shows / hides the asterisk as values change.
- `className` on `<Field>` is combined with `meta.className`.
- An unknown path warns and renders nothing.
