# Changelog

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
