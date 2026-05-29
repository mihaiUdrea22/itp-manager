'use client'

import { Clock } from 'lucide-react'

export default function ExpirariPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-primary">Expirari</h1>
      </div>
      <div className="bg-white border rounded-xl p-12 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">Expirari ITP Manager</h2>
        <p className="text-muted-foreground text-sm">
          Aici vor aparea vehiculele cu ITP Manager-ul expirat sau aproape de expirare.
        </p>
      </div>
    </div>
  )
}
