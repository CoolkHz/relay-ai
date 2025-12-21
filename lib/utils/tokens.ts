// Usage: token estimation helpers (approximate).

export function estimateTokens(text: string): number {
  // Simple estimation: ~4 chars per token for English, ~2 for Chinese
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

