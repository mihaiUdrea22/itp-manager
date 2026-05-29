-- ITP Manager Database Schema
-- Run this in Supabase SQL Editor or as a migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE staff_role AS ENUM ('admin', 'engineer', 'staff');
CREATE TYPE appointment_type AS ENUM ('staff', 'online', 'vin');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- Stations table (multi-tenant)
CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  block_holidays BOOLEAN DEFAULT true,
  suspend_from DATE,
  suspend_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table (linked to auth.users)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role staff_role DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  accepts_online BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, station_id)
);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, phone)
);

-- Vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  vin TEXT,
  civ TEXT,
  category TEXT,
  brand TEXT,
  manufacture_year INTEGER,
  fuel_type TEXT,
  itp_expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  engineer_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type appointment_type DEFAULT 'staff',
  status appointment_status DEFAULT 'scheduled',
  send_sms BOOLEAN DEFAULT true,
  reminder_sent BOOLEAN DEFAULT false,
  result TEXT CHECK (result IN ('admis', 'respins', 'neprezentare')),
  rejection_reason TEXT,
  itp_duration_years INTEGER DEFAULT 2,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Working hours table (station-level defaults)
CREATE TABLE working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME DEFAULT '08:30',
  end_time TIME DEFAULT '19:30',
  is_working BOOLEAN DEFAULT true,
  UNIQUE(station_id, day_of_week)
);

-- Engineer-specific working hours (per-engineer, per-day schedule)
CREATE TABLE engineer_working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engineer_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 6), -- 1=Monday .. 6=Saturday
  start_time TIME DEFAULT '08:30',
  end_time TIME DEFAULT '20:00',
  is_working BOOLEAN DEFAULT true,
  UNIQUE(engineer_id, day_of_week)
);

-- Engineer blocked intervals (specific dates when engineer is unavailable)
CREATE TABLE engineer_blocked_intervals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engineer_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME, -- NULL means whole day
  end_time TIME,   -- NULL means whole day
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Station categories (which vehicle categories a station accepts)
CREATE TABLE station_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(station_id, name)
);

-- Service prices (custom pricing for the station)
CREATE TABLE service_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'RON',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Station settings (key-value for templates, toggles, etc.)
CREATE TABLE station_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(station_id, key)
);

-- Unique VIN per station (partial — only when vin is NOT NULL)
CREATE UNIQUE INDEX idx_vehicles_vin_unique ON vehicles(station_id, vin) WHERE vin IS NOT NULL AND vin != '';

-- Indexes for performance
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_station ON clients(station_id);
CREATE INDEX idx_vehicles_client ON vehicles(client_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_engineer ON appointments(engineer_id);
CREATE INDEX idx_appointments_station_date ON appointments(station_id, date);
CREATE INDEX idx_staff_user ON staff(user_id);
CREATE INDEX idx_staff_station ON staff(station_id);
CREATE INDEX idx_ewh_engineer ON engineer_working_hours(engineer_id);
CREATE INDEX idx_ewh_station ON engineer_working_hours(station_id);
CREATE INDEX idx_ebi_engineer ON engineer_blocked_intervals(engineer_id);
CREATE INDEX idx_ebi_date ON engineer_blocked_intervals(blocked_date);
CREATE INDEX idx_station_categories_station ON station_categories(station_id);
CREATE INDEX idx_service_prices_station ON service_prices(station_id);
CREATE INDEX idx_station_settings_station ON station_settings(station_id);

-- Row Level Security (RLS)
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_blocked_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: returns the station_id for the current user
-- SECURITY DEFINER bypasses RLS, avoiding infinite recursion on the staff table
CREATE OR REPLACE FUNCTION get_my_station_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT station_id FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS Policies (using get_my_station_id() to avoid recursion)

-- Stations: user can see and update their own station
CREATE POLICY "stations_select" ON stations
  FOR SELECT USING (id = get_my_station_id());

CREATE POLICY "stations_update" ON stations
  FOR UPDATE USING (id = get_my_station_id());

-- Staff: can see all colleagues at the same station
CREATE POLICY "staff_select_policy" ON staff
  FOR SELECT USING (station_id = get_my_station_id());

-- Staff: can update only their own record
CREATE POLICY "staff_update_policy" ON staff
  FOR UPDATE USING (user_id = auth.uid());

-- Clients: full CRUD scoped to own station
CREATE POLICY "clients_policy" ON clients
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Vehicles: full CRUD scoped to own station
CREATE POLICY "vehicles_policy" ON vehicles
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Appointments: full CRUD scoped to own station
CREATE POLICY "appointments_policy" ON appointments
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Working hours: full CRUD scoped to own station
CREATE POLICY "working_hours_policy" ON working_hours
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Engineer working hours: full CRUD scoped to own station
CREATE POLICY "ewh_policy" ON engineer_working_hours
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Engineer blocked intervals: full CRUD scoped to own station
CREATE POLICY "ebi_policy" ON engineer_blocked_intervals
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Station categories: full CRUD scoped to own station
CREATE POLICY "station_categories_policy" ON station_categories
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Service prices: full CRUD scoped to own station
CREATE POLICY "service_prices_policy" ON service_prices
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Station settings: full CRUD scoped to own station
CREATE POLICY "station_settings_policy" ON station_settings
  FOR ALL USING (station_id = get_my_station_id())
  WITH CHECK (station_id = get_my_station_id());

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default working hours for a station
CREATE OR REPLACE FUNCTION seed_working_hours(p_station_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO working_hours (station_id, day_of_week, start_time, end_time, is_working)
  VALUES
    (p_station_id, 0, '08:30', '19:30', false),  -- Sunday
    (p_station_id, 1, '08:30', '19:30', true),   -- Monday
    (p_station_id, 2, '08:30', '19:30', true),   -- Tuesday
    (p_station_id, 3, '08:30', '19:30', true),   -- Wednesday
    (p_station_id, 4, '08:30', '19:30', true),   -- Thursday
    (p_station_id, 5, '08:30', '19:30', true),   -- Friday
    (p_station_id, 6, '08:30', '14:00', true);   -- Saturday (half day)
END;
$$ LANGUAGE plpgsql;
