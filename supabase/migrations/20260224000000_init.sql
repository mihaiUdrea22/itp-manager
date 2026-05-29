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
  category TEXT,
  brand TEXT,
  manufacture_year INTEGER,
  fuel_type TEXT,
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
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Working hours table
CREATE TABLE working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME DEFAULT '08:30',
  end_time TIME DEFAULT '19:30',
  is_working BOOLEAN DEFAULT true,
  UNIQUE(station_id, day_of_week)
);

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

-- Row Level Security (RLS)
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can only see their own station's data
CREATE POLICY "Staff can view own station" ON stations
  FOR SELECT USING (
    id IN (SELECT station_id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can view own station staff" ON staff
  FOR SELECT USING (
    station_id IN (SELECT station_id FROM staff s WHERE s.user_id = auth.uid())
  );

CREATE POLICY "Staff can view own station clients" ON clients
  FOR ALL USING (
    station_id IN (SELECT station_id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can manage own station vehicles" ON vehicles
  FOR ALL USING (
    station_id IN (SELECT station_id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can manage own station appointments" ON appointments
  FOR ALL USING (
    station_id IN (SELECT station_id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can view own station working hours" ON working_hours
  FOR ALL USING (
    station_id IN (SELECT station_id FROM staff WHERE user_id = auth.uid())
  );

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
