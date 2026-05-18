import { describe, it, expect, vi } from 'vitest'
import * as z from 'zod/v4'
import { injectOnChangeHandlers } from './fieldPipeline'
import { UniForm } from '../UniForm'
import type { UniFormContext } from '../UniForm'
import type { FieldConfig, FieldDependencyResult } from '../types'
import type { RowAwareOnChange } from './createRowScopedContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal mock UniFormContext that records setFieldMeta calls.
 */
function createMockContext(): {
  ctx: UniFormContext<any>
  setFieldMetaCalls: Array<{
    field: string
    meta: Partial<FieldDependencyResult>
  }>
} {
  const setFieldMetaCalls: Array<{
    field: string
    meta: Partial<FieldDependencyResult>
  }> = []

  const ctx = {
    setValue: vi.fn(),
    setValues: vi.fn(),
    getValues: vi.fn(() => ({
      items: [
        { type: 'personal', note: 'hello' },
        { type: 'business', note: 'world' },
        { type: 'other', note: 'test' },
      ],
    })),
    resetField: vi.fn(),
    reset: vi.fn(),
    setError: vi.fn(),
    setErrors: vi.fn(),
    clearErrors: vi.fn(),
    submit: vi.fn(),
    focus: vi.fn(),
    watch: vi.fn(),
    setFieldMeta: vi.fn(
      (field: string, meta: Partial<FieldDependencyResult>) => {
        setFieldMetaCalls.push({ field, meta })
      },
    ),
  } as unknown as UniFormContext<any>

  return { ctx, setFieldMetaCalls }
}

/**
 * Creates a minimal array field config with object item children.
 */
function createArrayFieldConfig(
  arrayName: string,
  childFields: string[],
): FieldConfig {
  const children: FieldConfig[] = childFields.map((name) => ({
    type: 'string' as const,
    name,
    label: name,
    required: false,
    meta: {},
    schema: z.string() as any,
  }))

  return {
    type: 'array' as const,
    name: arrayName,
    label: arrayName,
    required: false,
    meta: {},
    schema: z.array(z.object({})) as any,
    itemConfig: {
      type: 'object' as const,
      name: 'item',
      label: 'Item',
      required: false,
      meta: {},
      schema: z.object({}) as any,
      children,
    },
  }
}

/**
 * Creates a simple string field config.
 */
function createStringFieldConfig(name: string): FieldConfig {
  return {
    type: 'string' as const,
    name,
    label: name,
    required: false,
    meta: {},
    schema: z.string() as any,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('injectOnChangeHandlers - row context', () => {
  // -------------------------------------------------------------------------
  // Requirement 2.1, 2.2: Array item onChange receives rowIndex parameter
  // -------------------------------------------------------------------------
  describe('array item onChange receives rowIndex parameter', () => {
    it('injects a RowAwareOnChange handler that accepts rowIndex as third argument', () => {
      const schema = z.object({
        items: z.array(z.object({ type: z.string(), note: z.string() })),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('items.type' as any, (value, ctx) => {
        ctx.setFieldMeta('note' as any, { placeholder: `${value}-placeholder` })
      })

      const { ctx } = createMockContext()
      const fields: FieldConfig[] = [
        createArrayFieldConfig('items', ['type', 'note']),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      // The array field's itemConfig children should have an onChange handler
      const arrayField = result[0]
      expect(arrayField.type).toBe('array')
      if (arrayField.type !== 'array') return
      expect(arrayField.itemConfig.type).toBe('object')
      if (arrayField.itemConfig.type !== 'object') return

      const typeChild = arrayField.itemConfig.children.find(
        (c) => c.name === 'type',
      )
      expect(typeChild).toBeDefined()
      expect(typeChild!.meta.onChange).toBeDefined()

      // The onChange should accept 3 arguments (value, formMethods, rowIndex)
      const handler = typeChild!.meta.onChange as RowAwareOnChange
      expect(handler.length).toBe(3)
    })

    it('fires the handler with the correct rowIndex when called', () => {
      const schema = z.object({
        items: z.array(z.object({ type: z.string(), note: z.string() })),
      })
      const handlerSpy = vi.fn()
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('items.type' as any, handlerSpy)

      const { ctx } = createMockContext()
      const fields: FieldConfig[] = [
        createArrayFieldConfig('items', ['type', 'note']),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const arrayField = result[0]
      if (
        arrayField.type !== 'array' ||
        arrayField.itemConfig.type !== 'object'
      )
        return

      const typeChild = arrayField.itemConfig.children.find(
        (c) => c.name === 'type',
      )
      const handler = typeChild!.meta.onChange as RowAwareOnChange

      // Call with rowIndex = 2
      const mockFormMethods = {} as any
      handler('business', mockFormMethods, 2)

      // The UniForm handler should have been called
      expect(handlerSpy).toHaveBeenCalledTimes(1)
    })

    it('preserves existing onChange on the child field', () => {
      const schema = z.object({
        items: z.array(z.object({ type: z.string(), note: z.string() })),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('items.type' as any, vi.fn())

      const existingOnChange = vi.fn()
      const { ctx } = createMockContext()

      // Create field config with an existing onChange on the child
      const arrayField = createArrayFieldConfig('items', ['type', 'note'])
      if (
        arrayField.type === 'array' &&
        arrayField.itemConfig.type === 'object'
      ) {
        const typeChild = arrayField.itemConfig.children.find(
          (c) => c.name === 'type',
        )!
        typeChild.meta = { ...typeChild.meta, onChange: existingOnChange }
      }

      const result = injectOnChangeHandlers([arrayField], uniForm as any, ctx)

      const resultArray = result[0]
      if (
        resultArray.type !== 'array' ||
        resultArray.itemConfig.type !== 'object'
      )
        return

      const typeChild = resultArray.itemConfig.children.find(
        (c) => c.name === 'type',
      )
      const handler = typeChild!.meta.onChange as RowAwareOnChange

      handler('personal', {} as any, 0)

      // The existing onChange should also have been called
      expect(existingOnChange).toHaveBeenCalledWith(
        'personal',
        expect.anything(),
      )
    })
  })

  // -------------------------------------------------------------------------
  // Requirement 2.1, 2.2: Scoped context's setFieldMeta produces row-qualified keys
  // -------------------------------------------------------------------------
  describe('scoped context setFieldMeta produces row-qualified keys', () => {
    it('produces keys like "arrayName.rowIndex.childField" for sibling fields', () => {
      const schema = z.object({
        items: z.array(z.object({ type: z.string(), note: z.string() })),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('items.type' as any, (value, ctx) => {
        ctx.setFieldMeta('note' as any, { placeholder: `${value}-ph` })
      })

      const { ctx, setFieldMetaCalls } = createMockContext()
      const fields: FieldConfig[] = [
        createArrayFieldConfig('items', ['type', 'note']),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const arrayField = result[0]
      if (
        arrayField.type !== 'array' ||
        arrayField.itemConfig.type !== 'object'
      )
        return

      const typeChild = arrayField.itemConfig.children.find(
        (c) => c.name === 'type',
      )
      const handler = typeChild!.meta.onChange as RowAwareOnChange

      // Fire for row 0
      handler('personal', {} as any, 0)

      expect(setFieldMetaCalls).toHaveLength(1)
      expect(setFieldMetaCalls[0].field).toBe('items.0.note')
      expect(setFieldMetaCalls[0].meta).toEqual({ placeholder: 'personal-ph' })
    })

    it('produces different qualified keys for different row indices', () => {
      const schema = z.object({
        items: z.array(z.object({ type: z.string(), note: z.string() })),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('items.type' as any, (value, ctx) => {
        ctx.setFieldMeta('note' as any, { hidden: true })
      })

      const { ctx, setFieldMetaCalls } = createMockContext()
      const fields: FieldConfig[] = [
        createArrayFieldConfig('items', ['type', 'note']),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const arrayField = result[0]
      if (
        arrayField.type !== 'array' ||
        arrayField.itemConfig.type !== 'object'
      )
        return

      const typeChild = arrayField.itemConfig.children.find(
        (c) => c.name === 'type',
      )
      const handler = typeChild!.meta.onChange as RowAwareOnChange

      // Fire for row 0
      handler('a', {} as any, 0)
      // Fire for row 5
      handler('b', {} as any, 5)

      expect(setFieldMetaCalls).toHaveLength(2)
      expect(setFieldMetaCalls[0].field).toBe('items.0.note')
      expect(setFieldMetaCalls[1].field).toBe('items.5.note')
    })

    it('passes through non-sibling field names without row prefix', () => {
      const schema = z.object({
        items: z.array(z.object({ type: z.string(), note: z.string() })),
        globalField: z.string(),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('items.type' as any, (value, ctx) => {
        // 'globalField' is not a sibling of the array item fields
        ctx.setFieldMeta('globalField' as any, { disabled: true })
      })

      const { ctx, setFieldMetaCalls } = createMockContext()
      const fields: FieldConfig[] = [
        createArrayFieldConfig('items', ['type', 'note']),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const arrayField = result[0]
      if (
        arrayField.type !== 'array' ||
        arrayField.itemConfig.type !== 'object'
      )
        return

      const typeChild = arrayField.itemConfig.children.find(
        (c) => c.name === 'type',
      )
      const handler = typeChild!.meta.onChange as RowAwareOnChange

      handler('business', {} as any, 2)

      // 'globalField' is not in the item's sibling set, so it passes through as-is
      expect(setFieldMetaCalls).toHaveLength(1)
      expect(setFieldMetaCalls[0].field).toBe('globalField')
      expect(setFieldMetaCalls[0].meta).toEqual({ disabled: true })
    })
  })

  // -------------------------------------------------------------------------
  // Requirement 4.1, 4.4: Non-array field handlers still use global context
  // -------------------------------------------------------------------------
  describe('non-array field handlers use global context', () => {
    it('top-level field onChange fires with the global context (no row scoping)', () => {
      const schema = z.object({
        country: z.string(),
        state: z.string(),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('country' as any, (value, ctx) => {
        ctx.setFieldMeta('state' as any, { hidden: value !== 'US' })
      })

      const { ctx, setFieldMetaCalls } = createMockContext()
      const fields: FieldConfig[] = [
        createStringFieldConfig('country'),
        createStringFieldConfig('state'),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const countryField = result.find((f) => f.name === 'country')!
      expect(countryField.meta.onChange).toBeDefined()

      // Call the onChange (non-array, so only 2 args: value, formMethods)
      countryField.meta.onChange!('Canada', {} as any)

      // setFieldMeta should be called on the global context with unqualified key
      expect(setFieldMetaCalls).toHaveLength(1)
      expect(setFieldMetaCalls[0].field).toBe('state')
      expect(setFieldMetaCalls[0].meta).toEqual({ hidden: true })
    })

    it('top-level field onChange does not prefix keys with any row index', () => {
      const schema = z.object({
        toggle: z.boolean(),
        detail: z.string(),
      })
      const uniForm = new UniForm(schema)
      uniForm.setOnChange('toggle' as any, (value, ctx) => {
        ctx.setFieldMeta('detail' as any, { disabled: !value })
      })

      const { ctx, setFieldMetaCalls } = createMockContext()
      const fields: FieldConfig[] = [
        {
          type: 'boolean' as const,
          name: 'toggle',
          label: 'Toggle',
          required: false,
          meta: {},
          schema: z.boolean() as any,
        },
        createStringFieldConfig('detail'),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const toggleField = result.find((f) => f.name === 'toggle')!
      toggleField.meta.onChange!(false, {} as any)

      expect(setFieldMetaCalls).toHaveLength(1)
      expect(setFieldMetaCalls[0].field).toBe('detail')
      // No dot-separated row index in the key
      expect(setFieldMetaCalls[0].field).not.toMatch(/\.\d+\./)
      expect(setFieldMetaCalls[0].meta).toEqual({ disabled: true })
    })

    it('does not inject onChange for fields without registered handlers', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
      })
      const uniForm = new UniForm(schema)
      // Only register handler for 'name', not 'email'
      uniForm.setOnChange('name' as any, vi.fn())

      const { ctx } = createMockContext()
      const fields: FieldConfig[] = [
        createStringFieldConfig('name'),
        createStringFieldConfig('email'),
      ]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      const nameField = result.find((f) => f.name === 'name')!
      const emailField = result.find((f) => f.name === 'email')!

      expect(nameField.meta.onChange).toBeDefined()
      expect(emailField.meta.onChange).toBeUndefined()
    })

    it('returns fields unchanged when no handlers are registered', () => {
      const schema = z.object({ name: z.string() })
      const uniForm = new UniForm(schema)
      // No handlers registered

      const { ctx } = createMockContext()
      const fields: FieldConfig[] = [createStringFieldConfig('name')]

      const result = injectOnChangeHandlers(fields, uniForm as any, ctx)

      // Should return the same reference since no handlers exist
      expect(result).toBe(fields)
    })
  })
})
