import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createForm } from '../UniForm'
import { useArrayField } from '../hooks/useArrayField'
import type { FormWrapperProps } from '../types'

const schema = z.object({
  trigger: z.string(),
  items: z.array(z.object({ name: z.string() })),
})

function Toolbar() {
  const { remove, insert, prepend, swap, move, replace } =
    useArrayField('items')
  return (
    <div>
      <button type='button' onClick={() => remove(0)}>
        ext-remove-0
      </button>
      <button type='button' onClick={() => remove([0, 1])}>
        ext-remove-0-1
      </button>
      <button
        type='button'
        onClick={() => insert(1, [{ name: 'n1' }, { name: 'n2' }])}
      >
        ext-insert-2
      </button>
      <button type='button' onClick={() => prepend({ name: 'p' })}>
        ext-prepend
      </button>
      <button type='button' onClick={() => swap(1, 2)}>
        ext-swap
      </button>
      <button type='button' onClick={() => move(1, 0)}>
        ext-move
      </button>
      <button
        type='button'
        onClick={() => replace([{ name: 'r0' }, { name: 'r1' }])}
      >
        ext-replace
      </button>
    </div>
  )
}

const FormWrapper = ({ children }: FormWrapperProps) => (
  <>
    <Toolbar />
    {children}
  </>
)

async function renderWithRowLabel(row = 1) {
  const form = createForm(schema).setOnChange('trigger', (_value, ctx) => {
    ctx.setFieldMeta(`items.${row}.name` as never, {
      label: 'Custom Label',
    })
  })
  const user = userEvent.setup()
  render(
    <AutoForm
      form={form}
      defaultValues={{
        trigger: '',
        items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      }}
      layout={{ formWrapper: FormWrapper }}
      onSubmit={vi.fn()}
    />,
  )
  await user.type(screen.getByLabelText(/Trigger/), 'x')
  await waitFor(() =>
    expect(screen.getByLabelText(/^Custom Label/)).toHaveAttribute(
      'name',
      `items.${row}.name`,
    ),
  )
  return user
}

const labelledName = () =>
  screen.queryByLabelText(/^Custom Label/)?.getAttribute('name')

describe('per-row dynamic meta follows its row on external operations', () => {
  it('remove(0) from outside the array moves the row 1 label to row 0', async () => {
    const user = await renderWithRowLabel()
    await user.click(screen.getByRole('button', { name: 'ext-remove-0' }))
    await waitFor(() => expect(labelledName()).toBe('items.0.name'))
    expect(screen.getByLabelText(/^Custom Label/)).toHaveValue('b')
  })

  it('remove([0, 1]) applies removals highest-first', async () => {
    const user = await renderWithRowLabel(2)
    await user.click(screen.getByRole('button', { name: 'ext-remove-0-1' }))
    await waitFor(() =>
      expect(document.querySelectorAll('[name^="items."]')).toHaveLength(1),
    )
    expect(labelledName()).toBe('items.0.name')
    expect(screen.getByLabelText(/^Custom Label/)).toHaveValue('c')
  })

  it('insert(1, [a, b]) shifts the label up by two rows', async () => {
    const user = await renderWithRowLabel()
    await user.click(screen.getByRole('button', { name: 'ext-insert-2' }))
    await waitFor(() => expect(labelledName()).toBe('items.3.name'))
    expect(screen.getByLabelText(/^Custom Label/)).toHaveValue('b')
  })

  it('prepend shifts the label up by one row', async () => {
    const user = await renderWithRowLabel()
    await user.click(screen.getByRole('button', { name: 'ext-prepend' }))
    await waitFor(() => expect(labelledName()).toBe('items.2.name'))
  })

  it('swap(1, 2) moves the label with its row', async () => {
    const user = await renderWithRowLabel()
    await user.click(screen.getByRole('button', { name: 'ext-swap' }))
    await waitFor(() => expect(labelledName()).toBe('items.2.name'))
    expect(screen.getByLabelText(/^Custom Label/)).toHaveValue('b')
  })

  it('move(1, 0) moves the label with its row', async () => {
    const user = await renderWithRowLabel()
    await user.click(screen.getByRole('button', { name: 'ext-move' }))
    await waitFor(() => expect(labelledName()).toBe('items.0.name'))
    expect(screen.getByLabelText(/^Custom Label/)).toHaveValue('b')
  })

  it('replace() clears the row overrides of the array', async () => {
    const user = await renderWithRowLabel()
    await user.click(screen.getByRole('button', { name: 'ext-replace' }))
    await waitFor(() =>
      expect(document.querySelector('[name="items.1.name"]')).toHaveValue('r1'),
    )
    expect(labelledName()).toBeUndefined()
  })
})
