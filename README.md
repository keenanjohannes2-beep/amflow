# AMflow — Account Manager Toolkit

> A full-stack web application for Account Managers to manage clients, track performance, log communications, and generate professional reports — all in one place.

**Live App:** https://amflow-ten.vercel.app  
**Created by:** Keenan Johannes | keenanjohannes2@gmail.com

---

## What is AMflow?

AMflow is a purpose-built toolkit for Account Managers working in BPO, healthcare billing, and client services environments. It replaces disconnected spreadsheets and manual processes with a single intelligent platform.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Live metrics — active clients, revenue, open tasks, health scores |
| **Clients** | Client management with archive, delete and search |
| **Client Detail** | 10-tab view: Overview, POC, Requisitions, Job Specs, Tasks, Comms, Issues, Scorecard, Attendance, KPIs |
| **Weekly Business Reviews** | Auto-populated WBR — pulls attendance, health scores, KPIs and escalations automatically |
| **Task Manager** | Tasks with priorities, deadlines and status tracking |
| **Communications** | Communication log with POC, channel, and action flags |
| **Escalations & Issues** | Issue tracking with severity levels and resolution notes |
| **Health Scorecard** | Rate clients across 4 dimensions (1-5 scale) |
| **Attendance Tracker** | Employee attendance, leave requests and shift changes |
| **Performance KPIs** | Modular KPI system — each client has their own metrics |
| **Exports** | Client EOD PDF, Director EOD PDF, Client PowerPoint (8 slides) |

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Vercel
- **Exports:** jsPDF, jsPDF-AutoTable, PptxGenJS
- **Styling:** CSS Variables (light + dark mode)

---

## Getting Started

### Prerequisites

Before you begin make sure you have the following installed:

- [Node.js 18+](https://nodejs.org) — download the LTS version
- [VS Code](https://code.visualstudio.com) — recommended code editor
- [Git](https://git-scm.com) — version control

You will also need free accounts on:

- [Supabase](https://supabase.com) — your database
- [Vercel](https://vercel.com) — hosting
- [GitHub](https://github.com) — code storage

---

### Step 1 — Clone the repository

Open your terminal and run:

```bash
git clone https://github.com/keenanjohannes2-beep/amflow.git
cd amflow
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to **Project Settings → API**
3. Copy your **Project URL** and **anon/public key**

---

### Step 4 — Configure environment variables

Create a file called `.env.local` in the root of the project:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ Never commit this file to GitHub. It is already listed in `.gitignore`.

---

### Step 5 — Set up the database

Go to your Supabase project → **SQL Editor** → **New query** and run the following SQL to create all tables:

```sql
-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  role text,
  team_id uuid,
  created_at timestamp default now(),
  primary key (id)
);

-- Clients
create table clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  industry text,
  contact_person text,
  email text,
  start_date date,
  monthly_retainer numeric,
  services text,
  contract_type text,
  status text default 'Active',
  archived boolean default false,
  created_at timestamp default now()
);

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  priority text default 'Medium',
  deadline date,
  status text default 'Not Started',
  notes text,
  created_at timestamp default now()
);

-- WBR
create table wbr (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  week_start date,
  attendance_summary text,
  attendance_breakdown text,
  health_summary text,
  kpi_summary text,
  escalations_summary text,
  deliverables text,
  key_metrics text,
  wins text,
  challenges text,
  action_items text,
  next_week_focus text,
  archived boolean default false,
  created_at timestamp default now()
);

-- Communications
create table communications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  date date,
  channel text,
  summary text,
  poc text,
  action_required boolean default false,
  owner text,
  status text default 'Open',
  created_at timestamp default now()
);

-- Issues
create table issues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  date_logged date,
  severity text,
  description text,
  resolution text,
  status text default 'Open',
  created_at timestamp default now()
);

-- Scorecards
create table scorecards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  satisfaction int check (satisfaction between 1 and 5),
  communication int check (communication between 1 and 5),
  payment_reliability int check (payment_reliability between 1 and 5),
  workload_balance int check (workload_balance between 1 and 5),
  created_at timestamp default now()
);

-- Employees
create table employees (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  full_name text not null,
  role text,
  shift text,
  status text default 'Active',
  created_at timestamp default now()
);

-- Attendance
create table attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  status text default 'Present',
  notes text,
  created_at timestamp default now()
);

-- Leave Requests
create table leave_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  type text default 'Annual',
  reason text,
  status text default 'Pending',
  created_at timestamp default now()
);

-- Shift Changes
create table shift_changes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  original_shift text,
  requested_shift text,
  reason text,
  status text default 'Pending',
  created_at timestamp default now()
);

-- KPI Templates
create table kpi_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  metric_name text not null,
  metric_type text default 'number',
  unit text,
  target numeric,
  frequency text default 'Daily',
  created_at timestamp default now()
);

-- KPI Records
create table kpi_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  template_id uuid references kpi_templates(id) on delete cascade,
  value numeric not null,
  date date not null,
  notes text,
  created_at timestamp default now()
);

-- POC
create table poc (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  full_name text not null,
  role text,
  email text,
  phone text,
  notes text,
  created_at timestamp default now()
);

-- Requisitions
create table requisitions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  department text,
  headcount int default 1,
  priority text default 'Medium',
  status text default 'Open',
  date_requested date,
  date_needed date,
  notes text,
  created_at timestamp default now()
);

-- Job Specs
create table job_specs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  department text,
  requirements text,
  responsibilities text,
  experience text,
  salary_range text,
  employment_type text default 'Full Time',
  status text default 'Active',
  created_at timestamp default now()
);
```

---

### Step 6 — Enable Row Level Security

Run this in the Supabase SQL Editor to protect all user data:

```sql
alter table profiles enable row level security;
alter table clients enable row level security;
alter table tasks enable row level security;
alter table wbr enable row level security;
alter table communications enable row level security;
alter table issues enable row level security;
alter table scorecards enable row level security;
alter table employees enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table shift_changes enable row level security;
alter table kpi_templates enable row level security;
alter table kpi_records enable row level security;
alter table poc enable row level security;
alter table requisitions enable row level security;
alter table job_specs enable row level security;

create policy "own_profiles" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_clients" on clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_tasks" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_wbr" on wbr for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_comms" on communications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_issues" on issues for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_scorecards" on scorecards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_employees" on employees for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_attendance" on attendance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_leave" on leave_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_shifts" on shift_changes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_kpi_templates" on kpi_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_kpi_records" on kpi_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_poc" on poc for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_requisitions" on requisitions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_job_specs" on job_specs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

### Step 7 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should be redirected to the login page.

---

### Step 8 — Create your account

1. Click **Sign up** on the login page
2. Enter your full name, email and password
3. Check your email for a verification link and click it
4. Sign in with your credentials

---

## Deploying to Vercel

### First deployment

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** and import your repository
4. Add your environment variables under **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

### Subsequent deployments

Every push to the `main` branch automatically triggers a new deployment:

```bash
git add .
git commit -m "Description of your changes"
git push
```

---

## Troubleshooting

### Cannot add clients after signing up

Run this in your Supabase SQL Editor:

```sql
insert into profiles (id, full_name, role)
select id, email, 'account_manager'
from auth.users
on conflict (id) do nothing;
```

### App shows default Next.js page

Make sure `app/page.tsx` contains:

```typescript
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/login')
}
```

### Environment variables not working on Vercel

Go to Vercel → Project → Settings → Environment Variables and confirm both variables are added. Then go to Deployments → redeploy the latest build.

### Dev server port already in use

```bash
taskkill /PID <PID> /F
npm run dev
```

---

## Project Structure

```
amflow/
├── app/
│   ├── dashboard/page.tsx
│   ├── clients/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── wbr/page.tsx
│   ├── tasks/page.tsx
│   ├── communications/page.tsx
│   ├── issues/page.tsx
│   ├── scorecard/page.tsx
│   ├── attendance/page.tsx
│   ├── kpis/page.tsx
│   ├── exports/page.tsx
│   ├── login/page.tsx
│   └── signup/page.tsx
├── components/
│   └── Sidebar.tsx
├── lib/
│   └── supabase.ts
├── .env.local          ← never commit this
├── middleware.ts
└── README.md
```

---

## Using AMflow

### Adding your first client
1. Click **+ Add Client** on the dashboard or clients page
2. Fill in the client details and click **Save client**
3. Click the client card to open the full detail page

### Creating a Weekly Business Review
1. Go to **Weekly Reviews** in the sidebar
2. Select a client and the week start date
3. Click **⬇ Pull Data** — AMflow auto-fills all sections
4. Review and edit any fields
5. Click **Save WBR**
6. To export as PowerPoint, click the **Export** tab on any saved WBR

### Setting up KPI metrics
1. Go to **Performance KPIs** in the sidebar
2. Click the **Manage Metrics** tab
3. Click **+ Add Metric** and configure the metric name, unit, target and frequency
4. Go to **Log Performance** to start entering daily/weekly data

### Exporting reports
1. Go to **Exports** in the sidebar
2. Select a client for client-specific reports
3. Choose from Client EOD PDF, Director EOD PDF or Client PowerPoint

---

## Dark Mode

Click the **dark mode toggle** at the bottom of the sidebar to switch between light and dark themes. Your preference is saved in the browser.

---

## Creator

**Keenan Johannes**  
Account Manager & Product Creator  
📧 keenanjohannes2@gmail.com

For support, feature requests, suggestions or troubleshooting — reach out anytime.

---

*AMflow is a proprietary product created by Keenan Johannes. All rights reserved.*
