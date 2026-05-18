import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { UniForm, createForm } from '../UniForm'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(ui: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  }
}

// ---------------------------------------------------------------------------
// Regression: Non-array setFieldMeta behavior unchanged after per-row changes
// Validates: Requirements 4.1, 4.3
// ---------------------------------------------------------------------------

describe('Regression: non-array setFieldMeta behavior', () => {
  // -------------------------------------------------------------------------
  // Requirement 4.1: setFieldMeta for top-level (non-array) fields applies
  // globally, preserving current behavior.
  // -------------------------------------------------------------------------

  it('setFieldMeta hides a top-level field globally when onChange fires', async () => {
    const schema = z.object({
      type: z.enum(['individual', 'company']),
      companyName: z.string().optional(),
    })
    const form = createForm(schema).setOnChange('type', (value, ctx) => {
      ctx.setFieldMeta('companyName', { hidden: value !== 'company' })
    })

    const { user } = setup(<AutoForm form={form} onSubmit={vi.fn()} />)

    // Switch to 'company' → companyName visible
    await user.selectOptions(screen.getByRole('combobox'), 'company')
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    })

    // Switch to 'individual' → companyName hidden
    await user.selectOptions(screen.getByRole('combobox'), 'individual')
    await waitFor(() => {
      expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument()
    })
  })

  it('setFieldMeta disables a top-level field globally when onChange fires', async () => {
    const schema = z.object({
      isLocked: z.boolean(),
      notes: z.string().optional(),
    })
    const form = createForm(schema).setOnChange('isLocked', (value, ctx) => {
      ctx.setFieldMeta('notes', { disabled: value === true })
    })

    const { user } = setup(<AutoForm form={form} onSubmit={vi.fn()} />)

    // Initially not disabled
    expect(screen.getByRole('textbox')).not.toBeDisabled()

    // Check the boolean → notes disabled
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })

  it('setFieldMeta updates label of a top-level field globally', async () => {
    const schema = z.object({
      unit: z.enum(['kg', 'lbs']),
      quantity: z.number().optional(),
    })
    const form = createForm(schema).setOnChange('unit', (value, ctx) => {
      ctx.setFieldMeta('quantity', { label: `Quantity (${String(value)})` })
    })

    const { user } = setup(
      <AutoForm
        form={form}
        onSubmit={vi.fn()}
        defaultValues={{ unit: 'kg' }}
      />,
    )

    // Change unit to 'lbs' → label updates
    await user.selectOptions(screen.getByRole('combobox'), 'lbs')
    await waitFor(() => {
      expect(screen.getByLabelText('Quantity (lbs)')).toBeInTheDocument()
    })

    // Change back to 'kg' → label updates again
    await user.selectOptions(screen.getByRole('combobox'), 'kg')
    await waitFor(() => {
      expect(screen.getByLabelText('Quantity (kg)')).toBeInTheDocument()
    })
  })

  it('setFieldMeta updates select options of a top-level field globally', async () => {
    const schema = z.object({
      category: z.enum(['fruit', 'veggie']),
      item: z.enum(['apple', 'banana', 'carrot', 'broccoli']),
    })
    const form = createForm(schema).setOnChange('category', (value, ctx) => {
      ctx.setFieldMeta('item', {
        options:
          value === 'veggie'
            ? [
                { label: 'Carrot', value: 'carrot' },
                { label: 'Broccoli', value: 'broccoli' },
              ]
            : [
                { label: 'Apple', value: 'apple' },
                { label: 'Banana', value: 'banana' },
              ],
      })
    })

    const { user } = setup(
      <AutoForm
        form={form}
        onSubmit={vi.fn()}
        defaultValues={{ category: 'fruit' }}
      />,
    )

    const [categorySelect] = screen.getAllByRole('combobox')
    await user.selectOptions(categorySelect, 'veggie')

    await waitFor(() => {
      const [, itemSelect] = screen.getAllByRole('combobox')
      expect(
        within(itemSelect).getByRole('option', { name: 'Carrot' }),
      ).toBeInTheDocument()
      expect(
        within(itemSelect).queryByRole('option', { name: 'Apple' }),
      ).not.toBeInTheDocument()
    })
  })

  it('setFieldMeta updates placeholder of a top-level field globally', async () => {
    const schema = z.object({
      role: z.enum(['admin', 'user']),
      notes: z.string().optional(),
    })
    const form = createForm(schema).setOnChange('role', (value, ctx) => {
      ctx.setFieldMeta('notes', {
        placeholder: `Enter notes for ${String(value)}`,
      })
    })

    const { user } = setup(<AutoForm form={form} onSubmit={vi.fn()} />)

    await user.selectOptions(screen.getByRole('combobox'), 'admin')
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Enter notes for admin'),
      ).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox'), 'user')
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Enter notes for user'),
      ).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Regression: setCondition per-row scoping still works after per-row-field-meta
// Validates: Requirement 4.3
// ---------------------------------------------------------------------------

describe('Regression: setCondition per-row scoping', () => {
  it('setCondition on array item field receives row values and toggles visibility', async () => {
    const schema = z.object({
      tasks: z.array(
        z.object({
          priority: z.enum(['low', 'high']),
          note: z.string().optional(),
        }),
      ),
    })
    const form = createForm(schema)
    form.setCondition('tasks.note', (row) => row.priority === 'high')

    const { user } = setup(
      <AutoForm
        form={form}
        onSubmit={vi.fn()}
        defaultValues={{ tasks: [{ priority: 'low' }] }}
      />,
    )

    // note hidden when priority is 'low'
    expect(screen.queryByLabelText(/note/i)).not.toBeInTheDocument()

    // change to 'high' — note should appear
    await user.selectOptions(screen.getByRole('combobox'), 'high')
    await waitFor(() => {
      expect(screen.getByLabelText(/note/i)).toBeInTheDocument()
    })

    // change back to 'low' — note should disappear
    await user.selectOptions(screen.getByRole('combobox'), 'low')
    await waitFor(() => {
      expect(screen.queryByLabelText(/note/i)).not.toBeInTheDocument()
    })
  })

  it('row conditions are evaluated independently per row', async () => {
    const schema = z.object({
      tasks: z.array(
        z.object({
          priority: z.enum(['low', 'high']),
          note: z.string().optional(),
        }),
      ),
    })
    const form = createForm(schema)
    form.setCondition('tasks.note', (row) => row.priority === 'high')

    const { user } = setup(
      <AutoForm
        form={form}
        onSubmit={vi.fn()}
        defaultValues={{ tasks: [{ priority: 'low' }, { priority: 'high' }] }}
      />,
    )

    // row 0: low → note hidden; row 1: high → note visible → 1 note field total
    await waitFor(() => {
      expect(screen.getAllByLabelText(/note/i)).toHaveLength(1)
    })

    // set row 0 to 'high' → both rows show note → 2 note fields
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'high')
    await waitFor(() => {
      expect(screen.getAllByLabelText(/note/i)).toHaveLength(2)
    })
  })

  it('setCondition and setOnChange/setFieldMeta coexist on the same array', async () => {
    const schema = z.object({
      items: z.array(
        z.object({
          type: z.enum(['basic', 'advanced']),
          detail: z.string().optional(),
          extra: z.string().optional(),
        }),
      ),
    })
    const form = createForm(schema)
    // setCondition controls visibility of 'extra' based on row values
    form.setCondition('items.extra', (row) => row.type === 'advanced')
    // setOnChange controls placeholder of 'detail' per-row
    form.setOnChange('items.type', (value, ctx) => {
      ctx.setFieldMeta('detail', {
        placeholder: `${String(value)} detail`,
      })
    })

    const { user } = setup(
      <AutoForm
        form={form}
        onSubmit={vi.fn()}
        defaultValues={{
          items: [{ type: 'basic' }, { type: 'basic' }],
        }}
      />,
    )

    // Initially: 'extra' hidden for both rows (type is 'basic')
    expect(screen.queryByLabelText(/extra/i)).not.toBeInTheDocument()

    // Change row 0 to 'advanced'
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'advanced')

    await waitFor(() => {
      // Row 0's 'extra' should now be visible (condition met)
      expect(screen.getAllByLabelText(/extra/i)).toHaveLength(1)
      // Row 0's 'detail' should have the placeholder from setFieldMeta
      const details = screen.getAllByLabelText(/detail/i)
      expect(details[0]).toHaveAttribute('placeholder', 'advanced detail')
    })

    // Row 1 should still have 'extra' hidden and no placeholder override yet
    await waitFor(() => {
      const details = screen.getAllByLabelText(/detail/i)
      expect(details[1]).not.toHaveAttribute('placeholder', 'advanced detail')
    })
  })

  it('conditional array item field is absent from submitted data when condition is false', async () => {
    const schema = z.object({
      tasks: z.array(
        z.object({
          priority: z.enum(['low', 'high']),
          note: z.string().optional(),
        }),
      ),
    })
    const form = createForm(schema)
    form.setCondition('tasks.note', (row) => row.priority === 'high')

    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={form}
        onSubmit={onSubmit}
        defaultValues={{ tasks: [{ priority: 'low' }] }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      const row = (
        onSubmit.mock.calls[0] as [{ tasks: Record<string, unknown>[] }]
      )[0].tasks[0]
      expect(row).not.toHaveProperty('note')
    })
  })
})
