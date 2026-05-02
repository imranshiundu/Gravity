# Gravity Web

Gravity Web is the main UI shell for Grav. It currently uses the Ash interface foundation while being reshaped into one unified Gravity command center.

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui primitives + custom composition
- dnd-kit for interactive board behavior

## Key Screens

- **Tickets Workspace**
  - Board and table layouts
  - Bulk actions, status/priority edits
  - Ticket drawer for quick update

- **Ticket Detail View**
  - Conversation/task/activity/notes tabs
  - Context panel (details/people/knowledge)
  - Reply workflows with macro suggestions

- **CSM Navigation Sections**
  - Inbox, Customers, Accounts, Internal Notes, Knowledge Base, Macros, Automation, Settings
  - Shared route metadata and consistent page scaffolding

## Architecture

- `app/`
  - Route entry points (App Router)
  - Shared root layout and metadata

- `components/`
  - `tickets/`: ticket workflows (board, table, detail, drawer)
  - `data-grid/`: reusable table/grid foundation
  - `ui/`: shadcn-style primitives

- `lib/`
  - `grav-routes.ts`: route metadata, sidebar previews, template metrics
  - `tickets/*`: ticket domain types and mock data
  - `current-user.ts`: demo actor/profile data

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Install

```bash
pnpm install
```

### Develop

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Build and Run

```bash
pnpm build
pnpm start
```

### Quality Checks

```bash
pnpm typecheck
pnpm lint
```

## Mock Data and Production Notes

Current ticket and workspace content is still partly mock data while the Gravity endpoint layer is being connected.

Before using this in production:

1. Replace `lib/tickets/mock-data.ts` with API-backed data sources.
2. Replace demo identities in `lib/current-user.ts`.
3. Wire mutations (status/priority/notes/replies) to server actions or API routes.
