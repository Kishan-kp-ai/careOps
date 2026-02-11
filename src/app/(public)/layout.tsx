import Link from "next/link"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="border-t bg-white py-6 text-center text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          Powered by CareOps
        </Link>
      </footer>
    </div>
  )
}
