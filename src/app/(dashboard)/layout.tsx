import { AuthProvider } from '@/context/auth-context'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[160px]">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
