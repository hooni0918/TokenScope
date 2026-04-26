# TokenScope

> **Know exactly how many tokens (and dollars) your AI coding tools are burning on your project.**

TokenScope automatically tracks token usage and estimated cost from **Claude Code** and **OpenAI Codex CLI** per workspace in VSCode. No API keys, no manual input — just install and code.

---

## Why TokenScope?

AI coding tools don't show cumulative token usage per project. If you're working across multiple repos, it's hard to know where your tokens are going — or how much it's costing you.

TokenScope answers that by reading local conversation logs and presenting a clear breakdown — right inside VSCode.

- How many tokens did I spend on this project today?
- Which model is eating the most tokens?
- How much is this costing me?
- Is my usage trending up or down?
- Am I spending more on Claude Code or Codex CLI?

---

## Supported Tools

| Tool | Status | Data Source |
|------|--------|-------------|
| **Claude Code** | Supported | `~/.claude/projects/` JSONL logs |
| **OpenAI Codex CLI** | Supported | `~/.codex/sessions/` rollout JSONL files |
| Gemini CLI | Not possible | No local token data (in-memory only) |
| GitHub Copilot | Not possible | All usage data is server-side |
| Cursor | Not possible | No token counts stored locally |

---

## Features

### Status Bar — Always Visible

A persistent token counter in the status bar shows your project's total usage and estimated cost at a glance. Click it to open the full dashboard.

The tooltip expands to show a full breakdown:
- Input / Output / Cache Write / Cache Read / Reasoning tokens
- Total session and response counts
- Estimated cost in USD

### Sidebar Tree View

Browse usage broken down by **model** and **session** directly in the activity bar.

- **By Model** — see each model's total tokens, call count, and estimated cost
- **Sessions** — expand any session to see per-token-type breakdown, cost, and which provider (Claude Code or Codex CLI) it came from
- Configurable session display limit with `+N more sessions` indicator

### Dashboard

A dedicated webview panel with rich visualizations:

- **Provider indicator** — shows which tools are being tracked
- **Summary cards** — total tokens, input, output, cache write, cache read, reasoning, session count, response count, and estimated cost
- **Per-model bar chart** — see which models are consuming the most tokens, with cost per model
- **Daily trend chart** — visualize your token usage over the last 14 days to spot patterns and spikes
- **Session history table** — recent sessions with provider tag, full token breakdown, and per-session cost estimate
- **CSV Export** — one-click export of all session data for reporting or analysis

### Cost Estimation

TokenScope automatically estimates your spending based on known model pricing:

**Claude Models:**

| Model | Input | Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|------------|
| Claude Opus 4 | $15/M | $75/M | $18.75/M | $1.50/M |
| Claude Sonnet 4 | $3/M | $15/M | $3.75/M | $0.30/M |
| Claude 3.5 Sonnet | $3/M | $15/M | $3.75/M | $0.30/M |
| Claude 3.5 Haiku | $0.80/M | $4/M | $1/M | $0.08/M |
| Claude 3 Opus | $15/M | $75/M | $18.75/M | $1.50/M |
| Claude 3 Haiku | $0.25/M | $1.25/M | $0.30/M | $0.03/M |

**OpenAI Models:**

| Model | Input | Output | Cached Input |
|-------|-------|--------|--------------|
| Codex Mini | $1.50/M | $6/M | $0.375/M |
| o4-mini | $1.10/M | $4.40/M | $0.275/M |
| o3 | $2/M | $8/M | $0.50/M |
| o3-mini | $1.10/M | $4.40/M | $0.275/M |
| GPT-4.1 | $2/M | $8/M | $0.50/M |
| GPT-4.1 Mini | $0.40/M | $1.60/M | $0.10/M |
| GPT-4.1 Nano | $0.10/M | $0.40/M | $0.025/M |
| GPT-4o | $2.50/M | $10/M | $1.25/M |
| GPT-4o Mini | $0.15/M | $0.60/M | $0.075/M |

Cost estimates appear in the status bar, tree view, and dashboard. If a model is not in the pricing table, those tokens are excluded from the cost total and a note is shown.

You can toggle cost display on/off via the `tokenScope.showCostEstimate` setting.

### Session Labeling & Comparison

Tag any session with a custom name (e.g., `korean-skill`, `english-skill`, `task-A`) and compare two sessions side by side to see exactly which approach uses fewer tokens.

**Why this is useful:**
- Compare token cost of a Korean-written skill vs an English-written one
- Measure how a prompt rewrite affected usage
- Track cost difference between two implementation approaches

**How to label:**
- Click the tag icon next to any session in the tree view
- Right-click a session → Label Session
- Command Palette: `TokenScope: Label Session`
- Dashboard: **Label Session** button

**How to compare:**
- Click the diff icon at the top of the TokenScope sidebar
- Command Palette: `TokenScope: Compare Sessions`
- Dashboard: **Compare Sessions** button

The comparison panel shows total / input / output / cache write / cache read / reasoning / response count / estimated cost for both sessions, with absolute and percentage deltas. The session with fewer tokens gets a "cheaper" badge.

### CSV Export

Export your complete session history to CSV for spreadsheets, reporting, or team sharing.

Each row includes: Session ID, Provider, Date, Response count, Input/Output/Cache Write/Cache Read tokens, Total tokens, and Estimated Cost.

**Two ways to export:**
- Click the **Export CSV** button in the dashboard
- Run `TokenScope: Export Usage to CSV` from the Command Palette

### Daily Trend Chart

The dashboard includes a 14-day bar chart showing daily token consumption. Use it to:

- Spot which days had heavy AI coding tool usage
- Track whether your token usage is increasing or decreasing
- Identify spikes and correlate them with development activity

### Zero Configuration

TokenScope reads from local log directories that Claude Code and Codex CLI already write to. There's nothing to set up.

### Live Updates

File watchers monitor both Claude Code and Codex CLI log files. New usage appears automatically as you work — no reload needed.

### Diagnostic Logging

TokenScope writes to a dedicated Output Channel (`TokenScope` in the Output panel). If something looks wrong — missing data, unexpected counts — check the logs for details on file parsing and directory resolution.

---

## How It Works

### Claude Code

```
~/.claude/projects/-Users-you-project-name/
  ├── 1a2b3c.jsonl    ← Claude Code writes conversation logs here
  ├── 4d5e6f.jsonl
  └── ...
```

1. Claude Code stores conversation logs as JSONL files under `~/.claude/projects/`, keyed by your workspace path.
2. TokenScope maps your current workspace folder to the matching Claude Code directory.
3. It parses every assistant response to extract `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`.

### Codex CLI

```
~/.codex/sessions/
  ├── rollout-2025-05-07T17-24-21-<uuid>.jsonl
  ├── rollout-2025-05-08T09-12-33-<uuid>.jsonl
  └── ...
```

1. Codex CLI stores session rollouts as JSONL files under `~/.codex/sessions/`.
2. Each file starts with a `session_meta` entry containing the workspace directory (`cwd`).
3. TokenScope scans all rollout files and matches them to your current workspace.
4. It extracts `token_count` events with `input_tokens`, `output_tokens`, `cached_input_tokens`, and `reasoning_output_tokens`.

### Aggregation

Data from all matched sources is merged and aggregated by session, model, and day, then displayed in the status bar, tree view, and dashboard. Cost is estimated by matching the model name against known pricing.

## Token Types

| Type | Description |
|------|-------------|
| **Input** | Tokens sent to the model (your prompts + context) |
| **Output** | Tokens generated by the model (responses) |
| **Cache Write** | Tokens written to the prompt cache (Claude) |
| **Cache Read** | Tokens served from cache (both providers) |
| **Reasoning** | Tokens used for internal reasoning (OpenAI o-series models) |

## Commands

| Command | Description |
|---------|-------------|
| `TokenScope: Show Token Dashboard` | Open the visual dashboard in a new tab |
| `TokenScope: Export Usage to CSV` | Export all session data to a CSV file |
| `TokenScope: Label Session` | Tag a session with a custom name for easier identification |
| `TokenScope: Compare Sessions` | Side-by-side diff of two sessions' token usage and cost |

> **Tip:** You can also click the token counter in the status bar to open the dashboard.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `tokenScope.sessionLimit` | `50` | Maximum number of sessions to display in the tree view and dashboard (5–500) |
| `tokenScope.showCostEstimate` | `true` | Show estimated cost based on model pricing |

## Requirements

- **VSCode** 1.85.0 or later
- **Claude Code** and/or **Codex CLI** must have been used in the workspace at least once (so that log files exist)

## FAQ

**Q: Does this send any data to external servers?**
A: No. TokenScope is fully offline. It only reads local JSONL files from your machine. No telemetry, no network requests.

**Q: Does it work with Claude.ai (web) or ChatGPT?**
A: No. TokenScope only tracks usage from CLI/IDE tools that store logs locally — currently Claude Code and Codex CLI.

**Q: I opened a project but it shows 0 tokens.**
A: Make sure you've used Claude Code or Codex CLI in that specific workspace folder at least once. Check the `TokenScope` Output Channel for diagnostic details.

**Q: Are the cost estimates accurate?**
A: They are estimates based on publicly listed API pricing. Actual costs may differ depending on your plan or billing terms. If a model isn't recognized, its tokens won't be included in the cost calculation.

**Q: Can I see more than 50 sessions?**
A: Yes. Change the `tokenScope.sessionLimit` setting to any value between 5 and 500.

**Q: Does it work on Windows?**
A: Yes. TokenScope supports both Unix and Windows-style line endings in JSONL files.

**Q: Will more tools be supported in the future?**
A: We'd like to! However, Gemini CLI, Cursor, and GitHub Copilot don't store token usage data locally, making them impossible to track without API access. If those tools add local logging in the future, we can add support.

---

## Development

```bash
git clone https://github.com/hooni0918/TokenScope.git
cd TokenScope
npm install
npm run compile
# Press F5 in VSCode to launch Extension Development Host
```

## License

MIT
