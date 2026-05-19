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
// Integration: Row mutation + meta consistency
// Validates: Requirements 3.3, 3.4, 6.1
// ---------------------------------------------------------------------------

describe('Integration: row mutation + meta consistency', () => {
  // -------------------------------------------------------------------------
  // 1. Remove a row → verify stale meta is cleaned up and remaining rows
  //    have correct meta (re-indexed)
  // Requirement 3.3: removed row's meta is deleted, remaining rows re-indexed
  // -------------------------------------------------------------------------

  describe('remove a row cleans up stale meta and re-indexes remaining rows', () => {
    it('removing middle row removes its meta and shifts subsequent rows down', async () => {
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
          ctx.setFieldMeta('items.note', {
            placeholder: `note-for-${String(value)}`,
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

      // Trigger onChange for each row to establish per-row meta
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'a')
      await user.selectOptions(selects[1], 'b')
      await user.selectOptions(selects[2], 'c')

      // Verify all three rows have their meta
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(3)
        expect(notes[0]).toHaveAttribute('placeholder', 'note-for-a')
        expect(notes[1]).toHaveAttribute('placeholder', 'note-for-b')
        expect(notes[2]).toHaveAttribute('placeholder', 'note-for-c')
      })

      // Remove the middle row (index 1, which has 'b' meta)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[1])

      // After removal:
      // - Row 0 keeps 'note-for-a'
      // - Old row 2 (type 'c') becomes row 1 with 'note-for-c'
      // - No stale 'note-for-b' meta remains
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(2)
        expect(notes[0]).toHaveAttribute('placeholder', 'note-for-a')
        expect(notes[1]).toHaveAttribute('placeholder', 'note-for-c')
      })
    })

    it('removing last row removes its meta without affecting earlier rows', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['x', 'y', 'z']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('items.note', {
            placeholder: `${String(value)}-ph`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'x' }, { type: 'y' }, { type: 'z' }],
          }}
        />,
      )

      // Establish meta for all rows
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'x')
      await user.selectOptions(selects[1], 'y')
      await user.selectOptions(selects[2], 'z')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'x-ph')
        expect(notes[1]).toHaveAttribute('placeholder', 'y-ph')
        expect(notes[2]).toHaveAttribute('placeholder', 'z-ph')
      })

      // Remove the last row (index 2)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[2])

      // Rows 0 and 1 should keep their meta unchanged
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(2)
        expect(notes[0]).toHaveAttribute('placeholder', 'x-ph')
        expect(notes[1]).toHaveAttribute('placeholder', 'y-ph')
      })
    })
  })

  // -------------------------------------------------------------------------
  // 2. Add a new row after removing one → verify no stale meta inherited
  // Requirement 3.4: new row at previously occupied index has no stale meta
  // -------------------------------------------------------------------------

  describe('adding a new row does NOT inherit stale meta from a previously removed row', () => {
    it('new row added after removal has no placeholder from the removed row', async () => {
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
          ctx.setFieldMeta('items.note', {
            placeholder: `${String(value)}-placeholder`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'alpha' }, { type: 'beta' }],
          }}
        />,
      )

      // Establish meta for both rows
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'alpha')
      await user.selectOptions(selects[1], 'beta')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'alpha-placeholder')
        expect(notes[1]).toHaveAttribute('placeholder', 'beta-placeholder')
      })

      // Remove row 1 (the 'beta' row)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[1])

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(1)
        expect(notes[0]).toHaveAttribute('placeholder', 'alpha-placeholder')
      })

      // Add a new row (it will be at index 1, same index as the removed row)
      const addButton = screen.getByRole('button', { name: /add/i })
      await user.click(addButton)

      // The new row at index 1 should NOT have 'beta-placeholder'
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(2)
        // Row 0 still has its meta
        expect(notes[0]).toHaveAttribute('placeholder', 'alpha-placeholder')
        // Row 1 (newly added) should NOT have any stale placeholder
        expect(notes[1]).not.toHaveAttribute('placeholder', 'beta-placeholder')
      })
    })

    it('removing all rows and adding new ones results in clean meta state', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['one', 'two']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('items.note', {
            placeholder: `${String(value)}-val`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'one' }],
          }}
        />,
      )

      // Establish meta for row 0
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'two')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'two-val')
      })

      // Remove the only row
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      // Add a new row
      const addButton = screen.getByRole('button', { name: /add/i })
      await user.click(addButton)

      // The new row should have no stale meta from the removed row
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(1)
        expect(notes[0]).not.toHaveAttribute('placeholder', 'two-val')
      })
    })
  })

  // -------------------------------------------------------------------------
  // 3. Move a row → verify meta follows the row to its new position
  // Requirement 6.1: meta re-indexed on move so overrides follow the row
  // -------------------------------------------------------------------------

  describe('moving a row causes meta to follow the row', () => {
    it('moving row 0 down causes its meta to appear at index 1', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['first', 'second', 'third']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('items.note', {
            placeholder: `${String(value)}-meta`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'first' }, { type: 'second' }, { type: 'third' }],
          }}
          fields={{ items: { movable: true } }}
        />,
      )

      // Establish meta for all rows
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'first')
      await user.selectOptions(selects[1], 'second')
      await user.selectOptions(selects[2], 'third')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'first-meta')
        expect(notes[1]).toHaveAttribute('placeholder', 'second-meta')
        expect(notes[2]).toHaveAttribute('placeholder', 'third-meta')
      })

      // Move row 0 down (to index 1)
      const moveDownButtons = screen.getAllByRole('button', {
        name: /move item 1 down/i,
      })
      await user.click(moveDownButtons[0])

      // After move: row 0 was 'first', row 1 was 'second'
      // Now: row 0 should be 'second' with 'second-meta', row 1 should be 'first' with 'first-meta'
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes).toHaveLength(3)
        expect(notes[0]).toHaveAttribute('placeholder', 'second-meta')
        expect(notes[1]).toHaveAttribute('placeholder', 'first-meta')
        expect(notes[2]).toHaveAttribute('placeholder', 'third-meta')
      })
    })

    it('moving last row up causes its meta to appear at the previous index', async () => {
      const schema = z.object({
        items: z.array(
          z.object({
            type: z.enum(['top', 'bottom']),
            note: z.string().optional(),
          }),
        ),
      })
      const form = createForm(schema).setOnChange(
        'items.type',
        (value, ctx) => {
          ctx.setFieldMeta('items.note', {
            placeholder: `${String(value)}-pos`,
          })
        },
      )

      const { user } = setup(
        <AutoForm
          form={form}
          onSubmit={vi.fn()}
          defaultValues={{
            items: [{ type: 'top' }, { type: 'bottom' }],
          }}
          fields={{ items: { movable: true } }}
        />,
      )

      // Establish meta for both rows
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'top')
      await user.selectOptions(selects[1], 'bottom')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'top-pos')
        expect(notes[1]).toHaveAttribute('placeholder', 'bottom-pos')
      })

      // Move row 1 (last) up to index 0
      const moveUpButtons = screen.getAllByRole('button', {
        name: /move item 2 up/i,
      })
      await user.click(moveUpButtons[0])

      // After move: 'bottom' is now at index 0, 'top' is now at index 1
      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'bottom-pos')
        expect(notes[1]).toHaveAttribute('placeholder', 'top-pos')
      })
    })

    it('multiple moves maintain correct meta associations', async () => {
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
          ctx.setFieldMeta('items.note', {
            placeholder: `${String(value)}-m`,
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
          fields={{ items: { movable: true } }}
        />,
      )

      // Establish meta
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'a')
      await user.selectOptions(selects[1], 'b')
      await user.selectOptions(selects[2], 'c')

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'a-m')
        expect(notes[1]).toHaveAttribute('placeholder', 'b-m')
        expect(notes[2]).toHaveAttribute('placeholder', 'c-m')
      })

      // Move row 2 up (to index 1): order becomes [a, c, b]
      const moveUpButtons = screen.getAllByRole('button', {
        name: /move item 3 up/i,
      })
      await user.click(moveUpButtons[0])

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'a-m')
        expect(notes[1]).toHaveAttribute('placeholder', 'c-m')
        expect(notes[2]).toHaveAttribute('placeholder', 'b-m')
      })

      // Move row 0 down (to index 1): order becomes [c, a, b]
      const moveDownButtons2 = screen.getAllByRole('button', {
        name: /move item 1 down/i,
      })
      await user.click(moveDownButtons2[0])

      await waitFor(() => {
        const notes = screen.getAllByLabelText(/note/i)
        expect(notes[0]).toHaveAttribute('placeholder', 'c-m')
        expect(notes[1]).toHaveAttribute('placeholder', 'a-m')
        expect(notes[2]).toHaveAttribute('placeholder', 'b-m')
      })
    })
  })
})
