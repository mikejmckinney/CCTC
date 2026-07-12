/**
 * Short domain labels used consistently throughout the app.
 * Keys are category IDs from the blueprint breakdown.
 */
export const DOMAIN_SHORT_LABELS: Record<string, string> = {
  '1': 'D1: Education',
  '2': 'D2: Pre-Transplant',
  '3': 'D3: Post-Op',
};

/**
 * Get a short label for a domain, falling back to the full label.
 */
export function getDomainShortLabel(categoryId: string, fullLabel?: string): string {
  return DOMAIN_SHORT_LABELS[categoryId] || fullLabel || categoryId;
}
