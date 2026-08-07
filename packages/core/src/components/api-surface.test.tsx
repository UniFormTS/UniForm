import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createForm } from '../UniForm'
import { useAutoFormContext } from '../context/AutoFormContext'
import { en } from '../locales/en'
import { defaultCoercionMap } from '../coercion/coerce'
import { resolveLayoutSlots } from '../utils/resolveLayoutSlots'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

// ---------------------------------------------------------------------------
// W12 — context stratification
// ---------------------------------------------------------------------------

describe('context surface (W12)', () => {
  const schema = z.object({ name: z.string() })
  const form = createForm(schema)

  function Probe({ onRead }: { onRead: (ctx: unknown) => void }) {
    const ctx = useAutoFormContext()
    onRead(ctx)
    return null
  }

  function readContext() {
    let ctx: Record<string, unknown> | undefined
    render(
      <AutoForm
        form={form}
        defaultValues={{ name: '' }}
        layout={{
          formWrapper: ({ children }) => (
            <>
              <Probe
                onRead={(c) => {
                  ctx = c as Record<string, unknown>
                }}
              />
              {children}
            </>
          ),
        }}
        onSubmit={vi.fn()}
      />,
    )
    return ctx!
  }

  it('publishes the internals under _internal', () => {
    const ctx = readContext()
    const internal = ctx._internal as Record<string, unknown>
    expect(internal).toBeDefined()
    expect(Array.isArray(internal.resolvedFields)).toBe(true)
    expect(internal.fieldOverrides).toBeDefined()
    expect(typeof internal.setDynamicMeta).toBe('function')
    expect(internal.arrayFields).toBeDefined()
  })

  it('keeps the deprecated top-level aliases pointing at the same objects', () => {
    const ctx = readContext()
    const internal = ctx._internal as Record<string, unknown>
    expect(ctx.resolvedFields).toBe(internal.resolvedFields)
    expect(ctx.fieldOverrides).toBe(internal.fieldOverrides)
    expect(ctx.setDynamicMeta).toBe(internal.setDynamicMeta)
    expect(ctx.arrayFields).toBe(internal.arrayFields)
  })

  it('exposes the supported surface at the top level', () => {
    const ctx = readContext()
    for (const key of [
      'registry',
      'fieldConfigs',
      'fieldWrapper',
      'layout',
      'classNames',
      'disabled',
      'labels',
      'formMethods',
      'control',
    ]) {
      expect(ctx[key], `context.${key}`).toBeDefined()
    }
  })

  it('does not carry an errors snapshot', () => {
    // Errors are read through useFieldError / useFormErrors, which subscribe
    // scoped — a context field would re-render every consumer.
    expect(readContext().errors).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// W14 — documented defaults must match the implementation
// ---------------------------------------------------------------------------

describe('documented defaults (W14)', () => {
  it('persistence defaults to sessionStorage, never localStorage', async () => {
    const form = createForm(z.object({ name: z.string() }))
    const { user } = setup(
      <AutoForm
        form={form}
        persistKey='w14-default-store'
        persistDebounce={0}
        defaultValues={{ name: '' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(screen.getByRole('textbox'), 'A')

    await waitFor(() =>
      expect(sessionStorage.getItem('w14-default-store')).not.toBeNull(),
    )
    expect(localStorage.getItem('w14-default-store')).toBeNull()
    sessionStorage.clear()
  })

  it('the built-in collapse glyph defaults match the bundled en locale', async () => {
    const schema = z.object({
      rows: z.array(z.object({ label: z.string() })),
    })
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        fields={{ rows: { collapsible: true } }}
        defaultValues={{ rows: [{ label: 'One' }] }}
        onSubmit={vi.fn()}
      />,
    )

    const toggle = screen.getByRole('button', { name: /collapse item 1/i })
    // Expanded rows show the "collapse" glyph…
    expect(toggle.textContent).toContain(en.arrayCollapse)
    expect(toggle.textContent).not.toContain(en.arrayExpand)

    await user.click(toggle)

    // …and collapsed rows show the "expand" one.
    const collapsed = screen.getByRole('button', { name: /expand item 1/i })
    await waitFor(() => expect(collapsed.textContent).toContain(en.arrayExpand))
    expect(collapsed.textContent).not.toContain(en.arrayCollapse)
  })

  it('the add button is disabled at max rather than removed', () => {
    const schema = z.object({
      rows: z.array(z.object({ label: z.string() })).max(1),
    })
    render(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ rows: [{ label: 'One' }] }}
        onSubmit={vi.fn()}
      />,
    )
    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeInTheDocument()
    expect(add).toBeDisabled()
  })

  it('move buttons are disabled at the ends rather than omitted', () => {
    const schema = z.object({
      rows: z.array(z.object({ label: z.string() })),
    })
    render(
      <AutoForm
        form={createForm(schema)}
        fields={{ rows: { movable: true } }}
        defaultValues={{ rows: [{ label: 'One' }, { label: 'Two' }] }}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Move item 1 up' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Move item 2 down' }),
    ).toBeDisabled()
  })

  it('the loading fallback default is a <p>Loading…</p>', () => {
    const slots = resolveLayoutSlots(undefined)
    const { container } = render(<>{slots.loadingFallback}</>)
    expect(container.querySelector('p')?.textContent).toBe('Loading…')
  })

  it('coercions are keyed by field type, not field name', async () => {
    const schema = z.object({ age: z.number() })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ age: 1 }}
        coercions={{ number: (v) => Number(v) * 10 }}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByRole('spinbutton'), '2') // "12" -> 120
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ age: 120 }))
  })

  it('the built-in number coercion returns undefined for empty input', () => {
    expect(defaultCoercionMap.number('')).toBeUndefined()
    expect(defaultCoercionMap.number('5')).toBe(5)
  })

  it('the collapse slot does not fall back to arrayButtons.base', () => {
    const Base = () => null
    const slots = resolveLayoutSlots({ arrayButtons: { base: Base } })
    expect(slots.arrayButtons.add).toBe(Base)
    expect(slots.arrayButtons.remove).toBe(Base)
    expect(slots.arrayButtons.collapse).not.toBe(Base)
    expect(slots.arrayButtons.collapse).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// W14 — message precedence
// ---------------------------------------------------------------------------

describe('message precedence (W14)', () => {
  const schema = z.object({
    email: z.string().min(1, 'Schema says required'),
    name: z.string().min(3, 'Schema says too short'),
  })
  const form = createForm(schema)

  const submitEmpty = async (ui: React.ReactElement) => {
    const { user } = setup(ui)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    return screen.findAllByRole('alert')
  }

  it('falls through to the schema message when messages is absent', async () => {
    const alerts = await submitEmpty(
      <AutoForm
        form={form}
        defaultValues={{ email: '', name: '' }}
        onSubmit={vi.fn()}
      />,
    )
    expect(alerts.map((a) => a.textContent)).toContain('Schema says required')
  })

  it('a per-field string overrides the schema message', async () => {
    const alerts = await submitEmpty(
      <AutoForm
        form={form}
        defaultValues={{ email: '', name: '' }}
        messages={{ email: 'Form says required' }}
        onSubmit={vi.fn()}
      />,
    )
    const texts = alerts.map((a) => a.textContent)
    expect(texts).toContain('Form says required')
    // Unlisted fields fall through untouched — one override layer, not two systems.
    expect(texts).toContain('Schema says too short')
  })

  it('a per-code override targets one error code', async () => {
    const alerts = await submitEmpty(
      <AutoForm
        form={form}
        defaultValues={{ email: '', name: '' }}
        messages={{ name: { too_small: 'Needs 3+ characters' } }}
        onSubmit={vi.fn()}
      />,
    )
    expect(alerts.map((a) => a.textContent)).toContain('Needs 3+ characters')
  })

  it('messages.required covers a setRequired predicate', async () => {
    const dyn = createForm(
      z.object({ mode: z.enum(['a', 'b']), note: z.string().optional() }),
    ).setRequired('note', () => true)

    const alerts = await submitEmpty(
      <AutoForm
        form={dyn}
        defaultValues={{ mode: 'a', note: '' }}
        messages={{ required: 'Global required wording' }}
        onSubmit={vi.fn()}
      />,
    )
    expect(alerts.map((a) => a.textContent)).toContain(
      'Global required wording',
    )
  })
})
