# UniForm — Phase 5 Prompt: Polish & Release

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phases 1–4 are complete — there are 82 passing tests (34 introspection + 48 AutoForm), a recursive field renderer, unstyled default components, a component registry with a 4-step resolution chain, conditional fields, section grouping, layout slots, CSS class name threading, a `createAutoForm()` factory, pluggable coercion, custom validation messages, and deep field overrides.

This prompt covers **Phase 5 only**: polish and release. The library is feature-complete — this phase is about hardening it with end-to-end integration tests, building out the playground into a proper showcase, writing documentation, setting up CI/CD for automated quality gates, and preparing the package for npm publishing.

Before writing any code, read the existing test files, the playground `App.tsx`, the `README.md`, and the `package.json` files to make sure everything you build is consistent with what already exists.

---

## Current State (What Already Exists)

### Test Coverage

**82 passing tests** across two test files:

- `introspection/introspect.test.ts` — 34 tests covering all Zod type handling (scalars, enums, nativeEnums, objects, arrays, optionals, nullables, defaults, pipes/transforms, unions, discriminated unions, meta extraction, label derivation, unknown types)
- `components/AutoForm.test.tsx` — 48 tests covering rendering, validation, RHF integration, conditional fields, section grouping, layout slots, className threading, factory, coercion, validation messages, and deep field overrides

All tests use Vitest + React Testing Library + `@testing-library/user-event` with jsdom. The test setup file (`test-setup.ts`) imports `@testing-library/jest-dom/vitest`.

### Playground (`apps/playground`)

Vite + React app with **7 example forms** in `App.tsx`:

1. **classNames + span** — CSS Grid layout, `classNames` for styling, `meta.span` for columns
2. **Section grouping** — `meta.section` with ordered fields and section wrappers
3. **Custom layout slots** — `formWrapper`, `sectionWrapper`, `submitButton` via `layout` prop
4. **Custom fieldWrapper** — card-style wrapper with error highlighting
5. **createAutoForm factory** — branded input, field wrapper, and submit button via `createAutoForm()`
6. **Custom validation messages** — three levels of error message customization
7. **Deep field overrides** — dot-notated overrides for nested objects

Each example has its own schema, helper components, and commentary. The playground currently uses no CSS framework — all styling is inline.

### Package Configuration (`packages/core/package.json`)

```json
{
  "name": "@uniform/core",
  "version": "0.0.1",
  "private": false,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "peerDependencies": {
    "react": "^19",
    "react-hook-form": "^7",
    "zod": ">=3.25"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2"
  }
}
```

Build: `tsup` (ESM + CJS + `.d.ts`, sourcemaps, treeshaking, react/react-hook-form/zod external).

### Public API (`packages/core/src/index.ts`)

```ts
// Types
export type {
  FieldType,
  SelectOption,
  FieldCondition,
  FieldMeta,
  FieldConfig,
  FieldProps,
  ComponentRegistry,
  FieldWrapperProps,
  LayoutSlots,
  FormClassNames,
  AutoFormProps,
  AutoFormConfig,
  CoercionMap,
  ValidationMessages,
}

// Introspection
export { introspectSchema, introspectObjectSchema }

// Components
export { AutoForm, FieldRenderer }

// Default components
export {
  DefaultInput,
  DefaultCheckbox,
  DefaultSelect,
  DefaultFieldWrapper,
  DefaultSubmitButton,
}

// Registry
export { defaultRegistry, mergeRegistries }

// Factory
export { createAutoForm }

// Coercion
export { coerceValue, defaultCoercionMap }

// Hooks
export { useConditionalFields, useSectionGrouping }
export type { SectionGroup }
```

### Root Monorepo (`package.json`)

```json
{
  "name": "uniform-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @uniform/playground dev",
    "build": "pnpm --filter @uniform/core build",
    "test": "pnpm --filter @uniform/core test",
    "lint": "pnpm -r lint"
  }
}
```

### README

The `README.md` covers the monorepo structure, package descriptions (types, introspection, rendering, layout, customization), playground examples list, getting started commands (`pnpm install`, `pnpm build`, `pnpm test`, `pnpm dev`), and the tech stack. It does **not** have a quick-start guide with code examples, an API reference, or a recipes section.

---

## What to Build

### 1. Integration Tests (Render → Fill → Submit)

The existing 48 AutoForm tests cover individual features in isolation. Add a new set of **end-to-end integration tests** that simulate a real user workflow: render a complex form, fill in fields, interact with dynamic features, submit, and verify the `onSubmit` callback receives the correct data.

#### File: `packages/core/src/components/AutoForm.test.tsx`

Continue the existing test numbering (start at test 49). All new tests go in the same file.

##### 49. Full form flow — flat schema render → fill → submit

Define a schema with a string, number, enum, and boolean field. Render `<AutoForm>`. Fill all fields using `userEvent`. Submit the form. Assert `onSubmit` is called with the correct fully-typed values (string as `string`, number as `number`, enum as the selected option, boolean as `boolean`).

##### 50. Full form flow — nested object schema

Define a schema with a top-level string and a nested `address` object (`street`, `city`, `zip`). Render, fill all fields including nested ones, submit. Assert `onSubmit` receives the correctly nested object shape.

##### 51. Full form flow — array field add rows and submit

Define a schema with an array of objects. Render with one default row. Click "Add" to add a second row. Fill both rows. Submit. Assert `onSubmit` receives an array with two correctly filled items.

##### 52. Full form flow — array field remove row and submit

Render with two default array rows. Fill both. Remove the second row (click Remove). Submit. Assert `onSubmit` receives an array with only the first item.

##### 53. Validation errors block submit and display on all invalid fields

Define a schema with three required fields. Leave all empty. Submit. Assert `onSubmit` is NOT called. Assert all three fields show validation error messages relevant to them.

##### 54. Fix validation errors and resubmit succeeds

After test 53's pattern: submit with empty fields → errors appear → fill all fields → submit again → assert `onSubmit` IS called with correct values and errors are cleared.

##### 55. Conditional field appears only when condition is met then submits correctly

Define a schema with a boolean `hasDiscount` and a conditional `discountCode` field (condition: `hasDiscount` is true). Render — assert `discountCode` is not visible. Check the `hasDiscount` checkbox — assert `discountCode` appears. Fill it. Submit. Assert `onSubmit` receives both values.

##### 56. Section grouping renders sections and submits all field values

Define a schema with fields assigned to two sections. Render. Assert both section headings are visible. Fill all fields. Submit. Assert `onSubmit` receives all values from all sections.

##### 57. `createAutoForm` factory end-to-end with styled components

Create a factory with custom components and a custom field wrapper. Define a schema with multiple field types. Render the factory-created component. Assert custom components are rendered (not defaults). Fill all fields. Submit. Assert correct values.

##### 58. Custom coercion + validation messages end-to-end

Render a form with a number field, custom coercions, and custom messages. Leave the field empty → submit → assert the custom "required" message appears. Fill with a valid number → submit → assert `onSubmit` receives the coerced number value.

##### 59. Deep field overrides + nested submit

Define a schema with a nested object. Pass deep field overrides (e.g. `'address.city': { placeholder: 'Town' }`). Render. Assert the override applies (placeholder is set). Fill all fields. Submit. Assert the nested object is correctly shaped in `onSubmit`.

##### 60. Full kitchen-sink form — all features combined

Define a complex schema that exercises every feature simultaneously:

- Mix of scalar types (string, number, date, boolean, enum)
- A nested object
- An array field
- Section grouping on some fields
- A conditional field
- Custom class names
- Deep field overrides
- Custom validation messages

Render the form. Fill all visible fields. Trigger the conditional field and fill it. Submit. Assert `onSubmit` receives the entire complex data structure with correct types and nesting. This is the ultimate regression test.

---

### 2. Playground Enhancements

The playground already has 7 good examples. Enhance it to serve as a proper showcase and development tool.

#### a. Add Navigation / Table of Contents

Add a simple navigation bar or table of contents at the top of the page with anchor links to each example section. This makes it easy to jump between examples as the page grows.

#### b. Add Example 8: Full Kitchen Sink

Add a comprehensive example that combines every feature in one form:

- Schema with string, number, date, boolean, enum fields
- A nested `address` object
- An array of `items`
- Section grouping (`'Personal'`, `'Address'`, `'Items'`)
- Conditional field (e.g. `hasNotes` boolean → `notes` text field)
- Custom class names for grid layout
- Deep field overrides for nested fields
- Custom validation messages
- `createAutoForm` factory for branded components

This serves as both a visual demo and a manual integration test.

#### c. Add Example 9: Disabled Form State

Add a short example showing a form rendered with `disabled={true}`. This demonstrates that all fields are properly disabled and the submit button is non-interactive.

#### d. Add a "Submitted Data" Display

Instead of `alert(JSON.stringify(...))` for each example, add a small `<pre>` block below each form that shows the last submitted data. This is more user-friendly and avoids modal interruptions. Pattern:

```tsx
const [data, setData] = useState<unknown>(null)

<AutoForm schema={schema} onSubmit={(v) => setData(v)} />
{data && (
  <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: 4, marginTop: '0.5rem', fontSize: '0.85rem', overflow: 'auto' }}>
    {JSON.stringify(data, null, 2)}
  </pre>
)}
```

Apply this pattern to **all** examples, replacing the `alert()` calls.

#### e. Update Page Title

Change the page heading from `"UniForm Playground — Phase 4"` to `"UniForm Playground"`.

---

### 3. Documentation — README Rewrite

Rewrite the `README.md` to serve as the primary documentation for the library. It should be useful to a developer who has never seen UniForm before.

#### Structure:

```
# UniForm

> Headless React + Zod V4 form library. Zero styles — bring your own components.

## Features (bullet list)
## Quick Start
## Installation
## Basic Usage (code example)
## API Reference
  ### `<AutoForm>` Props
  ### `createAutoForm(config)`
  ### Types
    #### `AutoFormProps`
    #### `AutoFormConfig`
    #### `FieldMeta`
    #### `ComponentRegistry`
    #### `FieldProps`
    #### `FieldWrapperProps`
    #### `LayoutSlots`
    #### `FormClassNames`
    #### `CoercionMap`
    #### `ValidationMessages`
## Recipes
  ### Custom Components
  ### Grid Layout with `classNames` and `span`
  ### Section Grouping
  ### Conditional Fields
  ### Custom Validation Messages
  ### Factory Pattern with `createAutoForm`
  ### Deep Field Overrides
## Contributing
## License
```

#### Key Sections:

**Quick Start:**

```bash
npm install @uniform/core react react-hook-form zod
```

```tsx
import * as z from 'zod/v4'
import { AutoForm } from '@uniform/core'

const schema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().min(0).optional(),
})

function App() {
  return <AutoForm schema={schema} onSubmit={(values) => console.log(values)} />
}
```

**API Reference:**

Document every prop of `<AutoForm>` and every public type. For each prop, include: name, type, default value (if any), and a one-line description. For complex props (`components`, `layout`, `classNames`, `fields`, `messages`, `coercions`), include a short code snippet.

**Recipes:**

Each recipe should be a self-contained code example (15–30 lines) showing one feature clearly. Use the playground examples as inspiration but keep the README examples minimal and focused.

---

### 4. CI/CD Setup with GitHub Actions

#### File: `.github/workflows/ci.yml`

Create a GitHub Actions workflow that runs on every push and pull request:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Typecheck
        run: pnpm -r exec tsc --noEmit
```

This workflow:

- Tests on Node 20 and 22
- Installs with frozen lockfile (deterministic)
- Builds the library (catches tsup/bundling issues)
- Runs all tests (catches regressions)
- Runs TypeScript type checking (catches type errors not caught by tests)

#### File: `.github/workflows/publish.yml`

Create a manual-trigger workflow for publishing to npm:

```yaml
name: Publish

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Version bump
        working-directory: packages/core
        run: npm version ${{ github.event.inputs.version }}

      - name: Publish
        working-directory: packages/core
        run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Push version commit and tag
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore: release v$(node -p "require('./packages/core/package.json').version")"
          git push
          git push --tags
```

This is a manual workflow (triggered from the GitHub Actions UI) that:

- Runs the full build + test suite first
- Bumps the version in `packages/core/package.json`
- Publishes to npm with public access
- Commits the version bump and pushes back to the repo

---

### 5. Package Preparation

#### a. Add `LICENSE` File

Create a `LICENSE` file at the root with the MIT license text. Use the current year and "UniForm Contributors" as the copyright holder.

#### b. Add `keywords` and `repository` to `packages/core/package.json`

```json
{
  "keywords": [
    "react",
    "form",
    "zod",
    "headless",
    "auto-form",
    "schema",
    "react-hook-form"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/uniform/core.git"
  },
  "homepage": "https://github.com/uniform/core#readme"
}
```

NOTE: Use a placeholder GitHub URL. The consumer will update these when they set up their own repo.

#### c. Add `sideEffects: false` to `packages/core/package.json`

This tells bundlers the package is safe to tree-shake.

#### d. Verify `files` Field

The `"files": ["dist"]` already exists — verify the build output (`.js`, `.mjs`, `.d.ts`, `.map` files) is in `dist/` after running `pnpm build`.

#### e. Add a Root `.npmignore` or Verify `.gitignore`

Ensure that test files, playground sources, and documentation are not included in the npm package. The `"files": ["dist"]` whitelist in `package.json` should handle this, but verify by running `npm pack --dry-run` from `packages/core`.

---

## File Changes Summary

| File                                             | Change                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `packages/core/src/components/AutoForm.test.tsx` | Add integration tests 49–60                                                       |
| `apps/playground/src/App.tsx`                    | Add navigation, examples 8–9, replace `alert()` with data display, update heading |
| `README.md`                                      | Full rewrite with quick start, API reference, recipes                             |
| `.github/workflows/ci.yml`                       | **NEW** — CI workflow (build, test, typecheck on push/PR)                         |
| `.github/workflows/publish.yml`                  | **NEW** — manual npm publish workflow                                             |
| `LICENSE`                                        | **NEW** — MIT license                                                             |
| `packages/core/package.json`                     | Add `keywords`, `license`, `repository`, `homepage`, `sideEffects`                |

---

## Definition of Done for Phase 5

- [ ] Integration tests 49–60 all pass
- [ ] All 82 existing tests still pass (no regressions) — total: 94 tests
- [ ] Playground has navigation/TOC with anchor links
- [ ] Playground has Example 8 (kitchen sink) and Example 9 (disabled state)
- [ ] All playground examples show submitted data in a `<pre>` block instead of `alert()`
- [ ] Playground heading updated to "UniForm Playground"
- [ ] `README.md` contains: features list, quick start, installation, basic usage, full API reference for all public types and props, and at least 5 recipes with code examples
- [ ] `.github/workflows/ci.yml` exists and correctly defines build → test → typecheck pipeline for Node 20+22
- [ ] `.github/workflows/publish.yml` exists with manual trigger and version bump logic
- [ ] `LICENSE` file exists at root with MIT license
- [ ] `packages/core/package.json` has `keywords`, `license`, `repository`, `homepage`, `sideEffects: false`
- [ ] `pnpm build` succeeds and `dist/` contains `.js`, `.mjs`, `.d.ts` files
- [ ] `npm pack --dry-run` from `packages/core` only includes `dist/` and `package.json`
- [ ] No TypeScript errors in strict mode
- [ ] All test files pass: `pnpm test`

---

## Notes & Constraints

- Do not break any existing functionality. The 82 Phase 1–4 tests must remain green.
- Do not add CSS or any styling opinions to the library. The playground can use inline styles for demonstration purposes.
- Do not add new runtime dependencies to `@uniform/core`.
- The playground is allowed to add dev dependencies if needed (e.g. for syntax highlighting), but keep it minimal.
- Integration tests should simulate real user behavior — use `userEvent` for all interactions, never directly set input values.
- The README should be accurate to the current API. Do not document features that don't exist. Read the actual types and components before writing documentation.
- The CI workflow should use `pnpm install --frozen-lockfile` to ensure deterministic installs.
- The publish workflow should include `--no-git-checks` since pnpm may not recognize the GitHub Actions environment as clean.
- Keep the `repository` and `homepage` URLs as reasonable placeholders — the consumer will update them for their own GitHub repo.
- Use `actions/checkout@v4`, `pnpm/action-setup@v4`, and `actions/setup-node@v4` — the latest stable versions at time of writing.
