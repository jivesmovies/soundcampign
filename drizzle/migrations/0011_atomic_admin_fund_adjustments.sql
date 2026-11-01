CREATE OR REPLACE FUNCTION public.admin_adjust_account_funds(p_user uuid,p_delta numeric,p_earned_delta numeric DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'admin') AND public.admin_owns_training(auth.uid(),p_user))) THEN RAISE EXCEPTION 'You can only manage accounts within your administrator permissions.' USING ERRCODE='42501'; END IF;
 IF p_delta IS NULL OR p_earned_delta IS NULL OR p_delta::text IN ('NaN','Infinity','-Infinity') OR p_earned_delta::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Enter a valid fund amount.'; END IF;
 UPDATE public.profiles SET balance=round(balance+p_delta,2), total_earned=round(total_earned+p_earned_delta,2), updated_at=now() WHERE id=p_user RETURNING jsonb_build_object('balance',balance,'total_earned',total_earned) INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Account not found.'; END IF;
 RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_account_funds(uuid,numeric,numeric) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg jsonb; bonus numeric := 10;
BEGIN
 SELECT value INTO cfg FROM public.platform_settings WHERE key='platform_config';
 IF auth.role() IS DISTINCT FROM 'service_role' AND coalesce((cfg->>'registrations')::boolean,true)=false THEN RAISE EXCEPTION 'New registrations are currently closed.'; END IF;
 bonus := coalesce((cfg->>'welcomeBonus')::numeric,10);
 INSERT INTO public.profiles(id,username,display_name,balance) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'username',split_part(NEW.email,'@',1)),coalesce(NEW.raw_user_meta_data->>'display_name',split_part(NEW.email,'@',1)),bonus) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'user') ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;