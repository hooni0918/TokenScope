import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { UsageStore } from '../storage/usageStore';
import { LLMProvider, TokenUsageEntry } from '../models/types';

interface ProviderItem extends vscode.QuickPickItem {
  providerValue: LLMProvider;
}

const PROVIDER_OPTIONS: ProviderItem[] = [
  { label: 'Anthropic (Claude)', providerValue: 'anthropic' },
  { label: 'OpenAI', providerValue: 'openai' },
  { label: 'Google Gemini', providerValue: 'gemini' },
];

const MODEL_DEFAULTS: Record<LLMProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-pro',
};

function validateNumber(value: string): string | null {
  const num = Number(value);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return 'Please enter a non-negative integer';
  }
  return null;
}

export function registerLogUsageCommand(
  context: vscode.ExtensionContext,
  store: UsageStore,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.logUsage',
    async () => {
      const provider = await vscode.window.showQuickPick(PROVIDER_OPTIONS, {
        placeHolder: 'Select LLM provider',
      });
      if (!provider) { return; }

      const model = await vscode.window.showInputBox({
        prompt: 'Model name',
        value: MODEL_DEFAULTS[provider.providerValue],
      });
      if (!model) { return; }

      const inputStr = await vscode.window.showInputBox({
        prompt: 'Input tokens (prompt tokens)',
        validateInput: validateNumber,
      });
      if (inputStr === undefined) { return; }

      const outputStr = await vscode.window.showInputBox({
        prompt: 'Output tokens (completion tokens)',
        validateInput: validateNumber,
      });
      if (outputStr === undefined) { return; }

      const note = await vscode.window.showInputBox({
        prompt: 'Note (optional)',
        placeHolder: 'e.g. code review session',
      });

      const entry: TokenUsageEntry = {
        id: crypto.randomUUID(),
        provider: provider.providerValue,
        model,
        inputTokens: Number(inputStr),
        outputTokens: Number(outputStr),
        timestamp: Date.now(),
        ...(note ? { note } : {}),
      };

      await store.add(entry);

      vscode.window.showInformationMessage(
        `TokenScope: Logged ${entry.inputTokens + entry.outputTokens} tokens for ${model}`,
      );
    },
  );

  context.subscriptions.push(disposable);
}
