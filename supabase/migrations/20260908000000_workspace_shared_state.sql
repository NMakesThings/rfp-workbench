create table public.workspace_shared_state (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (workspace_id, item_key),
  constraint workspace_shared_state_item_key_check check (
    item_key in (
      'answers',
      'reviewDecisions',
      'requirementReviewNotes',
      'projectRoadmap',
      'projectPlanItems',
      'clientSourceDocuments'
    )
  )
);

grant select, insert, update, delete on public.workspace_shared_state to authenticated;

alter table public.workspace_shared_state enable row level security;

create policy "workspace members can select shared state"
on public.workspace_shared_state
for select
using (
  exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = workspace_shared_state.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "workspace members can insert shared state"
on public.workspace_shared_state
for insert
with check (
  exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = workspace_shared_state.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "workspace members can update shared state"
on public.workspace_shared_state
for update
using (
  exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = workspace_shared_state.workspace_id
      and workspace_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = workspace_shared_state.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "workspace members can delete shared state"
on public.workspace_shared_state
for delete
using (
  exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = workspace_shared_state.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);
