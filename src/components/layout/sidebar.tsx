'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  Bell,
  Settings,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/programari', label: 'Programari', icon: CalendarDays },
  { href: '/clienti', label: 'Clienti', icon: Users },
  { href: '/expirari', label: 'Expirari', icon: Clock },
  { href: '/notificari', label: 'Notificari', icon: Bell },
  { href: '/setari', label: 'Setari', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { staff, signOut } = useAuth()

  return (
    <aside className="w-[160px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">ITP Manager</h1>
        <p className="text-xs text-sidebar-foreground/50 mt-0.5">Panou de control</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sync indicator */}
      <div className="px-5 py-2">
        <div className="flex items-center gap-2 text-sidebar-foreground/40">
          <RefreshCw size={12} />
        </div>
      </div>

      {/* Clock & User info */}
      <div className="px-5 py-3 border-t border-sidebar-border">
        <Clock size={14} className="text-sidebar-foreground/50 mb-1" />
        <CurrentTime />
      </div>

      <div className="px-5 py-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/80 font-medium truncate">
          {staff?.email || ''}
        </p>
        <p className="text-xs text-sidebar-foreground/40 capitalize">
          {staff?.role || ''}
        </p>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-sidebar-foreground/50 hover:text-red-300 mt-2 transition-colors"
        >
          <LogOut size={12} />
          Deconectare
        </button>
      </div>
    </aside>
  )
}

function CurrentTime() {
  'use client'
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return <p className="text-xs text-sidebar-foreground/60 font-mono">{time}</p>
}

