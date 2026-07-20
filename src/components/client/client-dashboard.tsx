"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileCheck2,
  FileText,
  GitBranch,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquareWarning,
  MoonStar,
  Send,
  Sparkles,
  Sunrise,
  X,
} from "lucide-react";
import { lockClientBrief, submitDawnDecision } from "@/app/client/actions";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type GeneratedTask = {
  title: string;
  description: string;
  discipline: "frontend" | "backend" | "qa" | "delivery";
  technical_requirements: string;
  testing_criteria: string;
  priority: "normal" | "high" | "urgent";
};
type Task = {
  id: string;
  key: string;
  title: string;
  status: string;
  deploymentUrl: string | null;
  repositoryUrl: string | null;
  clientDecision: string | null;
  updatedAt: string;
};
type Props = {
  userName: string;
  company: { id: string; name: string; capacityLimit: number };
  project: { id: string; name: string };
  activeCycle: { id: string; status: string; date: string } | null;
  tasks: Task[];
  documents: { id: string; title: string; status: string; updatedAt: string }[];
  audit: {
    id: string;
    action: string;
    createdAt: string;
    actorName: string | null;
    task: {
      key: string;
      title: string;
      status: string;
      deploymentUrl: string | null;
    };
  }[];
};

const lifecycle = [
  "dusk_intake",
  "in_progress",
  "pending_senior_review",
  "dawn_shipped",
];

export function ClientDashboard(props: Props) {
  const [section, setSection] = useState<
    "overview" | "intake" | "audit" | "review"
  >("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const reviewCount = props.tasks.filter(
    (task) => task.status === "dawn_shipped" && !task.clientDecision,
  ).length;
  const nav = [
    { id: "overview", label: "Delivery overview", icon: LayoutDashboard },
    { id: "intake", label: "Dusk intake", icon: MoonStar },
    { id: "audit", label: "Night shift audit", icon: Activity },
    { id: "review", label: "Dawn review", icon: Sunrise },
  ] as const;
  return (
    <main className="min-h-dvh bg-[#f5f7f5] text-slate-900">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
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
            <p className="font-semibold">Lumetha</p>
            <p className="text-[10px] uppercase tracking-[.16em] text-emerald-50/70">
              Client workspace
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="shrink-0 border-b border-white/15 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-50/60">
            Workspace
          </p>
          <p className="mt-2 text-sm font-semibold">{props.company.name}</p>
          <p className="mt-1 text-xs text-emerald-50/70">
            {props.project.name}
          </p>
        </div>
        <nav className="min-h-0 flex-1 overflow-hidden p-3">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setMobileOpen(false);
              }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${section === id ? "bg-white font-medium text-emerald-800 shadow-sm" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "review" && reviewCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {reviewCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/15 bg-[#1D4B3B] p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-bold text-white">
              {props.userName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{props.userName}</p>
              <p className="text-[10px] text-emerald-50/65">
                Client stakeholder
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
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">
              {props.company.name}
            </p>
            <h1 className="mt-1 text-lg font-semibold">
              {nav.find((item) => item.id === section)?.label}
            </h1>
          </div>
          <div
            className={`ml-auto flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${props.activeCycle ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
          >
            <CircleDot className="h-3.5 w-3.5" />
            {props.activeCycle
              ? props.activeCycle.status.replaceAll("_", " ")
              : "Intake unavailable"}
          </div>
        </header>
        <div className="mx-auto max-w-[1450px] p-5 sm:p-8">
          {section === "overview" && (
            <ClientOverview {...props} onNavigate={setSection} />
          )}
          {section === "intake" && <DuskIntake {...props} />}
          {section === "audit" && (
            <NightAudit tasks={props.tasks} audit={props.audit} />
          )}
          {section === "review" && <DawnReview tasks={props.tasks} />}
        </div>
      </div>
    </main>
  );
}

function ClientOverview({
  tasks,
  documents,
  activeCycle,
  company,
  onNavigate,
}: Props & { onNavigate: (section: "intake" | "audit" | "review") => void }) {
  const counts = Object.fromEntries(
    lifecycle.map((status) => [
      status,
      tasks.filter((task) => task.status === status).length,
    ]),
  );
  return (
    <>
      <div className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#ecf8f0,#dff2e6)] p-6 text-slate-900 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-emerald-700">
              <MoonStar className="h-4 w-4" />
              Tonight’s delivery
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              From your brief to a reviewed dawn handoff.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Watch every state change, inspect staging links, and make the
              final client decision in one place.
            </p>
          </div>
          <Button
            onClick={() => onNavigate("intake")}
            className="rounded-xl bg-white text-[#173f2e] hover:bg-emerald-50"
          >
            <MoonStar />
            Open dusk intake
          </Button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {lifecycle.map((status, index) => (
          <Card key={status} className="rounded-2xl shadow-none">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
                0{index + 1}
              </p>
              <p className="mt-3 text-2xl font-semibold">{counts[status]}</p>
              <p className="mt-1 text-xs font-medium capitalize text-slate-600">
                {status.replaceAll("_", " ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <button
          onClick={() => onNavigate("audit")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-300"
        >
          <Activity className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-sm font-semibold">Follow the night shift</p>
          <p className="mt-1 text-xs text-slate-500">
            Live task movement and staging handoffs.
          </p>
        </button>
        <button
          onClick={() => onNavigate("review")}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-300"
        >
          <Sunrise className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-sm font-semibold">Review dawn deliveries</p>
          <p className="mt-1 text-xs text-slate-500">
            Approve, merge, or request a reversion.
          </p>
        </button>
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-5">
            <FileText className="h-5 w-5 text-violet-600" />
            <p className="mt-3 text-sm font-semibold">
              {documents.length} requirement documents
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Capacity {tasks.filter((t) => t.status !== "dawn_shipped").length}
              /{company.capacityLimit} ·{" "}
              {activeCycle ? "cycle active" : "intake closed"}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DuskIntake(props: Props) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const figma = useMemo(() => parseFigma(figmaUrl), [figmaUrl]);
  const canLock =
    props.activeCycle?.status === "intake_open" && tasks.length > 0;
  const preview = async () => {
    setBusy(true);
    setMessage("Analyzing product, frontend, backend, and QA scope…");
    const response = await fetch("/api/ai/brief-to-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        brief: `${brief}${figmaUrl ? `\n\nFigma: ${figmaUrl}` : ""}`,
      }),
    });
    const body = (await response.json()) as {
      tasks?: GeneratedTask[];
      source?: string;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !body.tasks) {
      setMessage(body.error ?? "Unable to generate a preview.");
      return;
    }
    setTasks(body.tasks);
    setMessage(
      `${body.source === "openai" ? "AI" : "Built-in"} breakdown ready. Review it before locking scope.`,
    );
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
      <Card className="rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Dusk Intake Slot</CardTitle>
          <CardDescription>
            Write the raw outcome and review the generated implementation plan
            before it becomes locked scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={lockClientBrief} className="space-y-4">
            <input type="hidden" name="companyId" value={props.company.id} />
            <input type="hidden" name="projectId" value={props.project.id} />
            <input
              type="hidden"
              name="taskPlan"
              value={JSON.stringify(tasks)}
            />
            <label className="block text-xs font-semibold text-slate-600">
              Brief title
              <Input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-2"
                placeholder="e.g. Let customers export monthly usage"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Raw requirements
              <textarea
                name="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                required
                minLength={20}
                className="mt-2 min-h-64 w-full rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-emerald-500"
                placeholder="Include the user problem, business rules, expected flow, edge cases, and acceptance criteria…"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Figma link
              <Input
                name="figmaUrl"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className={`mt-2 ${figmaUrl && !figma.valid ? "border-rose-400" : ""}`}
                placeholder="https://www.figma.com/design/..."
              />
            </label>
            {figmaUrl && (
              <div
                className={`flex items-center gap-3 rounded-xl p-3 text-xs ${figma.valid ? "bg-violet-50 text-violet-800" : "bg-rose-50 text-rose-700"}`}
              >
                <Link2 className="h-4 w-4" />
                {figma.valid ? (
                  <>
                    <span className="font-medium">Figma {figma.kind}</span>
                    <span className="truncate opacity-70">
                      File key: {figma.fileKey}
                    </span>
                  </>
                ) : (
                  "Use a valid figma.com design, file, board, or proto URL."
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <Button
                type="button"
                disabled={
                  busy ||
                  !title ||
                  brief.length < 20 ||
                  (!!figmaUrl && !figma.valid)
                }
                onClick={preview}
                variant="outline"
                className="rounded-xl"
              >
                <Sparkles />
                {busy ? "Generating…" : "Preview AI breakdown"}
              </Button>
              <Button
                type="submit"
                disabled={!canLock}
                className="ml-auto rounded-xl bg-[#1D4B3B] text-white hover:bg-emerald-500 hover:text-white"
              >
                <LockKeyhole />
                Lock brief & create {tasks.length || ""} tasks
              </Button>
            </div>
            {message && (
              <p
                role="status"
                className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600"
              >
                {message}
              </p>
            )}
            {props.activeCycle?.status !== "intake_open" && (
              <p className="text-xs text-amber-700">
                Scope is currently locked by Lumetha operations. You can
                preview, but cannot submit new work.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      <Card className="h-fit rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-600" />
            Instant task breakdown
          </CardTitle>
          <CardDescription>
            Nothing reaches the delivery board until you lock this plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.length ? (
              tasks.map((task, index) => (
                <article
                  key={`${task.title}-${index}`}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-violet-50 px-2 py-1 text-[9px] font-bold uppercase text-violet-700">
                      {task.discipline}
                    </span>
                    <span className="text-[9px] font-semibold uppercase text-slate-400">
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{task.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {task.technical_requirements}
                  </p>
                  <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-[10px] leading-4 text-emerald-800">
                    <strong>Review:</strong> {task.testing_criteria}
                  </div>
                </article>
              ))
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    No preview yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Your FE, BE, QA, and delivery tasks will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function parseFigma(value: string) {
  if (!value) return { valid: false, fileKey: "", kind: "link" };
  try {
    const url = new URL(value);
    const validHost =
      url.hostname === "figma.com" || url.hostname.endsWith(".figma.com");
    const match = url.pathname.match(/^\/(design|file|board|proto)\/([^/]+)/);
    return {
      valid: Boolean(validHost && match),
      kind: match?.[1] ?? "link",
      fileKey: match?.[2] ?? "",
    };
  } catch {
    return { valid: false, fileKey: "", kind: "link" };
  }
}

function NightAudit({ tasks, audit }: Pick<Props, "tasks" | "audit">) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card className="rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Live delivery status</CardTitle>
          <CardDescription>
            Every item follows the mandatory Dusk-to-Dawn lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task) => {
            const index = lifecycle.indexOf(task.status);
            return (
              <article
                key={task.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-slate-400">
                      {task.key}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{task.title}</h3>
                  </div>
                  {task.deploymentUrl && (
                    <a
                      href={task.deploymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-[#1D4B3B] px-3 py-2 text-xs text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Staging preview
                    </a>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1">
                  {lifecycle.map((status, step) => (
                    <div key={status}>
                      <div
                        className={`h-1.5 rounded-full ${step <= index ? "bg-emerald-500" : "bg-slate-100"}`}
                      />
                      <p
                        className={`mt-1 hidden text-[8px] uppercase sm:block ${step === index ? "font-bold text-emerald-700" : "text-slate-400"}`}
                      >
                        {status.replaceAll("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
      <Card className="h-fit rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Night Shift Audit Feed</CardTitle>
          <CardDescription>
            Live operational events and handoffs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {audit.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 border-l border-slate-200 pb-5 pl-4 last:pb-0"
              >
                <span className="-ml-[21px] mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-white" />
                <div>
                  <p className="text-xs font-semibold capitalize">
                    {event.action.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    {event.task.key} · {event.task.title}
                    <br />
                    {event.actorName ?? "Lumetha pod"} ·{" "}
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                  {event.task.deploymentUrl && (
                    <a
                      href={event.task.deploymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700"
                    >
                      Open deployment <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DawnReview({ tasks }: { tasks: Task[] }) {
  const [selected, setSelected] = useState<Task | null>(null);
  const delivered = tasks.filter((task) => task.status === "dawn_shipped");
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {delivered.length ? (
          delivered.map((task) => (
            <Card key={task.id} className="rounded-2xl shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <Sunrise className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-slate-400">
                      {task.key}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{task.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.clientDecision
                        ? `Decision: ${task.clientDecision}`
                        : "Ready for your decision"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.deploymentUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={task.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink />
                        Preview
                      </a>
                    </Button>
                  )}
                  {task.repositoryUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={task.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <GitBranch />
                        Code
                      </a>
                    </Button>
                  )}
                  {!task.clientDecision && (
                    <Button
                      size="sm"
                      onClick={() => setSelected(task)}
                      className="ml-auto bg-[#1D4B3B] text-white hover:bg-emerald-500 hover:text-white"
                    >
                      Review delivery
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full rounded-2xl p-14 text-center shadow-none">
            <Sunrise className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-3 text-sm font-medium">Dawn lane is waiting</p>
            <p className="mt-1 text-xs text-slate-500">
              Senior-approved deliveries will appear here.
            </p>
          </Card>
        )}
      </div>
      {selected && (
        <DecisionModal task={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function DecisionModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <Card
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-start">
            <div>
              <CardTitle className="text-lg">Dawn delivery decision</CardTitle>
              <CardDescription className="mt-1">
                {task.key} · {task.title}
              </CardDescription>
            </div>
            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-2 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDecision("approved")}
              className={`rounded-xl border p-3 text-left ${decision === "approved" ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <p className="mt-2 text-xs font-semibold">Approve & Merge</p>
            </button>
            <button
              onClick={() => setDecision("rejected")}
              className={`rounded-xl border p-3 text-left ${decision === "rejected" ? "border-rose-500 bg-rose-50" : "border-slate-200"}`}
            >
              <MessageSquareWarning className="h-4 w-4 text-rose-700" />
              <p className="mt-2 text-xs font-semibold">
                Reject / Request Reversion
              </p>
            </button>
          </div>
          <form action={submitDawnDecision} className="mt-5 space-y-3">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="decision" value={decision} />
            {decision === "approved" ? (
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-xl border p-3 text-xs">
                  <input
                    name="acceptance"
                    type="checkbox"
                    required
                    className="accent-[#1D4B3B]"
                  />
                  All acceptance criteria are satisfied
                </label>
                <label className="flex items-center gap-3 rounded-xl border p-3 text-xs">
                  <input
                    name="visual"
                    type="checkbox"
                    required
                    className="accent-[#1D4B3B]"
                  />
                  Visual and responsive behavior is approved
                </label>
              </div>
            ) : (
              <label className="block text-xs font-semibold">
                Required reversion criteria
                <textarea
                  name="reversionReason"
                  required
                  minLength={10}
                  className="mt-2 min-h-28 w-full rounded-xl border border-rose-200 p-3 text-sm"
                  placeholder="Describe what must change before this can return to Dawn Review…"
                />
              </label>
            )}
            <label className="block text-xs font-semibold">
              Additional feedback
              <textarea
                name="notes"
                className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
                placeholder="Optional context for the Lumetha pod"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className={
                  decision === "approved"
                    ? "bg-emerald-700 text-white hover:bg-[#1D4B3B] hover:text-white"
                    : "bg-rose-700 hover:bg-rose-600"
                }
              >
                {decision === "approved" ? (
                  <>
                    <FileCheck2 />
                    Approve & Merge
                  </>
                ) : (
                  <>
                    <Send />
                    Request reversion
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
