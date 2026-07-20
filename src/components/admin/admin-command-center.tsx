"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Check,
  ChevronRight,
  Clock3,
  FileJson,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MoonStar,
  RotateCcw,
  Search,
  ShieldAlert,
  Sunrise,
  UserPlus,
  UserRoundCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import {
  approveAccessRequest,
  bypassReviewGate,
  createDeliveryCycle,
  createWorkspaceUser,
  lockCycleScope,
  overrideAiTaskPlan,
  reassignTask,
  rejectAccessRequest,
  removeWorkspaceUser,
  resendAccountSetup,
  updateWorkspaceUser,
  updateClientCapacity,
  updateCycleStatus,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CycleStatus =
  | "intake_open"
  | "scope_locked"
  | "in_sprint"
  | "dawn_delivery";
type Props = {
  userId: string;
  userName: string;
  companies: { id: string; name: string; capacityLimit: number }[];
  projects: { id: string; name: string; company: { name: string } }[];
  cycles: {
    id: string;
    date: string;
    status: CycleStatus;
    isActive: boolean;
    scopeLockedAt: string | null;
    project: {
      name: string;
      company: { name: string; capacityLimit: number };
    } | null;
    _count: { tasks: number };
  }[];
  tasks: {
    id: string;
    key: string;
    title: string;
    status: string;
    aiParsedChecklist: unknown;
    updatedAt: string;
    project: { name: string; companyId: string };
    assignee: { id: string; name: string | null; email: string | null } | null;
  }[];
  developers: {
    id: string;
    name: string | null;
    email: string | null;
    companyMemberships: { companyId: string }[];
  }[];
  audit: {
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string | null; email: string | null };
    task: { key: string; title: string } | null;
  }[];
  pendingUsers: {
    id: string;
    name: string | null;
    email: string | null;
    createdAt: string;
  }[];
  people: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    disabledAt: string | null;
    hasPassword: boolean;
    setupEmailSent: boolean;
    roleAssignments: { role: string }[];
    companyMemberships: { companyId: string; company: { name: string } }[];
  }[];
};

const cycleSteps: { id: CycleStatus; label: string }[] = [
  { id: "intake_open", label: "Intake open" },
  { id: "scope_locked", label: "Scope locked" },
  { id: "in_sprint", label: "In sprint" },
  { id: "dawn_delivery", label: "Dawn delivery" },
];

export function AdminCommandCenter(props: Props) {
  const [section, setSection] = useState<
    "overview" | "access" | "cycles" | "dispatch" | "review" | "audit"
  >("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const reviewTasks = props.tasks.filter(
    (task) => task.status === "pending_senior_review",
  );
  const nav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "access", label: "People & access", icon: UserRoundCheck },
    { id: "cycles", label: "Delivery cycles", icon: MoonStar },
    { id: "dispatch", label: "Task dispatch", icon: ArrowRightLeft },
    { id: "review", label: "Review fallback", icon: ShieldAlert },
    { id: "audit", label: "Audit log", icon: Activity },
  ] as const;
  return (
    <main className="min-h-dvh bg-[#f4f7f4] text-slate-900">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-72 flex-col overflow-hidden border-r border-emerald-700 bg-[#1D4B3B] text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/15 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white">
            <Sunrise className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-white">Lumetha</p>
            <p className="text-[10px] uppercase tracking-[.18em] text-emerald-50/70">
              Admin command center
            </p>
          </div>
          <button
            className="ml-auto text-white/70 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-hidden px-3 py-6">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setMobileOpen(false);
              }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${section === id ? "bg-white font-medium text-emerald-800 shadow-sm" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "access" && props.pendingUsers.length > 0 && (
                <span className="ml-auto rounded-full bg-[#1D4B3B] px-2 py-0.5 text-[10px] font-bold text-white">
                  {props.pendingUsers.length}
                </span>
              )}
              {id === "review" && reviewTasks.length > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {reviewTasks.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/15 bg-[#1D4B3B] p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-semibold text-white">
              {props.userName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {props.userName}
              </p>
              <p className="text-[10px] text-emerald-50/65">
                System administrator
              </p>
            </div>
          </div>
          <form action={logout}>
            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-emerald-50/80 hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-h-dvh lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 rounded-lg border p-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-emerald-700">
              Operations
            </p>
            <h1 className="mt-1 text-lg font-semibold">
              {nav.find((item) => item.id === section)?.label}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live · all systems
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
          {section === "overview" && (
            <Overview
              {...props}
              reviewCount={reviewTasks.length}
              onNavigate={setSection}
            />
          )}
          {section === "access" && (
            <AccessControl
              userId={props.userId}
              pendingUsers={props.pendingUsers}
              companies={props.companies}
              people={props.people}
            />
          )}
          {section === "cycles" && (
            <CycleManager cycles={props.cycles} projects={props.projects} />
          )}
          {section === "dispatch" && (
            <Dispatch
              tasks={props.tasks}
              developers={props.developers}
              companies={props.companies}
            />
          )}
          {section === "review" && <ReviewFallback tasks={reviewTasks} />}
          {section === "audit" && <AuditFeed events={props.audit} />}
        </div>
      </div>
    </main>
  );
}

function Overview({
  cycles,
  tasks,
  companies,
  developers,
  pendingUsers,
  reviewCount,
  onNavigate,
}: Props & {
  reviewCount: number;
  onNavigate: (value: "access" | "cycles" | "dispatch" | "review") => void;
}) {
  const active = cycles.find((cycle) => cycle.isActive);
  const stats = [
    {
      label: "Active cycle",
      value: active
        ? (cycleSteps.find((s) => s.id === active.status)?.label ??
          active.status)
        : "Not started",
      detail: active?.project?.name ?? "Create tonight’s cycle",
      icon: MoonStar,
    },
    {
      label: "Tasks in flight",
      value: String(tasks.filter((t) => t.status === "in_progress").length),
      detail: `${tasks.length} total open`,
      icon: Boxes,
    },
    {
      label: "Review blockers",
      value: String(reviewCount),
      detail: "Awaiting senior validation",
      icon: ShieldAlert,
    },
    {
      label: "Developer pod",
      value: String(developers.length),
      detail: `${companies.length} client workspaces`,
      icon: Users,
    },
  ];
  return (
    <>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight">Good evening.</h2>
        <p className="mt-1 text-sm text-slate-500">
          A focused view of access, capacity, delivery, and review exceptions.
        </p>
      </div>
      {pendingUsers.length > 0 && (
        <button
          onClick={() => onNavigate("access")}
          className="mb-5 flex w-full items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <UserRoundCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-950">
              {pendingUsers.length} access{" "}
              {pendingUsers.length === 1 ? "request" : "requests"} awaiting
              review
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Approve a company role or remove the request.
            </p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 text-amber-700" />
        </button>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon }) => (
          <Card
            key={label}
            className="rounded-2xl border-slate-200 shadow-none"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6 rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Operations</CardTitle>
          <CardDescription>
            Only the controls that need attention tonight.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <QuickAction
            title="Manage cycle"
            detail="Lock scope or move the overnight sprint forward."
            onClick={() => onNavigate("cycles")}
          />
          <QuickAction
            title="Dispatch the pod"
            detail="Assign work and adjust AI task plans."
            onClick={() => onNavigate("dispatch")}
          />
          <QuickAction
            title="Clear review blockers"
            detail="Use audited fallback controls for stuck work."
            onClick={() => onNavigate("review")}
          />
        </CardContent>
      </Card>
    </>
  );
}

const roleOptions = [
  { value: "developer", label: "Developer" },
  { value: "client", label: "Client" },
  { value: "qa", label: "QA engineer" },
  { value: "project_manager", label: "Project manager" },
  { value: "senior_engineer", label: "Senior reviewer" },
  { value: "admin", label: "Lumetha admin" },
];

function AccessControl({
  userId,
  pendingUsers,
  companies,
  people,
}: Pick<Props, "userId" | "pendingUsers" | "companies" | "people">) {
  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-tight">
          People & access
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Create managed accounts or review people who registered themselves.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Pending requests</h3>
              <p className="mt-1 text-xs text-slate-500">
                No workspace data is visible until you approve a role.
              </p>
            </div>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600">
              {pendingUsers.length} pending
            </span>
          </div>
          {pendingUsers.length ? (
            pendingUsers.map((pending) => (
              <Card key={pending.id} className="rounded-2xl shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                      {(pending.name ?? pending.email ?? "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {pending.name ?? "Unnamed account"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {pending.email}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Requested {new Date(pending.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_1fr_auto_auto]">
                    <form action={approveAccessRequest} className="contents">
                      <input type="hidden" name="userId" value={pending.id} />
                      <select
                        name="companyId"
                        required
                        defaultValue=""
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      >
                        <option value="" disabled>
                          Select company
                        </option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      <RoleCheckboxes defaults={["client"]} compact />
                      <Button
                        size="sm"
                        className="bg-emerald-700 text-white hover:bg-[#1D4B3B] hover:text-white"
                      >
                        <Check />
                        Approve
                      </Button>
                    </form>
                    <form action={rejectAccessRequest}>
                      <input type="hidden" name="userId" value={pending.id} />
                      <Button
                        size="sm"
                        variant="outline"
                        title="Permanently remove this pending registration"
                        className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle />
                        Remove
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl border-dashed p-12 text-center shadow-none">
              <UserRoundCheck className="mx-auto h-8 w-8 text-[#1D4B3B]" />
              <p className="mt-3 text-sm font-medium">
                No pending access requests
              </p>
              <p className="mt-1 text-xs text-slate-500">
                New registrations will wait here for your decision.
              </p>
            </Card>
          )}
        </section>
        <Card className="h-fit rounded-2xl shadow-none">
          <CardHeader>
            <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-[#e7efe9] text-[#28533b]">
              <UserPlus className="h-5 w-5" />
            </span>
            <CardTitle className="text-base">Create a managed user</CardTitle>
            <CardDescription>
              Assign one or more roles. A private, one-time password setup link
              is sent directly to the user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createWorkspaceUser} className="space-y-3">
              <label className="block text-[11px] font-semibold text-slate-600">
                Full name
                <Input
                  name="name"
                  required
                  minLength={2}
                  className="mt-1"
                  placeholder="Jane Doe"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Work email
                <Input
                  name="email"
                  type="email"
                  required
                  className="mt-1"
                  placeholder="jane@company.com"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Company
                <select
                  name="companyId"
                  required
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-[11px] font-semibold text-slate-600">Workspace roles</legend>
                <RoleCheckboxes defaults={["developer"]} />
              </fieldset>
              <Button className="mt-2 w-full bg-[#1D4B3B] text-white hover:bg-emerald-500 hover:text-white">
                <UserPlus />
                Create user
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-semibold">Lumetha people</h3>
            <p className="mt-1 text-xs text-slate-500">Edit identity, company, and any combination of roles. Passwords are never displayed or required here.</p>
          </div>
          <span className="text-xs text-slate-500">{people.length} people</span>
        </div>
        <PeopleDirectory people={people} companies={companies} currentUserId={userId} />
      </section>
    </div>
  );
}

function PeopleDirectory({ people, companies, currentUserId }: { people: Props["people"]; companies: Props["companies"]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [setupFilter, setSetupFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const filtered = useMemo(() => people.filter((person) => {
    const roles = person.roleAssignments.length ? person.roleAssignments.map(({ role }) => role) : [person.role];
    const matchesQuery = `${person.name ?? ""} ${person.email ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesRole = roleFilter === "all" || roles.includes(roleFilter);
    const matchesCompany = companyFilter === "all" || person.companyMemberships.some(({ companyId }) => companyId === companyFilter);
    const matchesSetup = setupFilter === "all" || (setupFilter === "active" ? person.hasPassword : !person.hasPassword);
    return matchesQuery && matchesRole && matchesCompany && matchesSetup;
  }), [people, query, roleFilter, companyFilter, setupFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const resetPage = () => setPage(1);

  return (
    <Card className="overflow-hidden rounded-2xl shadow-none">
      <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_170px]">
        <label className="relative"><span className="sr-only">Search people</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} placeholder="Search name or email…" className="bg-white pl-9" /></label>
        <FilterSelect label="Filter by role" value={roleFilter} onChange={(value) => { setRoleFilter(value); resetPage(); }} options={[{ value: "all", label: "All roles" }, ...roleOptions]} />
        <FilterSelect label="Filter by company" value={companyFilter} onChange={(value) => { setCompanyFilter(value); resetPage(); }} options={[{ value: "all", label: "All companies" }, ...companies.map(({ id, name }) => ({ value: id, label: name }))]} />
        <FilterSelect label="Filter by setup status" value={setupFilter} onChange={(value) => { setSetupFilter(value); resetPage(); }} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Account active" }, { value: "pending", label: "Setup pending" }]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-white text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-semibold">Person</th><th className="px-4 py-3 font-semibold">Company</th><th className="px-4 py-3 font-semibold">Roles</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Manage</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((person) => {
              const roles = person.roleAssignments.length ? person.roleAssignments.map(({ role }) => role) : [person.role];
              const membership = person.companyMemberships[0];
              return (
                <tr key={person.id} className="align-top hover:bg-emerald-50/20">
                  <td className="px-5 py-4"><p className="font-semibold text-slate-900">{person.name ?? "Unnamed"}</p><p className="mt-0.5 text-xs text-slate-500">{person.email}</p></td>
                  <td className="px-4 py-4 text-xs text-slate-600">{membership?.company.name ?? "—"}</td>
                  <td className="px-4 py-4"><div className="flex max-w-xs flex-wrap gap-1">{roles.map((role) => <span key={role} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">{roleOptions.find((item) => item.value === role)?.label ?? role}</span>)}</div></td>
                  <td className="px-4 py-4"><span className={`text-xs font-medium ${person.hasPassword ? "text-emerald-700" : "text-amber-700"}`}>{person.hasPassword ? "Active" : person.setupEmailSent ? "Invite sent" : "Invite pending"}</span></td>
                  <td className="px-5 py-3 text-right">
                    <details className="group inline-block text-left"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-emerald-300">Edit</summary><div className="mt-2 w-[420px] rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
                      <form action={updateWorkspaceUser} className="space-y-3"><input type="hidden" name="userId" value={person.id} /><div className="grid gap-3 sm:grid-cols-2"><Input name="name" required minLength={2} defaultValue={person.name ?? ""} aria-label="Full name" /><Input name="email" type="email" required defaultValue={person.email ?? ""} aria-label="Work email" /></div><select name="companyId" required defaultValue={membership?.companyId} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><RoleCheckboxes defaults={roles} /><Button size="sm" className="bg-[#1D4B3B] text-white hover:bg-emerald-700 hover:text-white">Save changes</Button></form>
                      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3"><form action={resendAccountSetup}><input type="hidden" name="userId" value={person.id} /><Button size="sm" variant="outline">Send setup link</Button></form>{person.id !== currentUserId && person.email !== "lumethaadmin@lumetha.lu" && <form action={removeWorkspaceUser}><input type="hidden" name="userId" value={person.id} /><Button size="sm" variant="outline" className="border-rose-200 text-rose-700">Remove access</Button></form>}</div>
                    </div></details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && <p className="p-10 text-center text-sm text-slate-500">No people match these filters.</p>}
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-xs text-slate-500"><span>Showing {visible.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><Button size="sm" variant="outline" disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button></div></div>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function RoleCheckboxes({ defaults, compact = false }: { defaults: string[]; compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "mt-2 grid-cols-2 sm:grid-cols-3"}`}>
      {roleOptions.map((role) => (
        <label key={role.value} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-medium text-slate-700">
          <input type="checkbox" name="roles" value={role.value} defaultChecked={defaults.includes(role.value)} className="accent-[#1D4B3B]" />
          {role.label}
        </label>
      ))}
    </div>
  );
}

function QuickAction({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50/40"
    >
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
    </button>
  );
}

function CycleManager({
  cycles,
  projects,
}: Pick<Props, "cycles" | "projects">) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {cycles.length ? (
          cycles.map((cycle) => (
            <Card key={cycle.id} className="rounded-2xl shadow-none">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {cycle.project?.company.name ?? "Unassigned"} ·{" "}
                      {cycle.project?.name ?? "Cycle"}
                    </CardTitle>
                    <CardDescription>
                      {new Date(cycle.date).toLocaleDateString()} ·{" "}
                      {cycle._count.tasks}/
                      {cycle.project?.company.capacityLimit ?? 0} capacity
                    </CardDescription>
                  </div>
                  {cycle.isActive && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-4">
                  {cycleSteps.map((step, index) => (
                    <form key={step.id} action={updateCycleStatus}>
                      <input type="hidden" name="cycleId" value={cycle.id} />
                      <input type="hidden" name="status" value={step.id} />
                      <button
                        className={`w-full rounded-xl border p-3 text-left ${cycle.status === step.id ? "border-[#1D4B3B] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <span className="block text-[10px] font-semibold text-slate-400">
                          0{index + 1}
                        </span>
                        <span className="mt-1 block text-xs font-semibold">
                          {step.label}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
                {cycle.status === "intake_open" && (
                  <form
                    action={lockCycleScope}
                    className="mt-4 flex justify-end"
                  >
                    <input type="hidden" name="cycleId" value={cycle.id} />
                    <Button className="rounded-xl bg-amber-500 text-amber-950 hover:bg-amber-400">
                      <LockKeyhole />
                      Lock scope
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-2xl p-10 text-center shadow-none">
            <MoonStar className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 text-sm font-medium">No delivery cycles yet</p>
          </Card>
        )}
      </div>
      <Card className="h-fit rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Open a delivery cycle</CardTitle>
          <CardDescription>
            Start intake for a project and date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDeliveryCycle} className="space-y-3">
            <select
              name="projectId"
              required
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.company.name} · {project.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              name="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Button className="w-full bg-[#1D4B3B] text-white hover:bg-emerald-500 hover:text-white">
              Open intake
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dispatch({
  tasks,
  developers,
  companies,
}: Pick<Props, "tasks" | "developers" | "companies">) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Client capacity</CardTitle>
          <CardDescription>
            Limit how much work can enter one overnight cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <form
              action={updateClientCapacity}
              key={company.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{company.name}</p>
                <p className="text-[10px] text-slate-500">Tasks per cycle</p>
              </div>
              <Input
                name="capacityLimit"
                type="number"
                min="1"
                max="100"
                defaultValue={company.capacityLimit}
                className="w-20"
              />
              <Button size="sm" variant="outline">
                Save
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>
      <div className="space-y-3">
        {tasks.map((task) => {
          const eligible = developers.filter((developer) =>
            developer.companyMemberships.some(
              (m) => m.companyId === task.project.companyId,
            ),
          );
          return (
            <Card key={task.id} className="rounded-2xl shadow-none">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-slate-400">
                      {task.key} · {task.project.name}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{task.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.status.replaceAll("_", " ")} · Updated{" "}
                      {new Date(task.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <form action={reassignTask} className="flex gap-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <select
                      name="developerId"
                      required
                      defaultValue={task.assignee?.id ?? ""}
                      className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    >
                      <option value="" disabled>
                        Assign developer
                      </option>
                      {eligible.map((developer) => (
                        <option key={developer.id} value={developer.id}>
                          {developer.name ?? developer.email}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline">
                      <ArrowRightLeft />
                      Assign
                    </Button>
                  </form>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing(editing === task.id ? null : task.id)
                    }
                  >
                    <FileJson />
                    Edit AI plan
                  </Button>
                </div>
                {editing === task.id && (
                  <form
                    action={overrideAiTaskPlan}
                    className="mt-4 border-t border-slate-100 pt-4"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <textarea
                      name="taskJson"
                      required
                      defaultValue={JSON.stringify(
                        task.aiParsedChecklist ?? [],
                        null,
                        2,
                      )}
                      className="min-h-52 w-full rounded-xl border border-slate-200 bg-emerald-50 p-4 font-mono text-xs leading-5 text-emerald-900"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        className="bg-[#1D4B3B] text-white hover:bg-emerald-500 hover:text-white"
                      >
                        Validate & save override
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ReviewFallback({ tasks }: { tasks: Props["tasks"] }) {
  return (
    <div>
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-950">
              Emergency control
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Bypassing senior review is permanently audited. Use only when the
              normal review path is blocked and a verified deployment is ready.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <Card key={task.id} className="rounded-2xl shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {task.key} · {task.project.name}
                    </p>
                  </div>
                </div>
                <form
                  action={bypassReviewGate}
                  className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <input type="hidden" name="taskId" value={task.id} />
                  <Input
                    name="deploymentUrl"
                    type="url"
                    required
                    placeholder="https://verified-staging.example"
                  />
                  <Input
                    name="reason"
                    required
                    minLength={15}
                    placeholder="Why the normal review gate is unavailable"
                  />
                  <Button className="bg-rose-700 hover:bg-rose-600">
                    <RotateCcw />
                    Bypass & ship
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-2xl p-12 text-center shadow-none">
            <ShieldAlert className="mx-auto h-7 w-7 text-[#1D4B3B]" />
            <p className="mt-3 text-sm font-medium">No blocked reviews</p>
            <p className="mt-1 text-xs text-slate-500">
              The senior review queue is clear.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AuditFeed({ events }: { events: Props["audit"] }) {
  return (
    <Card className="rounded-2xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Immutable operations trail</CardTitle>
        <CardDescription>
          Cycle, dispatch, override, and review-gate events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-slate-200">
          {events.map((event) => (
            <div key={event.id} className="relative flex gap-4 py-3">
              <span className="z-10 mt-1 h-8 w-8 shrink-0 rounded-full border-4 border-white bg-emerald-500" />
              <div>
                <p className="text-sm font-medium">
                  {event.action.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.task
                    ? `${event.task.key} · ${event.task.title} · `
                    : ""}
                  {event.actor.name ?? event.actor.email} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
