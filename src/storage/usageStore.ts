import * as vscode from 'vscode';
import { TokenUsageEntry, UsageSummary, LLMProvider } from '../models/types';

const STORAGE_KEY = 'tokenScope.entries';

const PROVIDERS: LLMProvider[] = ['anthropic', 'openai', 'gemini'];

function emptyProviderSummary() {
  return { inputTokens: 0, outputTokens: 0, entryCount: 0 };
}

export class UsageStore {
  private onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  constructor(private state: vscode.Memento) {}

  getAll(): TokenUsageEntry[] {
    return this.state.get<TokenUsageEntry[]>(STORAGE_KEY, []);
  }

  async add(entry: TokenUsageEntry): Promise<void> {
    const entries = this.getAll();
    entries.push(entry);
    await this.state.update(STORAGE_KEY, entries);
    this.onDidChangeEmitter.fire();
  }

  async clear(): Promise<void> {
    await this.state.update(STORAGE_KEY, []);
    this.onDidChangeEmitter.fire();
  }

  getSummary(): UsageSummary {
    const entries = this.getAll();
    const byProvider = {} as Record<LLMProvider, { inputTokens: number; outputTokens: number; entryCount: number }>;

    for (const p of PROVIDERS) {
      byProvider[p] = emptyProviderSummary();
    }

    let totalInput = 0;
    let totalOutput = 0;

    for (const entry of entries) {
      totalInput += entry.inputTokens;
      totalOutput += entry.outputTokens;

      const ps = byProvider[entry.provider];
      if (ps) {
        ps.inputTokens += entry.inputTokens;
        ps.outputTokens += entry.outputTokens;
        ps.entryCount += 1;
      }
    }

    return {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      byProvider,
      entryCount: entries.length,
    };
  }
}
