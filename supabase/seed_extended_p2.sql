-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Healther — EXTENDED SEED DATA (Part 2)                  ║
-- ║  Run AFTER seed_extended.sql (Part 1)                             ║
-- ║  Adds: reviews, post_likes, post_comments,                       ║
-- ║        requirement_responses                                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Drop FK constraints to allow seed data with dummy user IDs
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_patient_id_fkey;
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE public.requirement_responses DROP CONSTRAINT IF EXISTS requirement_responses_provider_id_fkey;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. REVIEWS (for completed bookings)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 5,
  'Dr. Williams is amazing with kids! My baby was so comfortable during the checkup. Highly recommend!',
  b.created_at + interval '1 day'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000004-0000-0000-0000-000000000004'
  AND b.status = 'completed' LIMIT 1;

INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 5,
  'Robert completely changed my approach to diabetes management. My HbA1c dropped significantly!',
  b.created_at + interval '1 day'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000005-0000-0000-0000-000000000005'
  AND b.status = 'completed' LIMIT 1;

INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 5,
  'Incredible recovery plan after my ACL tear. Dr. Kim is thorough and genuinely cares about your progress.',
  b.created_at + interval '2 days'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000007-0000-0000-0000-000000000007'
  AND b.status = 'completed' LIMIT 1;

INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 5,
  'My persistent acne finally cleared up after following Dr. Ananya''s treatment plan. Life-changing!',
  b.created_at + interval '1 day'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000009-0000-0000-0000-000000000009'
  AND b.status = 'completed' LIMIT 1;

INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 5,
  'Dr. Chen is incredibly empathetic. CBT sessions have genuinely transformed how I handle stress and anxiety.',
  b.created_at + interval '1 day'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000010-0000-0000-0000-000000000010'
  AND b.patient_id = 'c0000008-0000-0000-0000-000000000008'
  AND b.status = 'completed'
ORDER BY b.booking_date ASC LIMIT 1;

INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 4,
  'Very solid annual checkup. Dr. Priya is thorough and explains everything clearly. Recommended!',
  b.created_at + interval '1 day'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000012-0000-0000-0000-000000000012'
  AND b.status = 'completed' LIMIT 1;

INSERT INTO public.reviews (booking_id, patient_id, provider_id, rating, comment, created_at)
SELECT b.id, b.patient_id, b.provider_id, 5,
  'Dr. Sarah identified a minor heart issue early that my previous doctor missed. Truly grateful for her expertise.',
  b.created_at + interval '2 days'
FROM bookings b
JOIN provider_profiles pp ON pp.id = b.provider_id
WHERE pp.user_id = 'b0000001-0000-0000-0000-000000000001'
  AND b.status = 'completed' LIMIT 1;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. POST LIKES (spread across users)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE
  post_rec RECORD;
  user_ids UUID[] := ARRAY[
    'c0000001-0000-0000-0000-000000000001','c0000002-0000-0000-0000-000000000002',
    'c0000003-0000-0000-0000-000000000003','c0000004-0000-0000-0000-000000000004',
    'c0000005-0000-0000-0000-000000000005','c0000006-0000-0000-0000-000000000006',
    'c0000007-0000-0000-0000-000000000007','c0000008-0000-0000-0000-000000000008',
    'b0000001-0000-0000-0000-000000000001','b0000002-0000-0000-0000-000000000002',
    'b0000004-0000-0000-0000-000000000004','b0000007-0000-0000-0000-000000000007',
    'b0000009-0000-0000-0000-000000000009','b0000010-0000-0000-0000-000000000010'
  ];
  uid UUID;
  i INT := 0;
BEGIN
  FOR post_rec IN SELECT id, user_id FROM posts ORDER BY created_at DESC LOOP
    FOREACH uid IN ARRAY user_ids LOOP
      i := i + 1;
      IF uid != post_rec.user_id AND (i % 3 != 0) THEN
        INSERT INTO post_likes (post_id, user_id) VALUES (post_rec.id, uid) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;
-- Recalculate likes_count
UPDATE posts SET likes_count = (SELECT count(*) FROM post_likes WHERE post_likes.post_id = posts.id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. POST COMMENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
DECLARE
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID;
BEGIN
  SELECT id INTO p1 FROM posts WHERE content LIKE '%heart disease%' LIMIT 1;
  SELECT id INTO p2 FROM posts WHERE content LIKE '%CBT techniques%' LIMIT 1;
  SELECT id INTO p3 FROM posts WHERE content LIKE '%ACL tear%' LIMIT 1;
  SELECT id INTO p4 FROM posts WHERE content LIKE '%SPF%' LIMIT 1;
  SELECT id INTO p5 FROM posts WHERE content LIKE '%Mental health is health%' LIMIT 1;

  INSERT INTO post_comments (post_id, user_id, content, created_at) VALUES
  (p1, 'c0000001-0000-0000-0000-000000000001', 'This is so true! Started walking daily 3 months ago and my blood pressure dropped. 🙏', now() - interval '1 day 3 hours'),
  (p1, 'c0000004-0000-0000-0000-000000000004', 'My grandmother does chair exercises and it helps a lot too!', now() - interval '1 day 1 hour'),
  (p1, 'b0000005-0000-0000-0000-000000000005', 'Great advice Dr. Sarah! I always recommend this to my diabetes patients as well.', now() - interval '23 hours'),

  (p2, 'c0000006-0000-0000-0000-000000000006', 'So happy for you Nina! I''m thinking of starting therapy too.', now() - interval '1 day 5 hours'),
  (p2, 'b0000010-0000-0000-0000-000000000010', 'Thank you for sharing your experience! It means a lot. 💚', now() - interval '1 day 2 hours'),
  (p2, 'c0000003-0000-0000-0000-000000000003', 'Needed to hear this today. Booking an appointment!', now() - interval '20 hours'),

  (p3, 'b0000007-0000-0000-0000-000000000007', 'So proud of your recovery Carlos! Keep up the rehab exercises. 💪', now() - interval '5 days 3 hours'),
  (p3, 'c0000001-0000-0000-0000-000000000001', 'What an inspiring journey! Sports injuries can be brutal.', now() - interval '5 days 1 hour'),
  (p3, 'b0000011-0000-0000-0000-000000000011', 'This is why early physio is so important. Amazing result!', now() - interval '4 days 20 hours'),

  (p4, 'c0000006-0000-0000-0000-000000000006', 'Learned this the hard way! SPF is non-negotiable now.', now() - interval '3 days 4 hours'),
  (p4, 'c0000002-0000-0000-0000-000000000002', 'What SPF brand do you recommend for babies?', now() - interval '3 days 2 hours'),
  (p4, 'b0000009-0000-0000-0000-000000000009', '@Sophia — For babies under 6 months, use shade + clothing. After 6 months, mineral sunscreen SPF 30+!', now() - interval '3 days 1 hour'),

  (p5, 'c0000008-0000-0000-0000-000000000008', '100% agree. Taking the first step was the hardest but best decision I made.', now() - interval '4 days 6 hours'),
  (p5, 'c0000001-0000-0000-0000-000000000001', 'The stigma around therapy needs to end. Thanks for posting this.', now() - interval '4 days 3 hours'),
  (p5, 'c0000004-0000-0000-0000-000000000004', 'Shared this with my family. So important. 🙌', now() - interval '4 days 1 hour');
END $$;
-- Recalculate comments_count
UPDATE posts SET comments_count = (SELECT count(*) FROM post_comments WHERE post_comments.post_id = posts.id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. REQUIREMENT RESPONSES (providers responding to patient job postings)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.requirement_responses (requirement_id, provider_id, message) VALUES
((SELECT id FROM requirements WHERE title LIKE '%Live-in Caretaker%' LIMIT 1),
 'b0000003-0000-0000-0000-000000000003',
 'Hi Emma! I have 6 years of experience in elderly and dementia care. I''m CPR certified and available Mon-Sat. Would love to schedule a trial day to meet your grandmother.'),

((SELECT id FROM requirements WHERE title LIKE '%Live-in Caretaker%' LIMIT 1),
 'b0000006-0000-0000-0000-000000000006',
 'Hello! I specialize in post-stroke rehab and companion care. I''m patient and experienced with elderly clients. Let me know if you''d like to chat!'),

((SELECT id FROM requirements WHERE title LIKE '%Pediatrician%Newborn%' LIMIT 1),
 'b0000004-0000-0000-0000-000000000004',
 'Hi Sophia! Congratulations on the baby! I do monthly home visits for newborns and would be happy to set up a schedule. My rate is $130/visit for well-baby checkups.'),

((SELECT id FROM requirements WHERE title LIKE '%Nurse for Weekly Diabetes%' LIMIT 1),
 'b0000005-0000-0000-0000-000000000005',
 'Hi Raj! I''m a certified diabetes educator with 10 years of experience. I can do weekly visits for glucose checks, insulin review, and meal planning at $70/session.'),

((SELECT id FROM requirements WHERE title LIKE '%Orthopedic Follow-up%' LIMIT 1),
 'b0000007-0000-0000-0000-000000000007',
 'Carlos, I saw your post. I specialize in post-surgical ACL recovery and can do home visits. Let''s discuss a physio plan that gets you back to 100%.'),

((SELECT id FROM requirements WHERE title LIKE '%Dermatologist%Eczema%' LIMIT 1),
 'b0000009-0000-0000-0000-000000000009',
 'Hi Aisha! Chronic eczema can be tough. I offer teledermatology sessions at ₹80/visit — we can start with an evaluation and build a treatment plan from there.');

-- Re-add FK constraints (NOT VALID to skip checking seed data)
ALTER TABLE public.reviews ADD CONSTRAINT reviews_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.post_likes ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.requirement_responses ADD CONSTRAINT requirement_responses_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
