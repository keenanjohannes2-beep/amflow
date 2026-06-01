-- AMflow Database Schema for Supabase
-- Run this in Supabase SQL Editor to set up the database
-- With complete Row-Level Security

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  status TEXT DEFAULT 'Active',
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  contract_type TEXT,
  monthly_retainer NUMERIC DEFAULT 0,
  start_date DATE,
  services TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  deadline DATE,
  status TEXT DEFAULT 'Not Started',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  date DATE,
  channel TEXT DEFAULT 'Email',
  summary TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  owner TEXT DEFAULT 'Me',
  status TEXT DEFAULT 'Open',
  poc TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  date_logged DATE,
  severity TEXT DEFAULT 'Medium',
  description TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  shift TEXT DEFAULT 'Morning',
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  date DATE,
  status TEXT DEFAULT 'Present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  type TEXT DEFAULT 'Annual',
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shift_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  date DATE,
  original_shift TEXT,
  requested_shift TEXT,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kpi_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT DEFAULT 'number',
  unit TEXT,
  target NUMERIC,
  frequency TEXT DEFAULT 'Daily',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kpi_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.kpi_templates(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  date DATE,
  value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scorecards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  satisfaction INTEGER DEFAULT 3,
  communication INTEGER DEFAULT 3,
  payment_reliability INTEGER DEFAULT 3,
  workload_balance INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wbr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  week_start DATE,
  -- Intro / Account Details
  am_name TEXT,
  director_name TEXT,
  csm_name TEXT,
  total_tls TEXT,
  total_agents TEXT,
  -- Recruitment
  new_hires TEXT,
  onboarding_dates TEXT,
  todo_list TEXT,
  recruitment_challenges TEXT,
  recruitment_deliverables TEXT,
  -- Attendance / Adherence
  attendance_summary TEXT,
  attendance_breakdown TEXT,
  attendance_flags TEXT,
  schedule_amendments TEXT,
  -- Attrition
  attrition_summary TEXT,
  -- Productivity / Utilization
  productivity_summary TEXT,
  productivity_trends TEXT,
  productivity_wins_losses TEXT,
  utilization_summary TEXT,
  utilization_gaps TEXT,
  utilization_wins_losses TEXT,
  -- Highlights
  tl_highlights TEXT,
  team_highlights TEXT,
  agent_highlights TEXT,
  flags_risks TEXT,
  engagement_summary TEXT,
  client_meeting_engagement TEXT,
  -- Legacy fields
  health_summary TEXT,
  kpi_summary TEXT,
  escalations_summary TEXT,
  deliverables TEXT,
  key_metrics TEXT,
  wins TEXT,
  challenges TEXT,
  action_items TEXT,
  next_week_focus TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wbr ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLIENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TASKS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- COMMUNICATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own communications" ON public.communications;
DROP POLICY IF EXISTS "Users can insert own communications" ON public.communications;
DROP POLICY IF EXISTS "Users can update own communications" ON public.communications;
DROP POLICY IF EXISTS "Users can delete own communications" ON public.communications;

CREATE POLICY "Users can view own communications"
  ON public.communications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own communications"
  ON public.communications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own communications"
  ON public.communications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own communications"
  ON public.communications FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ISSUES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can insert own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can update own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can delete own issues" ON public.issues;

CREATE POLICY "Users can view own issues"
  ON public.issues FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own issues"
  ON public.issues FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issues"
  ON public.issues FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own issues"
  ON public.issues FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EMPLOYEES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON public.employees;

CREATE POLICY "Users can view own employees"
  ON public.employees FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employees"
  ON public.employees FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
  ON public.employees FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
  ON public.employees FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ATTENDANCE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can delete own attendance" ON public.attendance;

CREATE POLICY "Users can view own attendance"
  ON public.attendance FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
  ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
  ON public.attendance FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own attendance"
  ON public.attendance FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- LEAVE REQUESTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can insert own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can update own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can delete own leave requests" ON public.leave_requests;

CREATE POLICY "Users can view own leave requests"
  ON public.leave_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leave requests"
  ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leave requests"
  ON public.leave_requests FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leave requests"
  ON public.leave_requests FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SHIFT CHANGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own shift changes" ON public.shift_changes;
DROP POLICY IF EXISTS "Users can insert own shift changes" ON public.shift_changes;
DROP POLICY IF EXISTS "Users can update own shift changes" ON public.shift_changes;
DROP POLICY IF EXISTS "Users can delete own shift changes" ON public.shift_changes;

CREATE POLICY "Users can view own shift changes"
  ON public.shift_changes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shift changes"
  ON public.shift_changes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shift changes"
  ON public.shift_changes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shift changes"
  ON public.shift_changes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- KPI TEMPLATES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own kpi templates" ON public.kpi_templates;
DROP POLICY IF EXISTS "Users can insert own kpi templates" ON public.kpi_templates;
DROP POLICY IF EXISTS "Users can update own kpi templates" ON public.kpi_templates;
DROP POLICY IF EXISTS "Users can delete own kpi templates" ON public.kpi_templates;

CREATE POLICY "Users can view own kpi templates"
  ON public.kpi_templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kpi templates"
  ON public.kpi_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kpi templates"
  ON public.kpi_templates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kpi templates"
  ON public.kpi_templates FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- KPI RECORDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own kpi records" ON public.kpi_records;
DROP POLICY IF EXISTS "Users can insert own kpi records" ON public.kpi_records;
DROP POLICY IF EXISTS "Users can update own kpi records" ON public.kpi_records;
DROP POLICY IF EXISTS "Users can delete own kpi records" ON public.kpi_records;

CREATE POLICY "Users can view own kpi records"
  ON public.kpi_records FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kpi records"
  ON public.kpi_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own kpi records"
  ON public.kpi_records FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own kpi records"
  ON public.kpi_records FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SCORECARDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Users can insert own scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Users can update own scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Users can delete own scorecards" ON public.scorecards;

CREATE POLICY "Users can view own scorecards"
  ON public.scorecards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scorecards"
  ON public.scorecards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scorecards"
  ON public.scorecards FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scorecards"
  ON public.scorecards FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- WBR POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own wbr" ON public.wbr;
DROP POLICY IF EXISTS "Users can insert own wbr" ON public.wbr;
DROP POLICY IF EXISTS "Users can update own wbr" ON public.wbr;
DROP POLICY IF EXISTS "Users can delete own wbr" ON public.wbr;

CREATE POLICY "Users can view own wbr"
  ON public.wbr FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wbr"
  ON public.wbr FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wbr"
  ON public.wbr FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wbr"
  ON public.wbr FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON public.communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON public.communications(client_id);
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON public.issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_client_id ON public.issues(client_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_client_id ON public.employees(client_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_client_id ON public.attendance(client_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_client_id ON public.leave_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_changes_user_id ON public.shift_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_changes_client_id ON public.shift_changes(client_id);
CREATE INDEX IF NOT EXISTS idx_shift_changes_employee_id ON public.shift_changes(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_user_id ON public.kpi_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_client_id ON public.kpi_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_user_id ON public.kpi_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_client_id ON public.kpi_records(client_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_template_id ON public.kpi_records(template_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_user_id ON public.scorecards(user_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_client_id ON public.scorecards(client_id);
CREATE INDEX IF NOT EXISTS idx_wbr_user_id ON public.wbr(user_id);
CREATE INDEX IF NOT EXISTS idx_wbr_client_id ON public.wbr(client_id);

-- ============================================
-- SECURITY SUMMARY
-- ============================================
--
-- All 12 tables have RLS enabled
-- Every operation (SELECT, INSERT, UPDATE, DELETE) requires:
--   auth.uid() = user_id
--
-- Protected tables:
--   - clients        - Account manager's client list
--   - tasks          - Tasks per client
--   - communications - Communication logs
--   - issues         - Escalations and issues
--   - employees      - Employees per client
--   - attendance     - Daily attendance records
--   - leave_requests - Leave management
--   - shift_changes  - Shift swap requests
--   - kpi_templates  - KPI metric definitions
--   - kpi_records    - KPI performance data
--   - scorecards     - Client health scores
--   - wbr            - Weekly business reviews
--
-- This means:
--   - User A CANNOT view User B's clients
--   - User A CANNOT view User B's tasks, employees, etc.
--   - User A CANNOT edit or delete any other user's data
--   - Only the authenticated user's own data is accessible
-- ============================================
