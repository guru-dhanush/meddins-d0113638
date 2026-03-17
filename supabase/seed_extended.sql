-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Healther — EXTENDED SEED DATA (Part 1)                  ║
-- ║  Run AFTER seed.sql                                               ║
-- ║  Adds: rich profiles, bookings, reviews, conversations, messages  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Drop FK constraints to allow seed data with dummy user IDs
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_patient_id_fkey;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. ENRICH PROFILES (education, skills, work_experience, certifications)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATE public.profiles SET
  education = '[{"degree":"MD","institution":"Johns Hopkins University","year":2009},{"degree":"Cardiology Fellowship","institution":"Mayo Clinic","year":2012}]'::jsonb,
  certifications = '[{"name":"ABIM Board Certified - Cardiology","year":2012},{"name":"ACLS Certified","year":2023}]'::jsonb,
  skills = ARRAY['Cardiac Assessment','ECG Interpretation','Heart Failure Management','Preventive Cardiology'],
  work_experience = '[{"role":"Attending Cardiologist","company":"NYC Heart Center","from":"2012","to":"present"},{"role":"Cardiology Fellow","company":"Mayo Clinic","from":"2009","to":"2012"}]'::jsonb
WHERE user_id = 'b0000001-0000-0000-0000-000000000001';

UPDATE public.profiles SET
  education = '[{"degree":"BSN","institution":"UCLA School of Nursing","year":2016}]'::jsonb,
  certifications = '[{"name":"RN License - California","year":2016},{"name":"CCRN Certified","year":2019}]'::jsonb,
  skills = ARRAY['Wound Care','IV Therapy','Post-Op Recovery','Patient Education','Vital Signs'],
  work_experience = '[{"role":"ICU Nurse","company":"Cedars-Sinai Medical Center","from":"2016","to":"2022"},{"role":"Home Health Nurse","company":"Self-Employed","from":"2022","to":"present"}]'::jsonb
WHERE user_id = 'b0000002-0000-0000-0000-000000000002';

UPDATE public.profiles SET
  education = '[{"degree":"CNA Certification","institution":"Chicago Health Academy","year":2018}]'::jsonb,
  certifications = '[{"name":"CPR & First Aid","year":2024},{"name":"Dementia Care Specialist","year":2020}]'::jsonb,
  skills = ARRAY['Elderly Care','Dementia Support','Mobility Assistance','Meal Preparation','Medication Reminders'],
  work_experience = '[{"role":"Senior Caretaker","company":"Comfort Home Care","from":"2018","to":"present"}]'::jsonb
WHERE user_id = 'b0000003-0000-0000-0000-000000000003';

UPDATE public.profiles SET
  education = '[{"degree":"MD","institution":"Baylor College of Medicine","year":2011},{"degree":"Pediatrics Residency","institution":"Texas Children Hospital","year":2014}]'::jsonb,
  certifications = '[{"name":"ABP Board Certified","year":2014},{"name":"PALS Certified","year":2024}]'::jsonb,
  skills = ARRAY['Pediatric Care','Vaccinations','Developmental Screening','Newborn Assessment'],
  work_experience = '[{"role":"Pediatrician","company":"Houston Kids Clinic","from":"2014","to":"present"}]'::jsonb
WHERE user_id = 'b0000004-0000-0000-0000-000000000004';

UPDATE public.profiles SET
  education = '[{"degree":"BSN","institution":"UCSF School of Nursing","year":2014}]'::jsonb,
  certifications = '[{"name":"RN License - California","year":2014},{"name":"Certified Diabetes Educator","year":2018}]'::jsonb,
  skills = ARRAY['Diabetes Management','Insulin Education','Chronic Disease','IV Infusion','Patient Counseling'],
  work_experience = '[{"role":"Diabetes Care Nurse","company":"SF General Hospital","from":"2014","to":"2020"},{"role":"Home Health Nurse","company":"Self-Employed","from":"2020","to":"present"}]'::jsonb
WHERE user_id = 'b0000005-0000-0000-0000-000000000005';

UPDATE public.profiles SET
  education = '[{"degree":"MBBS","institution":"Stanford University","year":2008},{"degree":"Orthopedics Residency","institution":"Mass General Hospital","year":2013}]'::jsonb,
  certifications = '[{"name":"ABOS Board Certified","year":2013},{"name":"Sports Medicine Certification","year":2015}]'::jsonb,
  skills = ARRAY['Joint Replacement','Sports Injuries','Fracture Care','Rehabilitation','Arthroscopy'],
  work_experience = '[{"role":"Orthopedic Surgeon","company":"Boston Ortho Group","from":"2013","to":"present"}]'::jsonb
WHERE user_id = 'b0000007-0000-0000-0000-000000000007';

UPDATE public.profiles SET
  education = '[{"degree":"MBBS","institution":"AIIMS Delhi","year":2015},{"degree":"MD Dermatology","institution":"KEM Hospital Mumbai","year":2018}]'::jsonb,
  certifications = '[{"name":"Indian Board of Dermatology","year":2018},{"name":"Cosmetic Dermatology Certificate","year":2020}]'::jsonb,
  skills = ARRAY['Acne Treatment','Eczema','Skin Cancer Screening','Cosmetic Procedures','Teledermatology'],
  work_experience = '[{"role":"Consultant Dermatologist","company":"Mumbai Skin Clinic","from":"2018","to":"present"}]'::jsonb
WHERE user_id = 'b0000009-0000-0000-0000-000000000009';

UPDATE public.profiles SET
  education = '[{"degree":"MD","institution":"Peking University","year":2012},{"degree":"Psychiatry Residency","institution":"NIMHANS Bangalore","year":2016}]'::jsonb,
  certifications = '[{"name":"Indian Psychiatric Society Member","year":2016},{"name":"CBT Certification","year":2018}]'::jsonb,
  skills = ARRAY['CBT Therapy','Anxiety Disorders','Depression','PTSD','Medication Management'],
  work_experience = '[{"role":"Consultant Psychiatrist","company":"MindWell Clinic Bangalore","from":"2016","to":"present"}]'::jsonb
WHERE user_id = 'b0000010-0000-0000-0000-000000000010';

UPDATE public.profiles SET
  education = '[{"degree":"MBBS","institution":"Madras Medical College","year":2004},{"degree":"MD General Medicine","institution":"CMC Vellore","year":2007}]'::jsonb,
  certifications = '[{"name":"MCI Registration","year":2004},{"name":"Preventive Medicine Certificate","year":2015}]'::jsonb,
  skills = ARRAY['Family Medicine','Preventive Care','Health Screening','Chronic Disease','Geriatric Care'],
  work_experience = '[{"role":"Senior GP","company":"Apollo Clinics Chennai","from":"2007","to":"2015"},{"role":"Independent Practitioner","company":"Dr Priya Family Care","from":"2015","to":"present"}]'::jsonb
WHERE user_id = 'b0000012-0000-0000-0000-000000000012';

-- Update provider consultation_modes
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person','video'] WHERE user_id = 'b0000001-0000-0000-0000-000000000001';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person'] WHERE user_id = 'b0000002-0000-0000-0000-000000000002';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person'] WHERE user_id = 'b0000003-0000-0000-0000-000000000003';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person','video'] WHERE user_id = 'b0000004-0000-0000-0000-000000000004';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person','video'] WHERE user_id = 'b0000005-0000-0000-0000-000000000005';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person'] WHERE user_id = 'b0000006-0000-0000-0000-000000000006';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person','video'] WHERE user_id = 'b0000007-0000-0000-0000-000000000007';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person'] WHERE user_id = 'b0000008-0000-0000-0000-000000000008';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person','video','chat'] WHERE user_id = 'b0000009-0000-0000-0000-000000000009';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['video','chat'] WHERE user_id = 'b0000010-0000-0000-0000-000000000010';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person'] WHERE user_id = 'b0000011-0000-0000-0000-000000000011';
UPDATE public.provider_profiles SET consultation_modes = ARRAY['in-person','video'] WHERE user_id = 'b0000012-0000-0000-0000-000000000012';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. BOOKINGS (mix of completed, upcoming, pending, cancelled)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.bookings (patient_id, provider_id, service_id, booking_date, booking_time, status, notes, health_concern, total_price, created_at) VALUES
-- Completed bookings (for reviews)
('c0000002-0000-0000-0000-000000000002',
 (SELECT id FROM provider_profiles WHERE user_id='b0000004-0000-0000-0000-000000000004'),
 (SELECT id FROM services WHERE name='Pediatric Checkup' LIMIT 1),
 (CURRENT_DATE - 30), '10:00 AM', 'completed', 'Routine 6-month checkup', 'Well-baby visit', 130.00, now() - interval '31 days'),

('c0000002-0000-0000-0000-000000000002',
 (SELECT id FROM provider_profiles WHERE user_id='b0000008-0000-0000-0000-000000000008'),
 NULL, (CURRENT_DATE - 20), '2:00 PM', 'completed', 'Lactation support session', 'Breastfeeding difficulties', 65.00, now() - interval '21 days'),

('c0000003-0000-0000-0000-000000000003',
 (SELECT id FROM provider_profiles WHERE user_id='b0000005-0000-0000-0000-000000000005'),
 (SELECT id FROM services WHERE name='Diabetes Management' LIMIT 1),
 (CURRENT_DATE - 14), '9:00 AM', 'completed', 'Weekly glucose check', 'Blood sugar monitoring', 70.00, now() - interval '15 days'),

('c0000005-0000-0000-0000-000000000005',
 (SELECT id FROM provider_profiles WHERE user_id='b0000007-0000-0000-0000-000000000007'),
 (SELECT id FROM services WHERE name='Sports Injury Eval' LIMIT 1),
 (CURRENT_DATE - 45), '11:00 AM', 'completed', 'ACL tear evaluation', 'Right knee ACL tear from football', 180.00, now() - interval '46 days'),

('c0000006-0000-0000-0000-000000000006',
 (SELECT id FROM provider_profiles WHERE user_id='b0000009-0000-0000-0000-000000000009'),
 (SELECT id FROM services WHERE name='Acne Treatment Plan' LIMIT 1),
 (CURRENT_DATE - 10), '9:30 AM', 'completed', 'Follow-up on treatment', 'Persistent cystic acne', 150.00, now() - interval '11 days'),

('c0000008-0000-0000-0000-000000000008',
 (SELECT id FROM provider_profiles WHERE user_id='b0000010-0000-0000-0000-000000000010'),
 (SELECT id FROM services WHERE name='Initial Assessment' LIMIT 1),
 (CURRENT_DATE - 60), '3:00 PM', 'completed', 'Initial psychiatric evaluation', 'Anxiety and work stress', 250.00, now() - interval '61 days'),

('c0000008-0000-0000-0000-000000000008',
 (SELECT id FROM provider_profiles WHERE user_id='b0000010-0000-0000-0000-000000000010'),
 (SELECT id FROM services WHERE name='Therapy Session' LIMIT 1),
 (CURRENT_DATE - 7), '4:00 PM', 'completed', 'CBT session #8', 'Ongoing anxiety management', 140.00, now() - interval '8 days'),

('c0000001-0000-0000-0000-000000000001',
 (SELECT id FROM provider_profiles WHERE user_id='b0000012-0000-0000-0000-000000000012'),
 (SELECT id FROM services WHERE name='General Checkup' LIMIT 1),
 (CURRENT_DATE - 25), '10:30 AM', 'completed', 'Annual physical', 'Routine health screening', 100.00, now() - interval '26 days'),

('c0000001-0000-0000-0000-000000000001',
 (SELECT id FROM provider_profiles WHERE user_id='b0000001-0000-0000-0000-000000000001'),
 (SELECT id FROM services WHERE name='Heart Health Screening' LIMIT 1),
 (CURRENT_DATE - 15), '2:00 PM', 'completed', 'Referred by GP', 'Family history of heart disease', 200.00, now() - interval '16 days'),

-- Upcoming bookings
('c0000003-0000-0000-0000-000000000003',
 (SELECT id FROM provider_profiles WHERE user_id='b0000005-0000-0000-0000-000000000005'),
 (SELECT id FROM services WHERE name='Diabetes Management' LIMIT 1),
 (CURRENT_DATE + 3), '9:00 AM', 'confirmed', 'Weekly glucose check', 'Ongoing diabetes monitoring', 70.00, now()),

('c0000002-0000-0000-0000-000000000002',
 (SELECT id FROM provider_profiles WHERE user_id='b0000004-0000-0000-0000-000000000004'),
 (SELECT id FROM services WHERE name='Vaccination Visit' LIMIT 1),
 (CURRENT_DATE + 7), '11:00 AM', 'confirmed', '9-month vaccination', 'DTaP booster', 100.00, now()),

('c0000008-0000-0000-0000-000000000008',
 (SELECT id FROM provider_profiles WHERE user_id='b0000010-0000-0000-0000-000000000010'),
 (SELECT id FROM services WHERE name='Therapy Session' LIMIT 1),
 (CURRENT_DATE + 5), '4:00 PM', 'confirmed', 'CBT session #9', 'Anxiety management', 140.00, now()),

-- Pending bookings
('c0000007-0000-0000-0000-000000000007',
 (SELECT id FROM provider_profiles WHERE user_id='b0000012-0000-0000-0000-000000000012'),
 (SELECT id FROM services WHERE name='Preventive Health Package' LIMIT 1),
 (CURRENT_DATE + 10), '10:00 AM', 'pending', 'Full body checkup', 'Annual health screening', 250.00, now()),

('c0000004-0000-0000-0000-000000000004',
 (SELECT id FROM provider_profiles WHERE user_id='b0000003-0000-0000-0000-000000000003'),
 (SELECT id FROM services WHERE name='Daily Care (4 hours)' LIMIT 1),
 (CURRENT_DATE + 2), '8:00 AM', 'pending', 'Trial day for grandmother care', 'Dementia care assessment', 120.00, now()),

-- Cancelled booking
('c0000005-0000-0000-0000-000000000005',
 (SELECT id FROM provider_profiles WHERE user_id='b0000007-0000-0000-0000-000000000007'),
 (SELECT id FROM services WHERE name='Joint Pain Consultation' LIMIT 1),
 (CURRENT_DATE - 5), '1:00 PM', 'cancelled', 'Patient rescheduled', 'Follow-up postponed', 160.00, now() - interval '10 days');

-- Re-add FK constraint (NOT VALID to skip checking seed data)
ALTER TABLE public.bookings ADD CONSTRAINT bookings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
