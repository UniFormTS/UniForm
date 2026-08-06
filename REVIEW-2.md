## How the project uses `@uniform-ts/core`

**Two independent `createAutoForm` factories** bake in this app's design system:

- ProcessForm.tsx — the big one, used for backend-driven process forms (`/processes/$name`). Registers custom `string`/`textarea`/`select`/`date`/`number`/`radio` components (FormInput, FormTextarea.tsx, FormSelect.tsx, FormDatePicker.tsx, FormNumber.tsx, FormRadio.tsx), a custom `fieldWrapper` (FieldWrapper.tsx), and a custom `formWrapper`/`submitButton` layout.
- FilterAutoForm.tsx — a simpler, static-schema instance for the purchase-reqs filter drawer, paired with a hand-written `createForm(z.object({...}))` in filterForm.ts.

**Schema is generated at runtime, not authored by hand**, for the process-forms case: build-form.ts + build-form-schema.ts turn backend `FormField[]` metadata into a Zod schema via `.meta()`, using **`GlobalMeta` module augmentation** to carry app-specific fields (`dataType`, `optionsQuery`, `optionsDependsOn`, `conditions`, `validations`, `width`, `status`, ...) straight through to `FieldProps.meta` in the custom components. This is the main way the app leans on the library's extensibility — presentation and behavior travel through schema `.meta()` rather than the `fields` prop (grep confirms `fields={{...}}` is never used anywhere in the app).

**Reactivity** is used heavily:
- `form.setCondition` drives per-field visibility for backend "SHOW" conditions (and unregisters hidden fields).
- `form.setOnChange` cascades resets through a manually-computed *transitive* dependency graph when a parent option field changes (UniForm's `setOnChange` only fires from real UI `onChange`, not programmatic `setValue`, so the app has to do the multi-level walk itself).
- `useAutoFormContext` is used inside FormSelect.tsx to `watch()` sibling fields for dependent-options queries and to read `fieldConfigs` for labels.

**Not used**: `useArrayField`/array fields (no repeating-row forms exist yet), `persistKey` (the multi-step process flow instead uses a versioned, persisted Zustand store — needs cross-route lifetime and migrations that a single `<AutoForm>`'s `sessionStorage` persistence doesn't offer), `AutoFormHandle`/`formRef.setErrors` (deliberately removed — backend `/validate` issues are rendered through a separate issue-anchoring system instead of pushed into RHF field errors), locale packs (only one inline `labels={{ submit: "..." }}` override despite the app being Hebrew/RTL-first), and `messages` overrides.

## Where I feel the library is currently missing something

1. **No dynamic "required."** `FieldDependencyResult` (the type behind `ctx.setFieldMeta`) only carries `options/hidden/disabled/label/placeholder/description` — no `required`. Backend "REQUIRE" conditions had to be enforced entirely via a top-level `superRefine` in the generated schema, with no built-in way to reflect that state live in the UI (e.g. a required asterisk) the way `setCondition`/`hidden` does for visibility.
2. **Arrays are object-rows only.** `z.array(z.string())` (or any primitive array) isn't rendered by the array machinery — this app's "multiple" option fields had to be handled as custom scalar-array selects outside `useArrayField` entirely, rather than the library having a first-class multi-value field type.
3. **Option identity assumes scalars.** Select values are pushed toward string/number identity; anything richer (this app's composite `{col1, col2}` IDs) needs a hand-rolled key/equality layer (`optionValueKey`) built entirely outside the library, plus care in `SelectFieldRoot`-style components not to conflate a derived key with the raw value.
4. **`setOnChange` doesn't compose into a declared dependency graph.** It only fires on real UI interaction, and only one handler per field is kept, so cascading resets across chained dependencies (A→B→C) must be computed by the caller instead of being expressed declaratively once.
5. **Persistence and error-reporting are single-`AutoForm`-shaped.** `persistKey` assumes one form's lifetime/storage; `setErrors`/`AutoFormHandle` assumes flat field-name-keyed errors. Multi-step flows or errors anchored to something other than a single field path (cart items, cross-entity issues) fall outside what the library offers, forcing bespoke state and rendering layers.