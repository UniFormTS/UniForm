import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
        <Link to="/form" activeProps={{ style: { fontWeight: 'bold' } }}>
          Form
        </Link>
      </nav>
      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </>
  ),
})
