import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from '../AutoForm'
import { createForm } from '../../UniForm'
import { useArrayField } from '../../hooks/useArrayField'

function setup(ui: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  }
}

const rowInputs = (prefix: string) =>
  screen
    .queryAllByRole('textbox')
    .filter((el) => el.getAttribute('name')?.startsWith(`${prefix}.`))

// ---------------------------------------------------------------------------
// W2 — arrays of primitives render as repeating rows
// ---------------------------------------------------------------------------

describe('ArrayField with primitive items', () => {
  describe('z.array(z.string())', () => {
    const schema = z.object({ tags: z.array(z.string()) })

    it('renders one input per row', () => {
      render(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha', 'beta'] }}
          onSubmit={vi.fn()}
        />,
      )
      const inputs = rowInputs('tags')
      expect(inputs).toHaveLength(2)
      expect(inputs[0]).toHaveValue('alpha')
      expect(inputs[1]).toHaveValue('beta')
      expect(inputs[0]).toHaveAttribute('name', 'tags.0')
      expect(inputs[1]).toHaveAttribute('name', 'tags.1')
    })

    it('typing updates the value at the right index', async () => {
      const onSubmit = vi.fn()
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha', 'beta'] }}
          onSubmit={onSubmit}
        />,
      )
      await user.clear(rowInputs('tags')[1])
      await user.type(rowInputs('tags')[1], 'gamma')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({ tags: ['alpha', 'gamma'] }),
      )
    })

    it('the add button appends an empty string row', async () => {
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha'] }}
          onSubmit={vi.fn()}
        />,
      )
      await user.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(rowInputs('tags')).toHaveLength(2))
      expect(rowInputs('tags')[1]).toHaveValue('')
    })

    it('the remove button removes the right row', async () => {
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha', 'beta'] }}
          onSubmit={vi.fn()}
        />,
      )
      await user.click(screen.getByRole('button', { name: 'Remove item 1' }))
      await waitFor(() => expect(rowInputs('tags')).toHaveLength(1))
      expect(rowInputs('tags')[0]).toHaveValue('beta')
    })

    it('renders no per-row label by default', () => {
      render(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha'] }}
          onSubmit={vi.fn()}
        />,
      )
      const wrapper = rowInputs('tags')[0].closest('[data-field-name]')
      expect(wrapper?.querySelector('label')).toBeNull()
    })

    it('renders a per-row label when meta.itemLabel is set', () => {
      render(
        <AutoForm
          form={createForm(schema)}
          fields={{ tags: { itemLabel: 'Tag' } }}
          defaultValues={{ tags: ['alpha'] }}
          onSubmit={vi.fn()}
        />,
      )
      const wrapper = rowInputs('tags')[0].closest('[data-field-name]')
      expect(wrapper?.querySelector('label')?.textContent).toContain('Tag')
    })

    it('shows a per-item validation error on the failing row', async () => {
      const constrained = z.object({ tags: z.array(z.string().min(3)) })
      const { user } = setup(
        <AutoForm
          form={createForm(constrained)}
          defaultValues={{ tags: ['alpha', 'no'] }}
          onSubmit={vi.fn()}
        />,
      )
      await user.click(screen.getByRole('button', { name: /submit/i }))

      const alerts = await screen.findAllByRole('alert')
      expect(alerts).toHaveLength(1)
      const errorRow = alerts[0].closest('[data-field-name]')
      expect(errorRow).toHaveAttribute('data-field-name', 'tags.1')
    })
  })

  describe('z.array(z.number())', () => {
    const schema = z.object({ scores: z.array(z.number()) })

    it('renders number inputs and submits numbers', async () => {
      const onSubmit = vi.fn()
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ scores: [1, 2] }}
          onSubmit={onSubmit}
        />,
      )
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs).toHaveLength(2)
      expect(inputs[0]).toHaveValue(1)
      expect(inputs[1]).toHaveValue(2)

      // jsdom does not support text selection on number inputs, so append a
      // digit rather than clearing: 2 -> 23.
      await user.type(inputs[1], '3')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({ scores: [1, 23] }),
      )
    })

    it('appends a 0 row', async () => {
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ scores: [1] }}
          onSubmit={vi.fn()}
        />,
      )
      await user.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() =>
        expect(screen.getAllByRole('spinbutton')).toHaveLength(2),
      )
      expect(screen.getAllByRole('spinbutton')[1]).toHaveValue(0)
    })
  })

  describe('z.array(z.enum([...]))', () => {
    const schema = z.object({
      roles: z.array(z.enum(['admin', 'editor', 'viewer'])),
    })

    it('renders a select per row with the enum options', () => {
      render(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ roles: ['admin', 'viewer'] }}
          onSubmit={vi.fn()}
        />,
      )
      const selects = screen.getAllByRole('combobox')
      expect(selects).toHaveLength(2)
      expect(selects[0]).toHaveValue('admin')
      expect(selects[1]).toHaveValue('viewer')
      expect(
        Array.from(selects[0].querySelectorAll('option')).map((o) => o.value),
      ).toEqual(['admin', 'editor', 'viewer'])
    })

    it('selecting writes to the right index', async () => {
      const onSubmit = vi.fn()
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ roles: ['admin', 'viewer'] }}
          onSubmit={onSubmit}
        />,
      )
      await user.selectOptions(screen.getAllByRole('combobox')[1], 'editor')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({ roles: ['admin', 'editor'] }),
      )
    })
  })

  describe('min / max gating', () => {
    const schema = z.object({
      tags: z.array(z.string()).min(1).max(2),
    })

    it('disables add at maxItems and remove at minItems', async () => {
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha'] }}
          onSubmit={vi.fn()}
        />,
      )
      expect(
        screen.getByRole('button', { name: 'Remove item 1' }),
      ).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Add' }))
      await waitFor(() => expect(rowInputs('tags')).toHaveLength(2))
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'Remove item 1' }),
      ).not.toBeDisabled()
    })
  })

  describe('reordering', () => {
    const schema = z.object({ tags: z.array(z.string()) })

    it('moves scalar rows with the move buttons', async () => {
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          fields={{ tags: { movable: true } }}
          defaultValues={{ tags: ['alpha', 'beta'] }}
          onSubmit={vi.fn()}
        />,
      )
      await user.click(screen.getByRole('button', { name: 'Move item 2 up' }))
      await waitFor(() => expect(rowInputs('tags')[0]).toHaveValue('beta'))
      expect(rowInputs('tags')[1]).toHaveValue('alpha')
    })

    it('does not render duplicate/collapse buttons for scalar rows', () => {
      render(
        <AutoForm
          form={createForm(schema)}
          fields={{ tags: { duplicable: true, collapsible: true } }}
          defaultValues={{ tags: ['alpha'] }}
          onSubmit={vi.fn()}
        />,
      )
      expect(
        screen.queryByRole('button', { name: /duplicate/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /collapse|expand/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('useArrayField drives a primitive array from outside', () => {
    const schema = z.object({ tags: z.array(z.string()) })

    function Toolbar() {
      const { append, remove, rowCount } = useArrayField('tags')
      return (
        <div>
          <span data-testid='tag-count'>{rowCount}</span>
          <button type='button' onClick={() => append('external')}>
            ext-add
          </button>
          <button type='button' onClick={() => remove(0)}>
            ext-remove
          </button>
        </div>
      )
    }

    it('appends and removes visible scalar rows', async () => {
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ tags: ['alpha'] }}
          layout={{
            formWrapper: ({ children }) => (
              <>
                <Toolbar />
                {children}
              </>
            ),
          }}
          onSubmit={vi.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'ext-add' }))
      await waitFor(() => expect(rowInputs('tags')).toHaveLength(2))
      expect(rowInputs('tags')[1]).toHaveValue('external')
      expect(screen.getByTestId('tag-count')).toHaveTextContent('2')

      await user.click(screen.getByRole('button', { name: 'ext-remove' }))
      await waitFor(() => expect(rowInputs('tags')).toHaveLength(1))
      expect(rowInputs('tags')[0]).toHaveValue('external')
    })
  })

  describe('nested arrays of primitives', () => {
    it('renders a primitive array inside an array of objects', async () => {
      const schema = z.object({
        groups: z.array(
          z.object({
            name: z.string(),
            emails: z.array(z.string()),
          }),
        ),
      })
      const onSubmit = vi.fn()
      const { user } = setup(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{
            groups: [{ name: 'g1', emails: ['a@b.c'] }],
          }}
          onSubmit={onSubmit}
        />,
      )
      const emailInput = screen
        .queryAllByRole('textbox')
        .find((el) => el.getAttribute('name') === 'groups.0.emails.0')
      expect(emailInput).toBeDefined()

      await user.clear(emailInput!)
      await user.type(emailInput!, 'x@y.z')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          groups: [{ name: 'g1', emails: ['x@y.z'] }],
        }),
      )
    })
  })
})
