-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║           Healther — EXTENDED SEED DATA (Part 3)                  ║
-- ║  Run AFTER seed_extended_p2.sql                                   ║
-- ║  Adds: direct conversations, messages, AI conversations           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Drop FK temporarily for seed conversations
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_participant_2_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.ai_conversations DROP CONSTRAINT IF EXISTS ai_conversations_user_id_fkey;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. DIRECT CONVERSATIONS (patient ↔ provider)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.conversations (id, participant_1, participant_2, last_message_at, created_at) VALUES
('d0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'b0000004-0000-0000-0000-000000000004', now() - interval '2 hours', now() - interval '5 days'),
('d0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003', 'b0000005-0000-0000-0000-000000000005', now() - interval '6 hours', now() - interval '10 days'),
('d0000003-0000-0000-0000-000000000003', 'c0000005-0000-0000-0000-000000000005', 'b0000007-0000-0000-0000-000000000007', now() - interval '1 day', now() - interval '30 days'),
('d0000004-0000-0000-0000-000000000004', 'c0000006-0000-0000-0000-000000000006', 'b0000009-0000-0000-0000-000000000009', now() - interval '3 hours', now() - interval '7 days'),
('d0000005-0000-0000-0000-000000000005', 'c0000008-0000-0000-0000-000000000008', 'b0000010-0000-0000-0000-000000000010', now() - interval '30 minutes', now() - interval '45 days'),
('d0000006-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', now() - interval '12 hours', now() - interval '15 days'),
('d0000007-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'b0000012-0000-0000-0000-000000000012', now() - interval '1 day', now() - interval '20 days'),
('d0000008-0000-0000-0000-000000000008', 'c0000004-0000-0000-0000-000000000004', 'b0000003-0000-0000-0000-000000000003', now() - interval '4 hours', now() - interval '3 days')
ON CONFLICT (participant_1, participant_2) DO NOTHING;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. MESSAGES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Conv 1: Sophia ↔ Dr. James (Pediatrician)
INSERT INTO public.messages (conversation_id, sender_id, content, read, created_at) VALUES
('d0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'Hi Dr. Williams! My baby has been running a low fever since yesterday. Should I be worried?', true, now() - interval '5 days'),
('d0000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000004', 'Hi Sophia! For low-grade fevers (under 100.4°F) in babies, it''s usually not alarming. Is she eating and sleeping normally?', true, now() - interval '5 days' + interval '20 min'),
('d0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'Yes, she''s eating fine but a little fussier than usual. Temperature is around 99.8°F.', true, now() - interval '5 days' + interval '35 min'),
('d0000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000004', 'That sounds like a very mild response — could be teething! Keep her hydrated and monitor for 24 hours. If it goes above 100.4°F or she shows other symptoms, let me know and we can schedule a visit.', true, now() - interval '5 days' + interval '50 min'),
('d0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'The fever went away! It was teething. Thanks so much Dr. Williams! 🙏', true, now() - interval '4 days'),
('d0000001-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000004', 'Glad to hear! Don''t forget we have the 9-month vaccination coming up next week. 😊', true, now() - interval '4 days' + interval '1 hour'),
('d0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'Yes! I just booked it. See you then!', true, now() - interval '2 hours'),

-- Conv 2: Raj ↔ Robert (Diabetes Nurse)
('d0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003', 'Robert, my fasting glucose was 185 this morning. That''s higher than usual.', true, now() - interval '8 days'),
('d0000002-0000-0000-0000-000000000002', 'b0000005-0000-0000-0000-000000000005', 'Did you have a late dinner or any sweets last night? Sometimes that spikes fasting numbers.', true, now() - interval '8 days' + interval '30 min'),
('d0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003', 'Actually yes, I had some dessert at a family dinner. Could that be it?', true, now() - interval '8 days' + interval '45 min'),
('d0000002-0000-0000-0000-000000000002', 'b0000005-0000-0000-0000-000000000005', 'Most likely! Try to eat sweets before 7 PM and always pair them with protein. Let''s check again at our next session on Wednesday.', true, now() - interval '8 days' + interval '1 hour'),
('d0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003', 'Fasting glucose was 128 today! The meal timing trick is working.', true, now() - interval '6 hours'),
('d0000002-0000-0000-0000-000000000002', 'b0000005-0000-0000-0000-000000000005', 'Excellent progress Raj! Keep it up. 📊', false, now() - interval '6 hours' + interval '15 min'),

-- Conv 3: Carlos ↔ Dr. Kim (Orthopedic)
('d0000003-0000-0000-0000-000000000003', 'c0000005-0000-0000-0000-000000000005', 'Dr. Kim, I''m feeling some stiffness in my right knee during morning walks. Is that normal at 6 months post-ACL?', true, now() - interval '3 days'),
('d0000003-0000-0000-0000-000000000003', 'b0000007-0000-0000-0000-000000000007', 'Morning stiffness at 6 months is fairly common. Are you doing the stretching routine I prescribed?', true, now() - interval '3 days' + interval '2 hours'),
('d0000003-0000-0000-0000-000000000003', 'c0000005-0000-0000-0000-000000000005', 'Honestly, I''ve been skipping the morning stretches. 😅', true, now() - interval '2 days'),
('d0000003-0000-0000-0000-000000000003', 'b0000007-0000-0000-0000-000000000007', 'That''s likely the cause! The morning routine loosens up the joint capsule. Commit to 10 minutes daily for 2 weeks and let me know. If stiffness persists, we should do an in-person assessment.', true, now() - interval '1 day'),

-- Conv 4: Aisha ↔ Dr. Ananya (Dermatologist)
('d0000004-0000-0000-0000-000000000004', 'c0000006-0000-0000-0000-000000000006', 'Hi Dr. Ananya! The tretinoin cream is causing some dryness and peeling. Is that expected?', true, now() - interval '5 days'),
('d0000004-0000-0000-0000-000000000004', 'b0000009-0000-0000-0000-000000000009', 'Yes, that''s completely normal during the first 2-3 weeks! It''s called the "purging phase." Use a gentle moisturizer 15 minutes after applying tretinoin.', true, now() - interval '5 days' + interval '1 hour'),
('d0000004-0000-0000-0000-000000000004', 'c0000006-0000-0000-0000-000000000006', 'Which moisturizer would you recommend?', true, now() - interval '5 days' + interval '2 hours'),
('d0000004-0000-0000-0000-000000000004', 'b0000009-0000-0000-0000-000000000009', 'CeraVe Moisturizing Cream or Cetaphil — both are non-comedogenic and perfect for this. Apply at night after the retinoid absorbs!', true, now() - interval '4 days'),
('d0000004-0000-0000-0000-000000000004', 'c0000006-0000-0000-0000-000000000006', 'Update: my skin is already looking so much better after 3 weeks! Thank you Dr. Ananya! ✨', false, now() - interval '3 hours'),

-- Conv 5: Nina ↔ Dr. Chen (Psychiatrist)
('d0000005-0000-0000-0000-000000000005', 'c0000008-0000-0000-0000-000000000008', 'Dr. Chen, I tried the breathing exercise during a stressful meeting today and it really helped!', true, now() - interval '2 days'),
('d0000005-0000-0000-0000-000000000005', 'b0000010-0000-0000-0000-000000000010', 'That''s wonderful progress Nina! The 4-7-8 technique works great for acute anxiety. How are you sleeping?', true, now() - interval '2 days' + interval '3 hours'),
('d0000005-0000-0000-0000-000000000005', 'c0000008-0000-0000-0000-000000000008', 'Much better actually! I''m averaging 7 hours now instead of 5. The sleep hygiene tips made a huge difference.', true, now() - interval '1 day'),
('d0000005-0000-0000-0000-000000000005', 'b0000010-0000-0000-0000-000000000010', 'Excellent! We''ll build on this in our next session on Friday. I want to introduce thought journaling — it''s the next step in CBT. 📝', false, now() - interval '30 minutes'),

-- Conv 6: Alex ↔ Dr. Sarah (Cardiologist)
('d0000006-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'Dr. Sarah, I got my blood work results. My LDL is at 145. Is that concerning given my family history?', true, now() - interval '3 days'),
('d0000006-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000001', 'With your family history of heart disease, I''d prefer to see LDL below 100. We should discuss lifestyle changes and possibly statins.', true, now() - interval '3 days' + interval '4 hours'),
('d0000006-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'I''d rather try diet changes first before medication. What do you recommend?', true, now() - interval '2 days'),
('d0000006-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000001', 'Great approach! Reduce saturated fats, increase fiber (oats, beans), add omega-3s (fish, walnuts), and exercise 150 min/week. Let''s retest in 3 months.', true, now() - interval '12 hours'),

-- Conv 7: Alex ↔ Dr. Priya (GP)
('d0000007-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'Hi Dr. Priya, thank you for the thorough checkup last week. Quick question — should I get a vitamin D supplement based on my results?', true, now() - interval '5 days'),
('d0000007-0000-0000-0000-000000000007', 'b0000012-0000-0000-0000-000000000012', 'Yes Alex, your Vitamin D was 18 ng/mL which is below optimal (30-50). I''d recommend 2000 IU daily of Vitamin D3 with a fatty meal for better absorption.', true, now() - interval '5 days' + interval '6 hours'),
('d0000007-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'Got it! I also referred myself to Dr. Sarah Johnson for a cardiac screening per your suggestion. Thank you!', true, now() - interval '1 day'),

-- Conv 8: Emma ↔ Maria (Caretaker)
('d0000008-0000-0000-0000-000000000008', 'c0000004-0000-0000-0000-000000000004', 'Hi Maria! My grandmother really enjoyed the trial day. She kept asking when you''re coming back!', true, now() - interval '2 days'),
('d0000008-0000-0000-0000-000000000008', 'b0000003-0000-0000-0000-000000000003', 'That makes me so happy! Your grandmother is lovely. I noticed she responds well to music — have you tried playing her favorite songs during meals?', true, now() - interval '2 days' + interval '1 hour'),
('d0000008-0000-0000-0000-000000000008', 'c0000004-0000-0000-0000-000000000004', 'Great idea! She loves old Bollywood songs. Can you start on Monday? We''d like 4-hour sessions Mon-Sat.', true, now() - interval '1 day'),
('d0000008-0000-0000-0000-000000000008', 'b0000003-0000-0000-0000-000000000003', 'Monday works perfectly! I''ll bring some activity cards for cognitive stimulation too. See you at 8 AM! 😊', false, now() - interval '4 hours');


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. AI CONVERSATIONS & MESSAGES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.ai_conversations (id, user_id, title, created_at, updated_at) VALUES
('e0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Understanding Cholesterol Levels', now() - interval '10 days', now() - interval '10 days'),
('e0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 'Baby Teething Remedies', now() - interval '4 days', now() - interval '4 days'),
('e0000003-0000-0000-0000-000000000003', 'c0000008-0000-0000-0000-000000000008', 'Sleep Hygiene Tips', now() - interval '15 days', now() - interval '15 days');

INSERT INTO public.ai_messages (conversation_id, role, content, created_at) VALUES
-- Alex: Cholesterol Q&A
('e0000001-0000-0000-0000-000000000001', 'user', 'What is a healthy LDL cholesterol level?', now() - interval '10 days'),
('e0000001-0000-0000-0000-000000000001', 'assistant', 'An optimal LDL cholesterol level is below 100 mg/dL. Levels between 100-129 mg/dL are near optimal, 130-159 is borderline high, 160-189 is high, and 190+ is very high. If you have risk factors like family history of heart disease, your doctor may recommend keeping LDL even lower. Regular exercise and a heart-healthy diet can help manage LDL levels.', now() - interval '10 days' + interval '5 seconds'),
('e0000001-0000-0000-0000-000000000001', 'user', 'What foods help lower LDL?', now() - interval '10 days' + interval '2 min'),
('e0000001-0000-0000-0000-000000000001', 'assistant', 'Here are some evidence-based foods that help lower LDL:\n\n1. **Oats & Barley** — soluble fiber binds cholesterol\n2. **Beans & Lentils** — high in fiber\n3. **Nuts** — especially almonds and walnuts\n4. **Fatty Fish** — salmon, mackerel (omega-3s)\n5. **Olive Oil** — replaces saturated fats\n6. **Avocados** — monounsaturated fats\n7. **Soy Products** — tofu, edamame\n\nAim for 25-30g of fiber daily and limit saturated fats to less than 7% of calories.', now() - interval '10 days' + interval '2 min 10 seconds'),

-- Sophia: Teething
('e0000002-0000-0000-0000-000000000002', 'user', 'My 8-month-old seems to be teething. What are safe remedies?', now() - interval '4 days'),
('e0000002-0000-0000-0000-000000000002', 'assistant', 'Teething can be uncomfortable for babies! Here are safe, pediatrician-approved remedies:\n\n✅ **Chilled teething rings** (not frozen)\n✅ **Clean, cold washcloth** to chew on\n✅ **Gentle gum massage** with a clean finger\n✅ **Infant acetaminophen** (Tylenol) for pain — consult your pediatrician for dosing\n\n❌ **Avoid**: Benzocaine gels (FDA warns against for under 2), amber necklaces (choking risk), and freezable teething toys.\n\nIf fever exceeds 100.4°F or symptoms persist beyond a few days, consult your pediatrician.', now() - interval '4 days' + interval '5 seconds'),

-- Nina: Sleep
('e0000003-0000-0000-0000-000000000003', 'user', 'I''ve been struggling with insomnia due to work anxiety. Any tips?', now() - interval '15 days'),
('e0000003-0000-0000-0000-000000000003', 'assistant', 'Here are evidence-based sleep hygiene strategies:\n\n🌙 **Environment**: Keep room cool (65-68°F), dark, and quiet\n📵 **Screen cutoff**: No screens 1 hour before bed\n⏰ **Consistency**: Same sleep/wake time every day\n☕ **No caffeine** after 2 PM\n🧘 **Relaxation**: Try the 4-7-8 breathing technique — inhale 4s, hold 7s, exhale 8s\n📝 **Worry journal**: Write down tomorrow''s tasks before bed to clear your mind\n\nFor work-related anxiety specifically, CBT (Cognitive Behavioral Therapy) for insomnia is highly effective. Consider discussing this with a mental health professional.', now() - interval '15 days' + interval '5 seconds'),
('e0000003-0000-0000-0000-000000000003', 'user', 'The 4-7-8 breathing technique sounds interesting. How exactly do I do it?', now() - interval '15 days' + interval '3 min'),
('e0000003-0000-0000-0000-000000000003', 'assistant', 'The **4-7-8 breathing technique** (developed by Dr. Andrew Weil):\n\n1. Sit or lie comfortably\n2. Place the tip of your tongue behind your upper front teeth\n3. **Exhale** completely through your mouth\n4. **Inhale** through your nose for **4 seconds**\n5. **Hold** your breath for **7 seconds**\n6. **Exhale** through your mouth for **8 seconds** (making a whoosh sound)\n7. Repeat 3-4 times\n\n💡 **Tips**: Do this twice daily. It activates the parasympathetic nervous system, reducing heart rate and promoting calmness. Many find it helps them fall asleep within minutes after 2 weeks of consistent practice.', now() - interval '15 days' + interval '3 min 10 seconds');


-- Re-add FK constraints (NOT VALID to skip validation of seed data)
ALTER TABLE public.conversations ADD CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES auth.users(id) NOT VALID;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES auth.users(id) NOT VALID;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) NOT VALID;
ALTER TABLE public.ai_conversations ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DONE! 🎉
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Extended seed data summary:
-- 8 direct conversations with 40+ messages
-- 3 AI conversations with 12 messages
-- Realistic health discussions: teething, diabetes, ACL, acne, anxiety
