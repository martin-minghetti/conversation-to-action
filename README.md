# Conversation-to-Action

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Claude](https://img.shields.io/badge/AI-Claude%20Sonnet-orange)](https://www.anthropic.com/)
[![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

**Turn messy Slack, Discord, and WhatsApp threads into structured work items in Linear and Notion — without copy-pasting or losing context.**

---

## The Problem

Teams make decisions in chat. Bugs get reported in threads. Feature requests hide inside emoji reactions and side conversations. Someone has to read all of it, figure out what matters, and manually create tickets.

That someone is usually you. And you miss things.

## The Solution

Conversation-to-Action watches your team's channels, extracts actionable items using Claude, deduplicates them against your existing backlog, and lets your team approve or discard each one — right inside the chat where the conversation happened. No context switching. No copy-paste. No tickets falling through the cracks.

---

## How It Works

| Stage | What happens |
|-------|-------------|
| **Ingest** | Messages arrive from Slack, Discord, or WhatsApp and are normalized into a canonical event format |
| **Extract** | Claude identifies four item types — `bug`, `feature`, `task`, `decision` — with titles, descriptions, evidence quotes, confidence scores, and suggested labels |
| **Dedup** | Each candidate is matched against your Linear/Notion backlog using keyword similarity. Close matches are flagged as updates instead of duplicates |
| **Review** | Interactive buttons appear in-channel: approve, edit, or discard each item. Your team stays in the conversation |
| **Push** | Approved items are written to Linear or Notion. Source message permalinks are attached as evidence |

Processing a typical thread of 10-20 messages costs approximately **$0.03-0.05** with Claude Sonnet.

---

## Screenshots

### Live Feed
Real-time feed of extracted items — bugs, features, tasks, and decisions — with confidence scores, status badges, and dedup matches.

![Feed](public/screenshots/feed.png)

### Item Detail
Full extraction view with evidence quotes from the source conversation, dedup analysis, and suggested labels.

![Item Detail](public/screenshots/item-detail.png)

### Stats Dashboard
Pipeline metrics: approval rate, average confidence, and breakdowns by type and status.

![Stats](public/screenshots/stats.png)

### Connection Management
BYOK setup — connect your own Slack, Discord, WhatsApp, Linear, and Notion accounts with encrypted credentials.

![Settings](public/screenshots/settings.png)

---

## Architecture

```mermaid
flowchart TD
    subgraph Sources
        S1[Slack\nEvents API]
        S2[Discord\nGateway]
        S3[WhatsApp\nBusiness API]
    end

    subgraph Normalize
        N[Canonical Event\nnormalize]
    end

    subgraph Pipeline["AI Pipeline (Vercel)"]
        P1[Stage 1\nClaude Extraction\nbug · feature · task · decision]
        P2[Stage 2\nDedup / Resolve\nagainst Linear & Notion]
    end

    subgraph Review["In-Channel Review"]
        R[Approve / Edit / Discard\nbuttons in Slack or Discord]
    end

    subgraph Sinks
        K1[Linear\nGraphQL]
        K2[Notion\nREST]
    end

    subgraph Infra
        V[Vercel\nwebhooks + cron]
        RW[Railway\nDiscord Gateway bot]
    end

    S1 --> N
    S2 -->|"via Railway bot"| N
    S3 --> N
    N --> P1
    P1 --> P2
    P2 --> R
    R -->|approved| K1
    R -->|approved| K2

    V -.->|"hosts"| Pipeline
    V -.->|"hosts"| Review
    RW -.->|"relays events"| N
```

> **Vercel** runs the Next.js app: webhook receivers, the AI pipeline cron, and the review interaction handlers.  
> **Railway** hosts the persistent Discord Gateway bot that stays connected over WebSocket and forwards events to Vercel via HTTP.

---

## Features

- **Three source connectors** — Slack Events API, Discord Gateway, WhatsApp Business API
- **Two sink connectors** — Linear (GraphQL) and Notion (REST)
- **Two-stage AI pipeline** — Stage 1 extracts candidates; Stage 2 deduplicates and resolves against your existing backlog
- **Decisions as first-class items** — not just tasks; explicit approvals and choices are captured as `decision` type
- **In-channel review** — approve, edit, or discard extracted items directly from interactive buttons inside the same Slack or Discord message
- **Dedup against existing backlog** — keyword similarity match; creates new items or updates existing ones
- **BYOK (Bring Your Own Keys)** — your API keys are encrypted at rest with AES-256-GCM and never leave your instance
- **Real-time dashboard** — live feed of extracted items powered by Supabase Realtime
- **Stats page** — precision metrics per source and item type
- **Async processing** — events are staged to Supabase; a per-minute cron processes them in batches, respecting Slack's 3-second webhook rule

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| AI | Anthropic SDK — Claude Sonnet |
| Database | Supabase (Postgres + Realtime) |
| Discord bot | discord.js (Railway) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel (app) + Railway (Discord bot) |
| Validation | Zod |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- API keys for whichever sources and sinks you want to connect (Slack, Discord, WhatsApp, Linear, Notion, Anthropic)

### Steps

1. **Clone the repo**

   ```bash
   git clone https://github.com/martin-minghetti/conversation-to-action.git
   cd conversation-to-action
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the Supabase migration**

   ```bash
   # Install Supabase CLI if needed: https://supabase.com/docs/guides/cli
   supabase db push
   ```

4. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   # Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   # SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ENCRYPTION_KEY
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Add your first connection**

   Open [http://localhost:3000/settings](http://localhost:3000/settings) and add a source (Slack, Discord, or WhatsApp) and a sink (Linear or Notion).

7. **Start chatting**

   Talk in any connected channel. Within a minute, extracted items will appear in the dashboard. Your team will see an in-channel review message with action buttons.

---

## Pipeline Details

### Stage 1 — Extraction

When a message lands in a connected channel, it is normalized into a canonical event and staged in Supabase. Every minute, a Vercel cron job picks up unprocessed events and groups them by thread. Each thread is sent to **Claude Sonnet** with a structured prompt that identifies four item types: `bug`, `feature`, `task`, and `decision`. The model returns a JSON array with title, description, owner, evidence quotes, confidence score (0-100), and suggested labels.

### Stage 2 — Dedup and Resolution

Each candidate item is then sent to your configured sink (Linear or Notion) for a keyword search against the existing backlog. The stage-2 resolver computes string similarity between the candidate title and each search result. If a close match is found (similarity >= 0.7), the item is flagged as `update`; if two close matches compete, it becomes `ambiguous`; otherwise it defaults to `create`. This prevents duplicates without requiring embeddings or vector infrastructure.

### In-Channel Review

After resolution, a review message with interactive buttons is posted back into the original Slack channel or Discord thread. Each team member can **approve**, **edit the title/description**, or **discard** each item individually — without switching tools. Only approved items are pushed to Linear or Notion.

### Push to Sink

Approved items are written to the configured sink via the connector API. If the dedup action is `update`, the existing issue is patched with the new description and evidence links. If it is `create`, a new issue or page is created. Source message permalinks are attached as evidence comments or page blocks.

---

## Testing

```bash
npm test           # run all tests once
npm run test:watch # watch mode
```

62 tests across the full pipeline: extraction, resolution, dedup logic, connector normalizers, crypto utilities, and API route handlers. Tests run in CI on every push via GitHub Actions.

---

## Architecture Decisions

See [DECISIONS.md](DECISIONS.md) for the 9 key trade-off analyses that shaped this project.

---

## Contributing

Contributions are welcome. If you want to add a new source connector, sink, or improve the extraction pipeline:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Write tests for your changes
4. Make sure `npm test` and `npm run typecheck` pass
5. Open a pull request with a clear description of what you changed and why

For bugs or feature requests, open an issue.

---

## Community

- [GitHub Issues](https://github.com/martin-minghetti/conversation-to-action/issues) — bug reports, feature requests
- [GitHub Discussions](https://github.com/martin-minghetti/conversation-to-action/discussions) — questions, ideas, show and tell

---

Built by [Martin Minghetti](https://github.com/martin-minghetti).
