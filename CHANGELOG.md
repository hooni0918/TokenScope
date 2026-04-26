# Changelog

## 0.5.0

### New Features
- **Session labeling** — tag any session with a custom name (e.g., `korean-skill`, `task-A`) via the tree view inline tag icon, right-click menu, or Command Palette
- **Session comparison** — pick two sessions and view a side-by-side diff of every token type, response count, and estimated cost with absolute and percentage deltas
- **Dashboard actions** — added **Label Session** and **Compare Sessions** buttons to the dashboard header
- Tree view shows labels as `[label] date` with a tag icon
- Dashboard session table shows a Label column when any session is labeled

### Use Case
Compare token cost between different prompts, skills, or approaches. Run task A in one session, label it, run task B in another, label it, then compare to see which uses fewer tokens.

## 0.4.0

### New Features
- **OpenAI Codex CLI support** — TokenScope now tracks token usage from Codex CLI (`~/.codex/sessions/`) in addition to Claude Code
- **Multi-provider architecture** — unified tracker merges data from all supported tools into a single view
- **OpenAI model pricing** — cost estimation for Codex Mini, o4-mini, o3, o3-mini, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, GPT-4o Mini
- **Reasoning token tracking** — displays reasoning tokens separately for OpenAI o-series models
- **Provider tags** — sessions in tree view, dashboard table, and CSV export now show which tool (Claude Code / Codex CLI) generated them

### Improvements
- Refactored type system from Claude-specific to provider-agnostic (`TokenUsage`, `TokenSession`, `UsageSummary`)
- Dashboard shows "Tracking: Claude Code, Codex CLI" indicator
- CSV export includes Provider column
- Status bar tooltip shows reasoning tokens when present
- Tree view session details include Provider row

## 0.3.0

### New Features
- **Cost estimation** — automatic USD cost calculation based on Claude model pricing, shown in status bar, tree view, and dashboard
- **Daily trend chart** — 14-day bar chart showing daily token consumption patterns
- **CSV export** — export all session data via dashboard button or Command Palette (`TokenScope: Export Usage to CSV`)
- **Settings** — `tokenScope.sessionLimit` (5–500) and `tokenScope.showCostEstimate` (on/off)
- **Diagnostic logging** — Output Channel for debugging file parsing issues

### Bug Fixes
- Fixed hardcoded Korean locale (`ko-KR`) — now uses system locale for date formatting
- Fixed Windows compatibility — JSONL parser now handles `\r\n` line endings
- Fixed potential NaN crash in dashboard when no model data exists
- Fixed memory leak — file watcher event listeners are now properly tracked and disposed
- Fixed silent error swallowing — parse/read failures are now logged to Output Channel
- Fixed session truncation — tree view now shows `+N more sessions` indicator instead of silently hiding them

### Improvements
- Removed dead code from v0.1.0 (unused types, old commands)
- Cleaned up `.vscodeignore` to exclude unnecessary files
- Added `galleryBanner` and `license` field for marketplace
- Reduced package size by removing stale compiled artifacts

## 0.2.0

- Auto-track Claude Code token usage per workspace (no manual input needed)
- Dashboard with per-model charts and session history
- Sidebar tree view with model and session breakdown
- Status bar showing total token count
- Live updates via file watcher

## 0.1.0

- Initial release with manual token logging
