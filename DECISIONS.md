# Architecture Decisions

Nine key trade-off analyses that shaped the design of Conversation to Action.

---

## 1. Two-stage pipeline over multi-agent (Prism-style)

**Decision:** Split AI processing into two discrete stages — extraction first, dedup/resolution second — rather than running a single multi-agent orchestration loop.

**Alternatives considered:**
- Single prompt that extracts and resolves in one pass
- Multi-agent framework (LangGraph, AutoGen, Prism) with dynamic tool calls
- Streaming pipeline where each message is processed as it arrives

**Why:**
Each stage has a clear, testable interface. Stage 1 always returns `ExtractedItem[]`; Stage 2 always returns `ResolvedItem[]`. That boundary makes unit testing trivial — you can feed synthetic extracted items into the resolver without touching an LLM. Multi-agent frameworks add orchestration overhead, non-deterministic routing, and model costs for control-plane decisions that don't require intelligence. For a pipeline this linear, the complexity is unjustified.

**Trade-offs:**
- Two API calls per thread instead of one. Mitigated by the fact that the resolver's prompt is minimal and the cost difference is negligible (~$0.01).
- The two stages can't share latent reasoning state. Acceptable because the resolution step queries live APIs (Linear/Notion) that no single-pass prompt could access anyway.

---

## 2. TypeScript full-stack over Python

**Decision:** Use TypeScript for everything — Next.js frontend, API routes, pipeline logic, connectors, and the Discord bot.

**Alternatives considered:**
- Python (FastAPI) for the pipeline and connectors; Next.js only for the frontend
- Python monolith with a lightweight frontend (HTMX or a minimal React app)

**Why:**
The primary goal is a portfolio project visible to hiring managers and Upwork clients evaluating full-stack TypeScript range. Keeping one language across the entire stack also eliminates serialization boundaries between the pipeline and the web layer, reduces cognitive overhead, and means a single `package.json` manages all non-bot dependencies. The Anthropic SDK, Supabase SDK, and all connector SDKs have first-class TypeScript support.

**Trade-offs:**
- Python has a richer AI/ML ecosystem. Not relevant here — Claude does all the inference; there is no custom model training or embedding work in v1.
- Some engineers are more comfortable writing async IO-heavy code in Python. Mitigated by TypeScript's native `async/await` and the fact that all external calls are simple REST/GraphQL.

---

## 3. Vercel + Railway split over a single platform

**Decision:** Deploy the Next.js app (webhooks, cron, dashboard) to Vercel and the Discord Gateway bot to Railway as a separate long-lived process.

**Alternatives considered:**
- Everything on Railway (Next.js + bot in one repo/container)
- Everything on Fly.io
- Vercel only, with Discord webhooks instead of Gateway (see Decision 4)

**Why:**
Vercel's serverless model is the natural fit for webhook receivers (Slack Events API, WhatsApp Business API) — they are short-lived, burst on demand, and benefit from Vercel's global edge network. But Discord's Gateway protocol requires a persistent WebSocket connection that a serverless function cannot maintain. Railway is purpose-built for always-on containers and handles the bot's reconnect logic cleanly. Splitting by workload type means each service runs on the platform it is optimized for.

**Trade-offs:**
- Two deployment targets increase operational overhead. Mitigated by Railway's simple Docker-based deploys and the fact that the Discord bot is a single `index.ts` file with minimal configuration.
- The bot must relay events to Vercel over HTTP, adding one network hop. The latency is imperceptible to users and acceptable for an async pipeline.

---

## 4. Webhook mode over Socket Mode (Slack)

**Decision:** Use Slack's Events API (HTTP webhooks) rather than Socket Mode (persistent WebSocket) for receiving Slack events.

**Alternatives considered:**
- Socket Mode, which keeps a WebSocket open and does not require a public URL
- Socket Mode hosted on Railway alongside the Discord bot

**Why:**
Webhook mode is fully compatible with Vercel serverless functions — each event triggers a standard POST request. Socket Mode requires a persistent connection which serverless cannot provide. Since Vercel is already the deployment target for all other webhooks (WhatsApp, interaction callbacks), keeping Slack in the same model avoids introducing a second persistent process just for one source connector. Socket Mode also bypasses Slack's standard request verification flow, making the security surface slightly harder to reason about.

**Trade-offs:**
- Webhook mode requires a public HTTPS URL with Slack's verified domain challenge. Not an issue for a deployed app; adds minor friction in local development (requires `ngrok` or similar tunnel). Documented in the Quick Start.
- Socket Mode would have simplified local development. Not a sufficient reason to diverge from the serverless architecture for production.

---

## 5. Decisions as a first-class item type

**Decision:** Add `decision` as a fourth extraction type alongside `bug`, `feature`, and `task`.

**Alternatives considered:**
- Treat decisions as a sub-type of `task` (with a label)
- Post-process tasks and flag ones that look like decisions
- Omit decisions entirely in v1

**Why:**
Product teams consistently lose track of decisions made in chat. A standup produces a task list; the explicit approval of a design direction gets buried three messages later and is forgotten. Linear and Notion both have native support for adding context blocks to issues and pages — a `decision` item maps naturally to a dedicated issue type or a standalone Notion page. Making it a first-class type means the extraction prompt is explicit about it, the dashboard filters by it, and the stats page tracks decision capture rate as a distinct metric.

**Trade-offs:**
- Claude occasionally over-extracts decisions (flagging a casual opinion as a choice). Mitigated by the confidence scoring system — low-confidence decisions surface for human review before being pushed to any sink.

---

## 6. Keyword dedup over embedding similarity

**Decision:** Use string similarity (Levenshtein-based) between item titles to detect duplicates, rather than semantic embedding vectors.

**Alternatives considered:**
- OpenAI or Supabase `pgvector` embeddings for semantic similarity
- Exact-match only (no fuzzy matching)
- Let the sinks handle dedup themselves

**Why:**
Linear and Notion both expose search APIs that accept text queries and return ranked results. Given that result set (5–10 candidates), comparing titles with a string similarity function is fast, deterministic, and free. Embedding-based similarity would require an additional API call per item, a vector store, and careful threshold tuning — complexity that is not justified when the existing backlog items and extracted titles share vocabulary (they describe the same codebase). String similarity at a 0.7 threshold catches renamed duplicates and typos reliably in testing.

**Trade-offs:**
- Semantic equivalents with different wording ("fix login crash" vs "users cannot authenticate") score low and may create duplicates. Accepted as a v1 limitation; the in-channel review step gives the team a chance to catch these before they land in the sink.
- Keyword search quality depends on the sink's own search implementation. Linear's search is strong; Notion's is more limited. Documented per-connector.

---

## 7. In-channel review over dashboard-only review

**Decision:** Post interactive approve/edit/discard buttons directly into the source channel (Slack or Discord) rather than requiring users to visit the web dashboard.

**Alternatives considered:**
- Dashboard-only approval (no in-channel messages)
- Email digest with approval links
- Auto-approve everything above a confidence threshold

**Why:**
The core value proposition is eliminating context switches. If reviewing extracted items requires opening a browser, navigating to a dashboard, and triaging a list, the friction is nearly as high as copy-pasting manually. In-channel review keeps the action at the point of conversation — the same thread where the discussion happened. Slack's Block Kit and Discord's component system both support this natively. Trust in the AI output is also higher when the team can immediately see what was extracted from their own words.

**Trade-offs:**
- Interactive buttons require additional API surface (Slack interactions endpoint, Discord interaction webhook) and signature verification. The added attack surface is contained to two route handlers with standard HMAC verification.
- Users who prefer a bulk review workflow must open the dashboard. Acceptable — the dashboard is available and the in-channel flow is opt-in per connection.

---

## 8. BYOK over hosted credentials

**Decision:** Store each user's API keys (Linear, Notion, Slack bot tokens) in the database encrypted with AES-256-GCM, rather than managing a shared set of hosted credentials.

**Alternatives considered:**
- OAuth flows with server-side token storage managed by the app
- A secrets manager (AWS Secrets Manager, Doppler) per tenant
- Demo mode with hardcoded read-only credentials

**Why:**
BYOK makes the demo immediately real — anyone cloning the repo and entering their own keys gets a fully functional integration without needing to trust a third-party OAuth server operated by this project. It eliminates credential liability: if this project's infrastructure were compromised, there are no shared tokens to rotate. Each key is encrypted with a per-deployment `ENCRYPTION_KEY` using AES-256-GCM, so the database alone is not sufficient to recover credentials. For a portfolio project, BYOK also demonstrates production-grade credential handling without requiring OAuth app registrations with every platform.

**Trade-offs:**
- Users must manually generate and paste API keys. More friction than OAuth at setup time. Mitigated by step-by-step instructions in the Settings UI for each connector.
- AES-256-GCM is only as strong as the `ENCRYPTION_KEY`. If the key leaks alongside the database, credentials are exposed. Documented as a deployment security requirement.

---

## 9. Async processing with cron over synchronous webhook processing

**Decision:** Stage incoming events in Supabase immediately on webhook receipt, then process them with a per-minute Vercel cron job, rather than running the AI pipeline synchronously inside the webhook handler.

**Alternatives considered:**
- Process inline in the webhook handler (synchronous)
- Use a message queue (BullMQ, Redis Streams, Upstash QStash)
- Use Vercel's background functions (waitUntil)

**Why:**
Slack requires a `200 OK` response within 3 seconds or it retries the event. Claude inference plus two sink API calls reliably exceeds that budget. Staging to Supabase takes under 100ms. The cron approach also provides natural retry semantics — failed events remain in the queue and are retried on the next tick — without requiring a dedicated queue service. Supabase Postgres is already in the stack, so there is no additional infrastructure to operate.

**Trade-offs:**
- Items appear in the dashboard up to 60 seconds after the conversation, not instantly. Acceptable for a tool whose primary use case is reviewing threads after a meeting, not real-time alerting.
- Per-minute cron granularity is coarse. If Vercel cron resolution improves or the use case demands lower latency, the event processor can be triggered directly from the webhook handler using `waitUntil` without changing the pipeline logic.
