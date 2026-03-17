-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Meddin — SEED DATA                                     ║
-- ║  Run AFTER schema.sql — populates with realistic sample data       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Temporarily drop FK constraints to allow seed data without auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_user_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_patient_id_fkey;
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS requirements_patient_id_fkey;
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_requester_id_fkey;
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_receiver_id_fkey;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. DUMMY USER IDs (simulating auth.users)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Providers: b0000001 through b0000012
-- Patients:  c0000001 through c0000008


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. PROFILES (12 providers + 8 patients = 20)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.profiles (user_id, full_name, avatar_url, bio, onboarding_completed) VALUES
-- Providers
('b0000001-0000-0000-0000-000000000001', 'Dr. Sarah Johnson', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face', 'Board-certified cardiologist passionate about preventive heart care.', true),
('b0000002-0000-0000-0000-000000000002', 'Emily Rodriguez', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face', 'Experienced ICU nurse specializing in post-operative care.', true),
('b0000003-0000-0000-0000-000000000003', 'Maria Garcia', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=face', 'Dedicated elderly caretaker with CPR and first-aid certification.', true),
('b0000004-0000-0000-0000-000000000004', 'Dr. James Williams', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face', 'Pediatrician with a gentle touch, 10+ years in-home checkups.', true),
('b0000005-0000-0000-0000-000000000005', 'Robert Thompson', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face', 'RN specializing in chronic disease management and diabetes.', true),
('b0000006-0000-0000-0000-000000000006', 'Linda Patel', 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&h=400&fit=crop&crop=face', 'Warm caretaker experienced in post-stroke rehabilitation.', true),
('b0000007-0000-0000-0000-000000000007', 'Dr. David Kim', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face', 'Orthopedic specialist: joint pain, sports injuries, rehab.', true),
('b0000008-0000-0000-0000-000000000008', 'Patricia Okonkwo', 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop&crop=face', 'Neonatal nurse passionate about newborn care and lactation.', true),
('b0000009-0000-0000-0000-000000000009', 'Dr. Ananya Sharma', 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&h=400&fit=crop&crop=face', 'Dermatologist specializing in acne treatment and skin health.', true),
('b0000010-0000-0000-0000-000000000010', 'Dr. Michael Chen', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face', 'Psychiatrist focused on anxiety, depression, and CBT therapy.', true),
('b0000011-0000-0000-0000-000000000011', 'Fatima Al-Hassan', 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=400&fit=crop&crop=face', 'Physical therapist specializing in sports injury recovery.', true),
('b0000012-0000-0000-0000-000000000012', 'Dr. Priya Reddy', 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&h=400&fit=crop&crop=face', 'General practitioner with 20 years of family medicine experience.', true),
-- Patients
('c0000001-0000-0000-0000-000000000001', 'Alex Turner', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', 'Looking for regular health checkups.', true),
('c0000002-0000-0000-0000-000000000002', 'Sophia Martinez', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face', 'New mom looking for pediatric care.', true),
('c0000003-0000-0000-0000-000000000003', 'Raj Krishnan', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', 'Managing diabetes, need regular nurse visits.', true),
('c0000004-0000-0000-0000-000000000004', 'Emma Wilson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', 'Elder care needed for my grandmother.', true),
('c0000005-0000-0000-0000-000000000005', 'Carlos Rivera', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face', 'Sports injury, need orthopedic consult.', true),
('c0000006-0000-0000-0000-000000000006', 'Aisha Patel', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', 'Skin concerns, looking for a good dermatologist.', true),
('c0000007-0000-0000-0000-000000000007', 'James O''Brien', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face', 'Annual physical and health screening.', true),
('c0000008-0000-0000-0000-000000000008', 'Nina Tanaka', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face', 'Mental health support and counseling.', true)
ON CONFLICT (user_id) DO NOTHING;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. USER ROLES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.user_roles (user_id, role) VALUES
('b0000001-0000-0000-0000-000000000001', 'provider'),
('b0000002-0000-0000-0000-000000000002', 'provider'),
('b0000003-0000-0000-0000-000000000003', 'provider'),
('b0000004-0000-0000-0000-000000000004', 'provider'),
('b0000005-0000-0000-0000-000000000005', 'provider'),
('b0000006-0000-0000-0000-000000000006', 'provider'),
('b0000007-0000-0000-0000-000000000007', 'provider'),
('b0000008-0000-0000-0000-000000000008', 'provider'),
('b0000009-0000-0000-0000-000000000009', 'provider'),
('b0000010-0000-0000-0000-000000000010', 'provider'),
('b0000011-0000-0000-0000-000000000011', 'provider'),
('b0000012-0000-0000-0000-000000000012', 'provider'),
('c0000001-0000-0000-0000-000000000001', 'patient'),
('c0000002-0000-0000-0000-000000000002', 'patient'),
('c0000003-0000-0000-0000-000000000003', 'patient'),
('c0000004-0000-0000-0000-000000000004', 'patient'),
('c0000005-0000-0000-0000-000000000005', 'patient'),
('c0000006-0000-0000-0000-000000000006', 'patient'),
('c0000007-0000-0000-0000-000000000007', 'patient'),
('c0000008-0000-0000-0000-000000000008', 'patient')
ON CONFLICT (user_id, role) DO NOTHING;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. PROVIDER PROFILES (12 providers)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.provider_profiles (
  user_id, provider_type, bio, experience_years, hourly_rate,
  avg_rating, total_reviews, specializations, city, consultation_fee,
  home_visit_fee, languages, accepting_new_patients, is_available,
  latitude, longitude, license_number, gender, verification_status
) VALUES
('b0000001-0000-0000-0000-000000000001', 'doctor',
  'Board-certified cardiologist with 15 years in home-based cardiac care. Expert in heart failure management and post-surgery recovery.',
  15, 180, 4.9, 63, ARRAY['Cardiology','Heart Failure','Cardiac Rehab'],
  'New York', 150, 200, ARRAY['English','Spanish'], true, true,
  40.7128, -74.0060, 'NY-MD-28451', 'female', 'verified'),

('b0000002-0000-0000-0000-000000000002', 'nurse',
  'Experienced ICU nurse specializing in post-operative care, wound management, and IV therapy. Compassionate bedside manner.',
  8, 75, 4.8, 91, ARRAY['Wound Care','IV Therapy','Post-Op Recovery'],
  'Los Angeles', 60, 90, ARRAY['English','Portuguese'], true, true,
  34.0522, -118.2437, 'CA-RN-55129', 'female', 'verified'),

('b0000003-0000-0000-0000-000000000003', 'caretaker',
  'Dedicated elderly caretaker with CPR and first-aid certification. Specializes in dementia care, mobility assistance, and daily living.',
  6, 45, 4.7, 38, ARRAY['Elderly Care','Dementia Care','Mobility Support'],
  'Chicago', 35, 55, ARRAY['English','Spanish'], true, true,
  41.8781, -87.6298, NULL, 'female', 'verified'),

('b0000004-0000-0000-0000-000000000004', 'doctor',
  'Pediatrician with a gentle touch. 10+ years providing in-home check-ups, vaccinations, and developmental screenings.',
  11, 160, 4.9, 55, ARRAY['Pediatrics','Vaccinations','Child Development'],
  'Houston', 130, 180, ARRAY['English'], true, true,
  29.7604, -95.3698, 'TX-MD-33712', 'male', 'verified'),

('b0000005-0000-0000-0000-000000000005', 'nurse',
  'Registered nurse with expertise in chronic disease management, diabetes education, and home infusion therapy.',
  10, 85, 4.6, 72, ARRAY['Diabetes Care','Infusion Therapy','Chronic Disease'],
  'San Francisco', 70, 100, ARRAY['English','Mandarin'], true, true,
  37.7749, -122.4194, 'CA-RN-61847', 'male', 'verified'),

('b0000006-0000-0000-0000-000000000006', 'caretaker',
  'Warm caretaker experienced with post-stroke rehabilitation, physical therapy assistance, and companion care.',
  4, 40, 4.8, 29, ARRAY['Stroke Rehab','Physical Therapy','Companion Care'],
  'Miami', 30, 50, ARRAY['English','Hindi'], true, true,
  25.7617, -80.1918, NULL, 'female', 'verified'),

('b0000007-0000-0000-0000-000000000007', 'doctor',
  'Orthopedic specialist providing home consultations for joint pain, sports injuries, and post-surgical recovery.',
  14, 190, 4.7, 41, ARRAY['Orthopedics','Sports Medicine','Joint Pain'],
  'Boston', 160, 220, ARRAY['English','Korean'], true, true,
  42.3601, -71.0589, 'MA-MD-42156', 'male', 'verified'),

('b0000008-0000-0000-0000-000000000008', 'nurse',
  'Neonatal nurse with a passion for newborn care. Helps new parents with feeding, bathing, and health monitoring.',
  7, 80, 4.9, 58, ARRAY['Newborn Care','Lactation Support','Postpartum'],
  'Dallas', 65, 95, ARRAY['English','French'], true, true,
  32.7767, -96.7970, 'TX-RN-71234', 'female', 'verified'),

('b0000009-0000-0000-0000-000000000009', 'doctor',
  'Dermatologist specializing in acne treatment, eczema management, and cosmetic skin procedures. Teledermatology available.',
  9, 170, 4.8, 47, ARRAY['Dermatology','Acne Treatment','Eczema','Cosmetic'],
  'Mumbai', 120, 170, ARRAY['English','Hindi','Marathi'], true, true,
  19.0760, 72.8777, 'MH-MD-88923', 'female', 'verified'),

('b0000010-0000-0000-0000-000000000010', 'doctor',
  'Psychiatrist focused on anxiety, depression, and CBT therapy. Online and in-person sessions available.',
  12, 200, 4.9, 83, ARRAY['Psychiatry','Anxiety','Depression','CBT'],
  'Bangalore', 140, NULL, ARRAY['English','Mandarin'], true, true,
  12.9716, 77.5946, 'KA-MD-44521', 'male', 'verified'),

('b0000011-0000-0000-0000-000000000011', 'nurse',
  'Physical therapist specializing in sports injury recovery, mobility training, and post-surgical rehabilitation.',
  5, 70, 4.7, 34, ARRAY['Physical Therapy','Sports Recovery','Mobility Training'],
  'Delhi', 55, 80, ARRAY['English','Arabic','Hindi'], true, true,
  28.6139, 77.2090, 'DL-PT-12890', 'female', 'verified'),

('b0000012-0000-0000-0000-000000000012', 'doctor',
  'General practitioner with 20 years of family medicine. Preventive care, health screenings, and chronic disease management.',
  20, 150, 4.8, 112, ARRAY['General Medicine','Preventive Care','Family Medicine'],
  'Chennai', 100, 150, ARRAY['English','Telugu','Tamil'], true, true,
  13.0827, 80.2707, 'TN-MD-19045', 'female', 'verified')
ON CONFLICT (user_id) DO NOTHING;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. SERVICES (2-3 per provider)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.services (provider_id, name, description, price, duration_minutes) VALUES
-- Dr. Sarah Johnson (cardiologist)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 'Cardiac Consultation', 'Full cardiac assessment, ECG review, and treatment plan.', 150.00, 45),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 'Heart Health Screening', 'Comprehensive heart health check with risk assessment.', 200.00, 60),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 'Follow-up Visit', 'Post-treatment follow-up and medication review.', 80.00, 20),
-- Emily Rodriguez (nurse)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000002-0000-0000-0000-000000000002'), 'Wound Care Session', 'Professional wound cleaning, dressing, and monitoring.', 60.00, 30),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000002-0000-0000-0000-000000000002'), 'IV Therapy', 'Home IV infusion and hydration therapy.', 90.00, 60),
-- Maria Garcia (caretaker)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000003-0000-0000-0000-000000000003'), 'Daily Care (4 hours)', 'Bathing, meal prep, medication reminders, companionship.', 120.00, 240),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000003-0000-0000-0000-000000000003'), 'Overnight Care', 'Full night supervision and assistance.', 200.00, 480),
-- Dr. James Williams (pediatrician)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 'Pediatric Checkup', 'Routine well-child exam and developmental screening.', 130.00, 30),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 'Vaccination Visit', 'Age-appropriate vaccinations with parent counseling.', 100.00, 20),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 'Sick Child Visit', 'Assessment and treatment for common childhood illnesses.', 140.00, 30),
-- Robert Thompson (nurse)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000005-0000-0000-0000-000000000005'), 'Diabetes Management', 'Blood sugar monitoring, insulin education, and meal planning.', 70.00, 45),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000005-0000-0000-0000-000000000005'), 'Health Education', 'Personalized chronic disease education and lifestyle coaching.', 65.00, 40),
-- Dr. David Kim (orthopedic)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000007-0000-0000-0000-000000000007'), 'Joint Pain Consultation', 'Assessment, X-ray review, and treatment for joint pain.', 160.00, 40),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000007-0000-0000-0000-000000000007'), 'Sports Injury Eval', 'MRI review, diagnosis, and recovery plan for sports injuries.', 180.00, 45),
-- Dr. Ananya Sharma (dermatologist)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 'Skin Consultation', 'Comprehensive skin exam and treatment plan.', 120.00, 30),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 'Acne Treatment Plan', 'Personalized acne treatment with prescription.', 150.00, 30),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 'Teledermatology', 'Video consultation for skin concerns.', 80.00, 20),
-- Dr. Michael Chen (psychiatrist)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 'Initial Assessment', 'Comprehensive psychiatric evaluation (90 min).', 250.00, 90),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 'Therapy Session', 'CBT-based talk therapy session.', 140.00, 50),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 'Medication Review', 'Follow-up for medication management.', 100.00, 20),
-- Dr. Priya Reddy (GP)
((SELECT id FROM provider_profiles WHERE user_id = 'b0000012-0000-0000-0000-000000000012'), 'General Checkup', 'Annual health screening and blood work review.', 100.00, 30),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000012-0000-0000-0000-000000000012'), 'Preventive Health Package', 'Full body checkup with lab tests and consultation.', 250.00, 60);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. AVAILABILITY (sample slots)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.availability (provider_id, day_of_week, start_time, end_time) VALUES
-- Dr. Sarah Johnson: Mon-Fri 9am-5pm
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 1, '09:00', '17:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 2, '09:00', '17:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 3, '09:00', '17:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 4, '09:00', '17:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000001-0000-0000-0000-000000000001'), 5, '09:00', '17:00'),
-- Emily Rodriguez: Mon-Wed-Fri 8am-4pm
((SELECT id FROM provider_profiles WHERE user_id = 'b0000002-0000-0000-0000-000000000002'), 1, '08:00', '16:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000002-0000-0000-0000-000000000002'), 3, '08:00', '16:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000002-0000-0000-0000-000000000002'), 5, '08:00', '16:00'),
-- Dr. James Williams: Mon-Thu 10am-6pm
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 1, '10:00', '18:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 2, '10:00', '18:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 3, '10:00', '18:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000004-0000-0000-0000-000000000004'), 4, '10:00', '18:00'),
-- Dr. Ananya Sharma: Mon-Sat 9am-1pm
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 1, '09:00', '13:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 2, '09:00', '13:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 3, '09:00', '13:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 4, '09:00', '13:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 5, '09:00', '13:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000009-0000-0000-0000-000000000009'), 6, '09:00', '13:00'),
-- Dr. Michael Chen: Tue-Sat 11am-7pm
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 2, '11:00', '19:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 3, '11:00', '19:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 4, '11:00', '19:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 5, '11:00', '19:00'),
((SELECT id FROM provider_profiles WHERE user_id = 'b0000010-0000-0000-0000-000000000010'), 6, '11:00', '19:00');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. POSTS (Social Feed — 15 posts)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.posts (user_id, content, category, likes_count, comments_count, created_at) VALUES
('b0000001-0000-0000-0000-000000000001',
  '🫀 Did you know that walking 30 minutes a day can reduce your risk of heart disease by 35%? Small steps lead to big changes! #HeartHealth #Prevention',
  'health-tips', 24, 5, now() - interval '2 days'),

('b0000004-0000-0000-0000-000000000004',
  '🧒 Reminder: Children ages 4-6 should get their booster shots! Don''t let vaccine schedules slip during busy seasons. Your pediatrician is here to help. #Pediatrics',
  'health-tips', 18, 3, now() - interval '3 days'),

('c0000002-0000-0000-0000-000000000002',
  'So grateful for the amazing care my baby received from Patricia! She made the transition to parenthood so much smoother. Highly recommend! 💛 #NewMom',
  'experience', 31, 7, now() - interval '1 day'),

('b0000009-0000-0000-0000-000000000009',
  '☀️ SPF is not optional! Even on cloudy days, UV rays can damage your skin. Apply SPF 30+ every morning, and reapply every 2 hours if outdoors. #SkinCare #Dermatology',
  'health-tips', 42, 8, now() - interval '4 days'),

('b0000010-0000-0000-0000-000000000010',
  '🧠 Mental health is health. If you''ve been feeling overwhelmed, anxious, or low for more than 2 weeks, please reach out. You don''t have to face it alone. #MentalHealth',
  'wellness', 56, 12, now() - interval '5 days'),

('c0000005-0000-0000-0000-000000000005',
  'After my ACL tear, I thought I''d never play football again. Dr. Kim created an incredible recovery plan. 8 months later, I''m back on the field! 🏈💪',
  'experience', 38, 9, now() - interval '6 days'),

('b0000005-0000-0000-0000-000000000005',
  '📊 Type 2 diabetes is reversible in many cases with the right diet and exercise plan! If you''ve been newly diagnosed, don''t lose hope. Book a consult and let''s talk. #Diabetes',
  'health-tips', 27, 4, now() - interval '7 days'),

('b0000012-0000-0000-0000-000000000012',
  '🏥 Annual health checkups save lives! Most serious conditions are treatable when caught early. When was your last full-body checkup? #PreventiveCare',
  'health-tips', 33, 6, now() - interval '8 days'),

('c0000008-0000-0000-0000-000000000008',
  'Started therapy with Dr. Chen 3 months ago. Learning CBT techniques has genuinely changed how I handle stress and anxiety. If you''re on the fence — just go. 🌱',
  'experience', 49, 11, now() - interval '2 days'),

('b0000002-0000-0000-0000-000000000002',
  '🩹 Wound care tip: Keep wounds moist, not dry! Moist wound healing is 3-5x faster than dry healing. Always use a clean dressing and consult if signs of infection appear.',
  'health-tips', 15, 2, now() - interval '9 days'),

('b0000011-0000-0000-0000-000000000011',
  '🏃‍♀️ Runner''s knee? Don''t push through the pain! REST, then strengthen. I see so many athletes who delay treatment and end up needing surgery. Early physio = faster recovery.',
  'health-tips', 22, 4, now() - interval '3 days'),

('c0000003-0000-0000-0000-000000000003',
  'Robert helped me understand my glucose readings and completely changed my meal plan. My HbA1c dropped from 8.2 to 6.5 in 4 months! 📉🎉 #DiabetesManagement',
  'experience', 35, 6, now() - interval '10 days'),

('b0000007-0000-0000-0000-000000000007',
  '🦴 Knee pain when climbing stairs? It might not be arthritis! Many causes are treatable without surgery. Book a consultation before jumping to conclusions.',
  'health-tips', 19, 3, now() - interval '4 days'),

('c0000006-0000-0000-0000-000000000006',
  'Dr. Ananya is incredible! My persistent acne finally cleared up after following her personalized treatment plan. Wish I had gone sooner. ✨ #ClearSkin',
  'experience', 28, 5, now() - interval '5 days'),

('b0000003-0000-0000-0000-000000000003',
  '❤️ Caring for a loved one with dementia? Routine is everything. Consistent meal times, familiar music, and gentle reminders create a sense of security. #CaregiverTips',
  'wellness', 20, 3, now() - interval '11 days');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. REQUIREMENTS (Patient job postings — 5)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.requirements (patient_id, title, description, provider_type, location, duration_type, budget_range, status) VALUES
('c0000004-0000-0000-0000-000000000004',
  'Live-in Caretaker for Elderly Grandmother',
  'Looking for an experienced caretaker for my 82-year-old grandmother with mild dementia. Need someone patient, reliable, and trained in dementia care. 6am-6pm, Mon-Sat.',
  'caretaker', 'Chicago, IL', 'recurring', '₹25,000-35,000/month', 'open'),

('c0000002-0000-0000-0000-000000000002',
  'Pediatrician for Newborn — Home Visits',
  'First-time mom, need a pediatrician for monthly well-baby check-ups at home. Baby is 2 months old. Prefer female doctor comfortable with newborns.',
  'doctor', 'Houston, TX', 'recurring', '₹100-150/visit', 'open'),

('c0000003-0000-0000-0000-000000000003',
  'Nurse for Weekly Diabetes Monitoring',
  'Type 2 diabetic, need a nurse for weekly blood sugar checks, medication review, and diet counseling. Prefer someone experienced with insulin management.',
  'nurse', 'San Francisco, CA', 'recurring', '₹60-80/visit', 'open'),

('c0000005-0000-0000-0000-000000000005',
  'Orthopedic Follow-up After ACL Surgery',
  'Had ACL reconstruction surgery 2 weeks ago. Need an orthopedic specialist for home follow-up visits and physio guidance for the next 3 months.',
  'doctor', 'Boston, MA', 'recurring', '₹150-200/visit', 'open'),

('c0000006-0000-0000-0000-000000000006',
  'Dermatologist for Persistent Eczema',
  'Dealing with chronic eczema on hands and arms. Need a dermatologist for an initial evaluation and ongoing treatment plan. Teledermatology preferred.',
  'doctor', 'Mumbai, India', 'one-time', '₹100-150/visit', 'open');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. CONNECTIONS (Some accepted, some pending)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.connections (requester_id, receiver_id, status) VALUES
('c0000002-0000-0000-0000-000000000002', 'b0000008-0000-0000-0000-000000000008', 'accepted'),
('c0000003-0000-0000-0000-000000000003', 'b0000005-0000-0000-0000-000000000005', 'accepted'),
('c0000005-0000-0000-0000-000000000005', 'b0000007-0000-0000-0000-000000000007', 'accepted'),
('c0000006-0000-0000-0000-000000000006', 'b0000009-0000-0000-0000-000000000009', 'accepted'),
('c0000008-0000-0000-0000-000000000008', 'b0000010-0000-0000-0000-000000000010', 'accepted'),
('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'pending'),
('c0000004-0000-0000-0000-000000000004', 'b0000003-0000-0000-0000-000000000003', 'pending'),
('c0000007-0000-0000-0000-000000000007', 'b0000012-0000-0000-0000-000000000012', 'pending'),
('b0000001-0000-0000-0000-000000000001', 'b0000007-0000-0000-0000-000000000007', 'accepted'),
('b0000002-0000-0000-0000-000000000002', 'b0000005-0000-0000-0000-000000000005', 'accepted')
ON CONFLICT (requester_id, receiver_id) DO NOTHING;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. RE-ADD FK CONSTRAINTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.provider_profiles ADD CONSTRAINT provider_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.requirements ADD CONSTRAINT requirements_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.connections ADD CONSTRAINT connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.connections ADD CONSTRAINT connections_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;


-- Done! 🎉
-- 20 users (12 providers + 8 patients)
-- 12 provider profiles with specializations, ratings, and geo data
-- 22 services across multiple providers
-- 23 availability slots
-- 15 social feed posts
-- 5 patient requirements
-- 10 connections
