export function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Untimed';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
