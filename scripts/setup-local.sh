#!/bin/bash
# Setup script for local development
# Creates a test user and seeds the database
# Prerequisites: supabase must be running (npx supabase start)

SUPABASE_URL="http://127.0.0.1:54321"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
DB_CONTAINER="supabase_db_itp-manager"

echo "🔧 Setting up ITP Manager local environment..."
echo ""

# Create test user via Supabase Auth API
echo "👤 Creating test user (mtz@itp.ro / password123)..."
USER_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mtz@itp.ro",
    "password": "password123",
    "email_confirm": true
  }')

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "⚠️  User might already exist, trying to fetch..."
  USER_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}")
  USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "   User ID: $USER_ID"
echo ""

# Seed database using docker exec
echo "🌱 Seeding database..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres << EOSQL
-- Create station
INSERT INTO stations (id, name, address, phone)
VALUES ('a0000000-0000-0000-0000-000000000001', 'ITP Timișoara', 'Str. Exemplu Nr. 1, Timișoara', '0256123456')
ON CONFLICT (id) DO NOTHING;

-- Link user as staff (admin + engineer)
INSERT INTO staff (id, user_id, station_id, name, email, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '${USER_ID}',
  'a0000000-0000-0000-0000-000000000001',
  'Ion Popescu',
  'mtz@itp.ro',
  'admin'
) ON CONFLICT (user_id, station_id) DO NOTHING;

-- Add some test clients
INSERT INTO clients (id, station_id, phone, name, info) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '0721234567', 'Gheorghe Marin', 'Client fidel'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '0731234567', 'Ana Popescu', NULL),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '0741234567', 'Mihai Dumitrescu', 'Vine cu 2 masini')
ON CONFLICT DO NOTHING;

-- Add test vehicles
INSERT INTO vehicles (id, client_id, station_id, plate_number, vin, category, brand, manufacture_year, fuel_type) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'TM51MTZ', 'WVWZZZ3CZWE123456', 'M1', 'Volkswagen', 2020, 'Motorină'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'TM09RMS', 'WAUZZZ8V5KA123456', 'M1', 'Audi', 2019, 'Benzină'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'TM22ABC', NULL, 'M1', 'Dacia', 2022, 'GPL')
ON CONFLICT DO NOTHING;

-- Add test appointments for this week
INSERT INTO appointments (station_id, client_id, vehicle_id, engineer_id, date, time, type, status, send_sms) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE, '12:30', 'staff', 'scheduled', true),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '1 day', '13:30', 'online', 'scheduled', true),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '2 days', '09:00', 'staff', 'scheduled', false)
ON CONFLICT DO NOTHING;

SELECT 'Seeding complete!' as result;
EOSQL

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Login credentials:"
echo "   Email: mtz@itp.ro"
echo "   Password: password123"
echo ""
echo "🚀 Start the app with: npm run dev"
echo "📊 Supabase Studio: http://127.0.0.1:54323"
