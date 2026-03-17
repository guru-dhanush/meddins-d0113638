# 🏥 Meddin — Healthcare Services Marketplace

A full-stack **healthcare SaaS platform** that connects **patients** with **healthcare providers** (doctors, nurses, caretakers). Think of it like an "Linkedin + Reddit + Uber for healthcare" — a booking marketplace with social features and AI assistance.

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI** | Tailwind CSS + shadcn/ui (Radix primitives) |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS) |
| **State** | TanStack React Query |
| **Routing** | React Router v6 |
| **Animations** | Framer Motion |
| **Maps** | Leaflet (for provider locations) |
| **Charts** | Recharts |

## 👥 User Roles

- **Patients** — Browse providers, book appointments, leave reviews, view social feed
- **Providers** (Doctor / Nurse / Caretaker) — Manage profile, services, availability, accept/decline bookings
- **Organizations** — Manage teams of providers, bookings, and org profiles

## 📄 Key Pages & Features

| Page | Purpose |
|---|---|
| `/auth` | Authentication (signup/login via Supabase Auth) |
| `/select-role` | Onboarding — choose Patient or Provider role |
| `/` & `/feed` | **Social feed** — users post health-related content, like & comment |
| `/post` | Create a new post |
| `/dashboard` | **Provider dashboard** — view/manage incoming bookings |
| `/providers` | **Browse providers** — search by type, view on a map |
| `/provider/:id` | Public provider profile with booking dialog |
| `/provider-profile/edit` | Providers edit their profile, services, qualifications |
| `/profile` & `/user/:id` | User profile page |
| `/messages` | **Messaging** between patients and providers |
| `/org/*` | Organization dashboard, team management, bookings, profile |
| `/upgrade-to-provider` | Patients can upgrade to provider status |
| `/invitations` | Manage org invitations |
| `/ai-chat` | **AI Chat assistant** for health-related queries |

## 🗄️ Database Schema (Supabase/Postgres)

The database includes **23 migrations** and the following core models:

- `profiles` — User profiles (name, avatar, phone, address)
- `user_roles` — Role assignment (patient/provider)
- `provider_profiles` — Provider details (type, bio, qualifications, hourly rate, location, ratings)
- `services` — Services offered by providers (name, price, duration)
- `bookings` — Appointment bookings with status tracking (pending → accepted → completed)
- `reviews` — Post-booking reviews (1–5 stars)
- `availability` — Provider weekly schedule slots
- `posts`, `post_likes`, `post_comments` — Social feed system

All tables use **Row Level Security (RLS)** for access control.

## 🔑 Key Architectural Patterns

- **Auth-gated routes** — most pages redirect to `/auth` if not logged in
- **Real-time data** via Supabase client queries
- **Component library** — 49 shadcn/ui components + 13 custom components
- **Responsive design** with mobile bottom navigation (`BottomNav`)
- **Context-based auth** via `AuthContext`

## Getting Started

### Prerequisites

- Node.js & npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd Meddin

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
