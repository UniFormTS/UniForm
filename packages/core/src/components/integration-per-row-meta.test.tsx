import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createForm } from '../UniForm'

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
// Integration: Full array form with per-row meta
// Validates: Requirements 1.1, 1.4, 1.5
// ---------------------------------------------------------------------------

describe('Integration: full array form with per-row meta', () => {
  // -------------------------------------------------------------------------
  // 1. Trigger onChange in a specific row, verify only that row's meta changes
  // Requirement 1.1: setFieldMeta scoped to the row where change occurred
  // -------------------------------------------------------------------------

  describe('onChange in a specific row only affects that row', () => {
    it('changing a select in row 1 sets placeholder only for row 1', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            category: z.enum(['electronics', 'clothing', 'food']),
            description: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.category',
        (value, ctx) => {
          ctx.setFieldMeta('items.description', {
            placeholder: `Describe your ${String(value)} item`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [
              { category: 'electronics' },
              { category: 'electronics' },
              { category: 'electronics' },
            ],
          }}
        />,
      )

      // Change only row 1's category to 'clothing'
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[1], 'clothing')

      await waitFor(() => {
        const descriptions = screen.getAllByLabelText(/description/i)
        // Row 0: no placeholder override (onChange not triggered for this row)
        expect(descriptions[0]).not.toHaveAttribute(
          'placeholder',
          expect.stringContaining('clothing'),
        )
        // Row 1: placeholder set to 'Describe your clothing item'
        expect(descriptions[1]).toHaveAttribute(
          'placeholder',
          'Describe your clothing item',
        )
        // Row 2: no placeholder override
        expect(descriptions[2]).not.toHaveAttribute(
          'placeholder',
          expect.stringContaining('clothing'),
        )
      })
    })

    it('changing a select in row 0 disables only row 0 sibling field', async () => {
      const schema = z.object({
        entries: z.array(
          z.object({
            status: z.enum(['draft', 'published', 'archived']),
            title: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'entries.status',
        (value, ctx) => {
          ctx.setFieldMeta('entries.title', {
            disabled: value === 'archived',
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            entries: [{ status: 'draft' }, { status: 'draft' }],
          }}
        />,
      )

      // Change row 0 to 'archived'
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'archived')

      await waitFor(() => {
        const titles = screen.getAllByLabelText(/title/i)
        // Row 0: disabled
        expect(titles[0]).toBeDisabled()
        // Row 1: NOT disabled
        expect(titles[1]).not.toBeDisabled()
      })
    })
  })

  // -------------------------------------------------------------------------
  // 2. DOM output reflects per-row overrides: one row hidden, another visible
  // Requirement 1.4, 1.5: per-row meta applied independently
  // -------------------------------------------------------------------------

  describe('DOM reflects per-row overrides (hidden/visible)', () => {
    it('hides a field in row 0 while row 1 and row 2 remain visible', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            mode: z.enum(['simple', 'detailed']),
            notes: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.mode',
        (value, ctx) => {
          ctx.setFieldMeta('items.notes', { hidden: value === 'simple' })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [
              { mode: 'detailed' },
              { mode: 'detailed' },
              { mode: 'detailed' },
            ],
          }}
        />,
      )

      // All 3 rows should show 'notes' initially
      expect(screen.getAllByLabelText(/notes/i)).toHaveLength(3)

      // Change row 0 to 'simple' → row 0's notes hidden
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'simple')

      await waitFor(() => {
        // Only 2 notes fields remain visible (rows 1 and 2)
        expect(screen.getAllByLabelText(/notes/i)).toHaveLength(2)
      })

      // Verify the remaining notes fields are for rows 1 and 2
      // by checking the selects still show 'detailed' for those rows
      const remainingSelects = screen.getAllByRole('combobox')
      expect(remainingSelects[0]).toHaveValue('simple')
      expect(remainingSelects[1]).toHaveValue('detailed')
      expect(remainingSelects[2]).toHaveValue('detailed')
    })

    it('hides fields in rows 0 and 2 while row 1 remains visible', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            visibility: z.enum(['show', 'hide']),
            extra: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.visibility',
        (value, ctx) => {
          ctx.setFieldMeta('items.extra', { hidden: value === 'hide' })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [
              { visibility: 'show' },
              { visibility: 'show' },
              { visibility: 'show' },
            ],
          }}
        />,
      )

      // All 3 rows show 'extra'
      expect(screen.getAllByLabelText(/extra/i)).toHaveLength(3)

      // Hide row 0 and row 2
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'hide')
      await user.selectOptions(selects[2], 'hide')

      await waitFor(() => {
        // Only row 1's extra field remains visible
        expect(screen.getAllByLabelText(/extra/i)).toHaveLength(1)
      })
    })
  })

  // -------------------------------------------------------------------------
  // 3. Multiple meta properties applied per-row independently
  // Requirement 1.5: independent override entries per row
  // -------------------------------------------------------------------------

  describe('multiple meta properties applied per-row independently', () => {
    it('each row gets its own label based on its onChange value', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['email', 'phone', 'address']),
            value: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('items.value', {
            label: `Enter ${String(value)}`,
            placeholder: `Your ${String(value)} here`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'email' }, { type: 'email' }, { type: 'email' }],
          }}
        />,
      )

      const selects = screen.getAllByRole('combobox')

      // Set each row to a different type
      await user.selectOptions(selects[0], 'email')
      await user.selectOptions(selects[1], 'phone')
      await user.selectOptions(selects[2], 'address')

      await waitFor(() => {
        // Each row should have its own label
        expect(screen.getByLabelText('Enter email')).toBeInTheDocument()
        expect(screen.getByLabelText('Enter phone')).toBeInTheDocument()
        expect(screen.getByLabelText('Enter address')).toBeInTheDocument()
      })

      // Each row should also have its own placeholder
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Your email here'),
        ).toBeInTheDocument()
        expect(
          screen.getByPlaceholderText('Your phone here'),
        ).toBeInTheDocument()
        expect(
          screen.getByPlaceholderText('Your address here'),
        ).toBeInTheDocument()
      })
    })

    it('changing one row does not overwrite another row meta', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            priority: z.enum(['low', 'medium', 'high']),
            comment: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.priority',
        (value, ctx) => {
          ctx.setFieldMeta('items.comment', {
            placeholder: `${String(value)} priority comment`,
            disabled: value === 'high',
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ priority: 'low' }, { priority: 'low' }],
          }}
        />,
      )

      const selects = screen.getAllByRole('combobox')

      // Set row 0 to 'high' (disabled)
      await user.selectOptions(selects[0], 'high')

      await waitFor(() => {
        const comments = screen.getAllByLabelText(/comment/i)
        expect(comments[0]).toBeDisabled()
        expect(comments[0]).toHaveAttribute(
          'placeholder',
          'high priority comment',
        )
      })

      // Set row 1 to 'medium' (not disabled)
      await user.selectOptions(selects[1], 'medium')

      await waitFor(() => {
        const comments = screen.getAllByLabelText(/comment/i)
        // Row 0 still disabled with 'high' placeholder
        expect(comments[0]).toBeDisabled()
        expect(comments[0]).toHaveAttribute(
          'placeholder',
          'high priority comment',
        )
        // Row 1 not disabled with 'medium' placeholder
        expect(comments[1]).not.toBeDisabled()
        expect(comments[1]).toHaveAttribute(
          'placeholder',
          'medium priority comment',
        )
      })
    })
  })

  // -------------------------------------------------------------------------
  // 4. Per-row meta with dynamic options
  // Requirement 1.1, 1.4: row-scoped setFieldMeta with options override
  // -------------------------------------------------------------------------

  describe('per-row dynamic options override', () => {
    it('each row gets different select options based on its own onChange', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            category: z.enum(['fruit', 'veggie']),
            item: z.enum(['apple', 'banana', 'carrot', 'broccoli']),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.category',
        (value, ctx) => {
          ctx.setFieldMeta('items.item', {
            options:
              value === 'fruit'
                ? [
                    { label: 'Apple', value: 'apple' },
                    { label: 'Banana', value: 'banana' },
                  ]
                : [
                    { label: 'Carrot', value: 'carrot' },
                    { label: 'Broccoli', value: 'broccoli' },
                  ],
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [
              { category: 'fruit', item: 'apple' },
              { category: 'fruit', item: 'apple' },
            ],
          }}
        />,
      )

      const selects = screen.getAllByRole('combobox')
      // selects[0] = row 0 category, selects[1] = row 0 item
      // selects[2] = row 1 category, selects[3] = row 1 item

      // Set row 0 category to 'veggie'
      await user.selectOptions(selects[0], 'veggie')
      // Set row 1 category to 'fruit'
      await user.selectOptions(selects[2], 'fruit')

      await waitFor(() => {
        const allSelects = screen.getAllByRole('combobox')
        // Row 0's item select should have veggie options
        const row0ItemOptions = allSelects[1].querySelectorAll('option')
        const row0Values = Array.from(row0ItemOptions).map((o) => o.value)
        expect(row0Values).toContain('carrot')
        expect(row0Values).toContain('broccoli')
        expect(row0Values).not.toContain('apple')

        // Row 1's item select should have fruit options
        const row1ItemOptions = allSelects[3].querySelectorAll('option')
        const row1Values = Array.from(row1ItemOptions).map((o) => o.value)
        expect(row1Values).toContain('apple')
        expect(row1Values).toContain('banana')
        expect(row1Values).not.toContain('carrot')
      })
    })
  })
})
