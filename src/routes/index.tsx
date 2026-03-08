import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div>
      <h1>Welcome to Generic Zod Form</h1>
      <p>
        Navigate to <Link to="/form">Form</Link> to try the generic form.
      </p>
    </div>
  )
}
