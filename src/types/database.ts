export type Database = {
  public: {
    Tables: {
      stations: {
        Row: {
          id: string
          name: string
          address: string | null
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          phone?: string | null
          created_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          user_id: string
          station_id: string
          name: string
          email: string
          role: 'admin' | 'engineer' | 'staff'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          station_id: string
          name: string
          email: string
          role?: 'admin' | 'engineer' | 'staff'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          station_id?: string
          name?: string
          email?: string
          role?: 'admin' | 'engineer' | 'staff'
          is_active?: boolean
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          station_id: string
          phone: string
          name: string | null
          info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          station_id: string
          phone: string
          name?: string | null
          info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          phone?: string
          name?: string | null
          info?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          client_id: string
          station_id: string
          plate_number: string
          vin: string | null
          civ: string | null
          category: string | null
          brand: string | null
          manufacture_year: number | null
          fuel_type: string | null
          itp_expiry_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          station_id: string
          plate_number: string
          vin?: string | null
          civ?: string | null
          category?: string | null
          brand?: string | null
          manufacture_year?: number | null
          fuel_type?: string | null
          itp_expiry_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          station_id?: string
          plate_number?: string
          vin?: string | null
          civ?: string | null
          category?: string | null
          brand?: string | null
          manufacture_year?: number | null
          fuel_type?: string | null
          itp_expiry_date?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          station_id: string
          client_id: string
          vehicle_id: string
          engineer_id: string
          date: string
          time: string
          type: 'staff' | 'online' | 'vin'
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          send_sms: boolean
          reminder_sent: boolean
          result: 'admis' | 'respins' | 'neprezentare' | null
          rejection_reason: string | null
          itp_duration_years: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          station_id: string
          client_id: string
          vehicle_id: string
          engineer_id: string
          date: string
          time: string
          type?: 'staff' | 'online' | 'vin'
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          send_sms?: boolean
          reminder_sent?: boolean
          result?: 'admis' | 'respins' | 'neprezentare' | null
          rejection_reason?: string | null
          itp_duration_years?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          client_id?: string
          vehicle_id?: string
          engineer_id?: string
          date?: string
          time?: string
          type?: 'staff' | 'online' | 'vin'
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
          send_sms?: boolean
          reminder_sent?: boolean
          result?: 'admis' | 'respins' | 'neprezentare' | null
          rejection_reason?: string | null
          itp_duration_years?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      working_hours: {
        Row: {
          id: string
          station_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_working: boolean
        }
        Insert: {
          id?: string
          station_id: string
          day_of_week: number
          start_time?: string
          end_time?: string
          is_working?: boolean
        }
        Update: {
          id?: string
          station_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_working?: boolean
        }
      }
      engineer_working_hours: {
        Row: {
          id: string
          engineer_id: string
          station_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_working: boolean
        }
        Insert: {
          id?: string
          engineer_id: string
          station_id: string
          day_of_week: number
          start_time?: string
          end_time?: string
          is_working?: boolean
        }
        Update: {
          id?: string
          engineer_id?: string
          station_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_working?: boolean
        }
      }
      engineer_blocked_intervals: {
        Row: {
          id: string
          engineer_id: string
          station_id: string
          blocked_date: string
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          engineer_id: string
          station_id: string
          blocked_date: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          engineer_id?: string
          station_id?: string
          blocked_date?: string
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
        }
      }
      station_categories: {
        Row: {
          id: string
          station_id: string
          name: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          station_id: string
          name: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          station_id?: string
          name?: string
          is_active?: boolean
          sort_order?: number
        }
      }
      service_prices: {
        Row: {
          id: string
          station_id: string
          name: string
          price: number
          currency: string
          created_at: string
        }
        Insert: {
          id?: string
          station_id: string
          name: string
          price: number
          currency?: string
          created_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          name?: string
          price?: number
          currency?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      staff_role: 'admin' | 'engineer' | 'staff'
      appointment_type: 'staff' | 'online' | 'vin'
      appointment_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    }
  }
}

// Helper types
export type Station = Database['public']['Tables']['stations']['Row']
export type Staff = Database['public']['Tables']['staff']['Row'] & { accepts_online?: boolean }
export type Client = Database['public']['Tables']['clients']['Row']
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type WorkingHours = Database['public']['Tables']['working_hours']['Row']
export type EngineerWorkingHours = Database['public']['Tables']['engineer_working_hours']['Row']
export type EngineerBlockedInterval = Database['public']['Tables']['engineer_blocked_intervals']['Row']
export type StationCategory = Database['public']['Tables']['station_categories']['Row']
export type ServicePrice = Database['public']['Tables']['service_prices']['Row']

export type AppointmentWithDetails = Appointment & {
  client: Client
  vehicle: Vehicle
  engineer: Staff
}
