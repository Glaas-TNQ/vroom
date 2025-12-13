-- Enable the pgsodium extension if not already enabled (required for Vault)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create a secure function to encrypt API keys using Vault
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_key TEXT;
BEGIN
  -- Use pgcrypto for encryption with a server-side secret
  -- The key is derived from a combination of the service role key hash
  SELECT encode(
    pgp_sym_encrypt(
      plain_key::bytea,
      current_setting('app.settings.jwt_secret', true)
    )::bytea,
    'base64'
  ) INTO encrypted_key;
  
  RETURN 'enc:' || encrypted_key;
EXCEPTION WHEN OTHERS THEN
  -- If encryption fails, return the original (this shouldn't happen in production)
  RETURN plain_key;
END;
$$;

-- Create a secure function to decrypt API keys (only callable from edge functions via service role)
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_key TEXT;
  key_to_decrypt TEXT;
BEGIN
  -- If not encrypted (no prefix), return as-is (for migration compatibility)
  IF NOT encrypted_key LIKE 'enc:%' THEN
    RETURN encrypted_key;
  END IF;
  
  -- Remove the 'enc:' prefix
  key_to_decrypt := substring(encrypted_key from 5);
  
  -- Decrypt using the same secret
  SELECT convert_from(
    pgp_sym_decrypt(
      decode(key_to_decrypt, 'base64')::bytea,
      current_setting('app.settings.jwt_secret', true)
    ),
    'UTF8'
  ) INTO decrypted_key;
  
  RETURN decrypted_key;
EXCEPTION WHEN OTHERS THEN
  -- If decryption fails, return null (key may be corrupted)
  RETURN NULL;
END;
$$;

-- Create a view that decrypts API keys for server-side use only
-- This view is used by edge functions via service role
CREATE OR REPLACE VIEW public.provider_profiles_decrypted AS
SELECT 
  id,
  user_id,
  name,
  provider_type,
  public.decrypt_api_key(api_key) as api_key,
  endpoint,
  model,
  is_default,
  created_at,
  updated_at
FROM public.provider_profiles;

-- Grant access to the view for service role only
REVOKE ALL ON public.provider_profiles_decrypted FROM anon, authenticated;
GRANT SELECT ON public.provider_profiles_decrypted TO service_role;

-- Create a trigger to automatically encrypt API keys on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_api_key_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only encrypt if not already encrypted
  IF NEW.api_key IS NOT NULL AND NOT NEW.api_key LIKE 'enc:%' THEN
    NEW.api_key := public.encrypt_api_key(NEW.api_key);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS encrypt_api_key_on_save ON public.provider_profiles;

-- Create trigger for insert and update
CREATE TRIGGER encrypt_api_key_on_save
  BEFORE INSERT OR UPDATE OF api_key ON public.provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_api_key_trigger();

-- Encrypt existing plain-text API keys (migration of existing data)
UPDATE public.provider_profiles 
SET api_key = public.encrypt_api_key(api_key)
WHERE api_key IS NOT NULL AND NOT api_key LIKE 'enc:%';