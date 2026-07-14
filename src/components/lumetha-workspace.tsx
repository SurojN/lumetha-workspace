"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Filter,
  FolderKanban,
  LayoutDashboard,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  LogOut,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

type Status = "backlog" | "progress" | "pm_review" | "testing" | "done";
type Priority = "Urgent" | "High" | "Medium" | "Low";
type ProjectView = "Board" | "Backlog" | "Timeline" | "Reports";
type StatusFilter = Status | "all";

type Issue = {
  id: string;
  key: string;
  title: string;
  status: Status;
  priority: Priority;
  type: "Feature" | "Bug" | "Task" | "Design";
  assignee: string;
  initials: string;
  avatar: string;
  due?: string;
  points?: number;
  labels?: string[];
  comments?: number;
};

const columns: { id: Status; name: string; dot: string; accent: string }[] = [
  {
    id: "backlog",
    name: "Backlog",
    dot: "bg-slate-400",
    accent: "border-slate-300",
  },
  {
    id: "progress",
    name: "In progress",
    dot: "bg-blue-500",
    accent: "border-blue-400",
  },
  {
    id: "pm_review",
    name: "PM review",
    dot: "bg-violet-500",
    accent: "border-violet-400",
  },
  {
    id: "testing",
    name: "Testing",
    dot: "bg-amber-500",
    accent: "border-amber-400",
  },
  {
    id: "done",
    name: "Done",
    dot: "bg-emerald-500",
    accent: "border-emerald-400",
  },
];

const initialIssues: Issue[] = [];
const storageKey = "lumetha-board-v1";

const priorityStyles: Record<Priority, string> = {
  Urgent: "text-rose-700 bg-rose-50 border-rose-200",
  High: "text-amber-700 bg-amber-50 border-amber-200",
  Medium: "text-blue-700 bg-blue-50 border-blue-200",
  Low: "text-slate-600 bg-slate-50 border-slate-200",
};

const typeStyles: Record<Issue["type"], string> = {
  Feature: "text-violet-700 bg-violet-50",
  Bug: "text-rose-700 bg-rose-50",
  Task: "text-slate-600 bg-slate-100",
  Design: "text-pink-700 bg-pink-50",
};

function Avatar({ issue }: { issue: Issue }) {
  return (
    <span
      title={issue.assignee}
      className={`grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white ${issue.avatar}`}
    >
      {issue.initials}
    </span>
  );
}

export function LumethaWorkspace({ userName, companyId, companyName, companyDomain }: { userName: string; companyId?: string; companyName?: string; companyDomain?: string | null }) {
  const [issues, setIssues] = useState(initialIssues);
  const [workspaceName, setWorkspaceName] = useState("My project");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<Priority | "All">("All");
  const [selected, setSelected] = useState<Issue | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<Issue["type"]>("Task");
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [dragging, setDragging] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ProjectView>("Board");
  const [hydrated, setHydrated] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    let board: { issues?: Issue[]; workspaceName?: string } | undefined;
    try {
      board = saved ? JSON.parse(saved) : undefined;
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    const frame = window.requestAnimationFrame(() => {
      if (board) {
        setIssues(board.issues ?? []);
        setWorkspaceName(board.workspaceName?.trim() || "My project");
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify({ issues, workspaceName }));
  }, [hydrated, issues, workspaceName]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const visibleIssues = useMemo(
    () =>
      issues.filter((issue) => {
        const matchesQuery = `${issue.key} ${issue.title} ${issue.assignee}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return (
          matchesQuery && (priority === "All" || issue.priority === priority)
        );
      }),
    [issues, query, priority],
  );

  const moveIssue = (issueId: string, status: Status) => {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId ? { ...issue, status } : issue,
      ),
    );
    setDragging(null);
  };

  const updateIssue = (issueId: string, updates: Partial<Issue>) => {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId ? { ...issue, ...updates } : issue,
      ),
    );
    setSelected((current) =>
      current?.id === issueId ? { ...current, ...updates } : current,
    );
  };

  const addIssue = () => {
    const title = newTitle.trim();
    if (!title) return;
    const issue: Issue = {
      id: crypto.randomUUID(),
      key: `LUM-${issues.length + 1}`,
      title,
      status: "backlog",
      priority: newPriority,
      type: newType,
      assignee: "Unassigned",
      initials: "+",
      avatar: "bg-slate-400",
      points: 1,
    };
    setIssues((current) => [issue, ...current]);
    setNewTitle("");
    setNewType("Task");
    setNewPriority("Medium");
    setComposerOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[244px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="relative flex h-16 items-center gap-3 border-b border-slate-100 px-5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#202b4b] text-sm font-bold text-white">
              L
            </div>
            <span className="font-semibold tracking-tight">Lumetha</span>
            <button onClick={() => setWorkspaceMenuOpen((current) => !current)} aria-label="Open workspace menu" aria-expanded={workspaceMenuOpen} className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ChevronDown className="h-4 w-4" /></button>
            {workspaceMenuOpen && <div className="absolute left-3 right-3 top-14 z-30 rounded-lg border border-slate-200 bg-white p-1 shadow-xl" role="menu"><button onClick={() => { setWorkspaceMenuOpen(false); setSettingsOpen(true); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" role="menuitem"><Settings2 className="h-4 w-4 text-slate-500" />Company settings</button><form action={logout}><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50" role="menuitem"><LogOut className="h-4 w-4" />Sign out</button></form></div>}
          </div>
          <nav className="flex-1 px-3 py-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Workspace
            </p>
            <NavItem icon={LayoutDashboard} label="Overview" onClick={() => setActiveView("Reports")} />
            <NavItem icon={FolderKanban} label="My work" count={String(issues.length)} onClick={() => setActiveView("Board")} />
            <NavItem icon={Activity} label="Activity" onClick={() => setActiveView("Timeline")} />
            <p className="mb-2 mt-7 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Projects
            </p>
            <div className="mb-1 flex items-center rounded-md bg-[#eef1f8] px-3 py-2 text-sm font-medium text-[#26365f]">
              <span className="mr-3 grid h-5 w-5 place-items-center rounded bg-[#563b96] text-[10px] font-bold text-white">
                P
              </span>
              {workspaceName}
            </div>
            <button onClick={() => setComposerOpen(true)} className="mt-3 flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-900">
              <Plus className="h-4 w-4" />
              Create issue
            </button>
          </nav>
          <div className="border-t border-slate-100 p-3">
            <NavItem icon={Settings2} label="Settings" onClick={() => setSettingsOpen(true)} />
            <div className="relative mt-3">
              <button onClick={() => setAccountOpen((current) => !current)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50" aria-expanded={accountOpen} aria-haspopup="menu">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1e3a5f] text-[10px] font-bold text-white">
                  AD
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{userName}</p>
                  <p className="truncate text-xs text-slate-500">Company administrator</p>
                </div>
                <MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" />
              </button>
              {accountOpen && <div className="absolute bottom-11 left-2 right-2 z-30 rounded-lg border border-slate-200 bg-white p-1 shadow-xl" role="menu">
                <form action={logout}><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-700 hover:bg-rose-50" role="menuitem"><LogOut className="h-4 w-4" />Sign out</button></form>
              </div>}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
            <button onClick={() => setWorkspaceMenuOpen((current) => !current)} aria-label="Open workspace menu" className="mr-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 lg:hidden">
              <Command className="h-4 w-4" />
            </button>
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search issues…  ⌘K"
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-[#596b9d] focus:bg-white"
              />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-3">
              <button
                aria-label="Notifications"
                onClick={() => alert("Notifications will appear here when team activity and authentication are connected.")}
                className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <Bell className="h-4 w-4" />
              </button>
              <button
                aria-label="Help"
                onClick={() => alert("Tip: use ⌘/Ctrl + K to search issues. Open an issue to update its status, priority, and comments.")}
                className="hidden h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 sm:grid"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
              <button
                onClick={() => setComposerOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#26365f] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#1d294a]"
              >
                <Plus className="h-4 w-4" />{" "}
                <span className="hidden sm:inline">Create issue</span>
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>Projects</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{workspaceName}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-900">Board</span>
            </div>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#563b96] text-sm font-bold text-white">
                    P
                  </span>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                      <input aria-label="Project name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="w-full border-0 bg-transparent p-0 text-xl font-semibold tracking-tight outline-none focus:ring-0" />
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Your clean workspace — invite your team when authentication is connected.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <button onClick={() => setSettingsOpen(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Users className="h-3.5 w-3.5" />
                  Invite
                </button>
              </div>
            </div>
            <div className="mt-7 flex items-center gap-5 border-b border-slate-200">
              {(
                ["Board", "Backlog", "Timeline", "Reports"] as ProjectView[]
              ).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`border-b-2 pb-3 text-sm font-medium transition ${activeView === view ? "border-[#293a69] text-[#293a69]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  {view}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => { setStatusFilter("all"); setFiltersOpen((current) => !current); }} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600">
                  <ListFilter className="h-3.5 w-3.5" />
                  All issues
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setFiltersOpen((current) => !current)} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </button>
                {(["All", "Urgent", "High"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setPriority(item)}
                    className={`h-8 rounded-md px-2.5 text-xs font-medium ${priority === item ? "bg-[#e9edf8] text-[#293a69]" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {filtersOpen && <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"><span className="px-1 text-xs font-medium text-slate-500">Status:</span>{([{ id: "all", name: "Any status" }, ...columns] as { id: StatusFilter; name: string }[]).map((item) => <button key={item.id} onClick={() => setStatusFilter(item.id)} className={`rounded px-2 py-1 text-xs ${statusFilter === item.id ? "bg-[#e9edf8] text-[#293a69]" : "text-slate-600 hover:bg-slate-100"}`}>{item.name}</button>)}</div>}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{visibleIssues.length} issues</span>
                <button className="inline-flex items-center gap-1 hover:text-slate-900">
                  <Clock3 className="h-3.5 w-3.5" />
                  Updated just now
                </button>
                <button
                  aria-label="Clear board filters"
                  onClick={() => { setQuery(""); setPriority("All"); }}
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {activeView === "Board" && (
              <>
              {!hydrated ? <div className="grid min-h-[530px] place-items-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">Loading workspace…</div> : !issues.length ? <div className="mb-4 rounded-lg border border-dashed border-[#b9c3dc] bg-[#f6f7fc] p-8 text-center"><FolderKanban className="mx-auto h-6 w-6 text-[#563b96]"/><h2 className="mt-3 text-base font-semibold">Your board is ready</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">There are no sample issues here. Create your first issue to start planning real work.</p><button onClick={() => setComposerOpen(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[#26365f] px-3 text-sm font-medium text-white"><Plus className="h-4 w-4"/>Create your first issue</button></div> : null}
              <div className="grid min-h-[530px] grid-cols-1 gap-4 xl:grid-cols-4">
                {columns.map((column) => {
                  const columnIssues = visibleIssues.filter((issue) => issue.status === column.id && (statusFilter === "all" || issue.status === statusFilter));
                  return (
                    <div
                      key={column.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => dragging && moveIssue(dragging, column.id)}
                      className={`flex min-h-[350px] flex-col rounded-lg border-t-2 ${column.accent} bg-[#eef0f4] p-3`}
                    >
                      <div className="mb-3 flex items-center px-1">
                        <span
                          className={`mr-2 h-2 w-2 rounded-full ${column.dot}`}
                        />
                        <h2 className="text-sm font-semibold text-slate-700">
                          {column.name}
                        </h2>
                        <span className="ml-2 text-xs text-slate-400">
                          {columnIssues.length}
                        </span>
                        <button
                          aria-label={`Add to ${column.name}`}
                          onClick={() => setComposerOpen(true)}
                          className="ml-auto text-slate-400 hover:text-slate-700"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {columnIssues.map((issue) => (
                          <IssueCard
                            key={issue.id}
                            issue={issue}
                            onOpen={() => setSelected(issue)}
                            onDragStart={() => setDragging(issue.id)}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setComposerOpen(true)}
                        className="mt-3 flex h-8 items-center gap-2 px-1 text-xs text-slate-500 hover:text-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add issue
                      </button>
                    </div>
                  );
                })}
              </div>
              </>
            )}
            {activeView === "Backlog" && (
              <BacklogView
                issues={visibleIssues}
                onOpen={setSelected}
                onCreate={() => setComposerOpen(true)}
              />
            )}
            {activeView === "Timeline" && (
              <TimelineView issues={visibleIssues} />
            )}
            {activeView === "Reports" && <ReportsView issues={issues} />}
          </div>
        </section>
      </div>

      {composerOpen && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-slate-950/20 p-4"
          onMouseDown={() => setComposerOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Create issue</p>
                <p className="mt-1 text-xs text-slate-500">{workspaceName}</p>
              </div>
              <button
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addIssue()}
              placeholder="What needs to be done?"
              className="mt-5 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#596b9d]"
            />
            <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-medium text-slate-600">Type<select value={newType} onChange={(event) => setNewType(event.target.value as Issue["type"])} className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"><option>Task</option><option>Feature</option><option>Bug</option><option>Design</option></select></label><label className="text-xs font-medium text-slate-600">Priority<select value={newPriority} onChange={(event) => setNewPriority(event.target.value as Priority)} className="mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setComposerOpen(false)}
                className="h-9 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={addIssue}
                className="h-9 rounded-md bg-[#26365f] px-3 text-sm font-medium text-white"
              >
                Create issue
              </button>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <IssueDrawer
          issue={selected}
          onClose={() => setSelected(null)}
          onMove={moveIssue}
          onUpdate={updateIssue}
        />
      )}
      {settingsOpen && <WorkspaceSettings companyId={companyId} companyName={companyName} companyDomain={companyDomain} onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}

function WorkspaceSettings({ companyId, companyName, companyDomain, onClose }: { companyId?: string; companyName?: string; companyDomain?: string | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const inviteMember = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!companyId) return; setSaving(true); setMessage(""); const response = await fetch(`/api/companies/${companyId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) }); const body = await response.json() as { error?: string }; setSaving(false); if (!response.ok) { setMessage(body.error ?? "Unable to add member."); return; } setEmail(""); setMessage("Member access updated."); };
  return <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/25 p-4" onMouseDown={onClose}>
    <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="settings-title">
      <div className="flex items-start justify-between"><div><h2 id="settings-title" className="text-lg font-semibold">Company settings</h2><p className="mt-1 text-sm text-slate-500">Access and workspace controls for your team.</p></div><button onClick={onClose} aria-label="Close settings" className="rounded-md p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="mt-6 space-y-4"><div className="rounded-lg border border-slate-200 p-4"><div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-[#563b96]" />{companyName ?? "Your company"}</div><p className="mt-2 text-sm text-slate-500">Company administrators can manage projects, boards, sprints, and member access.</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-sm font-medium">Email access policy</p><p className="mt-1 text-sm text-slate-500">{companyDomain ? `Only @${companyDomain} accounts can be added to this company.` : "No email domain restriction is set."}</p></div>{companyId && <form onSubmit={inviteMember} className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-medium">Add or update a member</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm" /><select value={role} onChange={(event) => setRole(event.target.value)} className="h-9 rounded-md border border-slate-300 px-2 text-sm"><option value="member">Member</option><option value="viewer">Viewer</option><option value="company_admin">Company admin</option></select><button disabled={saving} className="h-9 rounded-md bg-[#26365f] px-3 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Add"}</button></div>{message && <p className="mt-2 text-xs text-slate-600" role="status">{message}</p>}<p className="mt-2 text-xs text-slate-500">The person must create an account first.</p></form>}</div>
      <button onClick={onClose} className="mt-6 rounded-md bg-[#26365f] px-4 py-2 text-sm font-medium text-white">Done</button>
    </section>
  </div>;
}

function NavItem({
  icon: Icon,
  label,
  count,
  indent = false,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  count?: string;
  indent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${indent ? "pl-5 text-[13px]" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{label}</span>
      {count && <span className="ml-auto text-xs text-slate-400">{count}</span>}
    </button>
  );
}

function IssueCard({
  issue,
  onOpen,
  onDragStart,
}: {
  issue: Issue;
  onOpen: () => void;
  onDragStart: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="cursor-pointer rounded-md border border-slate-200 bg-white p-3 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-slate-400">
          {issue.key}
        </span>
        <button
          onClick={(event) => event.stopPropagation()}
          aria-label="Issue actions"
          className="text-slate-300 hover:text-slate-600"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[13px] font-medium leading-5 text-slate-700">
        {issue.title}
      </p>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeStyles[issue.type]}`}
        >
          {issue.type}
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${priorityStyles[issue.priority]}`}
        >
          {issue.priority}
        </span>
      </div>
      <div className="mt-3 flex items-center">
        <Avatar issue={issue} />
        {issue.due && (
          <span
            className={`ml-2 text-[11px] ${issue.due === "Today" ? "text-rose-600" : "text-slate-400"}`}
          >
            {issue.due}
          </span>
        )}
        {issue.points && (
          <span className="ml-auto text-[11px] text-slate-400">
            {issue.points} pts
          </span>
        )}
        {issue.comments && (
          <span className="ml-2 text-[11px] text-slate-400">
            {issue.comments} comments
          </span>
        )}
      </div>
    </article>
  );
}

function BacklogView({
  issues,
  onOpen,
  onCreate,
}: {
  issues: Issue[];
  onOpen: (issue: Issue) => void;
  onCreate: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Unplanned work</h2>
          <p className="mt-1 text-xs text-slate-500">
            Prioritize what your team should pick up next.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#26365f] px-2.5 text-xs font-medium text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Create issue
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {issues
          .filter((issue) => issue.status !== "done")
          .map((issue) => (
            <button
              key={issue.id}
              onClick={() => onOpen(issue)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50"
            >
              <span className="font-mono text-xs text-slate-400">
                {issue.key}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {issue.title}
              </span>
              <span
                className={`hidden rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline ${priorityStyles[issue.priority]}`}
              >
                {issue.priority}
              </span>
              <Avatar issue={issue} />
            </button>
          ))}
      </div>
    </div>
  );
}

function TimelineView({ issues }: { issues: Issue[] }) {
  const dated = issues.filter((issue) => issue.due);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[#563b96]" />
        <div>
          <h2 className="text-sm font-semibold">July delivery plan</h2>
          <p className="mt-1 text-xs text-slate-500">
            A focused view of work with a deadline.
          </p>
        </div>
      </div>
      <div className="mt-7 grid grid-cols-5 border-l border-t border-slate-200">
        {["Today", "Jul 16", "Jul 17", "Jul 18", "Jul 19"].map((day) => (
          <div
            key={day}
            className="min-h-48 border-b border-r border-slate-200 p-2"
          >
            <p className="text-[11px] font-medium text-slate-400">{day}</p>
            {dated
              .filter(
                (issue) =>
                  issue.due === day ||
                  (day === "Jul 17" && issue.due === "Tomorrow"),
              )
              .map((issue) => (
                <div
                  key={issue.id}
                  className="mt-3 rounded bg-[#f0edfa] p-2 text-[11px] font-medium leading-4 text-[#49347b]"
                >
                  {issue.key}
                  <br />
                  {issue.title}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsView({ issues }: { issues: Issue[] }) {
  const total = issues.length || 1;
  const done = issues.filter((issue) => issue.status === "done").length;
  const inFlight = issues.filter(
    (issue) => issue.status === "progress" || issue.status === "pm_review" || issue.status === "testing",
  ).length;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <ReportCard
        icon={BarChart3}
        label="Completion"
        value={`${Math.round((done / total) * 100)}%`}
        detail={`${done} of ${issues.length} issues shipped`}
      />
      <ReportCard
        icon={Activity}
        label="Work in progress"
        value={String(inFlight)}
        detail="Issues actively moving"
      />
      <ReportCard
        icon={Users}
        label="Team capacity"
        value="24 pts"
        detail="Planned for this sprint"
      />
      <div className="rounded-lg border border-slate-200 bg-white p-5 md:col-span-3">
        <h2 className="text-sm font-semibold">Flow by status</h2>
        <div className="mt-6 flex h-32 items-end gap-4">
          {columns.map((column) => {
            const count = issues.filter(
              (issue) => issue.status === column.id,
            ).length;
            return (
              <div
                key={column.id}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className={`w-full rounded-t ${column.dot}`}
                  style={{ height: `${Math.max(12, (count / total) * 100)}%` }}
                />
                <span className="text-xs text-slate-500">{column.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <Icon className="h-4 w-4 text-[#563b96]" />
      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function IssueDrawer({
  issue,
  onClose,
  onMove,
  onUpdate,
}: {
  issue: Issue;
  onClose: () => void;
  onMove: (id: string, status: Status) => void;
  onUpdate: (id: string, updates: Partial<Issue>) => void;
}) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const statusName =
    columns.find((column) => column.id === issue.status)?.name ?? issue.status;
  return (
    <div className="fixed inset-0 z-20 bg-slate-950/10" onMouseDown={onClose}>
      <aside
        onMouseDown={(event) => event.stopPropagation()}
        className="ml-auto flex h-full w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <span className="font-mono text-xs text-slate-500">{issue.key}</span>
          <button
            onClick={onClose}
            aria-label="Close issue"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex gap-2">
            <span
              className={`rounded px-2 py-1 text-[11px] font-medium ${typeStyles[issue.type]}`}
            >
              {issue.type}
            </span>
            <select
              aria-label="Priority"
              value={issue.priority}
              onChange={(event) =>
                onUpdate(issue.id, { priority: event.target.value as Priority })
              }
              className={`rounded border px-2 py-1 text-[11px] font-medium ${priorityStyles[issue.priority]}`}
            >
              <option>Urgent</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-7 tracking-tight">
            {issue.title}
          </h2>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            This issue is part of the Product launch project. Add context,
            decisions, and acceptance criteria here so the whole team has a
            shared source of truth.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-y-5 border-y border-slate-100 py-5 text-sm">
            <div>
              <p className="text-xs text-slate-400">Assignee</p>
              <div className="mt-2 flex items-center gap-2">
                <Avatar issue={issue} />
                <span>{issue.assignee}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400">Due date</p>
              <p className="mt-2">{issue.due ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Estimate</p>
              <p className="mt-2">{issue.points ?? "-"} points</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Status</p>
              <select
                aria-label="Issue status"
                value={issue.status}
                onChange={(event) =>
                  onMove(issue.id, event.target.value as Status)
                }
                className="mt-1 block rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-7">
            <p className="text-sm font-semibold">Activity</p>
            <div className="mt-4 flex gap-3 text-sm">
              <Avatar issue={issue} />
              <p className="leading-5 text-slate-500">
                <span className="font-medium text-slate-700">
                  {issue.assignee}
                </span>{" "}
                set status to{" "}
                <span className="font-medium text-slate-700">{statusName}</span>{" "}
                <span className="text-slate-400">just now</span>
              </p>
            </div>
            {comments.map((item, index) => (
              <div key={`${item}-${index}`} className="mt-4 flex gap-3 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1e3a5f] text-[9px] font-bold text-white">
                  KN
                </span>
                <p className="leading-5 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (comment.trim()) {
              setComments((current) => [...current, comment.trim()]);
              setComment("");
            }
          }}
          className="border-t border-slate-100 p-4"
        >
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a comment..."
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#596b9d]"
            />
            <button
              type="submit"
              className="grid h-10 w-10 place-items-center rounded-md bg-[#26365f] text-white"
              aria-label="Post comment"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
