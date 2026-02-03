-- Fix handle_new_user trigger to read role and client_id from user metadata.
-- Previously the trigger only set id, email, and full_name, leaving role
-- to default to 'member'. This caused client users registered via invitation
-- to be treated as agency members.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _role TEXT;
BEGIN
    -- Read role from metadata, default to 'member' if not provided
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

    -- Validate role value
    IF _role NOT IN ('admin', 'member', 'client') THEN
        _role := 'member';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, client_id)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        _role,
        (NEW.raw_user_meta_data->>'client_id')::UUID
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
