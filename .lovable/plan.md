## LinkedIn-Style Profile + Message Request System

### What We're Building

**1. LinkedIn-style profile sections** on the UserProfile page:
- **About** section (bio, expanded)
- **Education** section (institution, degree, field, start/end dates)
- **Licenses & Certifications** section (name, issuer, issued/expiry dates, credential URL)
- **Skills** section (list of skill strings)
- **Experience** section (title, company, employment type, start/end dates, location, description)
- Own profile shows edit (pencil) icons per section; other profiles are read-only

**2. Messaging rules change:**
- Only **connected** users can send direct messages
- Non-connected users see a **"Request Message"** button on profiles, which creates a conversation marked as a `message_request`
- Messages page gets a small **"Requests"** hyperlink (like "View Invitations" style) showing pending message requests
- Recipients can accept (moves to regular messages) or decline requests

**3. Profile edit pages** updated to allow adding/editing education, certifications, skills, and experience entries

---

## Availability & Service-Based Booking System Redesign

### Problem
Current system lacks:
1. **Mode-specific availability** — Providers can't set different schedules for online, clinic, and home visits
2. **Service selection in booking** — Users can't choose which specific service they want (e.g., ear check vs throat check for an ENT doctor)
3. **Booking doesn't track service or mode** — No link between booking and what service/mode was selected

### Current Schema
- `availability`: `provider_id, day_of_week, start_time, end_time, is_active` (no mode)
- `services`: `provider_id, name, description, price, duration_minutes, consultation_mode` (exists but unused in booking)
- `bookings`: `provider_id, patient_id, booking_date, booking_time, status, notes` (no service_id, no mode)

### Phase 1: Database Changes
1. **Add `consultation_mode` to `availability` table** — values: `online`, `in_clinic`, `home_visit`
   - Default to `in_clinic` for existing rows
2. **New `service_pricing` table** — mode-specific pricing per service:
   - `id`, `service_id` (FK → services), `consultation_mode` (text), `price` (numeric)
   - Allows: "Ear Exam" → online: $30, in_clinic: $40, home_visit: $50
   - The `services.price` column becomes the base/default price
3. **Add `service_id` (nullable FK → services) and `consultation_mode` to `bookings` table**
4. Optionally add `location_address` to `bookings` for home visit bookings

### Phase 2: Provider Dashboard — Availability Management
1. **Redesign availability editor** in Dashboard
   - Group slots by consultation mode (tabs: Online | In-Clinic | Home Visit)
   - Each mode has its own day/time grid
   - Provider enables/disables modes they support
   - Example: Mon 9-12 Online, Mon 1-5 In-Clinic, Mon 6-8 Home Visit

### Phase 3: Provider Dashboard — Services Management
1. **Improve services management UI**
   - Each service: name, description, duration, applicable modes (multi-select)
   - Per-mode pricing via `service_pricing` table (e.g., online $30, clinic $40, home $50)
   - e.g., "Ear Examination", "Throat Check", "Full ENT Consultation"

### Phase 4: Booking Flow Redesign (BookingDialog)
1. **Step 1: Select Service** — Show provider's services with mode-specific prices
2. **Step 2: Select Mode** — Show available consultation modes for that service (with price shown)
3. **Step 3: Select Date & Time** — Only show slots matching the selected mode
4. **Step 4: Notes** (existing)
5. **Step 5: Payment** — Show mode-specific service price from `service_pricing`
6. **Step 6: Confirmation** — Full details including service, mode & price

### Phase 5: Dashboard & Detail Updates
1. Provider/patient dashboards show service name and mode on bookings
2. BookingDetailDialog displays service and mode info

### Affected Files
- `supabase/migrations/` — Schema changes (availability, service_pricing, bookings)
- `src/components/BookingDialog.tsx` → refactor into sub-components
- `src/pages/Dashboard.tsx` — Availability editor + booking display
- `src/components/BookingDetailDialog.tsx`
- `src/pages/ProviderProfile.tsx`
- New: `src/components/availability/AvailabilityEditor.tsx`
- New: `src/components/booking/ServiceSelector.tsx`
- New: `src/components/booking/ModeSelector.tsx`
- New: `src/components/booking/TimeSlotPicker.tsx`

### Notes
- Works for all provider types: doctors, physiotherapists, nurses, caretakers, etc.
- Not all providers use all modes — UI adapts
- `service_pricing` table provides normalized per-mode pricing; falls back to `services.price` if no mode-specific price set
- Backward compatible: existing bookings without service_id remain valid

---

### Database Changes

**Add JSON columns to `profiles` table:**
```sql
ALTER TABLE profiles ADD COLUMN education jsonb DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN certifications jsonb DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN skills text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN work_experience jsonb DEFAULT '[]';
```

JSON structures:
- `education`: `[{institution, degree, field, start_date, end_date}]`
- `certifications`: `[{name, issuer, issue_date, expiry_date, credential_url}]`
- `work_experience`: `[{title, company, employment_type, start_date, end_date, location, description}]`

**Add `is_request` column to `conversations` table:**
```sql
ALTER TABLE conversations ADD COLUMN is_request boolean DEFAULT false;
```

This flags conversations created by non-connected users as message requests.

---

### UI Changes

**UserProfile.tsx** -- Restructure into LinkedIn-style card sections:
1. Header card (avatar, name, badges, headline, location, connection count) -- keep existing
2. About card (bio text, expandable)
3. Education card (list entries, edit icon if own profile)
4. Licenses & Certifications card (list entries)
5. Skills card (badge list)
6. Experience card (list entries with timeline)
7. Activity/Posts section (existing PostCard feed)
8. Action buttons logic:
   - Connected: "Message" + "Book" (if provider)
   - Not connected + public provider: "Book" + "Request Message"
   - Not connected + private provider: "Connect" + "Request Message"

**Messages.tsx** -- Add "Requests" section:
- Small underlined hyperlink "Requests" at the top right of conversation list
- Filter conversations where `is_request = true` and the current user is the receiver
- Show accept/decline UI for message requests

**PatientProfile.tsx / ProviderProfileEdit.tsx** -- Add structured sections:
- Collapsible/accordion sections for Education, Certifications, Skills, Experience
- Add/remove entries with simple forms

---

### Implementation Tasks
1. Database migration: add columns to profiles + conversations
2. Redesign UserProfile with LinkedIn-style sections
3. Update profile edit pages with structured data entry
4. Update messaging logic: message requests for non-connected users, "Requests" link on Messages page
