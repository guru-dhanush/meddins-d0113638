-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Meddin — AUTH SEED DATA                                ║
-- ║  Run this in the Supabase SQL Editor to create test users        ║
-- ║  All users have the password: password123                        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Enable the pgcrypto extension for password hashing if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to create auth users safely
CREATE OR REPLACE FUNCTION create_seed_user(
  user_id UUID,
  user_email TEXT,
  user_password TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create identity for the user
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    user_id,
    format('{"sub":"%s","email":"%s"}', user_id::text, user_email)::jsonb,
    'email',
    user_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. CREATE PROVIDERS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT create_seed_user('b0000001-0000-0000-0000-000000000001', 'dr.sarah@healther.com', 'password123');
SELECT create_seed_user('b0000002-0000-0000-0000-000000000002', 'emily.nurse@healther.com', 'password123');
SELECT create_seed_user('b0000003-0000-0000-0000-000000000003', 'maria.care@healther.com', 'password123');
SELECT create_seed_user('b0000004-0000-0000-0000-000000000004', 'dr.james@healther.com', 'password123');
SELECT create_seed_user('b0000005-0000-0000-0000-000000000005', 'robert.nurse@healther.com', 'password123');
SELECT create_seed_user('b0000006-0000-0000-0000-000000000006', 'linda.care@healther.com', 'password123');
SELECT create_seed_user('b0000007-0000-0000-0000-000000000007', 'dr.david@healther.com', 'password123');
SELECT create_seed_user('b0000008-0000-0000-0000-000000000008', 'patricia.nurse@healther.com', 'password123');
SELECT create_seed_user('b0000009-0000-0000-0000-000000000009', 'dr.ananya@healther.com', 'password123');
SELECT create_seed_user('b0000010-0000-0000-0000-000000000010', 'dr.michael@healther.com', 'password123');
SELECT create_seed_user('b0000011-0000-0000-0000-000000000011', 'fatima.physio@healther.com', 'password123');
SELECT create_seed_user('b0000012-0000-0000-0000-000000000012', 'dr.priya@healther.com', 'password123');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. CREATE PATIENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT create_seed_user('c0000001-0000-0000-0000-000000000001', 'alex.turner@gmail.com', 'password123');
SELECT create_seed_user('c0000002-0000-0000-0000-000000000002', 'sophia.m@gmail.com', 'password123');
SELECT create_seed_user('c0000003-0000-0000-0000-000000000003', 'raj.k@gmail.com', 'password123');
SELECT create_seed_user('c0000004-0000-0000-0000-000000000004', 'emma.w@gmail.com', 'password123');
SELECT create_seed_user('c0000005-0000-0000-0000-000000000005', 'carlos.r@gmail.com', 'password123');
SELECT create_seed_user('c0000006-0000-0000-0000-000000000006', 'aisha.p@gmail.com', 'password123');
SELECT create_seed_user('c0000007-0000-0000-0000-000000000007', 'james.o@gmail.com', 'password123');
SELECT create_seed_user('c0000008-0000-0000-0000-000000000008', 'nina.t@gmail.com', 'password123');

-- Cleanup
DROP FUNCTION create_seed_user;

-- Ensure profiles have the correct emails for identification in the dashboard
UPDATE public.provider_profiles SET email = 'dr.sarah@healther.com' WHERE user_id = 'b0000001-0000-0000-0000-000000000001';
UPDATE public.provider_profiles SET email = 'emily.nurse@healther.com' WHERE user_id = 'b0000002-0000-0000-0000-000000000002';
UPDATE public.provider_profiles SET email = 'maria.care@healther.com' WHERE user_id = 'b0000003-0000-0000-0000-000000000003';
-- ... and so on for others if needed.
