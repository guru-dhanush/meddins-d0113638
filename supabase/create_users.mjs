// Run: node supabase/create_users.mjs <SERVICE_ROLE_KEY>
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yjwvqulomxwwbhlmoheh.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
    console.error('Usage: node supabase/create_users.mjs <SERVICE_ROLE_KEY>');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const users = [
    { id: 'b0000001-0000-0000-0000-000000000001', email: 'dr.sarah@healther.com', name: 'Dr. Sarah Johnson' },
    { id: 'b0000002-0000-0000-0000-000000000002', email: 'emily.nurse@healther.com', name: 'Emily Rodriguez' },
    { id: 'b0000003-0000-0000-0000-000000000003', email: 'maria.care@healther.com', name: 'Maria Garcia' },
    { id: 'b0000004-0000-0000-0000-000000000004', email: 'dr.james@healther.com', name: 'Dr. James Williams' },
    { id: 'b0000005-0000-0000-0000-000000000005', email: 'robert.nurse@healther.com', name: 'Robert Thompson' },
    { id: 'b0000006-0000-0000-0000-000000000006', email: 'linda.care@healther.com', name: 'Linda Patel' },
    { id: 'b0000007-0000-0000-0000-000000000007', email: 'dr.david@healther.com', name: 'Dr. David Kim' },
    { id: 'b0000008-0000-0000-0000-000000000008', email: 'patricia.nurse@healther.com', name: 'Patricia Okonkwo' },
    { id: 'b0000009-0000-0000-0000-000000000009', email: 'dr.ananya@healther.com', name: 'Dr. Ananya Sharma' },
    { id: 'b0000010-0000-0000-0000-000000000010', email: 'dr.michael@healther.com', name: 'Dr. Michael Chen' },
    { id: 'b0000011-0000-0000-0000-000000000011', email: 'fatima.physio@healther.com', name: 'Fatima Al-Hassan' },
    { id: 'b0000012-0000-0000-0000-000000000012', email: 'dr.priya@healther.com', name: 'Dr. Priya Reddy' },
    { id: 'c0000001-0000-0000-0000-000000000001', email: 'alex.turner@gmail.com', name: 'Alex Turner' },
    { id: 'c0000002-0000-0000-0000-000000000002', email: 'sophia.m@gmail.com', name: 'Sophia Martinez' },
    { id: 'c0000003-0000-0000-0000-000000000003', email: 'raj.k@gmail.com', name: 'Raj Krishnan' },
    { id: 'c0000004-0000-0000-0000-000000000004', email: 'emma.w@gmail.com', name: 'Emma Wilson' },
    { id: 'c0000005-0000-0000-0000-000000000005', email: 'carlos.r@gmail.com', name: 'Carlos Rivera' },
    { id: 'c0000006-0000-0000-0000-000000000006', email: 'aisha.p@gmail.com', name: 'Aisha Patel' },
    { id: 'c0000007-0000-0000-0000-000000000007', email: 'james.o@gmail.com', name: 'James O\'Brien' },
    { id: 'c0000008-0000-0000-0000-000000000008', email: 'nina.t@gmail.com', name: 'Nina Tanaka' },
];

const PASSWORD = 'password123';

async function run() {
    console.log('Step 1: Deleting any corrupt leftover users...\n');

    for (const user of users) {
        // Try to delete by the fixed ID (from previous SQL seed attempt)
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
        if (!delErr) {
            console.log(`🗑️  Deleted old user ${user.id}`);
        }
    }

    console.log('\nStep 2: Creating fresh users...\n');
    let success = 0, failed = 0;

    for (const user of users) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: user.name },
        });

        if (error) {
            console.error(`❌ ${user.email} — ${error.message}`);
            failed++;
        } else {
            console.log(`✅ ${user.email} — created (id: ${data.user.id})`);
            success++;
        }
    }

    console.log(`\n🎉 Done! ${success} created, ${failed} failed`);
    console.log(`Password for all: ${PASSWORD}`);
}

run();
