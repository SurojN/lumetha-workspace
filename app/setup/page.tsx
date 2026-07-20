"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="mb-8 inline-block">
          <Button variant="outline">← Back</Button>
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Setup Guide
            </h1>
            <p className="text-slate-600">
              Get your Lumetha project management app up and running
            </p>
          </div>

          {/* Prerequisites */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Prerequisites
            </h2>
            <div className="bg-white rounded-lg p-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Node.js 18+
                  </p>
                  <p className="text-sm text-slate-600">
                    Ensure you have Node.js installed
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    PostgreSQL 14+
                  </p>
                  <p className="text-sm text-slate-600">
                    Database for storing your data
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Step 1: Database Setup */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Step 1: Database Setup
            </h2>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Option A: Local PostgreSQL
                </h3>
                <code className="block bg-slate-100 p-3 rounded text-sm text-slate-900 overflow-x-auto">
                  brew install postgresql
                  <br />
                  brew services start postgresql
                </code>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Option B: Prisma Cloud (Recommended)
                </h3>
                <code className="block bg-slate-100 p-3 rounded text-sm text-slate-900">
                  npx create-db
                </code>
              </div>
            </div>
          </section>

          {/* Step 2: Environment Variables */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Step 2: Environment Variables
            </h2>
            <div className="bg-white rounded-lg p-6">
              <p className="mb-3 text-slate-600">
                Create a{" "}
                <code className="bg-slate-100 px-2 py-1 rounded">
                  .env.local
                </code>{" "}
                file:
              </p>
              <code className="block bg-slate-100 p-3 rounded text-sm text-slate-900 whitespace-pre">
                {`DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"`}
              </code>
            </div>
          </section>

          {/* Step 3: Install Dependencies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Step 3: Install Dependencies
            </h2>
            <div className="bg-white rounded-lg p-6">
              <code className="block bg-slate-100 p-3 rounded text-sm text-slate-900">
                npm install
              </code>
            </div>
          </section>

          {/* Step 4: Database Migrations */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Step 4: Database Migrations
            </h2>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Create migrations
                </h3>
                <code className="block bg-slate-100 p-3 rounded text-sm text-slate-900">
                  npx prisma migrate dev --name init
                </code>
              </div>
            </div>
          </section>

          {/* Step 5: Start Development Server */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Step 5: Start Development
            </h2>
            <div className="bg-white rounded-lg p-6">
              <code className="block bg-slate-100 p-3 rounded text-sm text-slate-900">
                npm run dev
              </code>
              <p className="text-sm text-slate-600 mt-3">
                Visit{" "}
                <code className="bg-slate-100 px-2 py-1 rounded">
                  http://localhost:3000
                </code>
              </p>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Tech Stack
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Frontend
                </h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Next.js 16</li>
                  <li>• React 19</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS v4</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Backend
                </h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Prisma ORM</li>
                  <li>• PostgreSQL</li>
                  <li>• Next.js API Routes</li>
                  <li>• Auth.js</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              Next Steps
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
              <p className="text-slate-900">
                Once setup is complete:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li>1. Create your first project in the dashboard</li>
                <li>2. Add team members to your project</li>
                <li>3. Create tasks and organize them on the Kanban board</li>
                <li>4. Set up sprints for iteration planning</li>
              </ul>
            </div>
          </section>

          <div className="flex gap-4">
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back Home</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

