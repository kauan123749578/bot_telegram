export function humanDelayMs(baseMs: number) {
  const jitter = 0.65 + Math.random() * 0.9;
  const thinkingPause = Math.random() < 0.2 ? 1500 + Math.random() * 3500 : 0;
  return Math.max(800, Math.round(baseMs * jitter + thinkingPause));
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function humanPause(baseMs: number) {
  await sleep(humanDelayMs(baseMs));
}
