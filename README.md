# Lumetha - Project Management Application

A modern, scalable Jira-like project management application built with Next.js, React, TypeScript, and PostgreSQL.

## 🎯 Features

- **Projects**: Create and manage multiple projects
- **Kanban Board**: Drag-and-drop task management with DND Kit
- **Sprints**: Plan work in iterations
- **Tasks**: Create, assign, and track tasks with priority levels
- **Real-time Collaboration**: Work together on projects
- **User Management**: Invite team members and manage permissions
- **Activity Feed**: Track all project changes

## 🚀 Tech Stack

### Frontend

- **Next.js 16** (App Router)
- **React 19** with TypeScript
- **Tailwind CSS v4** - Styling
- **TanStack Query (React Query)** - State management
- **React Hook Form + Zod** - Form validation
- **Framer Motion** - Animations
- **DND Kit** - Drag and drop
- **shadcn/ui** - Component library
- **Lucide React** - Icons

### Backend

- **Next.js API Routes** - Serverless functions
- **Prisma ORM** - Database management
- **PostgreSQL** - Data storage
- **Auth.js** - Authentication
- **bcryptjs** - Password hashing

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher (or use Prisma Cloud)
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd lumetha-workspace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lumetha"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl"
NEXTAUTH_URL="http://localhost:3000"

# Optional: File uploads
# UPLOADTHING_TOKEN=""
# AWS_ACCESS_KEY_ID=""
# AWS_SECRET_ACCESS_KEY=""
# AWS_S3_BUCKET=""
```

To generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 4. Set up PostgreSQL

**Option A: Local PostgreSQL**

```bash
# macOS
brew install postgresql
brew services start postgresql

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Windows
# Download from https://www.postgresql.org/download/windows/
```

Then create a database:

```bash
createdb lumetha
```

**Option B: Prisma Cloud (Recommended for quick start)**

```bash
npx create-db
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

This will create all the required database tables.

### 6. Open Prisma Studio (optional)

View and manage your database visually:

```bash
npx prisma studio
```

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
lumetha-workspace/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── projects/            # Project endpoints
│   │   ├── tasks/               # Task endpoints
│   │   ├── boards/              # Board endpoints
│   │   └── sprints/             # Sprint endpoints
│   ├── dashboard/               # Dashboard pages
│   ├── setup/                   # Setup guide page
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   └── kanban/              # Kanban board components
│   ├── lib/
│   │   ├── api-client.ts        # Axios API client
│   │   ├── prisma.ts            # Prisma singleton
│   │   └── utils/               # Helper functions
│   ├── hooks/
│   │   └── useApi.ts            # React Query hooks
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── context/                 # React context
├── prisma/
│   ├── schema.prisma            # Prisma schema
│   └── migrations/              # Database migrations
├── public/                       # Static files
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── next.config.ts               # Next.js config
├── tailwind.config.ts           # Tailwind config
└── postcss.config.mjs           # PostCSS config
```

## 🎨 Database Schema

### Core Models

- **User** - User accounts and profiles
- **Project** - Project containers
- **ProjectMember** - Project membership and roles
- **Board** - Kanban or Scrum boards
- **BoardColumn** - Columns within boards
- **Task** - Work items and issues
- **Sprint** - Sprint containers for planning
- **Comment** - Task comments
- **Activity** - Activity log entries
- **Attachment** - Task attachments

## 🔑 Key Endpoints

### Projects

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Tasks

- `GET /api/projects/[id]/tasks` - List project tasks
- `POST /api/projects/[id]/tasks` - Create task
- `GET /api/tasks/[id]` - Get task details
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Boards

- `GET /api/projects/[projectId]/boards` - List boards
- `POST /api/projects/[projectId]/boards` - Create board

### Sprints

- `GET /api/projects/[projectId]/sprints` - List sprints
- `POST /api/projects/[projectId]/sprints` - Create sprint

## 📚 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Create new migration
npx prisma migrate dev --name your_migration_name
```

## 🔐 Authentication Setup

The app uses Auth.js for authentication. Update the authentication configuration in `app/api/auth/[...nextauth].ts` (to be created) to add:

- Email/password authentication
- OAuth providers (GitHub, Google, etc.)
- Session management

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Other Platforms

- Set up environment variables on your platform
- Run database migrations: `npx prisma migrate deploy`
- Deploy using standard Node.js deployment process

## 📖 API Documentation

### Create a Project

```bash
POST /api/projects
Content-Type: application/json

{
  "name": "My Project",
  "key": "MP",
  "description": "Project description",
  "ownerId": "user-id"
}
```

### Create a Task

```bash
POST /api/projects/[projectId]/tasks
Content-Type: application/json

{
  "title": "Implement feature",
  "key": "MP-1",
  "description": "Task description",
  "type": "feature",
  "priority": "high",
  "creatorId": "user-id",
  "assigneeId": "assignee-id"
}
```

### Update Task

```bash
PATCH /api/tasks/[taskId]
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "high",
  "assigneeId": "new-assignee-id"
}
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check DATABASE_URL in `.env.local`
- Ensure database exists: `createdb lumetha`

### Migration Errors

```bash
# Reset database (careful - deletes all data)
npx prisma migrate reset

# Or push schema without migrations (for new databases)
npx prisma db push
```

### Port 3000 Already in Use

```bash
npm run dev -- -p 3001
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [DND Kit Documentation](https://docs.dndkit.com/)

## ✨ What's Next

- [ ] Authentication system integration
- [ ] File upload functionality
- [ ] Notifications system
- [ ] Advanced filtering and search
- [ ] Custom workflows
- [ ] Time tracking
- [ ] Reports and analytics
- [ ] Mobile app

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
