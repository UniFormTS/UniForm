import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { FormErrorSummary } from './FormErrorSummary'
import { UniFormProvider } from './UniFormProvider'
import { createForm } from '../UniForm'
import { useUniForm } from '../hooks/useUniForm'
import {
  useFieldError,
  useFieldErrors,
  useFormErrors,
} from '../hooks/useFieldError'
import { isEmptyValue } from '../validation/requiredResolver'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

const wrapperFor = (name: string) =>
  document.querySelector(`[data-field-name="${name}"]`)

const labelTextFor = (name: string) =>
  wrapperFor(name)?.querySelector('label')?.textContent ?? ''

// ---------------------------------------------------------------------------
// W6 — runtime requiredness
// ---------------------------------------------------------------------------

describe('empty-value semantics (W6)', () => {
  it('treats undefined, null, empty string and empty array as empty', () => {
    expect(isEmptyValue(undefined)).toBe(true)
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue([])).toBe(true)
  })

  it('treats false and 0 as values', () => {
    expect(isEmptyValue(false)).toBe(false)
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue('x')).toBe(false)
    expect(isEmptyValue([1])).toBe(false)
  })
})

describe('setRequired (W6)', () => {
  const schema = z.object({
    action: z.enum(['view', 'transfer']),
    reason: z.string().optional(),
  })

  const buildForm = () =>
    createForm(schema).setRequired(
      'reason',
      (values) => values.action === 'transfer',
    )

  it('flips the asterisk live as a sibling value changes', async () => {
    const { user } = setup(
      <AutoForm
        form={buildForm()}
        defaultValues={{ action: 'view', reason: '' }}
        onSubmit={vi.fn()}
      />,
    )
    expect(labelTextFor('reason')).not.toContain('*')

    await user.selectOptions(screen.getByRole('combobox'), 'transfer')
    await waitFor(() => expect(labelTextFor('reason')).toContain('*'))

    await user.selectOptions(screen.getByRole('combobox'), 'view')
    await waitFor(() => expect(labelTextFor('reason')).not.toContain('*'))
  })

  it('drives aria-required on the input', async () => {
    const { user } = setup(
      <AutoForm
        form={buildForm()}
        defaultValues={{ action: 'view', reason: '' }}
        onSubmit={vi.fn()}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-required', 'false')

    await user.selectOptions(screen.getByRole('combobox'), 'transfer')
    await waitFor(() => expect(input).toHaveAttribute('aria-required', 'true'))
  })

  it('blocks submit when the predicate is true and the value is empty', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={buildForm()}
        defaultValues={{ action: 'transfer', reason: '' }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This field is required',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows submit when the predicate is false', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={buildForm()}
        defaultValues={{ action: 'view', reason: '' }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('allows submit once the required value is filled in', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={buildForm()}
        defaultValues={{ action: 'transfer', reason: '' }}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByRole('textbox'), 'Relocation')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        action: 'transfer',
        reason: 'Relocation',
      }),
    )
  })

  it('uses the messages.required override', async () => {
    const { user } = setup(
      <AutoForm
        form={buildForm()}
        defaultValues={{ action: 'transfer', reason: '' }}
        messages={{ required: 'Cannot be blank' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot be blank',
    )
  })

  it('does not overwrite an error Zod already reported', async () => {
    const strict = z.object({
      action: z.enum(['view', 'transfer']),
      reason: z.string().min(5, 'Too short'),
    })
    const form = createForm(strict).setRequired('reason', () => true)
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ action: 'transfer', reason: 'ab' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too short')
  })

  it('fires per row for array-item paths', async () => {
    const rowSchema = z.object({
      lines: z.array(
        z.object({
          kind: z.enum(['standard', 'custom']),
          spec: z.string().optional(),
        }),
      ),
    })
    // Row-local: the predicate receives the row.
    const form = createForm(rowSchema).setRequired(
      'lines.spec',
      (row) => row.kind === 'custom',
    )
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{
          lines: [
            { kind: 'standard', spec: '' },
            { kind: 'custom', spec: '' },
          ],
        }}
        onSubmit={onSubmit}
      />,
    )

    // Only the second row is required.
    expect(labelTextFor('lines.0.spec')).not.toContain('*')
    await waitFor(() => expect(labelTextFor('lines.1.spec')).toContain('*'))

    await user.click(screen.getByRole('button', { name: /submit/i }))
    const alerts = await screen.findAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].closest('[data-field-name]')).toHaveAttribute(
      'data-field-name',
      'lines.1.spec',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('can be declared through the fields prop with requiredWhen', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ action: 'transfer', reason: '' }}
        fields={{
          reason: { requiredWhen: (values) => values.action === 'transfer' },
        }}
        onSubmit={onSubmit}
      />,
    )
    await waitFor(() => expect(labelTextFor('reason')).toContain('*'))
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('setFieldMeta({ required }) wins over the schema for the marker', async () => {
    const metaSchema = z.object({
      trigger: z.enum(['off', 'on']),
      note: z.string().optional(),
    })
    const form = createForm(metaSchema).setOnChange('trigger', (value, ctx) => {
      ctx.setFieldMeta('note', { required: value === 'on' })
    })
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ trigger: 'off', note: '' }}
        onSubmit={vi.fn()}
      />,
    )
    expect(labelTextFor('note')).not.toContain('*')
    await user.selectOptions(screen.getByRole('combobox'), 'on')
    await waitFor(() => expect(labelTextFor('note')).toContain('*'))
  })

  it('treats false and 0 as filled in', async () => {
    const boolSchema = z.object({
      agree: z.boolean().optional(),
      count: z.number().optional(),
    })
    const form = createForm(boolSchema)
      .setRequired('agree', () => true)
      .setRequired('count', () => true)
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ agree: false, count: 0 }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })
})

// ---------------------------------------------------------------------------
// W7 — error tree access
// ---------------------------------------------------------------------------

const orderSchema = z
  .object({
    customer: z.string(),
    lines: z.array(
      z.object({ sku: z.string().min(3, 'SKU too short'), qty: z.number() }),
    ),
  })
  .superRefine((value, ctx) => {
    value.lines.forEach((line, index) => {
      if (line.qty > 10) {
        ctx.addIssue({
          code: 'custom',
          path: ['lines', index],
          message: 'Quantity exceeds stock for this line',
        })
      }
    })
    if (value.lines.length > 1 && value.customer === 'blocked') {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'This customer cannot place multi-line orders',
      })
    }
  })

const orderForm = createForm(orderSchema as unknown as z.ZodObject)

describe('error tree access (W7)', () => {
  function Probe({ path }: { path: string }) {
    const message = useFieldError(path)
    return <span data-testid={`err-${path || 'root'}`}>{message ?? ''}</span>
  }

  function renderOrder(defaults: unknown, extra?: React.ReactNode) {
    return setup(
      <AutoForm
        form={orderForm}
        defaultValues={defaults as never}
        layout={{
          formWrapper: ({ children }) => (
            <>
              {extra}
              {children}
            </>
          ),
        }}
        onSubmit={vi.fn()}
      />,
    )
  }

  it('reads a superRefine issue anchored to an array element', async () => {
    const { user } = renderOrder(
      { customer: 'acme', lines: [{ sku: 'ABC', qty: 99 }] },
      <Probe path='lines.0' />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('err-lines.0')).toHaveTextContent(
        'Quantity exceeds stock for this line',
      ),
    )
  })

  it('survives re-validation', async () => {
    const { user } = renderOrder(
      { customer: 'acme', lines: [{ sku: 'ABC', qty: 99 }] },
      <Probe path='lines.0' />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('err-lines.0')).not.toHaveTextContent(''),
    )

    const sku = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'lines.0.sku')!
    await user.type(sku, 'X')
    await waitFor(() =>
      expect(screen.getByTestId('err-lines.0')).toHaveTextContent(
        'Quantity exceeds stock for this line',
      ),
    )
  })

  it('anchors a root-path issue so it can be rendered', async () => {
    const { user } = renderOrder(
      {
        customer: 'blocked',
        lines: [
          { sku: 'ABC', qty: 1 },
          { sku: 'DEF', qty: 2 },
        ],
      },
      <Probe path='' />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('err-root')).toHaveTextContent(
        'This customer cannot place multi-line orders',
      ),
    )
  })

  it('collects nested leaf errors beneath a path', async () => {
    function Collector() {
      const issues = useFieldErrors('lines.0')
      return <span data-testid='collected'>{JSON.stringify(issues)}</span>
    }
    const { user } = renderOrder(
      { customer: 'acme', lines: [{ sku: 'a', qty: 1 }] },
      <Collector />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('collected')).toHaveTextContent(
        'SKU too short',
      ),
    )
    expect(screen.getByTestId('collected')).toHaveTextContent('lines.0.sku')
  })

  it('useFormErrors exposes the whole tree', async () => {
    function Tree() {
      const errors = useFormErrors()
      return <span data-testid='tree'>{Object.keys(errors).join(',')}</span>
    }
    const { user } = renderOrder(
      { customer: 'acme', lines: [{ sku: 'a', qty: 1 }] },
      <Tree />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getByTestId('tree')).toHaveTextContent('lines'),
    )
  })

  it('setIssues anchors messages at non-field paths and the root', async () => {
    function Harness() {
      const form = useUniForm(orderForm, {
        defaultValues: {
          customer: 'acme',
          lines: [{ sku: 'ABC', qty: 1 }],
        } as never,
      })
      return (
        <UniFormProvider form={form}>
          <button
            type='button'
            onClick={() =>
              form.methods.setIssues([
                { path: 'lines.0', message: 'Duplicate SKU' },
                { path: '', message: 'Credit limit exceeded' },
              ])
            }
          >
            apply-issues
          </button>
          <Probe path='lines.0' />
          <Probe path='' />
        </UniFormProvider>
      )
    }
    const { user } = setup(<Harness />)
    await user.click(screen.getByRole('button', { name: 'apply-issues' }))

    await waitFor(() =>
      expect(screen.getByTestId('err-lines.0')).toHaveTextContent(
        'Duplicate SKU',
      ),
    )
    expect(screen.getByTestId('err-root')).toHaveTextContent(
      'Credit limit exceeded',
    )
  })

  it('setError / setErrors keep working', async () => {
    function Harness() {
      const form = useUniForm(orderForm, {
        defaultValues: {
          customer: '',
          lines: [{ sku: 'ABC', qty: 1 }],
        } as never,
      })
      return (
        <UniFormProvider form={form}>
          <button
            type='button'
            onClick={() => form.methods.setErrors({ customer: 'Unknown' })}
          >
            set-errors
          </button>
          <Probe path='customer' />
        </UniFormProvider>
      )
    }
    const { user } = setup(<Harness />)
    await user.click(screen.getByRole('button', { name: 'set-errors' }))
    await waitFor(() =>
      expect(screen.getByTestId('err-customer')).toHaveTextContent('Unknown'),
    )
  })

  it('FormErrorSummary lists only unanchored issues', async () => {
    const { user } = renderOrder(
      {
        customer: 'blocked',
        lines: [
          { sku: 'a', qty: 99 },
          { sku: 'DEF', qty: 2 },
        ],
      },
      <FormErrorSummary title='Fix these' />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))

    const summary = await screen.findByText('Fix these')
    const list = summary.parentElement!
    // The array-element and root issues are listed…
    expect(list).toHaveTextContent('Quantity exceeds stock for this line')
    expect(list).toHaveTextContent('This customer cannot place multi-line')
    // …the leaf error is not, because its own field renders it.
    expect(list).not.toHaveTextContent('SKU too short')
  })

  it('FormErrorSummary renders nothing when there is nothing to report', () => {
    renderOrder(
      { customer: 'acme', lines: [{ sku: 'ABC', qty: 1 }] },
      <FormErrorSummary title='Fix these' />,
    )
    expect(screen.queryByText('Fix these')).not.toBeInTheDocument()
  })
})
