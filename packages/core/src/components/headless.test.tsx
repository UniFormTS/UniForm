import * as React from 'react'
import { describe, it, expect, vi, expectTypeOf } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { Field } from './Field'
import { UniFormProvider } from './UniFormProvider'
import { createForm } from '../UniForm'
import { useUniForm } from '../hooks/useUniForm'
import { useFormValue, useFormValues } from '../hooks/useFormValue'
import { useField } from '../hooks/useField'
import { useAutoFormContext } from '../context/AutoFormContext'
import { useArrayField } from '../hooks/useArrayField'
import type { ArrayContainerProps, FieldProps } from '../types'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string(),
  address: z.object({ city: z.string() }),
})
const profileForm = createForm(profileSchema)

// ---------------------------------------------------------------------------
// W3 — headless container mode
// ---------------------------------------------------------------------------

describe('useUniForm + UniFormProvider (W3)', () => {
  it('resolves hooks under UniFormProvider with no AutoForm rendered', () => {
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: {
          firstName: 'Ada',
          lastName: 'L',
          address: { city: 'London' },
        },
      })
      return (
        <UniFormProvider form={form}>
          <Readout />
        </UniFormProvider>
      )
    }
    function Readout() {
      const { formMethods } = useAutoFormContext(profileForm)
      const first = useFormValue(profileForm, 'firstName')
      return (
        <div>
          <span data-testid='watched'>{first}</span>
          <span data-testid='direct'>{formMethods.getValues().lastName}</span>
        </div>
      )
    }

    render(<App />)
    expect(screen.getByTestId('watched')).toHaveTextContent('Ada')
    expect(screen.getByTestId('direct')).toHaveTextContent('L')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('shares exactly one store between the instance and <AutoForm>', async () => {
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: { firstName: '', lastName: '', address: { city: '' } },
      })
      // Passing the live instance lets the hook work above the provider.
      const firstName = useFormValue(form, 'firstName')
      return (
        <div>
          <span data-testid='outside'>{firstName}</span>
          <button
            type='button'
            onClick={() => form.methods.setValue('lastName', 'Lovelace')}
          >
            set-outside
          </button>
          <AutoForm form={form} onSubmit={vi.fn()} />
        </div>
      )
    }
    const { user } = setup(<App />)

    // Inside -> outside
    const firstInput = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'firstName')!
    await user.type(firstInput, 'Grace')
    await waitFor(() =>
      expect(screen.getByTestId('outside')).toHaveTextContent('Grace'),
    )

    // Outside -> inside
    await user.click(screen.getByRole('button', { name: 'set-outside' }))
    const lastInput = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'lastName')!
    await waitFor(() => expect(lastInput).toHaveValue('Lovelace'))

    // Only one registered input per path
    expect(
      screen
        .getAllByRole('textbox')
        .filter((el) => el.getAttribute('name') === 'firstName'),
    ).toHaveLength(1)
  })

  it('submits from an external button with validation intact', async () => {
    const onSubmit = vi.fn()
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: { firstName: '', lastName: '', address: { city: '' } },
        onSubmit,
      })
      return (
        <div>
          <button type='button' onClick={() => form.submit()}>
            external-submit
          </button>
          <UniFormProvider form={form}>
            <Field name='firstName' />
          </UniFormProvider>
        </div>
      )
    }
    const { user } = setup(<App />)

    await user.click(screen.getByRole('button', { name: 'external-submit' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox'), 'Ada')
    await user.click(screen.getByRole('button', { name: 'external-submit' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Ada' }),
      ),
    )
  })

  it('<AutoForm onSubmit> also drives the instance submit()', async () => {
    const onSubmit = vi.fn()
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: {
          firstName: 'Ada',
          lastName: '',
          address: { city: '' },
        },
      })
      return (
        <div>
          <button type='button' onClick={() => form.submit()}>
            external-submit
          </button>
          <AutoForm form={form} onSubmit={onSubmit} />
        </div>
      )
    }
    const { user } = setup(<App />)
    await user.click(screen.getByRole('button', { name: 'external-submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('honours fields overrides passed to <AutoForm> in instance mode', () => {
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: { firstName: '', lastName: '', address: { city: '' } },
      })
      return (
        <AutoForm
          form={form}
          fields={{ firstName: { label: 'Given Name' } }}
          onSubmit={vi.fn()}
        />
      )
    }
    render(<App />)
    expect(
      document.querySelector('label[for="firstName"]')?.textContent,
    ).toContain('Given Name')
  })

  it('persists and restores from the instance without <AutoForm>', async () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    store.set(
      'headless-draft',
      JSON.stringify({
        firstName: 'Restored',
        lastName: '',
        address: { city: '' },
      }),
    )

    function App() {
      const form = useUniForm(profileForm, {
        persistKey: 'headless-draft',
        persistStorage: storage,
        defaultValues: { firstName: '', lastName: '', address: { city: '' } },
      })
      return (
        <UniFormProvider form={form}>
          <Field name='firstName' />
        </UniFormProvider>
      )
    }
    render(<App />)
    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveValue('Restored'),
    )
  })

  it('renders the loading fallback for async defaults in headless mode', async () => {
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: () =>
          Promise.resolve({
            firstName: 'Async',
            lastName: '',
            address: { city: '' },
          }),
      })
      if (form.isLoading) return <p>loading-headless</p>
      return (
        <UniFormProvider form={form}>
          <Field name='firstName' />
        </UniFormProvider>
      )
    }
    render(<App />)
    expect(screen.getByText('loading-headless')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveValue('Async'),
    )
  })
})

// ---------------------------------------------------------------------------
// W4 — typed access to form state
// ---------------------------------------------------------------------------

describe('useFormValue / useFormValues (W4)', () => {
  it('re-renders on the watched path and not on an unrelated one', async () => {
    const watchedRenders = vi.fn()

    function WatchFirst() {
      const value = useFormValue(profileForm, 'firstName')
      watchedRenders()
      return <span data-testid='first'>{value}</span>
    }

    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: { firstName: '', lastName: '', address: { city: '' } },
      })
      return (
        <div>
          <UniFormProvider form={form}>
            <WatchFirst />
          </UniFormProvider>
          <AutoForm form={form} onSubmit={vi.fn()} />
        </div>
      )
    }

    const { user } = setup(<App />)
    const baseline = watchedRenders.mock.calls.length

    const lastInput = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'lastName')!
    await user.type(lastInput, 'Hopper')
    await waitFor(() => expect(lastInput).toHaveValue('Hopper'))
    expect(watchedRenders.mock.calls.length).toBe(baseline)

    const firstInput = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'firstName')!
    await user.type(firstInput, 'Grace')
    await waitFor(() =>
      expect(screen.getByTestId('first')).toHaveTextContent('Grace'),
    )
    expect(watchedRenders.mock.calls.length).toBeGreaterThan(baseline)
  })

  it('useFormValues returns the whole values object reactively', async () => {
    function Readout() {
      const values = useFormValues(profileForm)
      return <span data-testid='json'>{JSON.stringify(values)}</span>
    }
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: {
          firstName: 'A',
          lastName: 'B',
          address: { city: 'C' },
        },
      })
      return (
        <div>
          <UniFormProvider form={form}>
            <Readout />
          </UniFormProvider>
          <AutoForm form={form} onSubmit={vi.fn()} />
        </div>
      )
    }
    const { user } = setup(<App />)
    expect(screen.getByTestId('json')).toHaveTextContent('"firstName":"A"')

    const firstInput = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'firstName')!
    await user.type(firstInput, 'Z')
    await waitFor(() =>
      expect(screen.getByTestId('json')).toHaveTextContent('"firstName":"AZ"'),
    )
  })

  it('reads index paths inside arrays', () => {
    const orderSchema = z.object({
      lines: z.array(z.object({ sku: z.string(), qty: z.number() })),
    })
    const orderForm = createForm(orderSchema)

    function Readout() {
      const sku = useFormValue(orderForm, 'lines.0.sku')
      return <span data-testid='sku'>{sku}</span>
    }
    function App() {
      const form = useUniForm(orderForm, {
        defaultValues: { lines: [{ sku: 'AAA', qty: 1 }] },
      })
      return (
        <UniFormProvider form={form}>
          <Readout />
        </UniFormProvider>
      )
    }
    render(<App />)
    expect(screen.getByTestId('sku')).toHaveTextContent('AAA')
  })

  it('infers value types from the form definition with zero casts', () => {
    const typedSchema = z.object({
      title: z.string(),
      count: z.number(),
      rows: z.array(z.object({ sku: z.string() })),
    })
    const typedForm = createForm(typedSchema)

    // Type-only assertions — no rendering required.
    function TypeProbe() {
      expectTypeOf(useFormValue(typedForm, 'title')).toEqualTypeOf<string>()
      expectTypeOf(useFormValue(typedForm, 'count')).toEqualTypeOf<number>()
      expectTypeOf(useFormValue(typedForm, 'rows')).toEqualTypeOf<
        { sku: string }[]
      >()
      expectTypeOf(
        useFormValue(typedForm, 'rows.0.sku'),
      ).toEqualTypeOf<string>()
      expectTypeOf(useFormValues(typedForm)).toEqualTypeOf<
        z.infer<typeof typedSchema>
      >()
      // @ts-expect-error — 'nope' is not a path in the schema
      useFormValue(typedForm, 'nope')
      const { formMethods } = useAutoFormContext(typedForm)
      expectTypeOf(formMethods.getValues()).toEqualTypeOf<
        z.infer<typeof typedSchema>
      >()
      return null
    }
    expect(TypeProbe).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// W5 — renderable subtrees
// ---------------------------------------------------------------------------

const orderSchema = z.object({
  reference: z.string(),
  lines: z.array(
    z.object({
      sku: z.string().min(3, 'SKU too short'),
      qty: z.number(),
    }),
  ),
})
const orderForm = createForm(orderSchema)

describe('<Field> and useField (W5)', () => {
  it('renders a leaf at an absolute path outside AutoForm', async () => {
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: {
          firstName: '',
          lastName: '',
          address: { city: 'Rome' },
        },
      })
      return (
        <UniFormProvider form={form}>
          <Field name='address.city' />
        </UniFormProvider>
      )
    }
    const { user } = setup(<App />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('name', 'address.city')
    expect(input).toHaveValue('Rome')
    await user.type(input, '!')
    await waitFor(() => expect(input).toHaveValue('Rome!'))
  })

  it('applies per-instance label and component overrides', () => {
    function Loud({ value }: FieldProps) {
      return <p data-testid='loud'>{String(value).toUpperCase()}</p>
    }
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: {
          firstName: 'ada',
          lastName: '',
          address: { city: '' },
        },
        components: { loud: Loud },
      })
      return (
        <UniFormProvider form={form}>
          <Field name='firstName' label='Given' component='loud' />
        </UniFormProvider>
      )
    }
    render(<App />)
    expect(screen.getByTestId('loud')).toHaveTextContent('ADA')
    expect(
      document.querySelector('label[for="firstName"]')?.textContent,
    ).toContain('Given')
  })

  it('warns and renders nothing for an unknown path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    function App() {
      const form = useUniForm(profileForm, { defaultValues: {} })
      return (
        <UniFormProvider form={form}>
          <Field name='nope.missing' />
        </UniFormProvider>
      )
    }
    render(<App />)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('<Field name="nope.missing" />'),
    )
    warn.mockRestore()
  })

  it('useField works under UniFormProvider with no AutoForm', async () => {
    function CityInput() {
      const { value, onChange, onBlur, ref, label, required } =
        useField<string>('address.city')
      return (
        <label>
          {label}
          <input
            ref={ref}
            aria-required={required}
            value={value}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      )
    }
    function App() {
      const form = useUniForm(profileForm, {
        defaultValues: {
          firstName: '',
          lastName: '',
          address: { city: 'Oslo' },
        },
      })
      return (
        <UniFormProvider form={form}>
          <CityInput />
        </UniFormProvider>
      )
    }
    const { user } = setup(<App />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('Oslo')
    expect(input).toHaveAttribute('aria-required', 'true')
    await user.clear(input)
    await user.type(input, 'Bergen')
    await waitFor(() => expect(input).toHaveValue('Bergen'))
  })

  it('surfaces validation errors through useField', async () => {
    const onSubmit = vi.fn()
    function SkuInput() {
      const { value, onChange, onBlur, ref, error } =
        useField<string>('lines.0.sku')
      return (
        <>
          <input
            ref={ref}
            value={value}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
          />
          {error && <span role='alert'>{error}</span>}
        </>
      )
    }
    function App() {
      const form = useUniForm(orderForm, {
        defaultValues: { reference: '', lines: [{ sku: 'a', qty: 1 }] },
        onSubmit,
      })
      return (
        <div>
          <button type='button' onClick={() => form.submit()}>
            go
          </button>
          <UniFormProvider form={form}>
            <SkuInput />
          </UniFormProvider>
        </div>
      )
    }
    const { user } = setup(<App />)
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('SKU too short')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('container component overrides (W5)', () => {
  function Cell(props: FieldProps) {
    return (
      <input
        data-testid={props.name}
        name={props.name}
        value={typeof props.value === 'string' ? props.value : ''}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        ref={props.ref}
      />
    )
  }

  function LinesTable({
    rowCount,
    rows,
    append,
    remove,
    path,
  }: ArrayContainerProps) {
    return (
      <table>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id)} data-testid={`row-${i}`}>
              <td>
                <Field name={`${i}.sku`} />
              </td>
              <td>
                <button type='button' onClick={() => remove(i)}>
                  drop-{i}
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <span data-testid='container-path'>{path}</span>
              <span data-testid='container-count'>{rowCount}</span>
              <button type='button' onClick={() => append({ sku: '', qty: 1 })}>
                add-row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  function renderTable(onSubmit = vi.fn()) {
    return setup(
      <AutoForm
        form={orderForm}
        components={{ string: Cell, linesTable: LinesTable }}
        fields={{ lines: { component: 'linesTable' } }}
        defaultValues={{
          reference: '',
          lines: [
            { sku: 'AAA', qty: 1 },
            { sku: 'BBB', qty: 2 },
          ],
        }}
        onSubmit={onSubmit}
      />,
    )
  }

  it('delegates each cell to a relative <Field> that registers with RHF', async () => {
    const onSubmit = vi.fn()
    const { user } = renderTable(onSubmit)

    expect(screen.getByTestId('container-path')).toHaveTextContent('lines')
    expect(screen.getByTestId('lines.0.sku')).toHaveValue('AAA')
    expect(screen.getByTestId('lines.1.sku')).toHaveValue('BBB')

    await user.type(screen.getByTestId('lines.1.sku'), 'X')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        reference: '',
        lines: [
          { sku: 'AAA', qty: 1 },
          { sku: 'BBBX', qty: 2 },
        ],
      }),
    )
  })

  it('uses the registered component for delegated cells', () => {
    renderTable()
    // Cell (from `components.string`) renders a data-testid; DefaultInput does not.
    expect(screen.getByTestId('lines.0.sku')).toBeInTheDocument()
  })

  it('writes only the typed path — the container value is never replaced', async () => {
    const containerOnChange = vi.fn()

    function SpyTable(props: ArrayContainerProps) {
      const { onChange, ...rest } = props
      return (
        <LinesTable
          {...rest}
          onChange={(v: unknown) => {
            containerOnChange(v)
            onChange(v)
          }}
        />
      )
    }

    const { user } = setup(
      <AutoForm
        form={orderForm}
        components={{ string: Cell, spyTable: SpyTable }}
        fields={{ lines: { component: 'spyTable' } }}
        defaultValues={{
          reference: '',
          lines: [
            { sku: 'AAA', qty: 1 },
            { sku: 'BBB', qty: 2 },
          ],
        }}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByTestId('lines.0.sku'), 'Z')
    await waitFor(() =>
      expect(screen.getByTestId('lines.0.sku')).toHaveValue('AAAZ'),
    )

    // The leaf wrote its own path; the whole array value was never pushed.
    expect(containerOnChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('lines.1.sku')).toHaveValue('BBB')
  })

  it('shows per-row validation errors on the delegated leaf', async () => {
    const { user } = renderTable()
    await user.clear(screen.getByTestId('lines.0.sku'))
    await user.type(screen.getByTestId('lines.0.sku'), 'a')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toHaveTextContent('SKU too short')
    expect(alerts[0].closest('[data-field-name]')).toHaveAttribute(
      'data-field-name',
      'lines.0.sku',
    )
  })

  it('exposes live row operations to the container component', async () => {
    const { user } = renderTable()
    await user.click(screen.getByRole('button', { name: 'add-row' }))
    await waitFor(() => expect(screen.getByTestId('row-2')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'drop-0' }))
    await waitFor(() =>
      expect(screen.queryByTestId('row-2')).not.toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(screen.getByTestId('lines.0.sku')).toHaveValue('BBB'),
    )
  })

  it('setPath performs a targeted write inside the container', async () => {
    function SetPathTable({ setPath, rowCount }: ArrayContainerProps) {
      return (
        <div>
          <span data-testid='count'>{rowCount}</span>
          <button type='button' onClick={() => setPath('0.sku', 'ZZZ')}>
            patch
          </button>
          <Field name='0.sku' />
        </div>
      )
    }
    const { user } = setup(
      <AutoForm
        form={orderForm}
        components={{ string: Cell, setPathTable: SetPathTable }}
        fields={{ lines: { component: 'setPathTable' } }}
        defaultValues={{ reference: '', lines: [{ sku: 'AAA', qty: 1 }] }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'patch' }))
    await waitFor(() =>
      expect(screen.getByTestId('lines.0.sku')).toHaveValue('ZZZ'),
    )
  })

  it('useArrayField drives an array rendered by a custom component', async () => {
    function Toolbar() {
      const { append, rowCount } = useArrayField('lines')
      return (
        <div>
          <span data-testid='toolbar-count'>{rowCount}</span>
          <button type='button' onClick={() => append({ sku: 'NEW', qty: 1 })}>
            ext-add
          </button>
        </div>
      )
    }
    function App() {
      const form = useUniForm(orderForm, {
        defaultValues: { reference: '', lines: [{ sku: 'AAA', qty: 1 }] },
        components: { string: Cell, linesTable: LinesTable },
        fields: { lines: { component: 'linesTable' } },
      })
      return (
        <div>
          <UniFormProvider form={form}>
            <Toolbar />
          </UniFormProvider>
          <AutoForm form={form} onSubmit={vi.fn()} />
        </div>
      )
    }
    const { user } = setup(<App />)
    await user.click(screen.getByRole('button', { name: 'ext-add' }))
    await waitFor(() =>
      expect(screen.getByTestId('lines.1.sku')).toHaveValue('NEW'),
    )
    expect(screen.getByTestId('toolbar-count')).toHaveTextContent('2')
  })
})
