-- Supabase RLS layer. The application uses text IDs, so policies resolve the
-- authenticated Supabase identity through its verified email claim.
create or replace function public.current_workspace_user_id()
returns text language sql stable security definer set search_path = public
as $$ select id from "User" where email = auth.jwt() ->> 'email' limit 1 $$;

create or replace function public.current_workspace_role()
returns text language sql stable security definer set search_path = public
as $$ select role::text from "User" where id = public.current_workspace_user_id() $$;

create or replace function public.is_company_member(target_company_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from "CompanyMember" where "companyId" = target_company_id and "userId" = public.current_workspace_user_id()) $$;

alter table "DeliveryCycle" enable row level security;
alter table "Task" enable row level security;
alter table "RequirementDocument" enable row level security;
alter table "AuditEvent" enable row level security;
alter table "Company" enable row level security;

create policy "members read company" on "Company" for select using (public.is_company_member(id));
create policy "admins update company" on "Company" for update using (public.current_workspace_role() = 'admin') with check (public.current_workspace_role() = 'admin');

create policy "members read cycles" on "DeliveryCycle" for select using (exists(select 1 from "Project" p where p.id = "projectId" and public.is_company_member(p."companyId")));
create policy "admins manage cycles" on "DeliveryCycle" for all using (public.current_workspace_role() = 'admin') with check (public.current_workspace_role() = 'admin');

create policy "members read project tasks" on "Task" for select using (exists(select 1 from "Project" p where p.id = "projectId" and public.is_company_member(p."companyId")));
create policy "developers update assigned tasks" on "Task" for update using ("assigneeId" = public.current_workspace_user_id() and public.current_workspace_role() = 'developer') with check ("assigneeId" = public.current_workspace_user_id());
create policy "delivery roles manage tasks" on "Task" for all using (public.current_workspace_role() in ('admin','project_manager','qa','senior_engineer')) with check (public.current_workspace_role() in ('admin','project_manager','qa','senior_engineer'));

create policy "clients read own company documents" on "RequirementDocument" for select using (public.is_company_member("companyId"));
create policy "clients write own documents" on "RequirementDocument" for all using ("authorId" = public.current_workspace_user_id() and public.current_workspace_role() = 'client') with check ("authorId" = public.current_workspace_user_id() and public.current_workspace_role() = 'client');
create policy "admins and planning roles manage documents" on "RequirementDocument" for all using (public.current_workspace_role() in ('admin','project_manager','qa')) with check (public.current_workspace_role() in ('admin','project_manager','qa'));

create policy "members read audit feed" on "AuditEvent" for select using (exists(select 1 from "Task" t join "Project" p on p.id = t."projectId" where t.id = "taskId" and public.is_company_member(p."companyId")));
create policy "server roles write audit events" on "AuditEvent" for insert with check (public.current_workspace_role() in ('admin','project_manager','qa','senior_engineer','developer'));
