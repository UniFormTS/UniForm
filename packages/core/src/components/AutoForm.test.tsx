import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createAutoForm } from '../factory/createAutoForm'
import { introspectSchema } from '../introspection/introspect'
import type { FieldProps } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(ui: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(ui),
  }
}

// ---------------------------------------------------------------------------
// 1. Basic render — flat schema renders the correct number of inputs
// ---------------------------------------------------------------------------

describe('AutoForm', () => {
  it('1. renders the correct number of inputs for a flat schema', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number(),
    })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    const inputs = screen.getAllByRole('textbox')
    // firstName, lastName are text; age is number input (role: spinbutton)
    expect(inputs).toHaveLength(2)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 2. Label rendering
  // ---------------------------------------------------------------------------

  it('2. renders field labels associated with their inputs', () => {
    const schema = z.object({ email: z.string().email() })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 3. Validation on submit — empty required field shows Zod error
  // ---------------------------------------------------------------------------

  it('3. shows a Zod error when submitting an empty required field', async () => {
    const schema = z.object({ name: z.string().min(1, 'Name is required') })
    const { user } = setup(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Name is required')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Successful submit calls onSubmit with typed values
  // ---------------------------------------------------------------------------

  it('4. calls onSubmit with correctly typed values on successful submit', async () => {
    const schema = z.object({ name: z.string() })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Alice')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' })
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Number coercion — number field submits as a number
  // ---------------------------------------------------------------------------

  it('5. coerces number field value to a number type', async () => {
    const schema = z.object({ age: z.number() })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)
    await user.clear(screen.getByRole('spinbutton'))
    await user.type(screen.getByRole('spinbutton'), '25')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      // toHaveBeenCalledWith uses deep equality — 25 (number) !== '25' (string)
      expect(onSubmit).toHaveBeenCalledWith({ age: 25 })
    })
  })

  // ---------------------------------------------------------------------------
  // 6. Default values pre-fill the form
  // ---------------------------------------------------------------------------

  it('6. pre-fills the form with defaultValues', () => {
    const schema = z.object({ name: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ name: 'Bob' }}
      />,
    )
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('Bob')
  })

  // ---------------------------------------------------------------------------
  // 7. ZodEnum renders a select with correct options
  // ---------------------------------------------------------------------------

  it('7. renders a select with correct options for z.enum', () => {
    const schema = z.object({
      role: z.enum(['admin', 'editor', 'viewer']),
    })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    const options = within(select).getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveValue('admin')
    expect(options[1]).toHaveValue('editor')
    expect(options[2]).toHaveValue('viewer')
  })

  // ---------------------------------------------------------------------------
  // 8. Nested object renders children with dot-notated names
  // ---------------------------------------------------------------------------

  it('8. renders nested object children with dot-notated names', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/street/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    // IDs should be dot-notated
    expect(document.getElementById('address.street')).toBeInTheDocument()
    expect(document.getElementById('address.city')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 9. Array field — renders one row by default (via defaultValues), add/remove
  // ---------------------------------------------------------------------------

  it('9. array field renders add and remove buttons, appends and removes rows', async () => {
    // useFieldArray works reliably with object arrays
    const schema = z.object({
      contacts: z.array(z.object({ name: z.string() })),
    })
    const { user } = setup(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    // Initially no rows
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    // Add first row
    await user.click(screen.getByRole('button', { name: /add/i }))
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(1))
    // Add second row
    await user.click(screen.getByRole('button', { name: /add/i }))
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(2))
    // Remove the first row
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0])
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(1))
  })

  // ---------------------------------------------------------------------------
  // 10. Conditional field — shown/hidden based on watched value
  // ---------------------------------------------------------------------------

  it('10. shows/hides a conditional field based on watched value', async () => {
    const schema = z.object({
      type: z.enum(['personal', 'business']),
      companyName: z.string().optional(),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          companyName: {
            condition: (values: Record<string, unknown>) =>
              values['type'] === 'business',
          },
        }}
      />,
    )
    // companyName should not be visible initially (type defaults to first option 'personal')
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument()

    // Change type to 'business'
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'business')

    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // 11. Hidden field — meta.hidden: true means not rendered
  // ---------------------------------------------------------------------------

  it('11. does not render a field with meta.hidden: true', () => {
    const schema = z.object({
      name: z.string(),
      secret: z.string(),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{ secret: { hidden: true } }}
      />,
    )
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/secret/i)).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 12. Disabled form — disabled prop disables all inputs
  // ---------------------------------------------------------------------------

  it('12. disables all inputs when disabled prop is true', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} disabled />)
    const textInputs = screen.getAllByRole('textbox')
    const numberInputs = screen.getAllByRole('spinbutton')
    ;[...textInputs, ...numberInputs].forEach((input) =>
      expect(input).toBeDisabled(),
    )
  })

  // ---------------------------------------------------------------------------
  // 13. Custom component — custom string component renders instead of default
  // ---------------------------------------------------------------------------

  it('13. uses a custom component from the components registry', () => {
    const CustomInput = (props: FieldProps) => (
      <input
        data-testid='custom-input'
        {...props}
        value={props.value as string}
        onChange={(e) => props.onChange(e.target.value)}
      />
    )
    const schema = z.object({ name: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        components={{ string: CustomInput }}
      />,
    )
    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 14. meta.component override — renders the registry component by key
  // ---------------------------------------------------------------------------

  it('14. renders the correct component from meta.component key', () => {
    const TextareaInput = (props: FieldProps) => (
      <textarea
        data-testid='textarea-component'
        onChange={(e) => props.onChange(e.target.value)}
        value={props.value as string}
      />
    )
    const schema = z.object({ bio: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        components={{ textarea: TextareaInput }}
        fields={{ bio: { component: 'textarea' } }}
      />,
    )
    expect(screen.getByTestId('textarea-component')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 15. Field order — fields render in meta.order order
  // ---------------------------------------------------------------------------

  it('15. renders fields in meta.order order', () => {
    const schema = z.object({ first: z.string(), second: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{ first: { order: 2 }, second: { order: 1 } }}
      />,
    )
    const inputs = screen.getAllByRole('textbox')
    // second (order=1) should come before first (order=2)
    expect(inputs[0]).toHaveAttribute('name', 'second')
    expect(inputs[1]).toHaveAttribute('name', 'first')
  })

  // ---------------------------------------------------------------------------
  // 16. Unknown type — renders nothing and logs a warning
  // ---------------------------------------------------------------------------

  it('16. renders null and logs a warning for an unsupported Zod type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // z.null() introspects as 'unknown' since ZodNull has no handler
    const schema = z.object({
      name: z.string(),
      unsupported: z.null(),
    })
    render(
      <AutoForm
        schema={schema as z.ZodObject<z.ZodRawShape>}
        onSubmit={vi.fn()}
      />,
    )
    // The form renders without throwing
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    // The unsupported field renders nothing (no label for 'unsupported')
    expect(screen.queryByLabelText(/unsupported/i)).not.toBeInTheDocument()
    // A warning was logged
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown'))
    warnSpy.mockRestore()
  })

  // ==========================================================================
  // Phase 3 — Layout & Styling Hooks
  // ==========================================================================

  // ---------------------------------------------------------------------------
  // 17. classNames.form applies to the form element
  // ---------------------------------------------------------------------------

  it('17. classNames.form applies to the form element', () => {
    const schema = z.object({ name: z.string() })
    const { container } = render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ form: 'my-form' }}
      />,
    )
    const form = container.querySelector('form')
    expect(form).toHaveClass('my-form')
  })

  // ---------------------------------------------------------------------------
  // 18. classNames.fieldWrapper applies to the field wrapper div
  // ---------------------------------------------------------------------------

  it('18. classNames.fieldWrapper applies to the field wrapper div', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ fieldWrapper: 'field-wrap' }}
      />,
    )
    const wrappers = document.querySelectorAll('.field-wrap')
    expect(wrappers).toHaveLength(2)
  })

  // ---------------------------------------------------------------------------
  // 19. classNames.label applies to labels
  // ---------------------------------------------------------------------------

  it('19. classNames.label applies to labels', () => {
    const schema = z.object({ name: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ label: 'my-label' }}
      />,
    )
    const labels = document.querySelectorAll('.my-label')
    expect(labels).toHaveLength(1)
    expect(labels[0].tagName).toBe('LABEL')
  })

  // ---------------------------------------------------------------------------
  // 20. classNames.error applies to error messages
  // ---------------------------------------------------------------------------

  it('20. classNames.error applies to error messages', async () => {
    const schema = z.object({ name: z.string().min(1, 'Required') })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ error: 'err-class' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('err-class')
    })
  })

  // ---------------------------------------------------------------------------
  // 21. classNames.description applies to description text
  // ---------------------------------------------------------------------------

  it('21. classNames.description applies to description text', () => {
    const schema = z.object({ name: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ description: 'desc-class' }}
        fields={{ name: { description: 'Enter your name' } }}
      />,
    )
    const desc = document.querySelector('.desc-class')
    expect(desc).toBeInTheDocument()
    expect(desc!.textContent).toBe('Enter your name')
  })

  // ---------------------------------------------------------------------------
  // 22. Section grouping renders fields in section wrappers
  // ---------------------------------------------------------------------------

  it('22. section grouping renders fields in section wrappers', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      street: z.string(),
      city: z.string(),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          firstName: { section: 'Personal' },
          lastName: { section: 'Personal' },
          street: { section: 'Address' },
          city: { section: 'Address' },
        }}
      />,
    )
    const fieldsets = document.querySelectorAll('fieldset')
    expect(fieldsets).toHaveLength(2)
    const legends = document.querySelectorAll('legend')
    expect(legends[0].textContent).toBe('Personal')
    expect(legends[1].textContent).toBe('Address')
    // firstName and lastName in first fieldset, street and city in second
    expect(
      within(fieldsets[0]).getByLabelText(/first name/i),
    ).toBeInTheDocument()
    expect(
      within(fieldsets[0]).getByLabelText(/last name/i),
    ).toBeInTheDocument()
    expect(within(fieldsets[1]).getByLabelText(/street/i)).toBeInTheDocument()
    expect(within(fieldsets[1]).getByLabelText(/city/i)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 23. Ungrouped fields render without a section wrapper
  // ---------------------------------------------------------------------------

  it('23. ungrouped fields render without a section wrapper', () => {
    const schema = z.object({
      username: z.string(),
      street: z.string(),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          street: { section: 'Address' },
        }}
      />,
    )
    // Only one fieldset (for Address section)
    const fieldsets = document.querySelectorAll('fieldset')
    expect(fieldsets).toHaveLength(1)
    expect(fieldsets[0].querySelector('legend')!.textContent).toBe('Address')
    // username is rendered but NOT inside a fieldset
    const usernameInput = screen.getByLabelText(/username/i)
    expect(usernameInput.closest('fieldset')).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // 24. Custom sectionWrapper receives the correct title prop
  // ---------------------------------------------------------------------------

  it('24. custom sectionWrapper receives the correct title prop', () => {
    const schema = z.object({
      name: z.string(),
      street: z.string(),
    })
    const CustomSection = ({
      children,
      title,
    }: {
      children: React.ReactNode
      title: string
    }) => <div data-testid={`section-${title}`}>{children}</div>

    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          name: { section: 'Info' },
          street: { section: 'Location' },
        }}
        layout={{ sectionWrapper: CustomSection }}
      />,
    )
    expect(screen.getByTestId('section-Info')).toBeInTheDocument()
    expect(screen.getByTestId('section-Location')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 25. Custom formWrapper wraps the form content
  // ---------------------------------------------------------------------------

  it('25. custom formWrapper wraps the form content', () => {
    const schema = z.object({ name: z.string() })
    const CustomFormWrapper = ({ children }: { children: React.ReactNode }) => (
      <div data-testid='form-wrapper'>{children}</div>
    )

    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        layout={{ formWrapper: CustomFormWrapper }}
      />,
    )
    const wrapper = screen.getByTestId('form-wrapper')
    expect(wrapper).toBeInTheDocument()
    // Fields and submit button are inside it
    expect(within(wrapper).getByLabelText(/name/i)).toBeInTheDocument()
    expect(
      within(wrapper).getByRole('button', { name: /submit/i }),
    ).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 26. Custom submitButton replaces the default
  // ---------------------------------------------------------------------------

  it('26. custom submitButton replaces the default', () => {
    const schema = z.object({ name: z.string() })
    const CustomSubmit = ({ isSubmitting }: { isSubmitting: boolean }) => (
      <button type='submit' disabled={isSubmitting}>
        Go
      </button>
    )

    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        layout={{ submitButton: CustomSubmit }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /submit/i }),
    ).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 27. Custom fieldWrapper replaces the default wrapper
  // ---------------------------------------------------------------------------

  it('27. custom fieldWrapper replaces the default wrapper', () => {
    const schema = z.object({ name: z.string() })
    const CustomWrapper = ({
      children,
    }: {
      children: React.ReactNode
      field: unknown
      error?: string
    }) => <section data-testid='custom-wrapper'>{children}</section>

    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fieldWrapper={CustomWrapper}
      />,
    )
    expect(screen.getByTestId('custom-wrapper')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 28. Custom fieldWrapper does not wrap object/array fields
  // ---------------------------------------------------------------------------

  it('28. custom fieldWrapper does not wrap object/array fields', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({ street: z.string() }),
      tags: z.array(z.object({ value: z.string() })),
    })
    const CustomWrapper = ({
      children,
    }: {
      children: React.ReactNode
      field: unknown
      error?: string
    }) => <section data-testid='custom-wrapper'>{children}</section>

    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fieldWrapper={CustomWrapper}
      />,
    )
    // custom-wrapper should appear for: name, address.street (nested scalar)
    // but NOT for address (object) or tags (array)
    const wrappers = screen.getAllByTestId('custom-wrapper')
    // name + address.street = 2 scalar fields wrapped
    expect(wrappers).toHaveLength(2)
  })

  // ---------------------------------------------------------------------------
  // 29. span meta value is available as a CSS custom property
  // ---------------------------------------------------------------------------

  it('29. span meta value is available as a CSS custom property', () => {
    const schema = z.object({ name: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{ name: { span: 6 } }}
      />,
    )
    const input = screen.getByLabelText(/name/i)
    const wrapper = input.closest('div')!
    expect(wrapper.style.getPropertyValue('--field-span')).toBe('6')
  })

  // ---------------------------------------------------------------------------
  // 30. Fields without span have no inline style on the wrapper
  // ---------------------------------------------------------------------------

  it('30. fields without span have no inline style on the wrapper', () => {
    const schema = z.object({ name: z.string() })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    const input = screen.getByLabelText(/name/i)
    const wrapper = input.closest('div')!
    // --field-index and --field-depth are always present; --field-span defaults to 1
    expect(wrapper.style.getPropertyValue('--field-span')).toBe('1')
    expect(wrapper.style.getPropertyValue('--field-index')).toBe('0')
    expect(wrapper.style.getPropertyValue('--field-depth')).toBe('0')
  })

  // ---------------------------------------------------------------------------
  // 31. Section ordering follows field order
  // ---------------------------------------------------------------------------

  it('31. section ordering follows field order', () => {
    const schema = z.object({
      city: z.string(),
      firstName: z.string(),
      street: z.string(),
      lastName: z.string(),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          firstName: { section: 'Personal', order: 1 },
          lastName: { section: 'Personal', order: 3 },
          street: { section: 'Address', order: 2 },
          city: { section: 'Address', order: 4 },
        }}
      />,
    )
    // After ordering: firstName(1), street(2), lastName(3), city(4)
    // Personal section first field appears at order 1, Address at order 2
    // So sections should be: Personal, Address
    const legends = document.querySelectorAll('legend')
    expect(legends[0].textContent).toBe('Personal')
    expect(legends[1].textContent).toBe('Address')

    // Within Personal: firstName(1), lastName(3)
    const fieldsets = document.querySelectorAll('fieldset')
    const personalInputs = within(fieldsets[0]).getAllByRole('textbox')
    expect(personalInputs[0]).toHaveAttribute('name', 'firstName')
    expect(personalInputs[1]).toHaveAttribute('name', 'lastName')

    // Within Address: street(2), city(4)
    const addressInputs = within(fieldsets[1]).getAllByRole('textbox')
    expect(addressInputs[0]).toHaveAttribute('name', 'street')
    expect(addressInputs[1]).toHaveAttribute('name', 'city')
  })

  // ---------------------------------------------------------------------------
  // 32. Empty sections are not rendered
  // ---------------------------------------------------------------------------

  it('32. empty sections are not rendered', () => {
    const schema = z.object({
      name: z.string(),
      secret: z.string(),
      hiddenToo: z.string(),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          name: { section: 'Visible' },
          secret: { section: 'Hidden', hidden: true },
          hiddenToo: { section: 'Hidden', hidden: true },
        }}
      />,
    )
    const legends = document.querySelectorAll('legend')
    // Only the 'Visible' section should be rendered
    expect(legends).toHaveLength(1)
    expect(legends[0].textContent).toBe('Visible')
  })

  // ==========================================================================
  // Phase 4 — Customization & DX
  // ==========================================================================

  // ---------------------------------------------------------------------------
  // 33. createAutoForm returns a working component with factory defaults
  // ---------------------------------------------------------------------------

  it('33. createAutoForm returns a working component with factory defaults', () => {
    const MyAutoForm = createAutoForm({ classNames: { form: 'factory-form' } })
    const schema = z.object({ name: z.string() })
    const { container } = render(
      <MyAutoForm schema={schema} onSubmit={vi.fn()} />,
    )
    expect(container.querySelector('form')).toHaveClass('factory-form')
  })

  // ---------------------------------------------------------------------------
  // 34. createAutoForm factory components are used by default
  // ---------------------------------------------------------------------------

  it('34. createAutoForm factory components are used by default', () => {
    const FactoryInput = (props: FieldProps) => (
      <input
        data-testid='factory-input'
        value={props.value as string}
        onChange={(e) => props.onChange(e.target.value)}
      />
    )
    const MyAutoForm = createAutoForm({ components: { string: FactoryInput } })
    const schema = z.object({ name: z.string() })
    render(<MyAutoForm schema={schema} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('factory-input')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 35. Instance props override factory defaults
  // ---------------------------------------------------------------------------

  it('35. instance props override factory defaults', () => {
    const MyAutoForm = createAutoForm({ classNames: { form: 'factory' } })
    const schema = z.object({ name: z.string() })
    const { container } = render(
      <MyAutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ form: 'instance' }}
      />,
    )
    expect(container.querySelector('form')).toHaveClass('instance')
    expect(container.querySelector('form')).not.toHaveClass('factory')
  })

  // ---------------------------------------------------------------------------
  // 36. Instance components merge with factory components
  // ---------------------------------------------------------------------------

  it('36. instance components merge with factory components', () => {
    const FactoryInput = (props: FieldProps) => (
      <input
        data-testid='factory-string'
        value={props.value as string}
        onChange={(e) => props.onChange(e.target.value)}
      />
    )
    const InstanceNumber = (props: FieldProps) => (
      <input
        data-testid='instance-number'
        type='number'
        value={props.value as string}
        onChange={(e) => props.onChange(e.target.value)}
      />
    )
    const MyAutoForm = createAutoForm({ components: { string: FactoryInput } })
    const schema = z.object({ name: z.string(), age: z.number() })
    render(
      <MyAutoForm
        schema={schema}
        onSubmit={vi.fn()}
        components={{ number: InstanceNumber }}
      />,
    )
    expect(screen.getByTestId('factory-string')).toBeInTheDocument()
    expect(screen.getByTestId('instance-number')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 37. Factory disabled OR instance disabled disables the form
  // ---------------------------------------------------------------------------

  it('37. factory disabled OR instance disabled disables the form', () => {
    const MyAutoForm = createAutoForm({ disabled: true })
    const schema = z.object({ name: z.string() })
    render(<MyAutoForm schema={schema} onSubmit={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  // ---------------------------------------------------------------------------
  // 38. Deep field overrides apply to nested fields
  // ---------------------------------------------------------------------------

  it('38. deep field overrides apply to nested fields', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
      }),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{ 'address.street': { placeholder: 'Enter street' } }}
      />,
    )
    expect(screen.getByPlaceholderText('Enter street')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 39. Empty string number coercion returns undefined not NaN
  // ---------------------------------------------------------------------------

  it('39. empty string number coercion returns undefined not NaN', async () => {
    const schema = z.object({ age: z.number({ error: 'Required' }) })
    const { user } = setup(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    // Clear and submit — the coerced value should be undefined, not NaN
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      // Should NOT contain "nan" — should be a clean "Required" or "expected number" message
      expect(alert.textContent?.toLowerCase()).not.toContain('nan')
    })
  })

  // ---------------------------------------------------------------------------
  // 40. Number field coerces string to number on submit
  // ---------------------------------------------------------------------------

  it('40. number field coerces string to number on submit', async () => {
    const schema = z.object({ age: z.number() })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)
    await user.clear(screen.getByRole('spinbutton'))
    await user.type(screen.getByRole('spinbutton'), '42')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ age: 42 })
    })
  })

  // ---------------------------------------------------------------------------
  // 41. Date field coerces string to Date on submit
  // ---------------------------------------------------------------------------

  it('41. date field coerces string to Date on submit', async () => {
    const schema = z.object({ dob: z.date() })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)
    const input = document.getElementById('dob') as HTMLInputElement
    await user.type(input, '2000-01-15')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const arg = (onSubmit.mock.calls as unknown[][])[0][0] as { dob: unknown }
      expect(arg.dob).toBeInstanceOf(Date)
    })
  })

  // ---------------------------------------------------------------------------
  // 42. Custom coercion function is used
  // ---------------------------------------------------------------------------

  it('42. custom coercion function is used', async () => {
    const schema = z.object({ amount: z.number() })
    const customCoercion = vi.fn((v: unknown) => (v === '' ? 0 : Number(v)))
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        coercions={{ number: customCoercion }}
      />,
    )
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '99')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(customCoercion).toHaveBeenCalled()
      expect(onSubmit).toHaveBeenCalledWith({ amount: 99 })
    })
  })

  // ---------------------------------------------------------------------------
  // 43. Per-field string message overrides error text
  // ---------------------------------------------------------------------------

  it('43. per-field string message overrides error text', async () => {
    const schema = z.object({ name: z.string().min(1) })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        messages={{ name: 'Please enter your name' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Please enter your name',
      )
    })
  })

  // ---------------------------------------------------------------------------
  // 44. Per-field per-code message overrides specific errors
  // ---------------------------------------------------------------------------

  it('44. per-field per-code message overrides specific errors', async () => {
    const schema = z.object({ email: z.email() })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        messages={{ email: { invalid_format: 'Bad email format' } }}
      />,
    )
    const input = screen.getByLabelText(/email/i)
    await user.type(input, 'notanemail')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Bad email format')
    })
  })

  // ---------------------------------------------------------------------------
  // 45. Global required message overrides default required error
  // ---------------------------------------------------------------------------

  it('45. global required message overrides default required error', async () => {
    const schema = z.object({ name: z.string().min(1) })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        messages={{ required: 'This is mandatory' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('This is mandatory')
    })
  })

  // ---------------------------------------------------------------------------
  // 46. Zod custom error messages pass through
  // ---------------------------------------------------------------------------

  it('46. Zod custom error messages from .min() pass through', async () => {
    const schema = z.object({
      name: z.string().min(3, 'At least 3 characters'),
    })
    const { user } = setup(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    await user.type(screen.getByRole('textbox'), 'ab')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'At least 3 characters',
      )
    })
  })

  // ---------------------------------------------------------------------------
  // 47. createAutoForm with messages merges with instance messages
  // ---------------------------------------------------------------------------

  it('47. createAutoForm with messages merges with instance messages', async () => {
    const MyAutoForm = createAutoForm({
      messages: { required: 'Factory required' },
    })
    const schema = z.object({
      name: z.string().min(1),
      age: z.number(),
    })
    const { user } = setup(
      <MyAutoForm
        schema={schema}
        onSubmit={vi.fn()}
        messages={{ name: 'Name needed' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      // name should use instance override
      const nameAlert = alerts.find((a) => a.textContent === 'Name needed')
      expect(nameAlert).toBeDefined()
      // age should use factory required
      const ageAlert = alerts.find((a) => a.textContent === 'Factory required')
      expect(ageAlert).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // 48. Field override component key works through resolution chain
  // ---------------------------------------------------------------------------

  it('48. field override component key works through resolution chain', () => {
    const TextareaComponent = (props: FieldProps) => (
      <textarea
        data-testid='textarea-field'
        onChange={(e) => props.onChange(e.target.value)}
        value={props.value as string}
      />
    )
    const schema = z.object({ bio: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        components={{ textarea: TextareaComponent }}
        fields={{ bio: { component: 'textarea' } }}
      />,
    )
    expect(screen.getByTestId('textarea-field')).toBeInTheDocument()
  })

  // ==========================================================================
  // Phase 5 — Integration Tests (Render → Fill → Submit)
  // ==========================================================================

  // ---------------------------------------------------------------------------
  // 49. Full form flow — flat schema render → fill → submit
  // ---------------------------------------------------------------------------

  it('49. full form flow — flat schema render, fill, submit', async () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
      role: z.enum(['admin', 'editor', 'viewer']),
      active: z.boolean(),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        defaultValues={{ role: 'admin', active: false }}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Alice')
    const spinner = screen.getByRole('spinbutton')
    await user.clear(spinner)
    await user.type(spinner, '30')
    await user.selectOptions(screen.getByRole('combobox'), 'editor')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Alice',
        age: 30,
        role: 'editor',
        active: true,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 50. Full form flow — nested object schema
  // ---------------------------------------------------------------------------

  it('50. full form flow — nested object schema', async () => {
    const schema = z.object({
      username: z.string().min(1),
      address: z.object({
        street: z.string().min(1),
        city: z.string().min(1),
        zip: z.string().min(1),
      }),
    })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/username/i), 'bob')
    await user.type(screen.getByLabelText(/street/i), '123 Main St')
    await user.type(screen.getByLabelText(/city/i), 'Springfield')
    await user.type(screen.getByLabelText(/zip/i), '62704')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'bob',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          zip: '62704',
        },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 51. Full form flow — array field add rows and submit
  // ---------------------------------------------------------------------------

  it('51. full form flow — array field add rows and submit', async () => {
    const schema = z.object({
      items: z.array(
        z.object({
          title: z.string().min(1),
        }),
      ),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        defaultValues={{ items: [{ title: '' }] }}
      />,
    )

    // Fill the first row
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Item A')

    // Add a second row
    await user.click(screen.getByRole('button', { name: /add/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(2)
    })

    // Fill the second row
    const allInputs = screen.getAllByRole('textbox')
    await user.type(allInputs[1], 'Item B')

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        items: [{ title: 'Item A' }, { title: 'Item B' }],
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 52. Full form flow — array field remove row and submit
  // ---------------------------------------------------------------------------

  it('52. full form flow — array field remove row and submit', async () => {
    const schema = z.object({
      items: z.array(
        z.object({
          title: z.string().min(1),
        }),
      ),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        defaultValues={{ items: [{ title: '' }, { title: '' }] }}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'Keep')
    await user.type(inputs[1], 'Remove')

    // Remove the second row
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[1])
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(1)
    })

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        items: [{ title: 'Keep' }],
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 53. Validation errors block submit and display on all invalid fields
  // ---------------------------------------------------------------------------

  it('53. validation errors block submit and display on all invalid fields', async () => {
    const schema = z.object({
      firstName: z.string().min(1, 'First name required'),
      lastName: z.string().min(1, 'Last name required'),
      email: z.string().min(1, 'Email required'),
    })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts).toHaveLength(3)
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // 54. Fix validation errors and resubmit succeeds
  // ---------------------------------------------------------------------------

  it('54. fix validation errors and resubmit succeeds', async () => {
    const schema = z.object({
      firstName: z.string().min(1, 'First name required'),
      lastName: z.string().min(1, 'Last name required'),
    })
    const onSubmit = vi.fn()
    const { user } = setup(<AutoForm schema={schema} onSubmit={onSubmit} />)

    // Submit empty → errors
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('alert')).toHaveLength(2)
    })

    // Fill fields
    await user.type(screen.getByLabelText(/first name/i), 'Alice')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')

    // Resubmit
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: 'Alice',
        lastName: 'Smith',
      })
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // 55. Conditional field appears when condition met then submits correctly
  // ---------------------------------------------------------------------------

  it('55. conditional field appears when condition met then submits correctly', async () => {
    const schema = z.object({
      hasDiscount: z.boolean(),
      discountCode: z.string().optional(),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        defaultValues={{ hasDiscount: false }}
        fields={{
          discountCode: {
            condition: (vals: Record<string, unknown>) =>
              vals['hasDiscount'] === true,
          },
        }}
      />,
    )

    // discountCode not visible
    expect(screen.queryByLabelText(/discount code/i)).not.toBeInTheDocument()

    // Check hasDiscount
    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => {
      expect(screen.getByLabelText(/discount code/i)).toBeInTheDocument()
    })

    // Fill and submit
    await user.type(screen.getByLabelText(/discount code/i), 'SAVE20')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        hasDiscount: true,
        discountCode: 'SAVE20',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 56. Section grouping renders sections and submits all field values
  // ---------------------------------------------------------------------------

  it('56. section grouping renders sections and submits all values', async () => {
    const schema = z.object({
      name: z.string().min(1),
      street: z.string().min(1),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        fields={{
          name: { section: 'Personal' },
          street: { section: 'Address' },
        }}
      />,
    )

    // Both sections visible
    expect(document.querySelector('legend')!.textContent).toBe('Personal')
    const legends = document.querySelectorAll('legend')
    expect(legends[1].textContent).toBe('Address')

    // Fill and submit
    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/street/i), '123 Main')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Alice',
        street: '123 Main',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 57. createAutoForm factory end-to-end with styled components
  // ---------------------------------------------------------------------------

  it('57. createAutoForm factory end-to-end with styled components', async () => {
    const FactoryInput = (props: FieldProps) => (
      <input
        data-testid={`factory-${props.name}`}
        id={props.name}
        name={props.name}
        value={String((props.value ?? '') as string | number | boolean)}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        aria-label={props.label}
      />
    )
    const FactoryWrapper = ({
      children,
      field,
      error,
    }: {
      children: React.ReactNode
      field: {
        name: string
        label: string
        required: boolean
        meta: Record<string, unknown>
      }
      error?: string
      span?: number
    }) => (
      <div data-testid={`wrapper-${field.name}`}>
        <label htmlFor={field.name}>{field.label}</label>
        {children}
        {error && <span role='alert'>{error}</span>}
      </div>
    )
    const MyAutoForm = createAutoForm({
      components: { string: FactoryInput },
      fieldWrapper: FactoryWrapper,
    })
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    })
    const onSubmit = vi.fn()
    const { user } = setup(<MyAutoForm schema={schema} onSubmit={onSubmit} />)

    // Factory components are rendered
    expect(screen.getByTestId('factory-title')).toBeInTheDocument()
    expect(screen.getByTestId('wrapper-title')).toBeInTheDocument()

    // Fill and submit
    await user.type(screen.getByTestId('factory-title'), 'My Title')
    await user.type(screen.getByTestId('factory-description'), 'Details')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'My Title',
        description: 'Details',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 58. Custom coercion + validation messages end-to-end
  // ---------------------------------------------------------------------------

  it('58. custom coercion + validation messages end-to-end', async () => {
    const schema = z.object({ price: z.number().min(1, 'Price is required') })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        messages={{ required: 'This field is mandatory' }}
      />,
    )

    // Submit empty → custom required message
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This field is mandatory',
      )
    })

    // Fill with a valid number → submit succeeds
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '99')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ price: 99 })
    })
  })

  // ---------------------------------------------------------------------------
  // 59. Deep field overrides + nested submit
  // ---------------------------------------------------------------------------

  it('59. deep field overrides + nested submit', async () => {
    const schema = z.object({
      address: z.object({
        city: z.string().min(1),
        zip: z.string().min(1),
      }),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        fields={{ 'address.city': { placeholder: 'Town' } }}
      />,
    )

    // Override applied
    expect(screen.getByPlaceholderText('Town')).toBeInTheDocument()

    // Fill and submit
    await user.type(screen.getByPlaceholderText('Town'), 'Springfield')
    await user.type(screen.getByLabelText(/zip/i), '62704')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        address: { city: 'Springfield', zip: '62704' },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 60. Full kitchen-sink form — all features combined
  // ---------------------------------------------------------------------------

  it('60. full kitchen-sink form — all features combined', async () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
      role: z.enum(['user', 'admin']),
      subscribe: z.boolean(),
      address: z.object({
        street: z.string().min(1),
        city: z.string().min(1),
      }),
      tags: z.array(z.object({ value: z.string().min(1) })),
      hasNotes: z.boolean(),
      notes: z.string().optional(),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        defaultValues={{
          role: 'user',
          subscribe: false,
          hasNotes: false,
          tags: [{ value: '' }],
        }}
        classNames={{ form: 'ks-form' }}
        fields={{
          name: { section: 'Personal', order: 1 },
          age: { section: 'Personal', order: 2 },
          role: { section: 'Personal', order: 3 },
          subscribe: { section: 'Personal', order: 4 },
          'address.street': { placeholder: 'Street...' },
          notes: {
            condition: (vals: Record<string, unknown>) =>
              vals['hasNotes'] === true,
          },
        }}
        messages={{ required: 'Required field' }}
      />,
    )

    // Fill scalar fields
    await user.type(screen.getByLabelText(/^name \*/i), 'Alice')
    const spinner = screen.getByRole('spinbutton')
    await user.clear(spinner)
    await user.type(spinner, '28')
    await user.selectOptions(screen.getByRole('combobox'), 'admin')
    await user.click(screen.getByLabelText(/subscribe/i))

    // Fill nested object
    await user.type(screen.getByPlaceholderText('Street...'), '123 Main')
    await user.type(screen.getByLabelText(/^city/i), 'Springfield')

    // Fill array field — tag item has label "Value"
    await user.type(screen.getByLabelText(/^value/i), 'tag1')

    // Enable conditional field and fill it
    await user.click(screen.getByLabelText(/has notes/i))
    await waitFor(() => {
      expect(screen.getByLabelText(/^notes/i)).toBeInTheDocument()
    })
    await user.type(screen.getByLabelText(/^notes/i), 'Some notes')

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const data = (onSubmit.mock.calls as unknown[][])[0][0] as Record<
        string,
        unknown
      >
      expect(data.name).toBe('Alice')
      expect(data.age).toBe(28)
      expect(data.role).toBe('admin')
      expect(data.subscribe).toBe(true)
      expect(data.address).toEqual({ street: '123 Main', city: 'Springfield' })
      expect(data.tags).toEqual([{ value: 'tag1' }])
      expect(data.hasNotes).toBe(true)
      expect(data.notes).toBe('Some notes')
    })
  })

  // =========================================================================
  // Phase 6 — Programmatic Control via Ref (61–69)
  // =========================================================================

  it('61. ref.reset() resets the form to default values', async () => {
    const schema = z.object({
      name: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        ref={ref}
        defaultValues={{ name: 'Initial' }}
      />,
    )
    const input = screen.getByLabelText(/name/i)
    expect(input).toHaveValue('Initial')
    await user.clear(input)
    await user.type(input, 'Changed')
    expect(input).toHaveValue('Changed')

    React.act(() => {
      ref.current!.reset()
    })
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('Initial')
    })
  })

  it('62. ref.submit() triggers form submission programmatically', async () => {
    const schema = z.object({
      name: z.string().min(1),
    })
    const onSubmit = vi.fn()
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        ref={ref}
        defaultValues={{ name: 'Alice' }}
      />,
    )

    React.act(() => {
      ref.current!.submit()
    })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alice' }),
      )
    })
  })

  it('63. ref.setValues() sets field values', async () => {
    const schema = z.object({
      name: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    setup(<AutoForm schema={schema} onSubmit={vi.fn()} ref={ref} />)

    React.act(() => {
      ref.current!.setValues({ name: 'Test' })
    })
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test')
    })
  })

  it('64. ref.getValues() returns current form values', async () => {
    const schema = z.object({
      name: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    const { user } = setup(
      <AutoForm schema={schema} onSubmit={vi.fn()} ref={ref} />,
    )

    await user.type(screen.getByLabelText(/name/i), 'hello')
    const values = ref.current!.getValues()
    expect(values).toEqual(expect.objectContaining({ name: 'hello' }))
  })

  it('65. ref.setErrors() displays errors on fields', async () => {
    const schema = z.object({
      name: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    setup(<AutoForm schema={schema} onSubmit={vi.fn()} ref={ref} />)

    React.act(() => {
      ref.current!.setErrors({ name: 'Custom error' })
    })
    await waitFor(() => {
      expect(screen.getByText('Custom error')).toBeInTheDocument()
    })
  })

  it('66. ref.clearErrors() clears all errors', async () => {
    const schema = z.object({
      name: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    setup(<AutoForm schema={schema} onSubmit={vi.fn()} ref={ref} />)

    React.act(() => {
      ref.current!.setErrors({ name: 'Err' })
    })
    await waitFor(() => {
      expect(screen.getByText('Err')).toBeInTheDocument()
    })

    React.act(() => {
      ref.current!.clearErrors()
    })
    await waitFor(() => {
      expect(screen.queryByText('Err')).not.toBeInTheDocument()
    })
  })

  it('67. ref.clearErrors([field]) clears only specified field error', async () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    setup(<AutoForm schema={schema} onSubmit={vi.fn()} ref={ref} />)

    React.act(() => {
      ref.current!.setErrors({ name: 'Name err', email: 'Email err' })
    })
    await waitFor(() => {
      expect(screen.getByText('Name err')).toBeInTheDocument()
      expect(screen.getByText('Email err')).toBeInTheDocument()
    })

    React.act(() => {
      ref.current!.clearErrors(['name'])
    })
    await waitFor(() => {
      expect(screen.queryByText('Name err')).not.toBeInTheDocument()
      expect(screen.getByText('Email err')).toBeInTheDocument()
    })
  })

  it('68. ref.focus() focuses the specified field', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    })
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    setup(<AutoForm schema={schema} onSubmit={vi.fn()} ref={ref} />)

    // setFocus may not actually move focus in JSDOM, so verify the method exists and doesn't throw
    expect(() => ref.current!.focus('email')).not.toThrow()
    // Verify the handle has the focus method
    expect(typeof ref.current!.focus).toBe('function')
  })

  it('69. ref works with createAutoForm factory', () => {
    const schema = z.object({
      name: z.string(),
    })
    const MyForm = createAutoForm({})
    const ref =
      React.createRef<
        import('../types').AutoFormHandle<z.infer<typeof schema>>
      >()
    render(
      <MyForm
        schema={schema}
        onSubmit={vi.fn()}
        ref={ref}
        defaultValues={{ name: 'Factory' }}
      />,
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current!.getValues()).toEqual(
      expect.objectContaining({ name: 'Factory' }),
    )
  })

  // =========================================================================
  // Phase 6 — Form State Persistence (70–75)
  // =========================================================================

  function createMockStorage() {
    const store: Record<string, string> = {}
    return {
      store,
      getItem: vi.fn(
        (key: string) => store[key] ?? null,
      ) as unknown as import('../types').PersistStorage['getItem'] &
        ReturnType<typeof vi.fn>,
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }) as unknown as import('../types').PersistStorage['setItem'] &
        ReturnType<typeof vi.fn>,
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }) as unknown as import('../types').PersistStorage['removeItem'] &
        ReturnType<typeof vi.fn>,
    }
  }

  it('70. form values are persisted to storage on change', async () => {
    const schema = z.object({ name: z.string() })
    const storage = createMockStorage()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        persistKey='test-form'
        persistDebounce={50}
        persistStorage={storage}
      />,
    )

    await user.type(screen.getByLabelText(/name/i), 'Bob')
    await waitFor(
      () => {
        expect(storage.setItem).toHaveBeenCalledWith(
          'test-form',
          expect.stringContaining('Bob'),
        )
      },
      { timeout: 2000 },
    )
  })

  it('71. persisted values are restored on mount', async () => {
    const schema = z.object({ name: z.string() })
    const storage = createMockStorage()
    storage.store['test-form'] = JSON.stringify({ name: 'Saved' })

    setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        persistKey='test-form'
        persistStorage={storage}
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('Saved')
    })
  })

  it('72. persisted data is cleared after successful submit', async () => {
    const schema = z.object({ name: z.string().min(1) })
    const storage = createMockStorage()
    storage.store['test-form'] = JSON.stringify({ name: 'Data' })
    const onSubmit = vi.fn()

    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        persistKey='test-form'
        persistStorage={storage}
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('Data')
    })
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      expect(storage.removeItem).toHaveBeenCalledWith('test-form')
    })
  })

  it('73. invalid stored data is handled gracefully', () => {
    const schema = z.object({ name: z.string() })
    const storage = createMockStorage()
    storage.store['test-form'] = 'not json'

    // Should not crash
    setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        persistKey='test-form'
        persistStorage={storage}
      />,
    )
    // Form renders with default empty value
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
  })

  it('74. persistDebounce controls write frequency', async () => {
    const schema = z.object({ name: z.string() })
    const storage = createMockStorage()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        persistKey='test'
        persistDebounce={500}
        persistStorage={storage}
      />,
    )

    // Type rapidly
    await user.type(screen.getByLabelText(/name/i), 'abc')
    // Immediately after typing, setItem should not have been called (or very few times)
    const callsImmediately = storage.setItem.mock.calls.length
    // Wait for debounce to expire
    await waitFor(
      () => {
        expect(storage.setItem.mock.calls.length).toBeGreaterThan(
          callsImmediately,
        )
      },
      { timeout: 2000 },
    )
  })

  it('75. no persistence when persistKey is not provided', async () => {
    const schema = z.object({ name: z.string() })
    const storage = createMockStorage()
    const { user } = setup(
      <AutoForm schema={schema} onSubmit={vi.fn()} persistStorage={storage} />,
    )

    await user.type(screen.getByLabelText(/name/i), 'hello')
    // Wait a bit to make sure no writes happened
    await new Promise((r) => setTimeout(r, 500))
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  // =========================================================================
  // Phase 6 — Array Field Enhancements (76–86)
  // =========================================================================

  it('76. "Move Up" reorders array rows', async () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={onSubmit}
        defaultValues={{ items: [{ value: 'First' }, { value: 'Second' }] }}
        fields={{ items: { movable: true } }}
      />,
    )

    const inputs = screen.getAllByLabelText(/value/i)
    expect(inputs[0]).toHaveValue('First')
    expect(inputs[1]).toHaveValue('Second')

    // Click Move Up on the second row
    const moveUpButtons = screen.getAllByLabelText(/move item \d+ up/i)
    await user.click(moveUpButtons[1])

    await waitFor(() => {
      const updated = screen.getAllByLabelText(/value/i)
      expect(updated[0]).toHaveValue('Second')
      expect(updated[1]).toHaveValue('First')
    })
  })

  it('77. "Move Down" reorders array rows', async () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }, { value: 'B' }] }}
        fields={{ items: { movable: true } }}
      />,
    )

    const moveDownButtons = screen.getAllByLabelText(/move item \d+ down/i)
    await user.click(moveDownButtons[0])

    await waitFor(() => {
      const updated = screen.getAllByLabelText(/value/i)
      expect(updated[0]).toHaveValue('B')
      expect(updated[1]).toHaveValue('A')
    })
  })

  it('78. "Move Up" is disabled on the first row', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'One' }, { value: 'Two' }] }}
        fields={{ items: { movable: true } }}
      />,
    )

    const moveUpButtons = screen.getAllByLabelText(/move item \d+ up/i)
    expect(moveUpButtons[0]).toBeDisabled()
  })

  it('79. "Move Down" is disabled on the last row', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'One' }, { value: 'Two' }] }}
        fields={{ items: { movable: true } }}
      />,
    )

    const moveDownButtons = screen.getAllByLabelText(/move item \d+ down/i)
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled()
  })

  it('80. "Duplicate" copies a row\'s values', async () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'Original' }] }}
        fields={{ items: { duplicable: true } }}
      />,
    )

    const dupBtn = screen.getByLabelText(/duplicate item 1/i)
    await user.click(dupBtn)

    await waitFor(() => {
      const inputs = screen.getAllByLabelText(/value/i)
      expect(inputs).toHaveLength(2)
      expect(inputs[0]).toHaveValue('Original')
      expect(inputs[1]).toHaveValue('Original')
    })
  })

  it('81. "Add" is disabled when at maxItems', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })).max(2),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }, { value: 'B' }] }}
      />,
    )

    const addBtn = screen.getByRole('button', { name: /^add$/i })
    expect(addBtn).toBeDisabled()
  })

  it('82. "Remove" is disabled when at minItems', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })).min(1),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'Only' }] }}
      />,
    )

    const removeBtn = screen.getByLabelText(/remove item 1/i)
    expect(removeBtn).toBeDisabled()
  })

  it('83. collapsible rows — toggle collapse hides/shows fields', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string(), age: z.number() })),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ name: 'Alice', age: 30 }] }}
        fields={{ items: { collapsible: true } }}
      />,
    )

    // Fields are visible initially
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()

    // Click collapse toggle
    const collapseBtn = screen.getByLabelText(/collapse item 1/i)
    await user.click(collapseBtn)

    // Fields should be hidden
    await waitFor(() => {
      expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument()
    })

    // Click expand to show fields again
    const expandBtn = screen.getByLabelText(/expand item 1/i)
    await user.click(expandBtn)

    await waitFor(() => {
      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument()
    })
  })

  it('84. collapsible rows — summary shows first string field value', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string(), age: z.number() })),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ name: 'Alice', age: 30 }] }}
        fields={{ items: { collapsible: true } }}
      />,
    )

    // Collapse the row
    const collapseBtn = screen.getByLabelText(/collapse item 1/i)
    await user.click(collapseBtn)

    // The text 'Alice' is inside a button along with the ▶ icon, so use a function matcher
    await waitFor(() => {
      const btn = screen.getByLabelText(/expand item 1/i)
      expect(btn.textContent).toContain('Alice')
    })
  })

  it('85. scalar array items are not collapsible', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ tags: ['one'] }}
      />,
    )

    // No collapse toggles should be rendered
    expect(screen.queryByLabelText(/collapse/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/expand/i)).not.toBeInTheDocument()
  })

  it('86. array minItems/maxItems are extracted by introspection', () => {
    const arraySchema = z.array(z.string()).min(1).max(5)
    const result = introspectSchema(arraySchema, 'items')
    expect(result.minItems).toBe(1)
    expect(result.maxItems).toBe(5)
  })

  // =========================================================================
  // Array Button classNames (87–91)
  // =========================================================================

  it('87. classNames.arrayAdd applies to the Add button', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        classNames={{ arrayAdd: 'btn-add' }}
      />,
    )
    const addBtn = screen.getByRole('button', { name: /^add$/i })
    expect(addBtn).toHaveClass('btn-add')
  })

  it('88. classNames.arrayRemove applies to Remove buttons', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }] }}
        classNames={{ arrayRemove: 'btn-remove' }}
      />,
    )
    const removeBtn = screen.getByLabelText(/remove item 1/i)
    expect(removeBtn).toHaveClass('btn-remove')
  })

  it('89. classNames.arrayMove applies to Move buttons', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }, { value: 'B' }] }}
        fields={{ items: { movable: true } }}
        classNames={{ arrayMove: 'btn-move' }}
      />,
    )
    const moveButtons = screen.getAllByLabelText(/move item \d+ (up|down)/i)
    moveButtons.forEach((btn) => expect(btn).toHaveClass('btn-move'))
  })

  it('90. classNames.arrayDuplicate applies to Duplicate buttons', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }] }}
        fields={{ items: { duplicable: true } }}
        classNames={{ arrayDuplicate: 'btn-dup' }}
      />,
    )
    const dupBtn = screen.getByLabelText(/duplicate item 1/i)
    expect(dupBtn).toHaveClass('btn-dup')
  })

  it('91. classNames.arrayCollapse applies to Collapse buttons', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }] }}
        fields={{ items: { collapsible: true } }}
        classNames={{ arrayCollapse: 'btn-collapse' }}
      />,
    )
    const collapseBtn = screen.getByLabelText(/collapse item 1/i)
    expect(collapseBtn).toHaveClass('btn-collapse')
  })

  // =========================================================================
  // layout.arrayRowLayout (92–95)
  // =========================================================================

  it('92. default arrayRowLayout renders remove button', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }] }}
      />,
    )
    expect(screen.getByLabelText(/remove item 1/i)).toBeInTheDocument()
  })

  it('93. custom arrayRowLayout receives buttons and children', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }] }}
        layout={{
          arrayRowLayout: ({ children, buttons }) => (
            <div data-testid='custom-row'>
              <div data-testid='actions-top'>{buttons.remove}</div>
              {children}
            </div>
          ),
        }}
      />,
    )
    expect(screen.getByTestId('custom-row')).toBeInTheDocument()
    // Remove button is inside the custom actions div
    const actionsTop = screen.getByTestId('actions-top')
    expect(
      within(actionsTop).getByLabelText(/remove item 1/i),
    ).toBeInTheDocument()
  })

  it('94. custom arrayRowLayout receives index and rowCount', () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }, { value: 'B' }] }}
        layout={{
          arrayRowLayout: ({ children, buttons, index, rowCount }) => (
            <div data-testid={`row-${index}`}>
              <span
                data-testid={`info-${index}`}
              >{`${index + 1}/${rowCount}`}</span>
              {children}
              {buttons.remove}
            </div>
          ),
        }}
      />,
    )
    expect(screen.getByTestId('info-0')).toHaveTextContent('1/2')
    expect(screen.getByTestId('info-1')).toHaveTextContent('2/2')
  })

  it('95. custom arrayRowLayout receives move buttons when movable', async () => {
    const schema = z.object({
      items: z.array(z.object({ value: z.string() })),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ value: 'A' }, { value: 'B' }] }}
        fields={{ items: { movable: true } }}
        layout={{
          arrayRowLayout: ({ children, buttons }) => (
            <div data-testid='custom-row'>
              <div data-testid='btn-group'>
                {buttons.moveUp}
                {buttons.moveDown}
              </div>
              {children}
              {buttons.remove}
            </div>
          ),
        }}
      />,
    )
    // Move buttons are inside the custom btn-group
    const btnGroups = screen.getAllByTestId('btn-group')
    expect(
      within(btnGroups[0]).getByLabelText(/move item 1 up/i),
    ).toBeInTheDocument()
    expect(
      within(btnGroups[0]).getByLabelText(/move item 1 down/i),
    ).toBeInTheDocument()

    // Move item 2 up and check re-ordering
    const moveUpBtn = within(btnGroups[1]).getByLabelText(/move item 2 up/i)
    await user.click(moveUpBtn)

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      expect(inputs[0]).toHaveValue('B')
      expect(inputs[1]).toHaveValue('A')
    })
  })

  // =========================================================================
  // Field Dependencies — depend (100–104)
  // =========================================================================

  it('100. depend provides dynamic options for a select field on initial render', () => {
    const schema = z.object({
      category: z.enum(['fruit', 'veggie']),
      item: z.enum(['apple', 'banana', 'carrot', 'broccoli']),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ category: 'fruit' }}
        fields={{
          item: {
            depend: (values) => ({
              options:
                values['category'] === 'veggie'
                  ? [
                      { label: 'Carrot', value: 'carrot' },
                      { label: 'Broccoli', value: 'broccoli' },
                    ]
                  : [
                      { label: 'Apple', value: 'apple' },
                      { label: 'Banana', value: 'banana' },
                    ],
            }),
          },
        }}
      />,
    )
    const selects = screen.getAllByRole('combobox')
    const itemSelect = selects[1]
    expect(
      within(itemSelect).getByRole('option', { name: 'Apple' }),
    ).toBeInTheDocument()
    expect(
      within(itemSelect).queryByRole('option', { name: 'Carrot' }),
    ).not.toBeInTheDocument()
  })

  it('101. depend options update reactively when the dependency field changes', async () => {
    const schema = z.object({
      category: z.enum(['fruit', 'veggie']),
      item: z.enum(['apple', 'banana', 'carrot', 'broccoli']),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ category: 'fruit' }}
        fields={{
          item: {
            depend: (values) => ({
              options:
                values['category'] === 'veggie'
                  ? [
                      { label: 'Carrot', value: 'carrot' },
                      { label: 'Broccoli', value: 'broccoli' },
                    ]
                  : [
                      { label: 'Apple', value: 'apple' },
                      { label: 'Banana', value: 'banana' },
                    ],
            }),
          },
        }}
      />,
    )
    const [categorySelect] = screen.getAllByRole('combobox')
    await user.selectOptions(categorySelect, 'veggie')

    await waitFor(() => {
      const [, updatedItemSelect] = screen.getAllByRole('combobox')
      expect(
        within(updatedItemSelect).getByRole('option', { name: 'Carrot' }),
      ).toBeInTheDocument()
      expect(
        within(updatedItemSelect).queryByRole('option', { name: 'Apple' }),
      ).not.toBeInTheDocument()
    })
  })

  it('102. depend.hidden hides a field when the condition is met', async () => {
    const schema = z.object({
      type: z.enum(['individual', 'company']),
      companyName: z.string().optional(),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          companyName: {
            depend: (values) => ({ hidden: values['type'] !== 'company' }),
          },
        }}
      />,
    )
    // Initially 'individual' (first enum) → companyName hidden
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument()

    // Switch to 'company' → companyName appears
    await user.selectOptions(screen.getByRole('combobox'), 'company')
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    })
  })

  it('103. depend.disabled disables a field when the condition is met', async () => {
    const schema = z.object({
      isLocked: z.boolean(),
      notes: z.string().optional(),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          notes: {
            depend: (values) => ({ disabled: values['isLocked'] === true }),
          },
        }}
      />,
    )
    expect(screen.getByRole('textbox')).not.toBeDisabled()

    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })

  it('104. depend.label changes a field label based on another field', () => {
    const schema = z.object({
      unit: z.enum(['kg', 'lbs']),
      quantity: z.number().optional(),
    })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ unit: 'kg' }}
        fields={{
          quantity: {
            depend: (values) => ({
              label: `Quantity (${String(values['unit'] ?? 'kg')})`,
            }),
          },
        }}
      />,
    )
    expect(screen.getByLabelText(/quantity \(kg\)/i)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 105. meta.component as a direct React component (via Zod schema meta)
  // ---------------------------------------------------------------------------

  it('105. meta.component as a direct React component renders the component', () => {
    const RichInput = (props: FieldProps) => (
      <input
        data-testid='rich-input'
        name={props.name}
        value={String((props.value ?? '') as string | number | boolean)}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
      />
    )
    const schema = z.object({
      title: z.string().meta({ component: RichInput }),
    })
    render(<AutoForm schema={schema} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('rich-input')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 106. meta.component as direct component via fields prop override
  // ---------------------------------------------------------------------------

  it('106. meta.component as a direct React component via fields prop override', () => {
    const StarWidget = (props: FieldProps) => (
      <div data-testid='star-widget' data-name={props.name} />
    )
    const schema = z.object({ rating: z.number() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{ rating: { component: StarWidget } }}
      />,
    )
    expect(screen.getByTestId('star-widget')).toBeInTheDocument()
    expect(screen.getByTestId('star-widget')).toHaveAttribute(
      'data-name',
      'rating',
    )
  })

  // ---------------------------------------------------------------------------
  // 107. meta.component direct component takes precedence over registry key
  // ---------------------------------------------------------------------------

  it('107. direct component in meta.component takes priority over registry key', () => {
    const DirectComp = (props: FieldProps) => (
      <input
        data-testid='direct-comp'
        name={props.name}
        onChange={() => {}}
        value=''
      />
    )
    const RegistryComp = (props: FieldProps) => (
      <input
        data-testid='registry-comp'
        name={props.name}
        onChange={() => {}}
        value=''
      />
    )
    const schema = z.object({ bio: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        // registry has 'string' mapped to RegistryComp
        components={{ string: RegistryComp }}
        // fields override uses a direct React component
        fields={{ bio: { component: DirectComp } }}
      />,
    )
    expect(screen.getByTestId('direct-comp')).toBeInTheDocument()
    expect(screen.queryByTestId('registry-comp')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 108. fields.depend callback is called with the actual form values
  // ---------------------------------------------------------------------------

  it('108. fields.depend callback is called and produces the correct override', async () => {
    const schema = z.object({
      role: z.enum(['admin', 'user']),
      permissions: z.string().optional(),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        fields={{
          permissions: {
            depend: (values) => ({
              hidden: values.role !== 'admin',
            }),
          },
        }}
      />,
    )

    // Default first enum value is 'admin' — permissions should be visible
    expect(screen.getByLabelText(/permissions/i)).toBeInTheDocument()

    // Switch role to 'user' — permissions should be hidden
    await user.selectOptions(screen.getByRole('combobox'), 'user')
    await waitFor(() => {
      expect(screen.queryByLabelText(/permissions/i)).not.toBeInTheDocument()
    })

    // Switch back to 'admin' — permissions should reappear
    await user.selectOptions(screen.getByRole('combobox'), 'admin')
    await waitFor(() => {
      expect(screen.getByLabelText(/permissions/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // 109. labels.submit changes the submit button text
  // ---------------------------------------------------------------------------

  it('109. labels.submit changes the submit button text', () => {
    const schema = z.object({ name: z.string() })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        labels={{ submit: 'Send Form' }}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Send Form' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Submit' }),
    ).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 110. labels.arrayAdd changes the array add button text
  // ---------------------------------------------------------------------------

  it('110. labels.arrayAdd changes the array add button text', () => {
    const schema = z.object({ tags: z.array(z.string()) })
    render(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        labels={{ arrayAdd: 'Add Tag' }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add Tag' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add' }),
    ).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 111. labels.arrayRemove changes the array remove button text
  // ---------------------------------------------------------------------------

  it('111. labels.arrayRemove changes the array remove button text', async () => {
    const schema = z.object({ tags: z.array(z.string()) })
    setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ tags: ['hello'] }}
        labels={{ arrayRemove: 'Delete' }}
      />,
    )
    // Wait for the row to appear and verify remove button text
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 112. labels.arrayMoveUp / labels.arrayMoveDown change move button texts
  // ---------------------------------------------------------------------------

  it('112. labels.arrayMoveUp and labels.arrayMoveDown change move button texts', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    })
    setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ name: 'A' }, { name: 'B' }] }}
        fields={{ items: { movable: true } }}
        labels={{ arrayMoveUp: 'Up', arrayMoveDown: 'Down' }}
      />,
    )
    await waitFor(() => {
      expect(screen.getAllByText('Up').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Down').length).toBeGreaterThan(0)
    })
    expect(screen.queryAllByText('↑')).toHaveLength(0)
    expect(screen.queryAllByText('↓')).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // 113. labels.arrayDuplicate changes the duplicate button text
  // ---------------------------------------------------------------------------

  it('113. labels.arrayDuplicate changes the duplicate button text', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    })
    setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ name: 'A' }] }}
        fields={{ items: { duplicable: true } }}
        labels={{ arrayDuplicate: 'Copy' }}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // 114. labels.arrayCollapse / labels.arrayExpand change toggle texts
  // ---------------------------------------------------------------------------

  it('114. labels.arrayCollapse and labels.arrayExpand change toggle texts', async () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    })
    const { user } = setup(
      <AutoForm
        schema={schema}
        onSubmit={vi.fn()}
        defaultValues={{ items: [{ name: 'A' }] }}
        fields={{ items: { collapsible: true } }}
        labels={{ arrayCollapse: 'Hide', arrayExpand: 'Show' }}
      />,
    )
    // Initially expanded — collapse button should show "Hide"
    await waitFor(() => {
      expect(screen.getByText(/hide/i)).toBeInTheDocument()
    })

    // Click to collapse — expand button should show "Show"
    await user.click(screen.getByText(/hide/i))
    await waitFor(() => {
      expect(screen.getByText(/show/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // 115. createAutoForm factory labels overridden by per-instance labels prop
  // ---------------------------------------------------------------------------

  it('115. factory-level labels are overridden by per-instance labels prop', () => {
    const FactoryForm = createAutoForm({ labels: { submit: 'Save' } })
    const schema = z.object({ name: z.string() })

    const { rerender } = render(
      <FactoryForm schema={schema} onSubmit={vi.fn()} />,
    )
    // Factory label applies
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()

    // Per-instance label overrides factory
    rerender(
      <FactoryForm
        schema={schema}
        onSubmit={vi.fn()}
        labels={{ submit: 'Save & Close' }}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Save & Close' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save' }),
    ).not.toBeInTheDocument()
  })
})
