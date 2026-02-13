export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/hero-bg.jpg')" }}
    >
      {children}
    </div>
  )
}
