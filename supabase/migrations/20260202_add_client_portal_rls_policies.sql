-- Helper function to get the client_id for the current authenticated user.
-- Uses SECURITY DEFINER to bypass RLS on the profiles table,
-- consistent with the existing get_user_role() pattern.
CREATE OR REPLACE FUNCTION public.get_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Allow client users to read their own client record.
-- The portal queries clients with .eq('profile_id', user.id) to find the client_id.
CREATE POLICY "Clients can view own client record" ON public.clients
    FOR SELECT USING (profile_id = auth.uid());

-- Allow client users to view projects assigned to their client record.
-- Uses get_client_id() to avoid cross-table RLS subquery issues.
CREATE POLICY "Clients can view their projects" ON public.projects
    FOR SELECT USING (client_id = public.get_client_id());
