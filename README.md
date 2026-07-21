# Lumetha Workspace

Lumetha Workspace is the internal delivery operating system for Lumetha's dedicated engineering pods. It replaces a generic Jira workflow with the company's **Daybreak Engine**: a client brief enters at dusk, the pod builds it, a senior engineer reviews it, and the client receives an auditable dawn handoff.

## What the product supports

- **Role-specific workspaces** for clients, developers, QA, project managers, senior engineers, and Lumetha administrators
- **Dusk Intake** for detailed requirements, drafts, and AI-assisted task decomposition
- **Shared delivery board** backed by PostgreSQL, with guarded lifecycle transitions
- **Senior review gate** requiring acceptance, test, security, summary, and delivery-link evidence
- **Dawn Review** for client approval or revision requests
- **Delivery cycles** with capacity limits and scope locking
- **People and access management** with multiple roles, account setup links, disable/restore controls, and company membership
- **Administrative dispatch and fallback review** with an immutable audit trail
- **GitHub pull-request synchronization** through signed webhooks and on-demand refresh
- **Persistent time tracking** with one active timer per workspace member
- **In-app notifications** for task lifecycle and pull-request activity
- **Private task attachments** stored in Vercel Blob and served through membership checks
- **Near-live boards** refreshed in the background and immediately when the workspace regains focus

The current lifecycle is:

```text
Dusk Intake → In Progress → Senior Review → Dawn Shipped → Client Decision
```

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- PostgreSQL with Prisma
- Server Actions and authenticated Route Handlers
- TanStack Query for the remaining resource hooks
- Zod validation and bcrypt password hashing

## Local setup

Requirements: Node.js 20+, npm, and PostgreSQL 14+.

```bash
npm install
createdb lumetha
```

Create `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lumetha"

# Optional: enables AI brief decomposition. The deterministic planner is used without it.
OPENAI_API_KEY=""

# Optional: used to send account-setup emails.
RESEND_API_KEY=""
RESEND_FROM_EMAIL="Lumetha <workspace@lumetha.com>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Private task attachments (Vercel Blob)
BLOB_READ_WRITE_TOKEN=""

# Pull-request sync. Use a fine-grained token with read access to relevant repositories.
GITHUB_TOKEN=""
GITHUB_WEBHOOK_SECRET=""

# Change this before seeding any shared environment.
LUMETHA_BOOTSTRAP_PASSWORD="replace-with-a-long-random-password"
```

Prepare and seed the database, then start the app:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The bootstrap administrator email is printed by the seed command; its password is `LUMETHA_BOOTSTRAP_PASSWORD`.

## Commands

```bash
npm run dev       # local development
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript validation
npm run build     # production build and migration deployment
npm run db:seed   # seed local data
```

## Product boundaries

Workspace is intentionally tailored to Lumetha's delivery model rather than being a general Jira clone. Live boards currently use authenticated background refresh rather than a dedicated WebSocket service. Production email delivery still requires Resend configuration, and private uploads and GitHub synchronization remain unavailable until their server-side credentials are supplied.

## GitHub setup

1. Set `GITHUB_TOKEN` for on-demand synchronization of already-open pull requests.
2. Add a GitHub repository webhook pointing to `https://<workspace-host>/api/github/webhook`.
3. Set the webhook content type to `application/json`, use the same value as `GITHUB_WEBHOOK_SECRET`, and subscribe to **Pull requests**.
4. Include a Lumetha task key such as `DAY-42` in the pull-request title, body, or branch name. Once linked, the exact pull-request URL is used for subsequent events.

## Brand context

Lumetha is the new brand for the Kathmandu engineering team previously operating as Kotuko Nepal. Public positioning centers on dedicated AI-augmented development pods, fractional CTO services, AI product development, and full-project delivery. Workspace translates that promise into a visible, reviewable operating workflow for the team and its clients.
