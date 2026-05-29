-- Seed data for development
-- Run this AFTER creating a user in Supabase Auth

-- First, create a test station
INSERT INTO stations (id, name, address, phone)
VALUES ('a0000000-0000-0000-0000-000000000001', 'ITP Timisoara', 'Str. Exemplu Nr. 1, Timisoara', '0256123456');

-- Seed working hours for the station
SELECT seed_working_hours('a0000000-0000-0000-0000-000000000001');

-- NOTE: After creating a user via Supabase Auth (email: mtz@itp.ro),
-- run the following to link them as staff:
--
-- INSERT INTO staff (user_id, station_id, name, email, role)
-- VALUES (
--   '<USER_UUID_FROM_AUTH>',
--   'a0000000-0000-0000-0000-000000000001',
--   'Ion Popescu',
--   'mtz@itp.ro',
--   'admin'
-- );
--
-- You can also add more engineers:
-- INSERT INTO staff (user_id, station_id, name, email, role)
-- VALUES (
--   '<ANOTHER_USER_UUID>',
--   'a0000000-0000-0000-0000-000000000001',
--   'Maria Ionescu',
--   'maria@itp.ro',
--   'engineer'
-- );
