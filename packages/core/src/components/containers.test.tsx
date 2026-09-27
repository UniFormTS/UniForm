import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { Field } from './Field'
import { createForm } from '../UniForm'
import { useArrayField } from '../hooks/useArrayField'
import type {
  ArrayContainerProps,
  FieldProps,
  FormWrapperProps,
  ObjectContainerProps,
} from '../types'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

function input(name: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
  if (!el) throw new Error(`No input named "${name}"`)
  return el
}

const linesSchema = z.object({
  lines: z.array(
    z.object({ title: z.string().min(1, 'Title required'), qty: z.number() }),
  ),
})

type Line = { title: string; qty: number }

function LinesTable(props: ArrayContainerProps) {
  const { rows, rowCount, append, remove, setPath, onChange, value } = props
  return (
    <div>
      <span data-testid='row-count'>{rowCount}</span>
      {rows.map((row, i) => (
        <div key={row.id} data-testid={`row-${i}`}>
          <Field name={`${i}.title`} />
          <Field name={`${i}.qty`} />
        </div>
      ))}
      <button type='button' onClick={() => append({ title: 'N', qty: 0 })}>
        c-append
      </button>
      <button type='button' onClick={() => remove(0)}>
        c-remove
      </button>
      <button type='button' onClick={() => setPath('0.title', 'X')}>
        c-set-path
      </button>
      <button
        type='button'
        onClick={() =>
          onChange([
            { title: 'a', qty: 1 },
            { title: 'b', qty: 2 },
            { title: 'c', qty: 3 },
          ])
        }
      >
        c-replace-3
      </button>
      <button type='button' onClick={() => onChange([...(value as Line[])])}>
        c-rewrite
      </button>
    </div>
  )
}

const twoLines = {
  lines: [
    { title: 'A', qty: 1 },
    { title: 'B', qty: 2 },
  ],
}

describe('array container components', () => {
  it('renders cells with <Field>, validates per row, and submits', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(linesSchema)}
        fields={{ lines: { component: LinesTable } }}
        defaultValues={{
          lines: [
            { title: 'A', qty: 1 },
            { title: '', qty: 2 },
          ],
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(input('lines.0.title')).toHaveValue('A')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(
        within(screen.getByTestId('row-1')).getByRole('alert'),
      ).toHaveTextContent('Title required'),
    )
    expect(within(screen.getByTestId('row-0')).queryByRole('alert')).toBeNull()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(input('lines.1.title'), 'B')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(twoLines))
  })

  it('cells use the registered component for their type', () => {
    function CustomString({ name, value, onChange }: FieldProps) {
      return (
        <input
          data-testid={`custom-${name}`}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }
    render(
      <AutoForm
        form={createForm(linesSchema)}
        components={{ string: CustomString }}
        fields={{ lines: { component: LinesTable } }}
        defaultValues={twoLines}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByTestId('custom-lines.0.title')).toHaveValue('A')
    expect(screen.getByTestId('custom-lines.1.title')).toHaveValue('B')
  })

  it('typing in a cell never calls the container onChange', async () => {
    const containerOnChange = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(linesSchema)}
        fields={{
          lines: { component: LinesTable, onChange: containerOnChange },
        }}
        defaultValues={twoLines}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(input('lines.0.title'), 'xyz')
    expect(input('lines.0.title')).toHaveValue('Axyz')
    expect(containerOnChange).not.toHaveBeenCalled()
  })

  it('append / remove update rows and setPath writes a leaf', async () => {
    const { user } = setup(
      <AutoForm
        form={createForm(linesSchema)}
        fields={{ lines: { component: LinesTable } }}
        defaultValues={twoLines}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'c-append' }))
    await waitFor(() =>
      expect(screen.getByTestId('row-count')).toHaveTextContent('3'),
    )
    expect(input('lines.2.title')).toHaveValue('N')

    await user.click(screen.getByRole('button', { name: 'c-remove' }))
    await waitFor(() =>
      expect(screen.getByTestId('row-count')).toHaveTextContent('2'),
    )
    expect(input('lines.0.title')).toHaveValue('B')

    await user.click(screen.getByRole('button', { name: 'c-set-path' }))
    await waitFor(() => expect(input('lines.0.title')).toHaveValue('X'))
  })

  it('onChange with a whole array updates rowCount', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(linesSchema)}
        fields={{ lines: { component: LinesTable } }}
        defaultValues={twoLines}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'c-replace-3' }))
    await waitFor(() =>
      expect(screen.getByTestId('row-count')).toHaveTextContent('3'),
    )
    expect(input('lines.2.title')).toHaveValue('c')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        lines: [
          { title: 'a', qty: 1 },
          { title: 'b', qty: 2 },
          { title: 'c', qty: 3 },
        ],
      }),
    )
  })

  it('useArrayField in a sibling drives an array rendered by a container', async () => {
    function Toolbar() {
      const { append, rowCount } = useArrayField('lines')
      return (
        <button type='button' onClick={() => append({ title: 'T', qty: 9 })}>
          ext-append ({rowCount})
        </button>
      )
    }
    function FormWrapper({ children }: FormWrapperProps) {
      return (
        <>
          <Toolbar />
          {children}
        </>
      )
    }
    const { user } = setup(
      <AutoForm
        form={createForm(linesSchema)}
        fields={{ lines: { component: LinesTable } }}
        layout={{ formWrapper: FormWrapper }}
        defaultValues={twoLines}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'ext-append (2)' }))
    await waitFor(() =>
      expect(screen.getByTestId('row-count')).toHaveTextContent('3'),
    )
    expect(input('lines.2.title')).toHaveValue('T')
    expect(
      screen.getByRole('button', { name: 'ext-append (3)' }),
    ).toBeInTheDocument()
  })

  it('row operations re-key row overrides; onChange keeps them', async () => {
    const form = createForm(linesSchema).setOnChange(
      'lines.title',
      (value, ctx) => {
        ctx.setFieldMeta('lines.qty', { disabled: value === 'LOCK' })
      },
    )
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ lines: { component: LinesTable } }}
        defaultValues={twoLines}
        onSubmit={vi.fn()}
      />,
    )
    await user.clear(input('lines.1.title'))
    await user.type(input('lines.1.title'), 'LOCK')
    await waitFor(() => expect(input('lines.1.qty')).toBeDisabled())
    expect(input('lines.0.qty')).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'c-remove' }))
    await waitFor(() =>
      expect(screen.getByTestId('row-count')).toHaveTextContent('1'),
    )
    expect(input('lines.0.qty')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'c-rewrite' }))
    expect(input('lines.0.qty')).toBeDisabled()
  })

  it('honours condition: hidden container is not rendered and its value is unregistered', async () => {
    const schema = z.object({
      hasLines: z.boolean(),
      lines: z
        .array(z.object({ title: z.string(), qty: z.number() }))
        .optional(),
    })
    const form = createForm(schema).setCondition('lines', (v) => v.hasLines)
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ lines: { component: LinesTable } }}
        defaultValues={{ hasLines: true, lines: [{ title: 'A', qty: 1 }] }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByTestId('row-count')).toHaveTextContent('1')
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.queryByTestId('row-count')).toBeNull())

    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ hasLines: false })
  })

  it('unregisters a hidden container that renders no <Field> cells', async () => {
    const schema = z.object({
      hasTags: z.boolean(),
      tags: z.array(z.string()).optional(),
    })
    function TagCount({ rowCount }: ArrayContainerProps) {
      return <span data-testid='tag-count'>{rowCount}</span>
    }
    const form = createForm(schema).setCondition('tags', (v) => v.hasTags)
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ tags: { component: TagCount } }}
        defaultValues={{ hasTags: true, tags: ['a', 'b'] }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByTestId('tag-count')).toHaveTextContent('2')
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.queryByTestId('tag-count')).toBeNull())

    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ hasTags: false })
  })
})

describe('object container components', () => {
  const schema = z.object({
    address: z.object({ city: z.string(), zip: z.string() }),
  })

  function AddressBox({ fields, path, setPath }: ObjectContainerProps) {
    return (
      <section data-testid='address-box' data-path={path}>
        {fields.map((f) => (
          <Field key={f.name} name={f.name.slice(`${path}.`.length)} />
        ))}
        <button type='button' onClick={() => setPath('city', 'Paris')}>
          set-city
        </button>
      </section>
    )
  }

  it('renders the subtree through <Field> relative paths and setPath writes a leaf', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        components={{ addressBox: AddressBox }}
        fields={{ address: { component: 'addressBox' } }}
        defaultValues={{ address: { city: 'Rome', zip: '1' } }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByTestId('address-box')).toHaveAttribute(
      'data-path',
      'address',
    )
    expect(input('address.city')).toHaveValue('Rome')
    expect(input('address.zip')).toHaveValue('1')

    await user.click(screen.getByRole('button', { name: 'set-city' }))
    await waitFor(() => expect(input('address.city')).toHaveValue('Paris'))
    await user.type(input('address.zip'), '2')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        address: { city: 'Paris', zip: '12' },
      }),
    )
  })
})

describe('container re-render cost', () => {
  const titleSchema = z.object({
    hasLines: z.boolean(),
    lines: z.array(z.object({ title: z.string() })),
  })

  function renderCountingTable(conditional: boolean) {
    const renders: Record<string, number> = {}
    const onChanges = new Set<unknown>()
    function Counting(p: FieldProps) {
      renders[p.name] = (renders[p.name] ?? 0) + 1
      return (
        <input
          name={p.name}
          value={p.value as string}
          onChange={(e) => p.onChange(e.target.value)}
        />
      )
    }
    function Table({ rows, onChange }: ArrayContainerProps) {
      onChanges.add(onChange)
      return (
        <>
          {rows.map((r, i) => (
            <Field key={r.id} name={`${i}.title`} component={Counting} />
          ))}
        </>
      )
    }
    const form = createForm(titleSchema)
    if (conditional) form.setCondition('lines', (v) => v.hasLines)
    const result = setup(
      <AutoForm
        form={form}
        fields={{ lines: { component: Table } }}
        defaultValues={{
          hasLines: true,
          lines: [{ title: '' }, { title: '' }],
        }}
        onSubmit={vi.fn()}
      />,
    )
    return { ...result, renders, onChanges }
  }

  it.each([
    ['a plain container', false],
    ['a conditional container', true],
  ])(
    'typing in a cell does not re-render other cells (%s)',
    async (_, conditional) => {
      const { user, renders } = renderCountingTable(conditional)
      const before = renders['lines.1.title']
      await user.type(input('lines.0.title'), 'abc')
      expect(input('lines.0.title')).toHaveValue('abc')
      expect(renders['lines.1.title']).toBe(before)
    },
  )

  it('passes a stable onChange across re-renders', async () => {
    const { user, onChanges } = renderCountingTable(false)
    await user.type(input('lines.0.title'), 'abc')
    expect(onChanges.size).toBe(1)
  })
})
