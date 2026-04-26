import * as vscode from 'vscode';

const STORAGE_KEY = 'tokenScope.sessionLabels';

export class SessionLabelStore {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private context: vscode.ExtensionContext) {}

  getLabel(sessionId: string): string | undefined {
    const labels = this.context.workspaceState.get<Record<string, string>>(STORAGE_KEY, {});
    return labels[sessionId];
  }

  getAllLabels(): Record<string, string> {
    return this.context.workspaceState.get<Record<string, string>>(STORAGE_KEY, {});
  }

  async setLabel(sessionId: string, label: string): Promise<void> {
    const labels = { ...this.getAllLabels() };
    labels[sessionId] = label;
    await this.context.workspaceState.update(STORAGE_KEY, labels);
    this._onDidChange.fire();
  }

  async removeLabel(sessionId: string): Promise<void> {
    const labels = { ...this.getAllLabels() };
    delete labels[sessionId];
    await this.context.workspaceState.update(STORAGE_KEY, labels);
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
