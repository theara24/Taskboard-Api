# TaskBoard API — Jira-Inspired Project & Issue Management REST API

A robust, enterprise-grade, backend-only REST API inspired by Jira for managing projects, issues, members, comments, labels, and activity audit trails. Built with **Node.js**, **Express**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

---

## Table of Contents
- [1. Project Overview](#1-project-overview)
- [2. Features](#2-features)
- [3. Technology Stack](#3-technology-stack)
- [4. System Architecture](#4-system-architecture)
- [5. Database Schema & ERD](#5-database-schema--erd)
- [6. Getting Started & Installation](#6-getting-started--installation)
- [7. Environment Configuration](#7-environment-configuration)
- [8. Database Migration & Seeding](#8-database-migration--seeding)
- [9. Running the Application](#9-running-the-application)
- [10. Swagger / OpenAPI Documentation](#10-swagger--openapi-documentation)
- [11. Testing](#11-testing)
- [12. Docker Setup](#12-docker-setup)
- [13. Example API Requests](#13-example-api-requests)
- [14. Academic Presentation Talking Points](#14-academic-presentation-talking-points)

---

## 1. Project Overview

**TaskBoard API** is a backend service for modern software engineering teams. It allows organizations to organize work into distinct **Projects** and track work items as **Issues** with full lifecycle management (Backlog, Todo, In Progress, Done), customizable priorities, assignees, markdown descriptions, labels, and threaded discussions.

### Key Highlights
- **100% Backend-Only**: Zero frontend dependencies; fully operable and testable via Swagger UI, cURL, or Postman.
- **Production-Style Layered Architecture**: Clean separation between presentation (routes/controllers), validation (Zod), business logic (services), and data access (Prisma ORM).
- **Concurrency-Safe Issue Keys**: Atomic monotonic counter per project guaranteeing sequential keys (e.g. `TASK-1`, `TASK-2`) without race condition duplicates.
- **Comprehensive Audit Trail**: Automated activity logging for issue status changes, priority shifts, and member reassignments.

---

## 2. Features

### 🔐 Authentication & Identity
- Secure user registration and login with **bcrypt** (10 salt rounds).
- Stateless **JWT (JSON Web Tokens)** with configurable expiration.
- Role-Based Access Control (**ADMIN**, **USER**).
- `/auth/me` endpoint to inspect authenticated profile.

### 📁 Project Management
- Create projects with unique uppercase project keys (e.g., `TASK`, `WEB`, `MOBILE`).
- Automatic assignment of project creator as `OWNER`.
- Add and remove project members by email or user ID (`OWNER`, `MEMBER`).
- Strict authorization: non-members cannot read or modify project data.

### 🎫 Issue Lifecycle & Management
- Auto-generated sequential issue keys (`<KEY>-<NUMBER>`).
- Supported issue types: `TASK`, `BUG`, `FEATURE`.
- Supported priorities: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Supported statuses: `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`.
- Assignee and reporter assignment with project membership verification.
- Search issues by title, description, or key.
- Multi-criteria filtering (by status, priority, type, assignee, reporter).
- Sorting (`createdAt`, `updatedAt`, `priority`, `dueDate`, `title`) and pagination metadata (`page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPrevPage`).

### 💬 Threaded Comments
- Add comments to any issue.
- Author-only permissions: users can edit and delete only their own comments (Admins can moderate).
- Automated audit log entry whenever comments are posted.

### 🏷️ Project-Scoped Labels
- Create labels isolated within each project namespace to prevent cross-project pollution.
- Attach and detach multiple labels to issues.

### 📜 Automated Activity History
- System audit log automatically records:
  - `ISSUE_CREATED`
  - `STATUS_CHANGED` (tracks old value -> new value)
  - `PRIORITY_CHANGED`
  - `ASSIGNEE_CHANGED`
  - `ISSUE_UPDATED`
  - `COMMENT_ADDED`

---

## 3. Technology Stack

| Category | Technology | Description |
|---|---|---|
| **Runtime** | Node.js (v20+) | High-performance asynchronous JavaScript engine |
| **Language** | TypeScript (v5+) | Strict type safety and maintainability |
| **Framework** | Express.js (v4) | Fast, unopinionated, minimalist web framework |
| **Database** | PostgreSQL (v16+) | Enterprise relational SQL database |
| **ORM** | Prisma ORM (v5) | Type-safe query builder and declarative migrations |
| **Auth** | JWT & bcryptjs | Stateless authorization and secure password hashing |
| **Validation** | Zod | Runtime schema validation for body, query, and params |
| **Documentation** | Swagger / OpenAPI 3.0 | Interactive API browser and testing suite |
| **Security** | Helmet, CORS, Rate Limiter | HTTP headers security, origin control, and brute-force mitigation |
| **Testing** | Jest & Supertest | End-to-end integration and API unit tests |
| **Containerization** | Docker & Docker Compose | Containerized PostgreSQL and API deployment |

---

## 4. System Architecture

TaskBoard API follows a **Layered 3-Tier Architecture**:

```
                  ┌─────────────────────────────────┐
                  │          Client Request         │
                  │   (Swagger / Postman / cURL)    │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │                 Security Middleware                 │
        │  • Helmet (HTTP Security Headers)                   │
        │  • CORS (Cross-Origin Policy)                       │
        │  • Express Rate Limit (Auth Brute-force Prevention) │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │                  Routing Layer                      │
        │  /api/v1/auth     /api/v1/projects  /api/v1/issues  │
        │  /api/v1/users    /api/v1/comments                  │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │          Auth & Guard Middlewares                   │
        │  • authenticate (JWT Bearer Token verification)     │
        │  • requireProjectMember (Membership check)          │
        │  • requireProjectOwner (Ownership check)            │
        │  • validate(ZodSchema) (Request payload validation) │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │                  Controllers                        │
        │  Extracts parameters, calls services, and formats   │
        │  standardized ApiResponse payloads                  │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │               Services (Business Logic)             │
        │  Atomic transactions, key generation, audit trail,   │
        │  password hashing, and business domain invariants   │
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │           Prisma ORM & PostgreSQL Database           │
        └─────────────────────────────────────────────────────┘
```

---

## 5. Database Schema & ERD

```
 ┌──────────────┐          ┌───────────────────┐          ┌──────────────┐
 │     User     │1       * │   ProjectMember   │ *       1│   Project    │
 ├──────────────┼──────────┼───────────────────┼──────────┼──────────────┤
 │ id (UUID)    │          │ id (UUID)         │          │ id (UUID)    │
 │ name         │          │ projectId (FK)    │          │ name         │
 │ email        │          │ userId (FK)       │          │ key (Unique) │
 │ passwordHash │          │ role (OWNER/MEM)  │          │ description  │
 │ role         │          │ joinedAt          │          │ ownerId (FK) │
 └──────┬───────┘          └───────────────────┘          │ issueCounter │
        │                                                 └──────┬───────┘
        │1                                                       │1
        │                                                        │
        │*                                                       │*
 ┌──────┴───────┐          ┌───────────────────┐          ┌──────┴───────┐
 │   Activity   │ *       1│       Issue       │1       * │    Label     │
 ├──────────────┼──────────┼───────────────────┼──────────┼──────────────┤
 │ id (UUID)    │          │ id (UUID)         │          │ id (UUID)    │
 │ issueId (FK) │          │ issueKey (Unique) │          │ name         │
 │ userId (FK)  │          │ title             │          │ projectId(FK)│
 │ action       │          │ description       │          └──────┬───────┘
 │ oldValue     │          │ type (Enum)       │                 │1
 │ newValue     │          │ status (Enum)     │                 │
 │ createdAt    │          │ priority (Enum)   │                 │*
 └──────────────┘          │ dueDate           │          ┌──────┴───────┐
                           │ projectId (FK)    │1       * │  IssueLabel  │
                           │ reporterId (FK)   ├──────────┼──────────────┤
                           │ assigneeId (FK)   │          │ issueId (FK) │
                           └─────────┬─────────┘          │ labelId (FK) │
                                     │1                   └──────────────┘
                                     │
                                     │*
                           ┌─────────┴─────────┐
                           │      Comment      │
                           ├───────────────────┤
                           │ id (UUID)         │
                           │ content           │
                           │ issueId (FK)      │
                           │ authorId (FK)     │
                           └───────────────────┘
```

### Relational Integrity Highlights
- **Composite Unique Keys**:
  - `ProjectMember`: `@@unique([projectId, userId])` prevents duplicate membership entries.
  - `Label`: `@@unique([projectId, name])` prevents duplicate labels within the same project.
  - `IssueLabel`: `@@id([issueId, labelId])` creates a clean junction table.
- **Cascade Deletions**: Deleting a project cascades to its members, issues, and labels. Deleting an issue cascades to comments and activities.
- **Restrictive Deletions**: Deleting a user is restricted if that user is currently the owner of an active project or the reporter of an issue, preserving data integrity.

---

## 6. Getting Started & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20 or later)
- [npm](https://www.npmjs.com/) (version 10 or later)
- [PostgreSQL](https://www.postgresql.org/) (v16+) OR [Docker Desktop](https://www.docker.com/)

### Clone & Install
```bash
# 1. Navigate to the project directory
cd taskboard-api

# 2. Install dependencies
npm install
```

---

## 7. Environment Configuration

Copy the sample environment file:
```bash
cp .env.example .env
```

Review and customize the variables in `.env`:
```ini
# Application Configuration
PORT=5000
NODE_ENV=development

# Database Connection (Adjust user, password, port, and DB name)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/taskboard_db?schema=public"

# Authentication & Security
JWT_SECRET="super-secret-jwt-key-taskboard-university-2026"
JWT_EXPIRES_IN="7d"

# CORS
CORS_ORIGIN="*"

# Rate Limiting (100 requests per 15 minutes on auth endpoints)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 8. Database Migration & Seeding

### 1. Run Migrations
Generate the Prisma Client and run database migrations:
```bash
npm run prisma:generate
npx prisma db push
```

### 2. Populate Demo Data
Run the automated seed script to populate realistic demo data:
```bash
npm run prisma:seed
```

The seed script creates:
- **1 Admin User**: `admin@taskboard.io` (Password: `Admin123!`)
- **3 Normal Users**: `alice@example.com`, `bob@example.com`, `charlie@example.com` (Password: `User123!`)
- **2 Projects**:
  - `WEB` — TaskBoard Web Platform (Owner: Alice)
  - `MOB` — TaskBoard Mobile App (Owner: Bob)
- **5 Issues**: Including Tasks, Bugs, and Features across backlog, in-progress, and done.
- **Labels, Comments, and Activity History logs**.

---

## 9. Running the Application

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

Once running:
- **Server**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Interactive Swagger UI**: `http://localhost:5000/api-docs`

---

## 10. Swagger / OpenAPI Documentation

TaskBoard API includes a complete interactive Swagger documentation UI.

Visit:
```
http://localhost:5000/api-docs
```

### Testing Protected Endpoints via Swagger:
1. Expand `POST /auth/login` and click **Try it out**.
2. Submit demo credentials:
   ```json
   {
     "email": "alice@example.com",
     "password": "User123!"
   }
   ```
3. Copy the returned `token` from the response.
4. Click the green **Authorize 🔓** button at the top of Swagger UI.
5. Paste the token and click **Authorize**.
6. You can now execute any protected endpoint directly from the browser!

---

## 11. Testing

The project includes an automated test suite covering authentication, authorization rules, projects, issues, key generation, and comments.

```bash
# Run all tests
npm test

# Run linter
npm run lint

# Format code with Prettier
npm run format
```

---

## 12. Docker Setup

TaskBoard API includes a complete `docker-compose.yml` for PostgreSQL and the API.

```bash
# Start PostgreSQL database in the background
docker compose up -d postgres

# Or build and run the entire stack (Postgres + API)
docker compose up -d
```

To stop the containers:
```bash
docker compose down
```

---

## 13. Example API Requests

### 1. Register a New User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Developer",
    "email": "alex@example.com",
    "password": "Password123!"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@example.com",
    "password": "Password123!"
  }'
```

### 3. Create a Project
```bash
curl -X POST http://localhost:5000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "name": "Cloud Backend",
    "key": "CLOUD",
    "description": "Microservices platform"
  }'
```

### 4. Create an Issue (Auto-Generates `CLOUD-1`)
```bash
curl -X POST http://localhost:5000/api/v1/projects/<PROJECT_ID>/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "title": "Setup Redis cache layer",
    "type": "FEATURE",
    "priority": "HIGH",
    "status": "TODO"
  }'
```

### 5. Search & Filter Issues with Pagination
```bash
curl -X GET "http://localhost:5000/api/v1/projects/<PROJECT_ID>/issues?page=1&limit=10&status=TODO&priority=HIGH&q=Redis" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 6. Update Issue Status (Triggers Activity Audit Log)
```bash
curl -X PATCH http://localhost:5000/api/v1/issues/<ISSUE_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

### 7. View Issue Activity History
```bash
curl -X GET http://localhost:5000/api/v1/issues/<ISSUE_ID>/activities \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

## 14. Academic Presentation Talking Points

When presenting this project to your university professor and examiners, highlight these architectural decisions:

1. **Why Layered Architecture?**
   - Decouples HTTP handling (`Controllers`) from business rules (`Services`) and database logic (`Prisma`).
   - Enables mocking database operations easily during unit and integration testing without database dependencies.

2. **How is the Issue Key generated concurrently without duplicate key errors?**
   - Projects maintain an internal `issueCounter`.
   - In `IssueService.createIssue`, we use `prisma.$transaction` with an atomic SQL update (`issueCounter: { increment: 1 }`). This utilizes PostgreSQL row-level locks, ensuring sequential, conflict-free keys (`TASK-1`, `TASK-2`) even under concurrent submissions.

3. **How is Authorization Enforced?**
   - Defense-in-depth: Not just route authentication (`authenticate`), but fine-grained membership validation (`requireProjectMember`, `requireProjectOwner`).
   - A user who logs in cannot inspect issues of a project they are not a member of (returns `403 Forbidden`).

4. **Production-Grade Error Handling**:
   - Uniform error format across all endpoints (`{ success: false, message, error, details? }`).
   - Internal stack traces and database credentials are fully suppressed in non-development environments.
