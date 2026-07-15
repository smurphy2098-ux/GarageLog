-- GarageLog seed data for development
-- Run with: cat src/db/seed.sql | team-db

-- Demo user (password: "password123" — bcrypt hash)
INSERT INTO users (id, email, password_hash, name, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@garagelog.app', '$2b$10$dummyhashfordevelopmentonly1234567890abcdef', 'Alex Turner', NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'collector@garagelog.app', '$2b$10$dummyhashfordevelopmentonly1234567890abcdef', 'Maria Rossi', NOW());

-- Demo cars for Alex
INSERT INTO cars (id, user_id, make, model, year, nickname, vin, mileage, color, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Porsche', '911 Carrera S', 2007, 'The Grey Ghost', 'WP0AA29997S765432', 84500, 'Arctic Silver', NOW() - INTERVAL '30 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'BMW', 'E30 M3', 1988, 'Racing Champ', 'WBSAK0308J2199999', 142000, 'Alpine White', NOW() - INTERVAL '15 days');

-- Service log entries for the 911
INSERT INTO log_entries (id, car_id, user_id, entry_type, title, description, mileage, date, cost, vendor, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'service', 'Oil Change & Inspection', 'Full synthetic oil change, new filter, multi-point inspection. All fluids topped off.', 83000, '2025-11-15', 450.00, 'European Auto Works', NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'modification', 'Fabspeed Exhaust Install', 'Installed Fabspeed sport exhaust system. Sounds incredible — deep tone, no drone on highway.', 84000, '2026-01-20', 2200.00, 'DIY (Garage)', NOW() - INTERVAL '10 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'milestone', '85,000 Mile Service', 'Major service milestone. Spark plugs, serpentine belt, coolant flush, brake fluid flush.', 85000, '2026-03-01', 3200.00, 'European Auto Works', NOW() - INTERVAL '5 days');

-- Mod log entries for the E30 M3
INSERT INTO log_entries (id, car_id, user_id, entry_type, title, description, mileage, date, cost, vendor, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'modification', 'Ground Control Coilovers', 'Ground Control adjustable coilovers with custom spring rates. Corner-balanced and aligned. Transformed the handling.', 138000, '2024-06-10', 1800.00, 'Performance Shop', NOW() - INTERVAL '90 days'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'service', 'Valve Adjustment', 'S14 engine valve adjustment. All clearances within spec. New valve cover gasket.', 140000, '2025-09-05', 600.00, 'Bimmer Specialists', NOW() - INTERVAL '40 days');

-- Subscriptions
INSERT INTO subscriptions (id, user_id, plan, status, current_period_end, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'enthusiast', 'active', NOW() + INTERVAL '30 days', NOW() - INTERVAL '10 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'free', 'active', NULL, NOW() - INTERVAL '5 days');