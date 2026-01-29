import { createClient } from '@supabase/supabase-js';

// Acestea vor fi setate din variabile de mediu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL sau Anon Key lipsesc. Verifică variabilele de mediu.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipuri pentru baza de date (vor fi generate automat cu Supabase CLI)
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          cui: string;
          email: string;
          phone: string | null;
          address: string | null;
          subscription_plan: 'basic' | 'professional' | 'enterprise';
          subscription_status: 'active' | 'suspended' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          station_id: string | null;
          email: string;
          password_hash: string;
          name: string;
          role: 'manager' | 'engineer';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      stations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          code: string;
          address: string;
          phone: string | null;
          email: string | null;
          inspector_name: string;
          inspector_license: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['stations']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          type: 'individual' | 'fleet';
          first_name: string | null;
          last_name: string | null;
          cnp: string | null;
          company_name: string | null;
          cui: string | null;
          email: string | null;
          phone: string;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          license_plate: string;
          vin: string | null;
          make: string;
          model: string;
          year: number;
          type: 'car' | 'truck' | 'motorcycle' | 'bus' | 'trailer';
          fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'cng';
          color: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      inspections: {
        Row: {
          id: string;
          station_id: string;
          vehicle_id: string;
          client_id: string;
          engineer_id: string;
          scheduled_date: string;
          completed_date: string | null;
          status: 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'cancelled';
          result: 'passed' | 'failed' | 'conditional' | null;
          period_months: 6 | 12 | 24;
          expiration_date: string;
          next_inspection_date: string | null;
          mileage: number | null;
          notes: string | null;
          emissions_test: boolean;
          emissions_result: 'passed' | 'failed' | null;
          brake_test: boolean;
          brake_result: 'passed' | 'failed' | null;
          lights_test: boolean;
          lights_result: 'passed' | 'failed' | null;
          certificate_number: string | null;
          certificate_file_url: string | null;
          photos: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inspections']['Row'], 'id' | 'created_at' | 'updated_at' | 'expiration_date'>;
        Update: Partial<Database['public']['Tables']['inspections']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          company_id: string;
          station_id: string | null;
          user_id: string | null;
          type: 'inspection_due' | 'inspection_expired' | 'inspection_scheduled' | 'system';
          title: string;
          message: string;
          related_entity_type: 'inspection' | 'vehicle' | 'client' | null;
          related_entity_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
  };
};
