import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createForm } from '../UniForm'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

const submit = () => screen.getByRole('button', { name: /submit/i })
const input = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | null

/** Contract: hidden fields are neither validated nor submitted, and a field
 * that is hidden resets to its default (shown again with that default). */
describe('hidden fields', () => {
  it('does not validate or submit a required field hidden by a condition', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({ has: z.boolean(), detail: z.string().min(1) }),
    ).setCondition('detail', (v) => v.has)
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ has: false })
  })

  it('does not validate or submit a required field hidden via the fields prop', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({ name: z.string(), secret: z.string().min(1) }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{ secret: { hidden: true } }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: '' })
  })

  it('does not validate or submit a field hidden with setFieldMeta', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        kind: z.enum(['person', 'company']),
        company: z.string().min(1),
      }),
    ).setOnChange('kind', (value, ctx) => {
      ctx.setFieldMeta('company', { hidden: value !== 'company' })
    })
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ kind: 'company' }}
        onSubmit={onSubmit}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox'), 'person')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ kind: 'person' })
  })

  it('excludes hidden nested fields', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({ news: z.boolean(), reason: z.string().min(1) }),
      }),
    ).setCondition('prefs.reason', (v) => v.prefs.news)
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ prefs: { news: false } })
  })

  it('excludes a hidden array, including its required rows', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        hasItems: z.boolean(),
        items: z.array(z.object({ name: z.string().min(1) })).min(1),
      }),
    ).setCondition('items', (v) => v.hasItems)
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ items: [{ name: '' }] }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ hasItems: false })
  })

  it('validates array row fields only in rows where they are visible', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        rows: z.array(
          z.object({ kind: z.enum(['a', 'b']), note: z.string().min(1) }),
        ),
      }),
    ).setCondition('rows.note', (row) => row.kind === 'b')
    const { user, container } = setup(
      <AutoForm
        form={form}
        defaultValues={{
          rows: [
            { kind: 'a', note: '' },
            { kind: 'b', note: '' },
          ],
        }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    // Row 1's visible note is still required
    expect(await screen.findAllByRole('alert')).toHaveLength(1)
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(input(container, 'rows.1.note')!, 'hi')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      rows: [{ kind: 'a' }, { kind: 'b', note: 'hi' }],
    })
  })

  it('still blocks submit on visible errors and only shows those', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        name: z.string().min(1, 'Name required'),
        has: z.boolean(),
        detail: z.string().min(1, 'Detail required'),
      }),
    ).setCondition('detail', (v) => v.has)
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((a) => a.textContent)).toEqual(['Name required'])
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps transforms and defaults of visible fields in the submitted output', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        name: z.string().transform((s) => s.toUpperCase()),
        count: z.number().default(3),
        has: z.boolean(),
        detail: z.string().min(1),
      }),
    ).setCondition('detail', (v) => v.has)
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    await user.type(input(container, 'name')!, 'ada')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'ADA',
      count: 3,
      has: false,
    })
  })

  it('works inside a discriminated union variant', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.discriminatedUnion('kind', [
        z.strictObject({
          kind: z.literal('a'),
          wantsNote: z.boolean(),
          note: z.string().min(1),
        }),
        z.strictObject({ kind: z.literal('b'), other: z.string() }),
      ]),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        fields={{
          note: {
            condition: (v: Record<string, unknown>) => v.wantsNote === true,
          },
        }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ kind: 'a', wantsNote: false })
  })

  it('clears the errors of a field when it becomes hidden', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({ has: z.boolean(), detail: z.string().min(1, 'Required!') }),
    ).setCondition('detail', (v) => v.has)
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('checkbox'))
    await user.click(submit())
    expect(await screen.findByText('Required!')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox')) // hide
    await waitFor(() =>
      expect(screen.queryByText('Required!')).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('checkbox')) // show again
    expect(screen.queryByText('Required!')).not.toBeInTheDocument()
  })

  it('resets a setFieldMeta-hidden field to its default when hidden, like conditions do', async () => {
    const form = createForm(
      z.object({
        kind: z.enum(['person', 'company']),
        company: z.string(),
      }),
    ).setOnChange('kind', (value, ctx) => {
      ctx.setFieldMeta('company', { hidden: value !== 'company' })
    })
    const { user, container } = setup(
      <AutoForm
        form={form}
        defaultValues={{ kind: 'company', company: 'Acme' }}
        onSubmit={() => {}}
      />,
    )
    const select = screen.getByRole('combobox')
    await user.clear(input(container, 'company')!)
    await user.type(input(container, 'company')!, 'Typed')
    await user.selectOptions(select, 'person')
    await waitFor(() => expect(input(container, 'company')).toBeNull())
    await user.selectOptions(select, 'company')
    // Back to the default (from defaultValues), not the typed value
    await waitFor(() => expect(input(container, 'company')!.value).toBe('Acme'))
  })

  it('resets a conditional field to its defaultValues entry when shown again', async () => {
    const form = createForm(
      z.object({ has: z.boolean(), detail: z.string() }),
    ).setCondition('detail', (v) => v.has)
    const { user, container } = setup(
      <AutoForm
        form={form}
        defaultValues={{ has: true, detail: 'preset' }}
        onSubmit={() => {}}
      />,
    )
    await user.type(input(container, 'detail')!, '!')
    await user.click(screen.getByRole('checkbox')) // hide
    await waitFor(() => expect(input(container, 'detail')).toBeNull())
    await user.click(screen.getByRole('checkbox')) // show
    await waitFor(() =>
      expect(input(container, 'detail')!.value).toBe('preset'),
    )
  })

  it('gives an initially hidden field its default when it is shown', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        has: z.boolean(),
        extra: z.object({ flag: z.boolean(), color: z.enum(['red', 'blue']) }),
      }),
    ).setCondition('extra', (v) => v.has)
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('checkbox', { name: /has/i }))
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      has: true,
      extra: { flag: false, color: 'red' },
    })
  })
})
