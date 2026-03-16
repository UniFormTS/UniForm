import Example01 from './examples/Example01'
import Example02 from './examples/Example02'
import Example03 from './examples/Example03'
import Example04 from './examples/Example04'
import Example05 from './examples/Example05'
import Example06 from './examples/Example06'
import Example07 from './examples/Example07'
import Example08 from './examples/Example08'
import Example09 from './examples/Example09'
import Example10 from './examples/Example10'
import Example11 from './examples/Example11'
import Example12 from './examples/Example12'
import Example13 from './examples/Example13'
import Example14 from './examples/Example14'
import Example15 from './examples/Example15'
import Example16 from './examples/Example16'
import Example17 from './examples/Example17'
import Example18 from './examples/Example18'
import Example19 from './examples/Example19'
import Example20 from './examples/Example20'
import Example21 from './examples/Example21'

const examples = [
  { id: 'ex1', label: '1. classNames + span' },
  { id: 'ex2', label: '2. Section Grouping' },
  { id: 'ex3', label: '3. Custom Layout Slots' },
  { id: 'ex4', label: '4. Custom fieldWrapper' },
  { id: 'ex5', label: '5. createAutoForm Factory' },
  { id: 'ex6', label: '6. Validation Messages' },
  { id: 'ex7', label: '7. Deep Field Overrides' },
  { id: 'ex8', label: '8. Kitchen Sink' },
  { id: 'ex9', label: '9. Disabled Form' },
  { id: 'ex10', label: '10. Ref Control' },
  { id: 'ex11', label: '11. Persistence' },
  { id: 'ex12', label: '12. Enhanced Arrays' },
  { id: 'ex13', label: '13. Array Row Layout' },
  { id: 'ex14', label: '14. Value Cascade' },
  { id: 'ex15', label: '15. Field Dependencies' },
  { id: 'ex16', label: '16. Per-field Custom Components' },
  { id: 'ex17', label: '17. Typed Dependencies & Custom Labels' },
  { id: 'ex18', label: '18. Discriminated Union' },
  { id: 'ex19', label: '19. isSubmitting via Ref' },
  { id: 'ex20', label: '20. Async setOnChange' },
  { id: 'ex21', label: '21. Async Default Values' },
]

export default function App() {
  return (
    <main
      style={{
        fontFamily: 'system-ui',
        padding: '2rem',
        maxWidth: 700,
        margin: '0 auto',
      }}
    >
      <h1>UniForm Playground</h1>

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
        }}
      >
        {examples.map((ex) => (
          <a
            key={ex.id}
            href={`#${ex.id}`}
            style={{
              fontSize: '0.85rem',
              color: '#4f46e5',
              textDecoration: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              background: '#fff',
              border: '1px solid #e0e0e0',
            }}
          >
            {ex.label}
          </a>
        ))}
      </nav>

      <Example01 />
      <hr style={{ margin: '2rem 0' }} />
      <Example02 />
      <hr style={{ margin: '2rem 0' }} />
      <Example03 />
      <hr style={{ margin: '2rem 0' }} />
      <Example04 />
      <hr style={{ margin: '2rem 0' }} />
      <Example05 />
      <hr style={{ margin: '2rem 0' }} />
      <Example06 />
      <hr style={{ margin: '2rem 0' }} />
      <Example07 />
      <hr style={{ margin: '2rem 0' }} />
      <Example08 />
      <hr style={{ margin: '2rem 0' }} />
      <Example09 />
      <hr style={{ margin: '2rem 0' }} />
      <Example10 />
      <hr style={{ margin: '2rem 0' }} />
      <Example11 />
      <hr style={{ margin: '2rem 0' }} />
      <Example12 />
      <hr style={{ margin: '2rem 0' }} />
      <Example13 />
      <hr style={{ margin: '2rem 0' }} />
      <Example14 />
      <hr style={{ margin: '2rem 0' }} />
      <Example15 />
      <hr style={{ margin: '2rem 0' }} />
      <Example16 />
      <hr style={{ margin: '2rem 0' }} />
      <Example17 />
      <hr style={{ margin: '2rem 0' }} />
      <Example18 />
      <hr style={{ margin: '2rem 0' }} />
      <Example19 />
      <hr style={{ margin: '2rem 0' }} />
      <Example20 />
      <hr style={{ margin: '2rem 0' }} />
      <Example21 />
    </main>
  )
}
