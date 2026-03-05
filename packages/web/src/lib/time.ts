export function formatTimeRemaining(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.round(timeMs / 1000));
  if (totalSeconds < 60) {
    return '< 1 min';
  }

  if (totalSeconds < 3600) {
    return `~${Math.round(totalSeconds / 60)} min`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.round((totalSeconds % 3600) / 60);
  return `~${hours} hr ${mins} min`;
}
