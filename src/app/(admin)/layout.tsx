// Intentionally does NOT import CartProvider, Header, or Footer.
// This layout is completely isolated from the storefront layout.
// Auth guard lives in admin/(protected)/layout.tsx so the login page
// (which is NOT under (protected)) doesn't trigger a redirect loop.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
