-- Function to delete user from auth.users when profile is deleted
CREATE OR REPLACE FUNCTION delete_auth_user()
RETURNS trigger AS $$
BEGIN
  -- Delete the user from the auth.users table
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a profile is deleted
DROP TRIGGER IF EXISTS on_profile_delete ON public.profiles;
CREATE TRIGGER on_profile_delete
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE delete_auth_user();
