export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    anthropic: 'Anthropic (Claude)',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
  };
  return names[provider] ?? provider;
}
