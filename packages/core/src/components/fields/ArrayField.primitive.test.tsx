import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from '../AutoForm'
import { createForm } from '../../UniForm'
import { useArrayField } from '../../hooks/useArrayField'
import type { FormWrapperProps } from '../../types'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

const input = (name: string) =>
  document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[name="${name}"]`,
  )

async function submitAndGetValues(
  user: ReturnType<typeof userEvent.setup>,
  onSubmit: ReturnType<typeof vi.fn>,
) {
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  return onSubmit.mock.calls[0][0] as Record<string, unknown>
}

describe('arrays of primitives', () => {
  it('string rows: typing updates the right index and submit yields string[]', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(z.object({ tags: z.array(z.string()) }))}
        defaultValues={{ tags: ['a', 'b'] }}
        onSubmit={onSubmit}
      />,
    )
    await user.type(input('tags.1')!, 'c')
    expect(input('tags.0')).toHaveValue('a')
    expect(input('tags.1')).toHaveValue('bc')
    expect(await submitAndGetValues(user, onSubmit)).toEqual({
      tags: ['a', 'bc'],
    })
  })

  it("string rows: Add appends ''", async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(z.object({ tags: z.array(z.string()) }))}
        defaultValues={{ tags: ['a'] }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(input('tags.1')).toHaveValue(''))
    expect(await submitAndGetValues(user, onSubmit)).toEqual({
      tags: ['a', ''],
    })
  })

  it('number rows: Add appends 0 and submit yields number[]', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(z.object({ scores: z.array(z.number()) }))}
        defaultValues={{ scores: [5] }}
        onSubmit={onSubmit}
      />,
    )
    expect(input('scores.0')).toHaveAttribute('type', 'number')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(input('scores.1')).toHaveValue(0))
    await user.clear(input('scores.1')!)
    await user.type(input('scores.1')!, '7')
    expect(await submitAndGetValues(user, onSubmit)).toEqual({
      scores: [5, 7],
    })
  })

  it('enum rows: render a select, Add appends the first option', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(
          z.object({ colors: z.array(z.enum(['red', 'green', 'blue'])) }),
        )}
        defaultValues={{ colors: ['blue'] }}
        onSubmit={onSubmit}
      />,
    )
    expect(input('colors.0')?.tagName).toBe('SELECT')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(input('colors.1')).toHaveValue('red'))
    await user.selectOptions(input('colors.1') as HTMLSelectElement, 'green')
    expect(await submitAndGetValues(user, onSubmit)).toEqual({
      colors: ['blue', 'green'],
    })
  })

  it('remove removes the right row and move reorders', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(
          z.object({ tags: z.array(z.string()).meta({ movable: true }) }),
        )}
        defaultValues={{ tags: ['a', 'b', 'c'] }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Remove item 2' }))
    await waitFor(() => expect(input('tags.2')).toBeNull())
    expect(input('tags.1')).toHaveValue('c')
    await user.click(screen.getByRole('button', { name: 'Move item 1 down' }))
    await waitFor(() => expect(input('tags.0')).toHaveValue('c'))
    expect(await submitAndGetValues(user, onSubmit)).toEqual({
      tags: ['c', 'a'],
    })
  })

  it('renders no row label by default, with an accessible name per row', () => {
    render(
      <AutoForm
        form={createForm(z.object({ tags: z.array(z.string()) }))}
        defaultValues={{ tags: ['a', 'b'] }}
        onSubmit={vi.fn()}
      />,
    )
    expect(document.querySelectorAll('label')).toHaveLength(0)
    expect(screen.getByRole('textbox', { name: 'Tags 1' })).toBe(
      input('tags.0'),
    )
    expect(screen.getByRole('textbox', { name: 'Tags 2' })).toBe(
      input('tags.1'),
    )
  })

  it('shows the row label with meta.itemLabel', () => {
    render(
      <AutoForm
        form={createForm(
          z.object({ tags: z.array(z.string()).meta({ itemLabel: 'Tag' }) }),
        )}
        defaultValues={{ tags: ['a'] }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/^Tag/)).toBe(input('tags.0'))
    expect(input('tags.0')).not.toHaveAttribute('aria-label')
  })

  it('does not render duplicate or collapse buttons for primitive rows', () => {
    render(
      <AutoForm
        form={createForm(
          z.object({
            tags: z
              .array(z.string())
              .meta({ duplicable: true, collapsible: true }),
          }),
        )}
        defaultValues={{ tags: ['a'] }}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /duplicate/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /collapse/i }),
    ).not.toBeInTheDocument()
  })

  it('shows per-item validation errors on the failing row', async () => {
    const { user } = setup(
      <AutoForm
        form={createForm(
          z.object({ tags: z.array(z.string().min(2, 'Too short')) }),
        )}
        defaultValues={{ tags: ['ok', 'x'] }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Too short')
    expect(alert.closest('[data-field-name]')).toHaveAttribute(
      'data-field-name',
      'tags.1',
    )
  })

  it('minItems / maxItems disable Remove / Add', () => {
    render(
      <AutoForm
        form={createForm(z.object({ tags: z.array(z.string()).min(1).max(1) }))}
        defaultValues={{ tags: ['a'] }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeDisabled()
  })

  it('works nested inside object rows', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(
          z.object({
            people: z.array(
              z.object({ name: z.string(), emails: z.array(z.string()) }),
            ),
          }),
        )}
        defaultValues={{ people: [{ name: 'Ann', emails: ['a@x'] }] }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Emails 1' })).toBe(
      input('people.0.emails.0'),
    )
    await user.type(input('people.0.emails.0')!, 'y')
    expect(await submitAndGetValues(user, onSubmit)).toEqual({
      people: [{ name: 'Ann', emails: ['a@xy'] }],
    })
  })

  it('useArrayField drives primitive arrays', async () => {
    function Toolbar() {
      const { append, rowCount } = useArrayField('tags')
      return (
        <button type='button' onClick={() => append('new')}>
          ext-append ({rowCount})
        </button>
      )
    }
    const FormWrapper = ({ children }: FormWrapperProps) => (
      <>
        <Toolbar />
        {children}
      </>
    )
    const { user } = setup(
      <AutoForm
        form={createForm(z.object({ tags: z.array(z.string()) }))}
        defaultValues={{ tags: ['a'] }}
        layout={{ formWrapper: FormWrapper }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'ext-append (1)' }))
    await waitFor(() => expect(input('tags.1')).toHaveValue('new'))
    expect(
      screen.getByRole('button', { name: 'ext-append (2)' }),
    ).toBeInTheDocument()
  })
})
