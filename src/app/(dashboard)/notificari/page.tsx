'use client'

import { Bell } from 'lucide-react'

export default function NotificariPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-primary">Notificari</h1>
      </div>
      <div className="bg-white border rounded-xl p-12 text-center">
        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">Notificari</h2>
        <p className="text-muted-foreground text-sm">
          Nu aveti notificari noi.
        </p>
      </div>
    </div>
  )
}
