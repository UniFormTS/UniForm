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

describe('field defaults', () => {
  it('submits untouched nested booleans and selects without errors', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({
          news: z.boolean(),
          color: z.enum(['red', 'blue']),
          inner: z.object({ deep: z.boolean() }),
        }),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: false, color: 'red', inner: { deep: false } },
    })
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('merges user defaultValues over generated nested defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({ prefs: z.object({ news: z.boolean(), name: z.string() }) }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ prefs: { news: true, name: 'Ada' } }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: true, name: 'Ada' },
    })
  })

  it('deep-merges partial nested defaultValues with generated defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({ news: z.boolean(), color: z.enum(['red', 'blue']) }),
      }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ prefs: { news: true } }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: true, color: 'red' },
    })
  })

  it('deep-merges async defaultValues with generated nested defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({ news: z.boolean(), color: z.enum(['red', 'blue']) }),
      }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={() => Promise.resolve({ prefs: { news: true } })}
        onSubmit={onSubmit}
      />,
    )
    await user.click(await screen.findByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: true, color: 'red' },
    })
  })

  it('gives fields of a non-first union variant their defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), x: z.string() }),
        z.object({
          kind: z.literal('b'),
          flag: z.boolean(),
          color: z.enum(['red', 'blue']),
        }),
      ]),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.selectOptions(screen.getByRole('combobox'), 'b')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    // Other variants' keys are stripped by the union schema on submit
    expect(onSubmit.mock.calls[0][0]).toEqual({
      kind: 'b',
      flag: false,
      color: 'red',
    })
  })

  it('allows an optional formatted string to be left blank', async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ email: z.string().email().optional() }))
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({})
  })

  it('allows an optional formatted string to be cleared after typing', async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ email: z.string().email().optional() }))
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    const input = container.querySelector('[name="email"]') as HTMLInputElement
    await user.type(input, 'abc')
    await user.clear(input)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({})
  })

  it('submits null for a cleared nullable string', async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ middle: z.string().nullable() }))
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    const input = container.querySelector('[name="middle"]') as HTMLInputElement
    await user.type(input, 'J')
    await user.clear(input)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ middle: null })
  })

  it('uses schema .default() values as initial values', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        greeting: z.string().default('hello'),
        count: z.number().default(5),
        agree: z.boolean().default(true),
      }),
    )
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    expect(
      (container.querySelector('[name="greeting"]') as HTMLInputElement).value,
    ).toBe('hello')
    expect(
      (container.querySelector('[name="count"]') as HTMLInputElement).value,
    ).toBe('5')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      greeting: 'hello',
      count: 5,
      agree: true,
    })
  })

  it('appends array rows using the same defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        items: z.array(
          z.object({
            name: z.string().default('new'),
            note: z.string().email().optional(),
            done: z.boolean(),
          }),
        ),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      items: [{ name: 'new', done: false }],
    })
  })

  it('submits strict union variants without inactive variant keys', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('a'), aFlag: z.boolean() }),
        z.strictObject({ kind: z.literal('b'), bFlag: z.boolean() }),
      ]),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ kind: 'a', aFlag: false })
  })

  it('does not submit inactive variant values for passthrough variants', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.discriminatedUnion('kind', [
        z.looseObject({ kind: z.literal('a'), aFlag: z.boolean() }),
        z.looseObject({ kind: z.literal('b'), bFlag: z.boolean() }),
      ]),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ kind: 'a', aFlag: false })
  })

  it('merges nested defaults of variants that share an object key', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.discriminatedUnion('kind', [
        z.object({
          kind: z.literal('a'),
          prefs: z.object({ news: z.boolean() }),
        }),
        z.object({
          kind: z.literal('b'),
          prefs: z.object({ done: z.boolean() }),
        }),
      ]),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.selectOptions(screen.getByRole('combobox'), 'b')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      kind: 'b',
      prefs: { done: false },
    })
  })

  it("keeps the documented blank value for z.number().or(z.literal(''))", async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ amount: z.number().or(z.literal('')) }))
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ amount: '' })

    // Clearing a typed value returns to the blank value, too
    const input = container.querySelector('[name="amount"]') as HTMLInputElement
    await user.type(input, '4')
    await user.clear(input)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    expect(onSubmit.mock.calls[1][0]).toEqual({ amount: '' })
  })

  it('leaves the input undefined when .default() supplies a transformed output', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        len: z
          .string()
          .transform((s) => s.length)
          .default(5),
      }),
    )
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    expect(
      (container.querySelector('[name="len"]') as HTMLInputElement).value,
    ).toBe('')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ len: 5 })
  })

  it('restores a cleared optional field as cleared, not as its default', async () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    const form = createForm(
      z.object({
        email: z.string().email().optional(),
        nested: z.object({ note: z.string().optional() }),
      }),
    )
    const ui = (
      <AutoForm
        form={form}
        defaultValues={{ email: 'old@example.com', nested: { note: 'keep?' } }}
        persistKey='draft'
        persistDebounce={0}
        persistStorage={storage}
        onSubmit={() => {}}
      />
    )
    const first = setup(ui)
    await first.user.clear(
      first.container.querySelector('[name="email"]') as HTMLInputElement,
    )
    await first.user.clear(
      first.container.querySelector('[name="nested.note"]') as HTMLInputElement,
    )
    await waitFor(() => {
      const draft = store.get('draft') ?? ''
      expect(draft).toContain('"email"')
      expect(draft).not.toContain('old@example.com')
      expect(draft).not.toContain('keep?')
    })
    first.unmount()

    const second = render(ui)
    await waitFor(() => {
      expect(
        (second.container.querySelector('[name="email"]') as HTMLInputElement)
          .value,
      ).toBe('')
      expect(
        (
          second.container.querySelector(
            '[name="nested.note"]',
          ) as HTMLInputElement
        ).value,
      ).toBe('')
    })
  })

  it('shows an emptied prefilled optional input as empty and submits it as cleared', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        email: z.string().email().optional(),
        age: z.number().optional(),
      }),
    )
    const { user, container } = setup(
      <AutoForm
        form={form}
        defaultValues={{ email: 'old@example.com', age: 30 }}
        onSubmit={onSubmit}
      />,
    )
    const email = container.querySelector('[name="email"]') as HTMLInputElement
    const age = container.querySelector('[name="age"]') as HTMLInputElement
    await user.clear(email)
    await user.clear(age)
    expect(email.value).toBe('')
    expect(age.value).toBe('')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({})
    expect(email.value).toBe('')
  })

  it('applies a transformed boolean default when the checkbox is untouched', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        flag: z
          .boolean()
          .transform((b) => !b)
          .default(false),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ flag: false })
  })

  it('applies a composite output default when its fields are untouched', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        o: z
          .object({ len: z.string().transform((s) => s.length) })
          .default({ len: 5 }),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ o: { len: 5 } })
  })

  it('runs default suppliers for every appended row', async () => {
    const onSubmit = vi.fn()
    let n = 0
    const form = createForm(
      z.object({
        rows: z.array(z.object({ id: z.string().default(() => `id-${++n}`) })),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const ids = (
      onSubmit.mock.calls[0][0] as { rows: { id: string }[] }
    ).rows.map((r) => r.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })
})
