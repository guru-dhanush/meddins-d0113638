
-- Temporarily drop FK constraints to allow seed data
ALTER TABLE profiles DROP CONSTRAINT profiles_user_id_fkey;
ALTER TABLE provider_profiles DROP CONSTRAINT provider_profiles_user_id_fkey;

-- Insert dummy profiles
INSERT INTO profiles (id, user_id, full_name, avatar_url) VALUES
('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Dr. Sarah Johnson', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face'),
('a0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 'Emily Rodriguez', 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face'),
('a0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'Maria Garcia', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&crop=face'),
('a0000004-0000-0000-0000-000000000004', 'b0000004-0000-0000-0000-000000000004', 'Dr. James Williams', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face'),
('a0000005-0000-0000-0000-000000000005', 'b0000005-0000-0000-0000-000000000005', 'Robert Thompson', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face'),
('a0000006-0000-0000-0000-000000000006', 'b0000006-0000-0000-0000-000000000006', 'Linda Patel', 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=400&h=400&fit=crop&crop=face'),
('a0000007-0000-0000-0000-000000000007', 'b0000007-0000-0000-0000-000000000007', 'Dr. David Kim', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face'),
('a0000008-0000-0000-0000-000000000008', 'b0000008-0000-0000-0000-000000000008', 'Patricia Okonkwo', 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop&crop=face');

-- Insert dummy provider profiles
INSERT INTO provider_profiles (id, user_id, provider_type, bio, experience_years, hourly_rate, avg_rating, total_reviews, specializations, city, consultation_fee, is_available) VALUES
('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'doctor', 'Board-certified cardiologist with 15 years in home-based cardiac care. Expert in heart failure management and post-surgery recovery.', 15, 180, 4.9, 63, ARRAY['Cardiology','Heart Failure','Cardiac Rehab'], 'New York', 150, true),
('d0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 'nurse', 'Experienced ICU nurse specializing in post-operative care, wound management, and IV therapy. Compassionate bedside manner.', 8, 75, 4.8, 91, ARRAY['Wound Care','IV Therapy','Post-Op Recovery'], 'Los Angeles', 60, true),
('d0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'caretaker', 'Dedicated elderly caretaker with CPR and first-aid certification. Specializes in dementia care, mobility assistance, and daily living support.', 6, 45, 4.7, 38, ARRAY['Elderly Care','Dementia Care','Mobility Support'], 'Chicago', 35, true),
('d0000004-0000-0000-0000-000000000004', 'b0000004-0000-0000-0000-000000000004', 'doctor', 'Pediatrician with a gentle touch. 10+ years providing in-home check-ups, vaccinations, and developmental screenings for children.', 11, 160, 4.9, 55, ARRAY['Pediatrics','Vaccinations','Child Development'], 'Houston', 130, true),
('d0000005-0000-0000-0000-000000000005', 'b0000005-0000-0000-0000-000000000005', 'nurse', 'Registered nurse with expertise in chronic disease management, diabetes education, and home infusion therapy.', 10, 85, 4.6, 72, ARRAY['Diabetes Care','Infusion Therapy','Chronic Disease'], 'San Francisco', 70, true),
('d0000006-0000-0000-0000-000000000006', 'b0000006-0000-0000-0000-000000000006', 'caretaker', 'Warm and patient caretaker experienced with post-stroke rehabilitation, physical therapy assistance, and companion care.', 4, 40, 4.8, 29, ARRAY['Stroke Rehab','Physical Therapy','Companion Care'], 'Miami', 30, true),
('d0000007-0000-0000-0000-000000000007', 'b0000007-0000-0000-0000-000000000007', 'doctor', 'Orthopedic specialist providing home-based consultations for joint pain, sports injuries, and post-surgical recovery plans.', 14, 190, 4.7, 41, ARRAY['Orthopedics','Sports Medicine','Joint Pain'], 'Boston', 160, true),
('d0000008-0000-0000-0000-000000000008', 'b0000008-0000-0000-0000-000000000008', 'nurse', 'Neonatal nurse with a passion for newborn care. Helps new parents with feeding, bathing, and health monitoring at home.', 7, 80, 4.9, 58, ARRAY['Newborn Care','Lactation Support','Postpartum'], 'Dallas', 65, true);

-- Re-add FK constraints
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE provider_profiles ADD CONSTRAINT provider_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
