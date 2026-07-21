"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  ClipboardCheck,
  CloudMoon,
  Code2,
  ExternalLink,
  FileText,
  GitBranch,
  LayoutGrid,
  Link2,
  LogOut,
  Menu,
  MoonStar,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { DaybreakStatus } from "@/lib/daybreak";

type Checklist = {
  acceptanceCriteria: boolean;
  testsPassing: boolean;
  securityReviewed: boolean;
};
type WorkItem = {
  id: string;
  key: string;
  title: string;
  brief: string;
  status: DaybreakStatus;
  priority: "Urgent" | "High" | "Normal";
  tags: string[];
  assignee?: string;
  attachments: string[];
  attachmentRecords?: { id: string; name: string; size: number | null }[];
  checklist: { title: string; done: boolean }[];
  summary?: string;
  repositoryUrl?: string;
  deploymentUrl?: string;
  review?: Checklist;
};

type ApiTask = {
  id: string;
  key: string;
  title: string;
  rawBrief: string;
  description: string | null;
  status: DaybreakStatus;
  priority: "low" | "medium" | "high" | "critical";
  aiParsedChecklist: unknown;
  technicalSummary: string | null;
  repositoryUrl: string | null;
  deploymentUrl: string | null;
  reviewChecklist: unknown;
  assignee: { name: string | null; email: string | null } | null;
  attachments?: { id: string; name: string; size: number | null }[];
  pullRequests?: { pullNumber: number; repository: string; state: string; isDraft: boolean }[];
};

type WorkspaceNotification = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  task: { key: string; title: string } | null;
};

const stages: {
  id: DaybreakStatus;
  label: string;
  hint: string;
  icon: typeof MoonStar;
  color: string;
  wash: string;
}[] = [
  {
    id: "dusk_intake",
    label: "Dusk intake",
    hint: "Client briefs",
    icon: MoonStar,
    color: "text-violet-700",
    wash: "bg-violet-50",
  },
  {
    id: "in_progress",
    label: "In progress",
    hint: "Building overnight",
    icon: Code2,
    color: "text-blue-700",
    wash: "bg-blue-50",
  },
  {
    id: "pending_senior_review",
    label: "Senior review",
    hint: "Human validation",
    icon: ShieldCheck,
    color: "text-amber-700",
    wash: "bg-amber-50",
  },
  {
    id: "dawn_shipped",
    label: "Dawn shipped",
    hint: "Ready by morning",
    icon: Sunrise,
    color: "text-emerald-700",
    wash: "bg-emerald-50",
  },
];

const isReview = (value: unknown): value is Checklist => {
  if (!value || typeof value !== "object") return false;
  const review = value as Record<string, unknown>;
  return ["acceptanceCriteria", "testsPassing", "securityReviewed"].every(
    (key) => typeof review[key] === "boolean",
  );
};

const toWorkItem = (task: ApiTask): WorkItem => {
  const parsed = Array.isArray(task.aiParsedChecklist)
    ? task.aiParsedChecklist
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as Record<string, unknown>;
          const title = item.title ?? item.description;
          return typeof title === "string" ? { title, done: false } : null;
        })
        .filter((entry): entry is { title: string; done: boolean } => Boolean(entry))
    : [];
  const assigneeName = task.assignee?.name ?? task.assignee?.email;
  return {
    id: task.id,
    key: task.key,
    title: task.title,
    brief: task.rawBrief || task.description || "No brief supplied.",
    status: task.status,
    priority:
      task.priority === "critical"
        ? "Urgent"
        : task.priority === "high"
          ? "High"
          : "Normal",
    tags: task.pullRequests?.length
      ? ["Delivery task", `PR ${task.pullRequests[0].state}`]
      : ["Delivery task"],
    assignee: assigneeName
      ?.split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    attachments: task.attachments?.map((attachment) => attachment.name) ?? [],
    attachmentRecords: task.attachments,
    checklist: parsed,
    summary: task.technicalSummary ?? undefined,
    repositoryUrl: task.repositoryUrl ?? undefined,
    deploymentUrl: task.deploymentUrl ?? undefined,
    review: isReview(task.reviewChecklist) ? task.reviewChecklist : undefined,
  };
};
const nextStatus: Partial<Record<DaybreakStatus, DaybreakStatus>> = {
  dusk_intake: "in_progress",
  in_progress: "pending_senior_review",
};

export function LumethaWorkspace({
  userName,
  companyId,
  projectId,
  companyName,
  canReview = false,
  role = "developer",
}: {
  userName: string;
  companyId?: string;
  projectId?: string;
  companyName?: string;
  companyDomain?: string | null;
  canReview?: boolean;
  role?:
    | "client"
    | "developer"
    | "qa"
    | "project_manager"
    | "senior_engineer"
    | "admin";
}) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState(false);
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [menu, setMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [view, setView] = useState<"board" | "shipped">("board");

  useEffect(() => {
    let active = true;
    const loadTasks = async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const response = await fetch(
          projectId ? `/api/projects/${projectId}/tasks` : "/api/tasks",
        );
        const body = (await response.json()) as ApiTask[] | { error?: string };
        if (!response.ok || !Array.isArray(body)) {
          throw new Error(!Array.isArray(body) ? body.error : undefined);
        }
        if (active) setItems(body.map(toWorkItem));
      } catch (error) {
        if (active)
          setNotice(
            error instanceof Error && error.message
              ? error.message
              : "Unable to load this delivery board.",
          );
      } finally {
        if (active && !quiet) setLoading(false);
      }
    };
    void loadTasks();
    const timer = window.setInterval(() => void loadTasks(true), 15_000);
    const onFocus = () => void loadTasks(true);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const body = (await response.json()) as WorkspaceNotification[];
      if (active) setNotifications(body);
    };
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 20_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const markNotificationsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date().toISOString() })));
  };

  const visible = useMemo(
    () =>
      items.filter((item) =>
        `${item.key} ${item.title} ${item.brief} ${item.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const update = (id: string, patch: Partial<WorkItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setSelected((current) =>
      current?.id === id ? { ...current, ...patch } : current,
    );
  };
  const advance = async (item: WorkItem) => {
    const target = nextStatus[item.status];
    const status = target ?? (item.status === "pending_senior_review" ? "dawn_shipped" : undefined);
    if (!status) return;
    setNotice("Saving lifecycle update…");
    const response = await fetch(`/api/tasks/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        technicalSummary: item.summary || null,
        repositoryUrl: item.repositoryUrl || null,
        deploymentUrl: item.deploymentUrl || null,
        ...(status === "dawn_shipped" ? { reviewChecklist: item.review } : {}),
      }),
    });
    const body = (await response.json()) as ApiTask | { error?: string };
    if (!response.ok || !("id" in body)) {
      setNotice("error" in body && body.error ? body.error : "Unable to update task.");
      return;
    }
    const saved = toWorkItem(body);
    setItems((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)));
    setSelected(saved);
    setNotice("Task updated for the whole workspace.");
  };
  const add = async (
    title: string,
    brief: string,
    priority: WorkItem["priority"],
    attachments: string[],
  ) => {
    if (!projectId) {
      setNotice("Create a project before adding delivery work.");
      return;
    }
    const number = Math.max(0, ...items.map((item) => Number(item.key.match(/(\d+)$/)?.[1]) || 0)) + 1;
    const response = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        rawBrief: brief,
        key: `DAY-${String(number).padStart(3, "0")}`,
        priority: priority === "Urgent" ? "critical" : priority.toLowerCase(),
        type: "task",
      }),
    });
    const body = (await response.json()) as ApiTask | { error?: string };
    if (!response.ok || !("id" in body)) {
      setNotice("error" in body && body.error ? body.error : "Unable to create task.");
      return;
    }
    setItems((current) => [toWorkItem(body), ...current]);
    if (attachments.length) setNotice("Task saved. File uploads are not enabled yet; add links in the brief.");
    else setNotice("Task added to the shared Dusk Intake.");
    setComposer(false);
  };
  const initials = userName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (role === "client")
    return (
      <ClientPortal
        userName={userName}
        companyId={companyId}
        projectId={projectId}
        companyName={companyName}
      />
    );
  if (role === "admin")
    return (
      <AdminPortal
        userName={userName}
        companyId={companyId}
        companyName={companyName}
      />
    );

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#17221d]">
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
        />
      )}
      <aside
        aria-label="Mobile workspace navigation"
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-[min(18rem,88vw)] flex-col border-r border-emerald-700 bg-[#1D4B3B] text-white transition-transform lg:hidden ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-white/15 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Sunrise className="h-5 w-5" /></span>
          <div><p className="font-semibold">Lumetha</p><p className="text-[11px] text-emerald-50/65">Daybreak workspace</p></div>
          <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="ml-auto rounded-lg p-2 text-white/75"><X className="h-5 w-5" /></button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-50/60">Overnight cycle</p>
          <SideButton active={view === "board"} icon={LayoutGrid} label="Daybreak board" count={items.filter((item) => item.status !== "dawn_shipped").length} onClick={() => { setView("board"); setMobileNavOpen(false); }} />
          <SideButton active={view === "shipped"} icon={Sunrise} label="Dawn archive" count={items.filter((item) => item.status === "dawn_shipped").length} onClick={() => { setView("shipped"); setMobileNavOpen(false); }} />
          {canReview && <SideButton active={false} icon={ClipboardCheck} label="Review queue" count={items.filter((item) => item.status === "pending_senior_review").length} onClick={() => { setView("board"); setQuery(""); setMobileNavOpen(false); }} />}
        </nav>
        <form action={logout} className="shrink-0 border-t border-white/15 p-4">
          <button className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-emerald-50/85 hover:bg-white/10"><LogOut className="h-4 w-4" />Sign out</button>
        </form>
      </aside>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-emerald-700 bg-[#1D4B3B] text-white lg:flex">
          <div className="flex h-[72px] items-center gap-3 border-b border-white/15 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white">
              <Sunrise className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Lumetha</p>
              <p className="text-[11px] text-[#78827c]">Daybreak workspace</p>
            </div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-50/60">
              Overnight cycle
            </p>
            <SideButton
              active={view === "board"}
              icon={LayoutGrid}
              label="Daybreak board"
              count={items.filter((i) => i.status !== "dawn_shipped").length}
              onClick={() => setView("board")}
            />
            <SideButton
              active={view === "shipped"}
              icon={Sunrise}
              label="Dawn archive"
              count={items.filter((i) => i.status === "dawn_shipped").length}
              onClick={() => setView("shipped")}
            />
            {canReview && (
              <SideButton
                active={false}
                icon={ClipboardCheck}
                label="Review queue"
                count={
                  items.filter((i) => i.status === "pending_senior_review")
                    .length
                }
                onClick={() => {
                  setView("board");
                  setQuery("");
                }}
              />
            )}
          </nav>
          <div className="shrink-0 border-t border-white/15 bg-[#1D4B3B] p-3">
            <div className="relative">
              <button
                onClick={() => setMenu(!menu)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dce9e1] text-xs font-bold text-[#204733]">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {userName}
                  </span>
                  <span className="block text-xs text-emerald-50/65">
                    {canReview ? "Senior reviewer" : "Delivery member"}
                  </span>
                </span>
                <ChevronDown className="ml-auto h-4 w-4 text-emerald-50/60" />
              </button>
              {menu && (
                <form
                  action={logout}
                  className="absolute bottom-14 left-0 right-0 rounded-xl border border-[#e1e6e1] bg-white p-1 shadow-lg"
                >
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-[#e1e6e1] bg-white/90 px-3 backdrop-blur sm:px-7">
            <button aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#e1e6e1] lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 md:hidden">
              <p className="truncate text-sm font-semibold">{view === "board" ? "Daybreak board" : "Dawn archive"}</p>
              <p className="truncate text-[10px] text-[#7a857e]">{companyName ?? "Lumetha workspace"}</p>
            </div>
            <div className="relative hidden w-80 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a09b]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tonight’s work…"
                className="h-10 w-full rounded-xl border border-[#e3e7e3] bg-[#f8f9f7] pl-9 pr-3 text-sm outline-none focus:border-[#7ca18e] focus:bg-white"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="relative">
                <button
                  aria-label="Open notifications"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative grid h-10 w-10 place-items-center rounded-xl text-[#647068] hover:bg-[#f0f3ef]"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {notifications.some((entry) => !entry.readAt) && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-30 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[#dfe5e0] bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#edf0ed] px-4 py-3">
                      <p className="text-sm font-semibold">Notifications</p>
                      <button onClick={() => void markNotificationsRead()} className="text-[11px] font-medium text-emerald-700">Mark all read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length ? notifications.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            if (entry.task) setQuery(entry.task.key);
                          }}
                          className={`block w-full border-b border-[#f0f2f0] px-4 py-3 text-left last:border-0 ${entry.readAt ? "bg-white" : "bg-emerald-50/60"}`}
                        >
                          <p className="text-xs font-semibold text-[#26352d]">{entry.title}</p>
                          <p className="mt-1 text-[11px] leading-5 text-[#667168]">{entry.message}</p>
                        </button>
                      )) : <p className="px-4 py-8 text-center text-xs text-[#7b877f]">No notifications yet.</p>}
                    </div>
                  </div>
                )}
              </div>
              {(role === "qa" || role === "project_manager") && (
                <button
                  onClick={() => setComposer(true)}
                  className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1D4B3B] px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-500"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create task or bug</span>
                </button>
              )}
            </div>
          </header>

          <div className="mx-auto max-w-[1680px] p-4 sm:p-7">
            <label className="relative mb-4 block md:hidden">
              <span className="sr-only">Search delivery work</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a09b]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tonight’s work…" className="h-11 w-full rounded-xl border border-[#e1e6e1] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#7ca18e]" />
            </label>
            {notice && (
              <div role="status" className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <span>{notice}</span>
                <button aria-label="Dismiss message" onClick={() => setNotice("")}><X className="h-4 w-4" /></button>
              </div>
            )}
            <div className="overflow-hidden rounded-2xl border border-[#dfe6e0] bg-[linear-gradient(135deg,#eef8f1,#deefe4)] px-4 py-5 text-slate-900 shadow-[0_12px_30px_rgba(22,59,44,.12)] sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <CloudMoon className="h-4 w-4" />
                    ACTIVE DELIVERY CYCLE{" "}
                    <span className="h-1 w-1 rounded-full bg-emerald-300" /> JUL
                    20 → JUL 21
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold tracking-[-.02em] sm:text-[28px]">
                    Good evening, {userName.split(" ")[0]}.
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Drop the brief tonight. Wake up to reviewed,
                    production-ready work.
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/70 px-4 py-3 sm:w-auto sm:justify-start sm:gap-6 sm:px-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-800/60">
                      Dawn handoff
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold">
                      06:30 NPT
                    </p>
                  </div>
                  <div className="h-9 w-px bg-emerald-200" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-800/60">
                      Cycle health
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      On track
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#859088]">
                  {companyName ?? "Your workspace"}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {view === "board"
                    ? "Tonight’s delivery board"
                    : "Dawn delivery archive"}
                </h2>
                <p className="mt-1 text-sm text-[#758078]">
                  {view === "board"
                    ? "Every task follows one guarded path from intake to senior approval."
                    : "Reviewed work, previews, and repositories from completed cycles."}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#dfe5e0] bg-white px-3 py-2 text-xs text-[#667168]">
                <CircleDot className="h-3.5 w-3.5 text-[#1D4B3B]" />
                {items.length} deliverables this cycle
              </div>
            </div>

            {loading ? (
              <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-[#dfe5e0] bg-white text-sm text-[#667168]">
                Loading the shared delivery board…
              </div>
            ) : view === "board" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-4">
                {stages.map((stage, index) => {
                  const columnItems = visible.filter(
                    (item) => item.status === stage.id,
                  );
                  const Icon = stage.icon;
                  return (
                    <section
                      key={stage.id}
                      className="min-h-[490px] rounded-2xl border border-[#e0e5e0] bg-[#f0f3ef] p-3"
                    >
                      <div className="flex items-center gap-3 px-1 py-2">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-lg ${stage.wash} ${stage.color}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold">
                            {stage.label}
                          </h3>
                          <p className="text-[11px] text-[#849087]">
                            {stage.hint}
                          </p>
                        </div>
                        <span className="ml-auto rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#68736b]">
                          {columnItems.length}
                        </span>
                        {index < 3 && (
                          <ArrowRight className="hidden h-3.5 w-3.5 text-[#aab2ac] xl:block" />
                        )}
                      </div>
                      <div className="mt-2 space-y-3">
                        {columnItems.map((item) => (
                          <WorkCard
                            key={item.id}
                            item={item}
                            onOpen={() => setSelected(item)}
                            onAdvance={() => advance(item)}
                          />
                        ))}
                      </div>
                      {stage.id === "dusk_intake" &&
                        (role === "qa" || role === "project_manager") && (
                          <button
                            onClick={() => setComposer(true)}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#bec9c1] py-3 text-xs font-medium text-[#627068] hover:border-[#6d927e] hover:bg-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create task or bug
                          </button>
                        )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <Archive
                items={visible.filter((item) => item.status === "dawn_shipped")}
              />
            )}
          </div>
        </section>
      </div>
      {composer && (
        <IntakeModal onClose={() => setComposer(false)} onAdd={add} />
      )}
      {selected && (
        <DetailDrawer
          item={selected}
          canReview={canReview}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => update(selected.id, patch)}
          onAdvance={() => advance(selected)}
          onAttachment={(attachment) => update(selected.id, {
            attachments: [...selected.attachments, attachment.name],
            attachmentRecords: [...(selected.attachmentRecords ?? []), attachment],
          })}
        />
      )}
    </main>
  );
}

type GeneratedTask = {
  title: string;
  description: string;
  discipline: "frontend" | "backend" | "qa" | "delivery";
  technical_requirements: string;
  testing_criteria: string;
  priority: "normal" | "high" | "urgent";
};

function PortalShell({
  userName,
  title,
  subtitle,
  children,
}: {
  userName: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f6f8f6] text-[#17221d]">
      <header className="flex h-[72px] items-center border-b border-[#e0e6e1] bg-white px-5 sm:px-8">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1D4B3B] text-white">
          <Sunrise className="h-5 w-5" />
        </span>
        <div className="ml-3">
          <p className="font-semibold">Lumetha</p>
          <p className="text-[10px] uppercase tracking-wider text-[#89938c]">
            {title}
          </p>
        </div>
        <form action={logout} className="ml-auto">
          <button className="flex items-center gap-2 rounded-xl border border-[#dde3de] px-3 py-2 text-xs text-[#5f6c64] hover:bg-[#f3f5f3]">
            <LogOut className="h-3.5 w-3.5" />
            {userName}
          </button>
        </form>
      </header>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-[#718078]">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

function ClientPortal({
  userName,
  companyId,
  projectId,
  companyName,
}: {
  userName: string;
  companyId?: string;
  projectId?: string;
  companyName?: string;
}) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (submit: boolean) => {
    if (!companyId || title.trim().length === 0 || brief.trim().length < 20) {
      setStatus("Add a title and a more detailed requirement.");
      return false;
    }
    const response = await fetch("/api/requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        title,
        content: brief,
        status: submit ? "submitted" : "draft",
      }),
    });
    const body = (await response.json()) as { error?: string };
    setStatus(
      response.ok
        ? submit
          ? "Requirement submitted to Lumetha."
          : "Draft saved."
        : (body.error ?? "Unable to save."),
    );
    return response.ok;
  };
  const generate = async () => {
    setBusy(true);
    setStatus("Structuring frontend, backend, and QA work…");
    const response = await fetch("/api/ai/brief-to-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, brief, projectId }),
    });
    const body = (await response.json()) as {
      tasks?: GeneratedTask[];
      source?: string;
      created?: number;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !body.tasks) {
      setStatus(body.error ?? "Unable to generate tasks.");
      return;
    }
    setTasks(body.tasks);
    setStatus(
      `${body.source === "openai" ? "AI" : "Built-in"} plan ready. ${body.created ?? 0} tasks were added to Dusk Intake for PM review.`,
    );
  };
  return (
    <PortalShell
      userName={userName}
      title="Client requirements"
      subtitle={`Write and track product requirements for ${companyName ?? "your workspace"}.`}
    >
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-[#dfe5e0] bg-white p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#3e7257]" />
            <h2 className="font-semibold">New product requirement</h2>
          </div>
          <label className="mt-6 block text-xs font-semibold">
            Document title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should we build?"
              className="mt-2 h-11 w-full rounded-xl border border-[#d9e0da] px-3 text-sm outline-none focus:border-[#739581]"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold">
            Requirements and acceptance criteria
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe the user problem, desired flow, business rules, examples, Figma links, and how you will know it works…"
              className="mt-2 min-h-64 w-full rounded-xl border border-[#d9e0da] p-3 text-sm leading-6 outline-none focus:border-[#739581]"
            />
          </label>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => save(false)}
              className="rounded-xl border border-[#d8dfd9] px-4 py-2.5 text-sm font-medium"
            >
              Save draft
            </button>
            <button
              onClick={() => save(true)}
              className="rounded-xl bg-[#1D4B3B] px-4 py-2.5 text-sm font-medium text-white"
            >
              Submit to Lumetha
            </button>
            <button
              disabled={busy || !title || brief.length < 20}
              onClick={generate}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              {busy ? "Planning…" : "Generate task plan"}
            </button>
          </div>
          {status && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-[#f1f5f2] px-3 py-2 text-xs text-[#526158]"
            >
              {status}
            </p>
          )}
        </section>
        <aside className="rounded-2xl border border-[#dfe5e0] bg-[#eef3ef] p-5">
          <h2 className="text-sm font-semibold">Generated delivery plan</h2>
          <p className="mt-1 text-xs leading-5 text-[#728077]">
            Review the proposed work. PM and QA can refine it before developers
            see it.
          </p>
          <div className="mt-4 space-y-3">
            {tasks.length ? (
              tasks.map((task) => (
                <article
                  key={`${task.discipline}-${task.title}`}
                  className="rounded-xl border border-[#dce3dd] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#e9f0eb] px-2 py-1 text-[9px] font-bold uppercase text-[#426650]">
                      {task.discipline}
                    </span>
                    <span className="text-[9px] uppercase text-[#89938c]">
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xs font-semibold">{task.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-[#748078]">
                    {task.technical_requirements}
                  </p>
                </article>
              ))
            ) : (
              <div className="grid min-h-48 place-items-center text-center text-xs text-[#7c8880]">
                <div>
                  <Sparkles className="mx-auto h-6 w-6" />
                  <p className="mt-2">
                    Your structured tasks will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}

function AdminPortal({
  userName,
  companyId,
  companyName,
}: {
  userName: string;
  companyId?: string;
  companyName?: string;
}) {
  const [tab, setTab] = useState<"overview" | "clients" | "team" | "billing">(
    "overview",
  );
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState("developer");
  const [message, setMessage] = useState("");
  const [invoices, setInvoices] = useState([
    {
      id: "INV-104",
      client: companyName ?? "Client workspace",
      amount: "$4,800",
      status: "Due Jul 28",
    },
  ]);
  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    const response = await fetch(`/api/companies/${companyId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role: userRole === "admin" ? "company_admin" : "member",
        userRole,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? `${userRole.replace("_", " ")} access granted.`
        : (body.error ?? "Unable to add team member."),
    );
    if (response.ok) setEmail("");
  };
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "clients", label: "Clients", icon: Users },
    { id: "team", label: "Team & roles", icon: ShieldCheck },
    { id: "billing", label: "Billing", icon: FileText },
  ] as const;
  return (
    <PortalShell
      userName={userName}
      title="Lumetha admin"
      subtitle="Control clients, staffing, delivery health, and commercial operations."
    >
      <div className="mt-7 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${tab === id ? "bg-[#1D4B3B] text-white" : "border border-[#dce2dd] bg-white"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Active clients", "12", "+2 this month"],
            ["Tonight’s work", "28", "6 in review"],
            ["Developer capacity", "82%", "4 available"],
            ["Outstanding billing", "$14.2k", "3 invoices"],
          ].map(([label, value, detail]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#dfe5e0] bg-white p-5"
            >
              <p className="text-xs text-[#758078]">{label}</p>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-[11px] text-[#7f8a82]">{detail}</p>
            </div>
          ))}
        </div>
      )}
      {tab === "clients" && (
        <div className="mt-6 rounded-2xl border border-[#dfe5e0] bg-white">
          <div className="border-b border-[#e8ece8] p-5">
            <h2 className="font-semibold">Client engagements</h2>
          </div>
          {[
            companyName ?? "Current workspace",
            "Northstar Labs",
            "Evergreen Commerce",
          ].map((client, i) => (
            <div
              key={client}
              className="flex flex-wrap items-center gap-4 border-b border-[#edf0ed] p-5 last:border-0"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7efe9] font-semibold text-[#31563f]">
                {client[0]}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{client}</p>
                <p className="text-xs text-[#7a857e]">
                  {i === 0
                    ? "8 active requirements · cycle on track"
                    : "No delivery risk"}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                Active
              </span>
            </div>
          ))}
        </div>
      )}
      {tab === "team" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-[#dfe5e0] bg-white p-5">
            <h2 className="font-semibold">Role permissions</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Developer", "Assigned board, timer, implementation handoff"],
                ["QA", "Create bugs, acceptance checks, regression findings"],
                [
                  "Project manager",
                  "Create and prioritize tasks from requirements",
                ],
                ["Senior engineer", "Review gate and dawn shipping approval"],
                ["Lumetha admin", "Clients, team, billing, and full oversight"],
              ].map(([role, scope]) => (
                <div key={role} className="rounded-xl bg-[#f5f7f5] p-4">
                  <p className="text-sm font-medium">{role}</p>
                  <p className="mt-1 text-xs text-[#758078]">{scope}</p>
                </div>
              ))}
            </div>
          </div>
          <form
            onSubmit={addMember}
            className="h-fit rounded-2xl border border-[#dfe5e0] bg-white p-5"
          >
            <h2 className="font-semibold">Add team member</h2>
            <p className="mt-1 text-xs text-[#758078]">
              The person must register first.
            </p>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@lumetha.com"
              className="mt-5 h-11 w-full rounded-xl border border-[#d9e0da] px-3 text-sm"
            />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="mt-3 h-11 w-full rounded-xl border border-[#d9e0da] bg-white px-3 text-sm"
            >
              <option value="developer">Developer</option>
              <option value="qa">QA</option>
              <option value="project_manager">Project manager</option>
              <option value="senior_engineer">Senior engineer</option>
              <option value="client">Client</option>
              <option value="admin">Lumetha admin</option>
            </select>
            <button className="mt-3 w-full rounded-xl bg-[#1D4B3B] py-2.5 text-sm font-medium text-white">
              Grant workspace access
            </button>
            {message && (
              <p className="mt-3 text-xs text-[#5d6a62]" role="status">
                {message}
              </p>
            )}
          </form>
        </div>
      )}
      {tab === "billing" && (
        <div className="mt-6 rounded-2xl border border-[#dfe5e0] bg-white">
          <div className="flex items-center border-b border-[#e8ece8] p-5">
            <div>
              <h2 className="font-semibold">Invoices and retainers</h2>
              <p className="mt-1 text-xs text-[#758078]">
                Commercial tracking stays private to Lumetha admins.
              </p>
            </div>
            <button
              onClick={() =>
                setInvoices((current) => [
                  ...current,
                  {
                    id: `INV-${104 + current.length}`,
                    client: companyName ?? "Client workspace",
                    amount: "$0",
                    status: "Draft",
                  },
                ])
              }
              className="ml-auto rounded-xl bg-[#1D4B3B] px-4 py-2 text-xs font-medium text-white"
            >
              Create invoice
            </button>
          </div>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="grid grid-cols-2 items-center gap-3 border-b border-[#edf0ed] p-4 text-sm last:border-0 sm:grid-cols-4 sm:p-5"
            >
              <span className="font-mono text-xs">{invoice.id}</span>
              <span>{invoice.client}</span>
              <span className="font-semibold">{invoice.amount}</span>
              <span className="text-right text-xs text-[#748078]">
                {invoice.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

function SideButton({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof LayoutGrid;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-[#e6eee9] font-medium text-[#173f2e]" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}

function WorkCard({
  item,
  onOpen,
  onAdvance,
}: {
  item: WorkItem;
  onOpen: () => void;
  onAdvance: () => void;
}) {
  const done = item.checklist.filter((c) => c.done).length;
  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border border-[#dfe4df] bg-white p-4 shadow-[0_2px_8px_rgba(28,48,37,.04)] transition hover:-translate-y-0.5 hover:border-[#b8c5bc] hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold tracking-wide text-[#929b95]">
          {item.key}
        </span>
        <span
          className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${item.priority === "Urgent" ? "bg-rose-50 text-rose-700" : item.priority === "High" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"}`}
        >
          {item.priority}
        </span>
      </div>
      <h4 className="mt-3 text-[14px] font-semibold leading-5 text-[#26332b]">
        {item.title}
      </h4>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#738078]">
        {item.brief}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-[#f0f4f1] px-2 py-1 text-[10px] font-medium text-[#607067]"
          >
            {tag}
          </span>
        ))}
      </div>
      {item.checklist.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[10px] text-[#879189]">
            <span>
              {done}/{item.checklist.length} checks
            </span>
            <span>{Math.round((done / item.checklist.length) * 100)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#e9ede9]">
            <div
              className="h-full rounded-full bg-[#5b8d72]"
              style={{ width: `${(done / item.checklist.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center border-t border-[#eef1ee] pt-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#dfeae3] text-[9px] font-bold text-[#31533e]">
          {item.assignee ?? "—"}
        </span>
        {item.attachments.length > 0 && (
          <span className="ml-2 flex items-center gap-1 text-[10px] text-[#879189]">
            <Paperclip className="h-3 w-3" />
            {item.attachments.length}
          </span>
        )}
        {item.status !== "pending_senior_review" &&
          item.status !== "dawn_shipped" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvance();
              }}
              className="ml-auto flex min-h-9 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-[#3c7156] opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              Advance <ArrowRight className="h-3 w-3" />
            </button>
          )}
        {item.status === "pending_senior_review" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-amber-700">
            <ShieldCheck className="h-3 w-3" />
            Review required
          </span>
        )}
        {item.status === "dawn_shipped" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        )}
      </div>
    </article>
  );
}

function IntakeModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (
    title: string,
    brief: string,
    priority: WorkItem["priority"],
    attachments: string[],
  ) => void;
}) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [priority, setPriority] = useState<WorkItem["priority"]>("Normal");
  const [files, setFiles] = useState<string[]>([]);
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#10251c]/40 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/50 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <MoonStar className="h-5 w-5" />
            </span>
            <div>
              <h2 id="intake-title" className="text-lg font-semibold">
                Drop a dusk brief
              </h2>
              <p className="mt-1 text-sm text-[#778179]">
                Raw notes are welcome. The delivery pod will shape the technical
                plan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-[#8b958e] hover:bg-[#f1f3f1]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-6 block text-xs font-semibold text-[#536159]">
          Brief title
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Add a dark mode preference"
            className="mt-2 h-11 w-full rounded-xl border border-[#dbe1dc] px-3 text-sm outline-none focus:border-[#6e9a82]"
          />
        </label>
        <label className="mt-4 block text-xs font-semibold text-[#536159]">
          Everything we should know
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Paste feedback, markdown, acceptance notes, or a Figma URL…"
            className="mt-2 min-h-36 w-full resize-y rounded-xl border border-[#dbe1dc] p-3 text-sm leading-6 outline-none focus:border-[#6e9a82]"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#dce2dd] px-3 py-2 text-xs font-medium text-[#5e6c63] hover:bg-[#f7f9f7]">
            <Paperclip className="h-3.5 w-3.5" />
            Attach files
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(e) =>
                setFiles(Array.from(e.target.files ?? []).map((f) => f.name))
              }
            />
          </label>
          <span className="flex items-center gap-1 text-[11px] text-[#919a94]">
            <Link2 className="h-3 w-3" />
            Figma and repository links can go directly in the brief
          </span>
        </div>
        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((file) => (
              <span
                key={file}
                className="flex items-center gap-1 rounded-md bg-[#eef3ef] px-2 py-1 text-[10px]"
              >
                <FileText className="h-3 w-3" />
                {file}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ed] pt-5">
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as WorkItem["priority"])
            }
            className="h-10 rounded-xl border border-[#dbe1dc] bg-white px-3 text-xs"
          >
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
          <button
            disabled={!title.trim() || !brief.trim()}
            onClick={() => onAdd(title.trim(), brief.trim(), priority, files)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1D4B3B] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Send to dusk intake
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailDrawer({
  item,
  canReview,
  onClose,
  onUpdate,
  onAdvance,
  onAttachment,
}: {
  item: WorkItem;
  canReview: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<WorkItem>) => void;
  onAdvance: () => void;
  onAttachment: (attachment: { id: string; name: string; size: number | null }) => void;
}) {
  const [activeEntry, setActiveEntry] = useState<{ id: string; startedAt: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [trackedSeconds, setTrackedSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch(`/api/time-entries?taskId=${item.id}`);
      if (!response.ok) return;
      const entries = (await response.json()) as { id: string; startedAt: string; endedAt: string | null; durationSeconds: number | null }[];
      if (!active) return;
      setTrackedSeconds(entries.reduce((total, entry) => total + (entry.durationSeconds ?? 0), 0));
      const running = entries.find((entry) => !entry.endedAt);
      setActiveEntry(running ? { id: running.id, startedAt: running.startedAt } : null);
    };
    void load();
    return () => { active = false; };
  }, [item.id]);

  useEffect(() => {
    if (!activeEntry) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeEntry.startedAt).getTime()) / 1000)));
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeEntry]);

  const toggleTracking = async () => {
    const response = await fetch("/api/time-entries", {
      method: activeEntry ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activeEntry ? { entryId: activeEntry.id } : { taskId: item.id }),
    });
    const body = (await response.json()) as { id?: string; startedAt?: string; durationSeconds?: number | null; error?: string };
    if (!response.ok || !body.id) {
      setDrawerStatus(body.error ?? "Unable to update the timer.");
      return;
    }
    if (activeEntry) {
      setTrackedSeconds((current) => current + (body.durationSeconds ?? seconds));
      setActiveEntry(null);
      setSeconds(0);
      setDrawerStatus("Time entry saved.");
    } else if (body.startedAt) {
      setActiveEntry({ id: body.id, startedAt: body.startedAt });
      setSeconds(0);
      setDrawerStatus("Timer running. You can close this drawer safely.");
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setDrawerStatus("Uploading securely…");
    const data = new FormData();
    data.set("file", file);
    const response = await fetch(`/api/tasks/${item.id}/attachments`, { method: "POST", body: data });
    const body = (await response.json()) as { id?: string; name?: string; size?: number | null; error?: string };
    setUploading(false);
    if (!response.ok || !body.id || !body.name) {
      setDrawerStatus(body.error ?? "Unable to upload this file.");
      return;
    }
    onAttachment({ id: body.id, name: body.name, size: body.size ?? null });
    setDrawerStatus("File uploaded and shared with workspace members.");
  };

  const syncPullRequest = async () => {
    setDrawerStatus("Synchronizing with GitHub…");
    const response = await fetch(`/api/tasks/${item.id}/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryUrl: item.repositoryUrl }),
    });
    const body = (await response.json()) as { state?: string; error?: string };
    setDrawerStatus(response.ok ? `GitHub pull request synchronized (${body.state ?? "updated"}).` : (body.error ?? "Unable to synchronize GitHub."));
  };
  const review = item.review ?? {
    acceptanceCriteria: false,
    testsPassing: false,
    securityReviewed: false,
  };
  const allChecked = Object.values(review).every(Boolean);
  const ready =
    allChecked &&
    Boolean(item.summary?.trim()) &&
    Boolean(item.repositoryUrl || item.deploymentUrl);
  const setReview = (key: keyof Checklist, checked: boolean) =>
    onUpdate({ review: { ...review, [key]: checked } });
  return (
    <div className="fixed inset-0 z-40 bg-[#10251c]/30" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="ml-auto h-full w-full max-w-3xl overflow-y-auto bg-[#fbfcfa] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex h-16 items-center border-b border-[#e3e7e3] bg-white/95 px-5 backdrop-blur">
          <span className="font-mono text-xs font-semibold text-[#7f8a82]">
            {item.key}
          </span>
          <span className="mx-3 h-4 w-px bg-[#dfe4df]" />
          <span className="text-xs font-medium text-[#68746c]">
            {stages.find((s) => s.id === item.status)?.label}
          </span>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="ml-auto rounded-lg p-2 text-[#7d8780] hover:bg-[#f0f3ef]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="detail-title"
                className="text-2xl font-semibold tracking-tight"
              >
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#657269]">
                {item.brief}
              </p>
            </div>
            {item.status === "in_progress" && (
              <button
                onClick={() => void toggleTracking()}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${activeEntry ? "bg-rose-50 text-rose-700" : "bg-[#e7efe9] text-[#315c43]"}`}
              >
                <Clock3 className="h-4 w-4" />
                {activeEntry ? "Stop" : "Start"} ·{" "}
                {String(Math.floor((trackedSeconds + seconds) / 3600)).padStart(2, "0")}:
                {String(Math.floor(((trackedSeconds + seconds) % 3600) / 60)).padStart(2, "0")}:
                {String((trackedSeconds + seconds) % 60).padStart(2, "0")}
              </button>
            )}
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-[#e0e5e0] bg-white p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold">AI technical plan</h3>
                <span className="ml-auto rounded-md bg-violet-50 px-2 py-1 text-[9px] font-bold uppercase text-violet-700">
                  Generated
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {item.checklist.length ? (
                  item.checklist.map((check) => (
                    <div
                      key={check.title}
                      className="flex gap-3 text-xs leading-5"
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${check.done ? "bg-emerald-100 text-emerald-700" : "border border-[#ccd4ce]"}`}
                      >
                        {check.done && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span
                        className={
                          check.done
                            ? "text-[#7b857e] line-through"
                            : "text-[#4e5b53]"
                        }
                      >
                        {check.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-5 text-[#7c8780]">
                    The AI checklist will appear when the delivery pod accepts
                    this brief.
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
              <div className="flex items-center gap-2 text-amber-900">
                <ShieldCheck className="h-4 w-4" />
                <h3 className="text-sm font-semibold">
                  Senior validation gate
                </h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-900/60">
                A human reviewer must validate every criterion before dawn
                shipping unlocks.
              </p>
              <div className="mt-4 space-y-2">
                {(
                  [
                    ["acceptanceCriteria", "Acceptance criteria verified"],
                    ["testsPassing", "Automated and manual tests pass"],
                    ["securityReviewed", "Security and data handling reviewed"],
                  ] as [keyof Checklist, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-xs ${canReview ? "cursor-pointer" : "cursor-not-allowed opacity-65"}`}
                  >
                    <input
                      type="checkbox"
                      disabled={
                        !canReview || item.status !== "pending_senior_review"
                      }
                      checked={review[key]}
                      onChange={(e) => setReview(key, e.target.checked)}
                      className="h-4 w-4 accent-[#296044]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {!canReview && (
                <p className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-amber-800">
                  <ShieldCheck className="h-3 w-3" />
                  Senior reviewer access required
                </p>
              )}
            </section>
          </div>
          <section className="mt-5 rounded-2xl border border-[#e0e5e0] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Developer handoff</h3>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#dce2dd] px-3 py-2 text-xs font-medium text-[#526158] hover:bg-[#f5f7f5]">
                <Paperclip className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Attach file"}
                <input
                  type="file"
                  disabled={uploading}
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.zip"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {item.attachmentRecords?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.attachmentRecords.map((attachment) => (
                  <a key={attachment.id} href={`/api/attachments/${attachment.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef3ef] px-3 py-2 text-[11px] text-[#3f5f4c] hover:bg-[#e2ebe5]">
                    <FileText className="h-3.5 w-3.5" />
                    {attachment.name}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3">
              <textarea
                value={item.summary ?? ""}
                onChange={(e) => onUpdate({ summary: e.target.value })}
                placeholder="Technical summary of what changed, tradeoffs, and testing performed…"
                className="min-h-24 rounded-xl border border-[#dce2dd] p-3 text-xs leading-5 outline-none focus:border-[#71937f]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="relative">
                  <GitBranch className="absolute left-3 top-3 h-4 w-4 text-[#8a948d]" />
                  <input
                    value={item.repositoryUrl ?? ""}
                    onChange={(e) =>
                      onUpdate({ repositoryUrl: e.target.value })
                    }
                    placeholder="Repository or pull request URL"
                    className="h-10 w-full rounded-xl border border-[#dce2dd] pl-9 pr-3 text-xs"
                  />
                </label>
                <label className="relative">
                  <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-[#8a948d]" />
                  <input
                    value={item.deploymentUrl ?? ""}
                    onChange={(e) =>
                      onUpdate({ deploymentUrl: e.target.value })
                    }
                    placeholder="Staging preview URL"
                    className="h-10 w-full rounded-xl border border-[#dce2dd] pl-9 pr-3 text-xs"
                  />
                </label>
              </div>
              {item.repositoryUrl?.startsWith("https://github.com/") && (
                <button onClick={() => void syncPullRequest()} className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#dce2dd] px-3 py-2 text-xs font-medium text-[#526158] hover:bg-[#f5f7f5]">
                  <GitBranch className="h-3.5 w-3.5" />
                  Sync pull request
                </button>
              )}
            </div>
          </section>
          {drawerStatus && <p role="status" className="mt-3 rounded-lg bg-[#eef3ef] px-3 py-2 text-xs text-[#526158]">{drawerStatus}</p>}
          <div className="mt-6 flex justify-end">
            {item.status === "dusk_intake" && (
              <button
                onClick={onAdvance}
                className="rounded-xl bg-[#1D4B3B] px-4 py-2.5 text-sm font-medium text-white"
              >
                Accept & start work
              </button>
            )}
            {item.status === "in_progress" && (
              <button
                onClick={onAdvance}
                className="rounded-xl bg-[#1D4B3B] px-4 py-2.5 text-sm font-medium text-white"
              >
                Submit for senior review
              </button>
            )}
            {item.status === "pending_senior_review" && (
              <button
                disabled={!canReview || !ready}
                  onClick={() => {
                    onUpdate({ review });
                    onAdvance();
                  }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#d99328] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sun className="h-4 w-4" />
                Approve for dawn shipping
              </button>
            )}
          </div>
          {item.status === "pending_senior_review" && !ready && (
            <p className="mt-2 text-right text-[10px] text-[#8a948d]">
              Complete all review checks, the summary, and at least one delivery
              link.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Archive({ items }: { items: WorkItem[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe5e0] bg-white">
      {items.length === 0 ? (
        <div className="grid min-h-64 place-items-center text-center">
          <div>
            <Sunrise className="mx-auto h-7 w-7 text-[#7a9b88]" />
            <p className="mt-3 text-sm font-medium">No dawn deliveries yet</p>
            <p className="mt-1 text-xs text-[#7c8780]">
              Approved work will collect here automatically.
            </p>
          </div>
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-4 border-b border-[#edf0ed] p-5 last:border-0"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 font-mono text-[10px] text-[#8a948d]">
                {item.key} · SENIOR VERIFIED
              </p>
            </div>
            <div className="flex gap-2">
              {item.repositoryUrl && (
                <a
                  href={item.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-[#dfe4df] px-3 py-2 text-xs"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Code
                </a>
              )}
              {item.deploymentUrl && (
                <a
                  href={item.deploymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-[#1D4B3B] px-3 py-2 text-xs text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </a>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
