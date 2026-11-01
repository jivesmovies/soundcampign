CREATE OR REPLACE FUNCTION public.save_platform_config_field(p_field text, p_value jsonb, p_expected jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg jsonb; defaults jsonb := '{"maintenance":false,"registrations":true,"welcomeBonus":10,"terms":"","faq":"","about":"","testimonials":[],"licenses":[]}'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Only the Super Admin can change platform settings.' USING ERRCODE='42501'; END IF;
 IF p_field NOT IN ('maintenance','registrations','welcomeBonus','terms','faq','about','testimonials','licenses') OR p_value IS NULL THEN RAISE EXCEPTION 'Invalid setting.'; END IF;
 IF p_field IN ('maintenance','registrations') AND jsonb_typeof(p_value) <> 'boolean' THEN RAISE EXCEPTION 'Invalid toggle.'; END IF;
 IF p_field = 'welcomeBonus' THEN
  IF jsonb_typeof(p_value) <> 'number' THEN RAISE EXCEPTION 'Invalid bonus.'; END IF;
  IF (p_value::text)::numeric < 0 THEN RAISE EXCEPTION 'Bonus cannot be negative.'; END IF;
 END IF;
 IF p_field IN ('terms','faq','about') AND (jsonb_typeof(p_value) <> 'string' OR length(p_value::text)>30002) THEN RAISE EXCEPTION 'Invalid page text.'; END IF;
 IF p_field IN ('testimonials','licenses') AND jsonb_typeof(p_value) <> 'array' THEN RAISE EXCEPTION 'Invalid media list.'; END IF;
 INSERT INTO public.platform_settings(key,value) VALUES ('platform_config',defaults) ON CONFLICT(key) DO NOTHING;
 SELECT defaults || value INTO cfg FROM public.platform_settings WHERE key='platform_config' FOR UPDATE;
 IF cfg->p_field IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'This setting changed in another session. Refresh before saving.'; END IF;
 cfg := jsonb_set(cfg,ARRAY[p_field],p_value);
 UPDATE public.platform_settings SET value=cfg,updated_at=now() WHERE key='platform_config';
 RETURN cfg;
END; $$;
GRANT EXECUTE ON FUNCTION public.save_platform_config_field(text,jsonb,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg jsonb; bonus numeric := 10;
BEGIN
 SELECT value INTO cfg FROM public.platform_settings WHERE key='platform_config';
 IF NEW.raw_user_meta_data->>'withdraw_pin' IS NOT NULL THEN NULL; END IF;
 IF coalesce(NEW.raw_user_meta_data->>'invited_by','') <> '' AND coalesce((cfg->>'registrations')::boolean,true)=false THEN RAISE EXCEPTION 'New registrations are currently closed.'; END IF;
 bonus := coalesce((cfg->>'welcomeBonus')::numeric,10);
 INSERT INTO public.profiles(id,username,display_name,balance) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'username',split_part(NEW.email,'@',1)),coalesce(NEW.raw_user_meta_data->>'display_name',split_part(NEW.email,'@',1)),bonus) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'user') ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['platform_settings','trending_songs','announcements','profiles','user_task_settings','user_exclusive_tasks'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END IF;
 END LOOP;
END; $$;

CREATE POLICY "super admin manage platform settings" ON public.platform_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage task settings" ON public.user_task_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage premiums" ON public.user_exclusive_tasks FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage transactions" ON public.mock_transactions FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage announcements" ON public.announcements FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage chat" ON public.support_messages FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage trending" ON public.trending_songs FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage levels" ON public.vip_plans FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admin manage rewards" ON public.user_rewards FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));