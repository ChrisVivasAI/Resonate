-- FIX: Infinite recursion in RLS policies
-- Run this in your Supabase SQL Editor

-- Step 1: Create a security definer function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Step 2: Drop the problematic policies on EXISTING tables only
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Team members can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can view payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;

-- Step 3: Recreate policies using the helper function

-- Profiles: Users can view their own OR team members can view all
CREATE POLICY "Team can view all profiles" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR public.get_user_role() IN ('admin', 'member')
    );

-- Clients policies
CREATE POLICY "Team members can view clients" ON public.clients
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert clients" ON public.clients
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update clients" ON public.clients
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete clients" ON public.clients
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Projects policies
CREATE POLICY "Team members can view projects" ON public.projects
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert projects" ON public.projects
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update projects" ON public.projects
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete projects" ON public.projects
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Tasks policies
CREATE POLICY "Team members can view tasks" ON public.tasks
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update tasks" ON public.tasks
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete tasks" ON public.tasks
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Milestones policies
DROP POLICY IF EXISTS "Team members can view milestones" ON public.milestones;
DROP POLICY IF EXISTS "Team members can manage milestones" ON public.milestones;

CREATE POLICY "Team members can view milestones" ON public.milestones
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert milestones" ON public.milestones
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update milestones" ON public.milestones
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete milestones" ON public.milestones
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Payments policies
CREATE POLICY "Team members can view payments" ON public.payments
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Admins can insert payments" ON public.payments
    FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Admins can update payments" ON public.payments
    FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete payments" ON public.payments
    FOR DELETE USING (public.get_user_role() = 'admin');

-- Invoices policies
DROP POLICY IF EXISTS "Team members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;

CREATE POLICY "Team members can view invoices" ON public.invoices
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Admins can insert invoices" ON public.invoices
    FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Admins can update invoices" ON public.invoices
    FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete invoices" ON public.invoices
    FOR DELETE USING (public.get_user_role() = 'admin');

-- AI Generations - these should be fine but let's ensure they work
DROP POLICY IF EXISTS "Users can view their own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can create generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can update their own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can delete their own generations" ON public.ai_generations;

CREATE POLICY "Users can view their own generations" ON public.ai_generations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create generations" ON public.ai_generations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own generations" ON public.ai_generations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own generations" ON public.ai_generations
    FOR DELETE USING (user_id = auth.uid());
