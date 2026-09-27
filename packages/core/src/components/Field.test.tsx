import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { Field } from './Field'
import { createForm } from '../UniForm'
import type { FieldProps, FormWrapperProps } from '../types'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

function input(name: string): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]`)
}

/** Form wrapper that renders `slot` above the auto-rendered fields. */
function withSlot(slot: React.ReactNode) {
  return function FormWrapper({ children }: FormWrapperProps) {
    return (
      <>
        <div data-testid='slot'>{slot}</div>
        {children}
      </>
    )
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('<Field>', () => {
  const linesSchema = z.object({
    lines: z.array(z.object({ title: z.string(), qty: z.number() })),
  })

  it('binds array-row handlers: setOnChange ctx.getValues() is the row', async () => {
    const seen: unknown[] = []
    const form = createForm(linesSchema).setOnChange(
      'lines.title',
      (_, ctx) => {
        seen.push(ctx.getValues())
      },
    )
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ lines: { hidden: true } }}
        layout={{ formWrapper: withSlot(<Field name='lines.1.title' />) }}
        defaultValues={{
          lines: [
            { title: 'A', qty: 1 },
            { title: 'B', qty: 2 },
          ],
        }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(input('lines.1.title')!, 'Z')
    await waitFor(() => expect(seen).toHaveLength(1))
    expect(seen[0]).toEqual({ title: 'BZ', qty: 2 })
  })

  it('applies per-row dynamic meta for its row', async () => {
    const form = createForm(linesSchema).setOnChange(
      'lines.title',
      (v, ctx) => {
        ctx.setFieldMeta('lines.qty', { disabled: v === 'BX' })
      },
    )
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ lines: { hidden: true } }}
        layout={{
          formWrapper: withSlot(
            <>
              <Field name='lines.1.title' />
              <Field name='lines.0.qty' />
              <Field name='lines.1.qty' />
            </>,
          ),
        }}
        defaultValues={{
          lines: [
            { title: 'A', qty: 1 },
            { title: 'B', qty: 2 },
          ],
        }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(input('lines.1.title')!, 'X')
    await waitFor(() => expect(input('lines.1.qty')).toBeDisabled())
    expect(input('lines.0.qty')).not.toBeDisabled()
  })

  it('follows setCondition and excludes its value from submit while hidden', async () => {
    const schema = z.object({
      showNick: z.boolean(),
      nick: z.string().optional(),
    })
    const form = createForm(schema).setCondition('nick', (v) => v.showNick)
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ nick: { hidden: true } }}
        layout={{ formWrapper: withSlot(<Field name='nick' />) }}
        onSubmit={onSubmit}
      />,
    )
    expect(input('nick')).toBeNull()
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(input('nick')).not.toBeNull())
    await user.type(input('nick')!, 'abc')

    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(input('nick')).toBeNull())
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ showNick: false })
  })

  it("honours an ancestor's condition", async () => {
    const schema = z.object({
      hasAddress: z.boolean(),
      address: z.object({ city: z.string().optional() }).optional(),
    })
    const form = createForm(schema).setCondition('address', (v) => v.hasAddress)
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ address: { hidden: true } }}
        layout={{ formWrapper: withSlot(<Field name='address.city' />) }}
        onSubmit={vi.fn()}
      />,
    )
    expect(input('address.city')).toBeNull()
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(input('address.city')).not.toBeNull())
  })

  it('ignores meta.hidden', () => {
    render(
      <AutoForm
        form={createForm(z.object({ nick: z.string() }))}
        fields={{ nick: { hidden: true } }}
        layout={{ formWrapper: withSlot(<Field name='nick' />) }}
        onSubmit={vi.fn()}
      />,
    )
    expect(input('nick')).not.toBeNull()
  })

  it('combines className with meta.className', () => {
    render(
      <AutoForm
        form={createForm(z.object({ nick: z.string() }))}
        fields={{ nick: { hidden: true, className: 'base' } }}
        layout={{
          formWrapper: withSlot(<Field name='nick' className='wide' />),
        }}
        onSubmit={vi.fn()}
      />,
    )
    const wrapper = document.querySelector('[data-field-name="nick"]')
    expect(wrapper).toHaveClass('base')
    expect(wrapper).toHaveClass('wide')
  })

  it('applies per-instance component, label and disabled overrides', () => {
    function Custom({ name, label, disabled }: FieldProps) {
      return (
        <input
          name={name}
          data-testid='custom'
          aria-label={label}
          disabled={disabled}
        />
      )
    }
    render(
      <AutoForm
        form={createForm(z.object({ nick: z.string() }))}
        fields={{ nick: { hidden: true } }}
        layout={{
          formWrapper: withSlot(
            <Field name='nick' component={Custom} label='Handle' disabled />,
          ),
        }}
        onSubmit={vi.fn()}
      />,
    )
    const el = screen.getByTestId('custom')
    expect(el).toHaveAccessibleName('Handle')
    expect(el).toBeDisabled()
  })

  it('warns once and renders nothing for an unknown path', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { user } = setup(
      <AutoForm
        form={createForm(z.object({ nick: z.string() }))}
        layout={{ formWrapper: withSlot(<Field name='nope' />) }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByTestId('slot')).toBeEmptyDOMElement()
    await user.type(input('nick')!, 'abc')
    const fieldWarnings = warn.mock.calls.filter((args) =>
      String(args[0]).includes('"nope"'),
    )
    expect(fieldWarnings).toHaveLength(1)
  })

  it('a plain <Field> does not re-render when other values change', async () => {
    let renders = 0
    function Counting(props: FieldProps) {
      renders++
      return <input name={props.name} readOnly value={String(props.value)} />
    }
    const Slot = React.memo(function Slot() {
      return <Field name='a' component={Counting} />
    })
    const { user } = setup(
      <AutoForm
        form={createForm(z.object({ a: z.string(), b: z.string() }))}
        fields={{ a: { hidden: true } }}
        layout={{ formWrapper: withSlot(<Slot />) }}
        onSubmit={vi.fn()}
      />,
    )
    const before = renders
    await user.type(input('b')!, 'xyz')
    expect(renders).toBe(before)
  })

  it('does not re-render when only another field’s error changes', async () => {
    let renders = 0
    function Counting(props: FieldProps) {
      renders++
      return <input name={props.name} readOnly value={String(props.value)} />
    }
    const Slot = React.memo(function Slot() {
      return <Field name='a' component={Counting} />
    })
    const { user } = setup(
      <AutoForm
        form={createForm(
          z.object({ a: z.string().min(1), b: z.string().min(1) }),
        )}
        fields={{ a: { hidden: true } }}
        layout={{ formWrapper: withSlot(<Slot />) }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2))
    const before = renders
    // After submit, typing re-validates `b` and clears only its error
    await user.type(input('b')!, 'x')
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1))
    expect(renders).toBe(before)
  })
})
