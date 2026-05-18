import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from '../AutoForm'
import { UniForm, createForm } from '../../UniForm'

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
// ArrayField Row-Aware Behavior Tests
// ---------------------------------------------------------------------------

describe('ArrayField row-aware behavior', () => {
  // -------------------------------------------------------------------------
  // 1. onChange is called with correct rowIndex for each row
  // Requirements: 1.4, 2.1
  // -------------------------------------------------------------------------
  describe('onChange is called with correct rowIndex for each row', () => {
    it('fires onChange for row 0 and scopes setFieldMeta to row 0', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['personal', 'business']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', {
            placeholder: `${String(value)}-placeholder`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'personal' }, { type: 'personal' }],
          }}
        />,
      )

      // Change the first row's type to 'business'
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'business')

      // Only row 0's note should get the placeholder override
      await waitFor(() => {
        const noteInputs = screen.getAllByLabelText(/note/i)
        expect(noteInputs[0]).toHaveAttribute(
          'placeholder',
          'business-placeholder',
        )
        // Row 1's note should NOT have the placeholder
        expect(noteInputs[1]).not.toHaveAttribute(
          'placeholder',
          'business-placeholder',
        )
      })
    })

    it('fires onChange for row 1 and scopes setFieldMeta to row 1 only', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['personal', 'business']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', { disabled: value === 'business' })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'personal' }, { type: 'personal' }],
          }}
        />,
      )

      // Change the second row's type to 'business'
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[1], 'business')

      // Only row 1's note should be disabled
      await waitFor(() => {
        const noteInputs = screen.getAllByLabelText(/note/i)
        expect(noteInputs[0]).not.toBeDisabled()
        expect(noteInputs[1]).toBeDisabled()
      })
    })

    it('each row independently tracks its own meta from onChange', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['personal', 'business']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', {
            placeholder: `${String(value)}-ph`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'personal' }, { type: 'personal' }],
          }}
        />,
      )

      const selects = screen.getAllByRole('combobox')

      // Change row 0 to 'business'
      await user.selectOptions(selects[0], 'business')
      // Change row 1 to 'personal' (triggers onChange for row 1)
      await user.selectOptions(selects[1], 'personal')

      await waitFor(() => {
        const noteInputs = screen.getAllByLabelText(/note/i)
        expect(noteInputs[0]).toHaveAttribute('placeholder', 'business-ph')
        expect(noteInputs[1]).toHaveAttribute('placeholder', 'personal-ph')
      })
    })
  })

  // -------------------------------------------------------------------------
  // 2. Per-row meta overrides render correctly in each row
  // Requirements: 1.4, 3.1, 3.2
  // -------------------------------------------------------------------------
  describe('per-row meta overrides render correctly', () => {
    it('hides a field in one row but not another', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['simple', 'advanced']),
            detail: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('detail', { hidden: value === 'simple' })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'advanced' }, { type: 'advanced' }],
          }}
        />,
      )

      // Both rows should show 'detail' initially (no onChange fired yet)
      expect(screen.getAllByLabelText(/detail/i)).toHaveLength(2)

      // Change row 0 to 'simple' → row 0's detail should be hidden
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'simple')

      await waitFor(() => {
        // Only row 1's detail should remain visible
        expect(screen.getAllByLabelText(/detail/i)).toHaveLength(1)
      })
    })

    it('applies different labels per row based on onChange', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            unit: z.enum(['kg', 'lbs']),
            quantity: z.number().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.unit',
        (value, ctx) => {
          ctx.setFieldMeta('quantity', {
            label: `Quantity (${String(value)})`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{ items: [{ unit: 'kg' }, { unit: 'kg' }] }}
        />,
      )

      const selects = screen.getAllByRole('combobox')

      // Change row 0 to 'lbs'
      await user.selectOptions(selects[0], 'lbs')
      // Change row 1 to 'kg' (trigger onChange)
      await user.selectOptions(selects[1], 'kg')

      await waitFor(() => {
        expect(screen.getByLabelText('Quantity (lbs)')).toBeInTheDocument()
        expect(screen.getByLabelText('Quantity (kg)')).toBeInTheDocument()
      })
    })
  })

  // -------------------------------------------------------------------------
  // 3. Row removal triggers re-indexing
  // Requirements: 3.3
  // -------------------------------------------------------------------------
  describe('row removal triggers re-indexing of dynamic meta', () => {
    it('removes meta for deleted row and shifts remaining rows', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['a', 'b', 'c']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', {
            placeholder: `${String(value)}-note`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'a' }, { type: 'b' }, { type: 'c' }],
          }}
        />,
      )

      // Trigger onChange for each row to set per-row meta
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'a')
      await user.selectOptions(selects[1], 'b')
      await user.selectOptions(selects[2], 'c')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'a-note')
        expect(notes[1]).toHaveAttribute('placeholder', 'b-note')
        expect(notes[2]).toHaveAttribute('placeholder', 'c-note')
      })

      // Remove the middle row (index 1)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[1])

      // After removal: row 0 keeps 'a-note', old row 2 becomes row 1 with 'c-note'
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(2)
        expect(notes[0]).toHaveAttribute('placeholder', 'a-note')
        expect(notes[1]).toHaveAttribute('placeholder', 'c-note')
      })
    })

    it('removes meta for the first row and shifts all others down', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['x', 'y']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', { placeholder: `${String(value)}-ph` })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{ items: [{ type: 'x' }, { type: 'y' }] }}
        />,
      )

      // Trigger onChange for both rows
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'x')
      await user.selectOptions(selects[1], 'y')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'x-ph')
        expect(notes[1]).toHaveAttribute('placeholder', 'y-ph')
      })

      // Remove the first row
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[0])

      // After removal: only old row 1 remains, now at index 0 with 'y-ph'
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(1)
        expect(notes[0]).toHaveAttribute('placeholder', 'y-ph')
      })
    })
  })

  // -------------------------------------------------------------------------
  // 4. Row duplication copies meta to new row
  // Requirements: 6.1, 6.2
  // -------------------------------------------------------------------------
  describe('row duplication copies meta to new row', () => {
    it('duplicated row inherits the source row meta overrides', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['alpha', 'beta']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', {
            placeholder: `${String(value)}-dup`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{ items: [{ type: 'alpha' }] }}
          fields={{ items: { duplicable: true } }}
        />,
      )

      // Trigger onChange for row 0
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'beta')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'beta-dup')
      })

      // Duplicate row 0
      const dupBtn = screen.getByLabelText(/duplicate item 1/i)
      await user.click(dupBtn)

      // Both rows should have the same meta override
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(2)
        expect(notes[0]).toHaveAttribute('placeholder', 'beta-dup')
        expect(notes[1]).toHaveAttribute('placeholder', 'beta-dup')
      })
    })

    it('duplication shifts meta of rows after the duplicated row', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['a', 'b']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('note', { placeholder: `${String(value)}-val` })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{ items: [{ type: 'a' }, { type: 'b' }] }}
          fields={{ items: { duplicable: true } }}
        />,
      )

      // Trigger onChange for both rows
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'a')
      await user.selectOptions(selects[1], 'b')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'a-val')
        expect(notes[1]).toHaveAttribute('placeholder', 'b-val')
      })

      // Duplicate row 0 → new row at index 1, old row 1 shifts to index 2
      const dupBtn = screen.getByLabelText(/duplicate item 1/i)
      await user.click(dupBtn)

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(3)
        expect(notes[0]).toHaveAttribute('placeholder', 'a-val') // original row 0
        expect(notes[1]).toHaveAttribute('placeholder', 'a-val') // duplicated from row 0
        expect(notes[2]).toHaveAttribute('placeholder', 'b-val') // shifted from row 1
      })
    })
  })
})
