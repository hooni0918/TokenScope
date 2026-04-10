# TokenScope

Track LLM API token usage per project in VSCode.

## Features

- **Multi-provider support**: Track tokens from Anthropic (Claude), OpenAI, and Google Gemini
- **Per-project tracking**: Each workspace maintains its own token usage data
- **Status bar**: See total token count at a glance
- **Sidebar tree view**: Browse usage breakdown by provider and model
- **Dashboard**: Visual overview with charts and recent entries

## Usage

1. Open Command Palette (`Cmd+Shift+P`)
2. Run `TokenScope: Log Token Usage`
3. Select provider, enter model name, input/output tokens
4. View usage in the status bar, sidebar, or dashboard

## Commands

| Command | Description |
|---------|-------------|
| `TokenScope: Log Token Usage` | Record token usage manually |
| `TokenScope: Show Token Dashboard` | Open the visual dashboard |
| `TokenScope: Reset Token Usage` | Clear all usage data for this workspace |

## Development

```bash
npm install
npm run compile
# Press F5 in VSCode to launch Extension Development Host
```
