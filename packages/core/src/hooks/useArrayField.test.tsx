import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from '../components/AutoForm'
import { createForm } from '../UniForm'
import { useArrayField } from './useArrayField'
import type { FormWrapperProps } from '../types'

function withToolbar(Toolbar: React.ComponentType) {
  return function FormWrapper({ children }: FormWrapperProps) {
    return (
      <>
        <Toolbar />
        {children}
      </>
    )
  }
}

function rowNames(): string[] {
  return screen
    .queryAllByRole('textbox')
    .filter((el) => /^items\.\d+\.name$/.test(el.getAttribute('name') ?? ''))
    .map((el) => (el as HTMLInputElement).value)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useArrayField — external control of a rendered array', () => {
  const schema = z.object({
    items: z.array(z.object({ name: z.string() })).max(5),
  })

  function Toolbar() {
    const { append, remove, insert, move, rowCount } = useArrayField('items')
    return (
      <div>
        <span data-testid='count'>{rowCount}</span>
        <button type='button' onClick={() => append({ name: 'appended' })}>
          ext-append
        </button>
        <button type='button' onClick={() => remove(0)}>
          ext-remove
        </button>
        <button type='button' onClick={() => insert(1, { name: 'inserted' })}>
          ext-insert
        </button>
        <button type='button' onClick={() => move(0, 1)}>
          ext-move
        </button>
      </div>
    )
  }

  function renderForm() {
    return {
      user: userEvent.setup(),
      ...render(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ items: [{ name: 'a' }, { name: 'b' }] }}
          layout={{ formWrapper: withToolbar(Toolbar) }}
          onSubmit={vi.fn()}
        />,
      ),
    }
  }

  it('append() from a sibling renders a new row', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'ext-append' }))
    await waitFor(() => expect(rowNames()).toEqual(['a', 'b', 'appended']))
  })

  it('remove() from a sibling removes the rendered row', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'ext-remove' }))
    await waitFor(() => expect(rowNames()).toEqual(['b']))
  })

  it('insert() from a sibling renders the row at the index', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'ext-insert' }))
    await waitFor(() => expect(rowNames()).toEqual(['a', 'inserted', 'b']))
  })

  it('move() from a sibling reorders the rendered rows', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('button', { name: 'ext-move' }))
    await waitFor(() => expect(rowNames()).toEqual(['b', 'a']))
  })

  it('rows added with the built-in Add button are reflected in rowCount', async () => {
    const { user } = renderForm()
    expect(screen.getByTestId('count')).toHaveTextContent('2')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('3'),
    )
  })

  it('does not re-render while typing inside a rendered row', async () => {
    let renders = 0
    const CountingToolbar = React.memo(function CountingToolbar() {
      useArrayField('items')
      renders++
      return null
    })
    const user = userEvent.setup()
    render(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ items: [{ name: '' }] }}
        layout={{ formWrapper: withToolbar(CountingToolbar) }}
        onSubmit={vi.fn()}
      />,
    )
    const before = renders
    await user.type(screen.getByRole('textbox'), 'abc')
    expect(renders - before).toBe(0)
  })
})

describe('useArrayField — fallback when the array is not rendered', () => {
  const schema = z.object({
    items: z.array(z.object({ name: z.string() })).max(3),
  })

  function Toolbar() {
    const { append, remove, rowCount, canAdd } = useArrayField('items')
    return (
      <div>
        <span data-testid='count'>{rowCount}</span>
        <span data-testid='can-add'>{String(canAdd)}</span>
        <button
          type='button'
          onClick={() => {
            append({ name: 'x' })
            append({ name: 'y' })
          }}
        >
          append-twice
        </button>
        <button type='button' onClick={() => remove(0)}>
          remove-first
        </button>
      </div>
    )
  }

  function renderHidden(onSubmit = vi.fn()) {
    return {
      onSubmit,
      user: userEvent.setup(),
      ...render(
        <AutoForm
          form={createForm(schema)}
          defaultValues={{ items: [{ name: 'a' }] }}
          fields={{ items: { hidden: true } }}
          layout={{ formWrapper: withToolbar(Toolbar) }}
          onSubmit={onSubmit}
        />,
      ),
    }
  }

  it('two appends in one handler both land', async () => {
    const { user, onSubmit } = renderHidden()
    await user.click(screen.getByRole('button', { name: 'append-twice' }))
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('3'),
    )
    expect(screen.getByTestId('can-add')).toHaveTextContent('false')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      items: [{ name: 'a' }, { name: 'x' }, { name: 'y' }],
    })
  })

  it('remove() writes the array value', async () => {
    const { user, onSubmit } = renderHidden()
    await user.click(screen.getByRole('button', { name: 'remove-first' }))
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('0'),
    )
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ items: [] })
  })

  it('reflects rows added before the array was hidden', async () => {
    const user = userEvent.setup()
    const toggleSchema = z.object({
      show: z.boolean(),
      items: z.array(z.object({ name: z.string() })).max(3),
    })
    render(
      <AutoForm
        form={createForm(toggleSchema)}
        defaultValues={{ show: true, items: [{ name: 'a' }] }}
        fields={{ items: { condition: (v) => v.show === true } }}
        layout={{ formWrapper: withToolbar(Toolbar) }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('2'),
    )
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Add' })).toBeNull(),
    )
    expect(screen.getByTestId('count')).toHaveTextContent('2')
    await user.click(screen.getByRole('button', { name: 'remove-first' }))
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('1'),
    )
  })
})

describe('useArrayField — nested and indexed paths', () => {
  const schema = z.object({
    groups: z.array(
      z.object({
        title: z.string(),
        emails: z.array(z.object({ address: z.string() })).max(2),
      }),
    ),
  })

  function Toolbar() {
    const { append, rowCount, canAdd } = useArrayField('groups.0.emails')
    return (
      <div>
        <span data-testid='count'>{rowCount}</span>
        <span data-testid='can-add'>{String(canAdd)}</span>
        <button type='button' onClick={() => append({ address: 'new' })}>
          add-email
        </button>
      </div>
    )
  }

  it('resolves groups.0.emails and drives the rendered nested array', async () => {
    const user = userEvent.setup()
    render(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{
          groups: [{ title: 'g', emails: [{ address: 'one' }] }],
        }}
        layout={{ formWrapper: withToolbar(Toolbar) }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('can-add')).toHaveTextContent('true')
    await user.click(screen.getByRole('button', { name: 'add-email' }))
    await waitFor(() =>
      expect(
        document.querySelector('input[name="groups.0.emails.1.address"]'),
      ).toHaveValue('new'),
    )
    expect(screen.getByTestId('count')).toHaveTextContent('2')
    expect(screen.getByTestId('can-add')).toHaveTextContent('false')
  })
})

describe('useArrayField — misuse and isolation', () => {
  it('warns once when the path is not an array field', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const schema = z.object({ name: z.string() })
    function Toolbar() {
      useArrayField('name')
      return null
    }
    const form = createForm(schema)
    const layout = { formWrapper: withToolbar(Toolbar) }
    const { rerender } = render(
      <AutoForm form={form} layout={layout} onSubmit={vi.fn()} />,
    )
    rerender(<AutoForm form={form} layout={layout} onSubmit={vi.fn()} />)
    const calls = warn.mock.calls.filter((c) =>
      String(c[0]).includes('useArrayField'),
    )
    expect(calls).toHaveLength(1)
    expect(String(calls[0][0])).toContain('"name"')
  })

  it('two forms on one page do not share array registrations', async () => {
    const user = userEvent.setup()
    const schema = z.object({ items: z.array(z.object({ name: z.string() })) })
    function Toolbar() {
      const { append } = useArrayField('items')
      return (
        <button type='button' onClick={() => append({ name: 'new' })}>
          ext-append
        </button>
      )
    }
    render(
      <>
        <div data-testid='form-a'>
          <AutoForm
            form={createForm(schema)}
            defaultValues={{ items: [{ name: 'a' }] }}
            layout={{ formWrapper: withToolbar(Toolbar) }}
            onSubmit={vi.fn()}
          />
        </div>
        <div data-testid='form-b'>
          <AutoForm
            form={createForm(schema)}
            defaultValues={{ items: [{ name: 'b' }] }}
            onSubmit={vi.fn()}
          />
        </div>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'ext-append' }))
    const formA = screen.getByTestId('form-a')
    const formB = screen.getByTestId('form-b')
    await waitFor(() =>
      expect(within(formA).getAllByRole('textbox')).toHaveLength(2),
    )
    expect(within(formB).getAllByRole('textbox')).toHaveLength(1)
  })
})
