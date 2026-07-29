CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  instagram text,
  customer_type text NOT NULL DEFAULT 'new',
  city text,
  service_id text NOT NULL,
  service_name text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  appointment_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration_minutes integer NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  deposit_amount numeric(10,2) NOT NULL,
  remaining_balance numeric(10,2) NOT NULL,
  deposit_status text NOT NULL DEFAULT 'unpaid',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'website'
);
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT, UPDATE ON public.bookings TO authenticated;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'contact',
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  message text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'website'
);
GRANT ALL ON public.leads TO service_role;
GRANT SELECT, UPDATE ON public.leads TO authenticated;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));

CREATE INDEX bookings_date_idx ON public.bookings (appointment_date, start_time);
CREATE INDEX leads_created_idx ON public.leads (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();