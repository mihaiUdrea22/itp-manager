'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Staff, Station } from '@/types/database'

type AuthContextType = {
  user: User | null
  staff: Staff | null
  station: Station | null
  engineers: Staff[]
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  staff: null,
  station: null,
  engineers: [],
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [station, setStation] = useState<Station | null>(null)
  const [engineers, setEngineers] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get staff record
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (staffData) {
          setStaff(staffData)

          // Get station
          const { data: stationData } = await supabase
            .from('stations')
            .select('*')
            .eq('id', staffData.station_id)
            .single()

          setStation(stationData)

          // Get all engineers for this station
          const { data: engineersData } = await supabase
            .from('staff')
            .select('*')
            .eq('station_id', staffData.station_id)
            .eq('is_active', true)
            .in('role', ['admin', 'engineer'])
            .order('name')

          setEngineers(engineersData || [])
        }
      }

      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setStaff(null)
        setStation(null)
        setEngineers([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setStaff(null)
    setStation(null)
    setEngineers([])
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, staff, station, engineers, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
