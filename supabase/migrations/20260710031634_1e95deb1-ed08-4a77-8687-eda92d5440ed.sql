
-- 1) Assignments: which end-users each admin assistant is scoped to
CREATE TABLE public.admin_assistant_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assistant_id, target_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_assistant_user_assignments TO authenticated;
GRANT ALL ON public.admin_assistant_user_assignments TO service_role;

ALTER TABLE public.admin_assistant_user_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assistant user assignments"
  ON public.admin_assistant_user_assignments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Assistants view their own assignments"
  ON public.admin_assistant_user_assignments
  FOR SELECT TO authenticated
  USING (assistant_id = auth.uid());

CREATE INDEX idx_aaua_assistant ON public.admin_assistant_user_assignments(assistant_id);
CREATE INDEX idx_aaua_target ON public.admin_assistant_user_assignments(target_user_id);

CREATE TRIGGER update_aaua_updated_at
  BEFORE UPDATE ON public.admin_assistant_user_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Helper: is the current user allowed to access this target user?
CREATE OR REPLACE FUNCTION public.assistant_can_access_user(_target UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_assistant_user_assignments
    WHERE assistant_id = auth.uid() AND target_user_id = _target
  )
$$;

-- 3) Audit trigger for admin_assistant_permissions (add / remove / change)
CREATE OR REPLACE FUNCTION public.audit_admin_assistant_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
  _action TEXT;
  _target UUID;
  _details JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'assistant_permissions_granted';
    _target := NEW.user_id;
    _details := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'assistant_permissions_updated';
    _target := NEW.user_id;
    _details := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    _action := 'assistant_permissions_revoked';
    _target := OLD.user_id;
    _details := to_jsonb(OLD);
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (_actor, _action, 'admin_assistant_permissions', _target::text, _details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_admin_assistant_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.admin_assistant_permissions
FOR EACH ROW EXECUTE FUNCTION public.audit_admin_assistant_permissions();

-- 4) Audit trigger for assistant<->user assignments
CREATE OR REPLACE FUNCTION public.audit_assistant_user_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
  _action TEXT;
  _details JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'assistant_user_assigned';
    _details := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'assistant_user_assignment_updated';
    _details := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    _action := 'assistant_user_unassigned';
    _details := to_jsonb(OLD);
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, details)
  VALUES (_actor, _action, 'admin_assistant_user_assignments',
          COALESCE(NEW.assistant_id, OLD.assistant_id)::text, _details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_assistant_user_assignments
AFTER INSERT OR UPDATE OR DELETE ON public.admin_assistant_user_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_assistant_user_assignments();
