// Which joke you get at the end depends on how you played.
export function pickJoke({ cups, totalCups, retries, skips }) {
  if (skips > 0) return 'end.jokeSkips';
  if (totalCups > 0 && cups >= totalCups) return 'end.jokeAllCups';
  if (retries === 0) return 'end.jokeClean';
  if (retries >= 8) return 'end.jokeRetries';
  if (cups >= totalCups * 0.5) return 'end.jokeManyCups';
  return 'end.jokeFewCups';
}

export function formatTime(ticks) {
  const seconds = Math.floor(ticks / 60);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
