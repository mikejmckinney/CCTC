import { describe, it, expect } from 'vitest';

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('WCAG AA contrast', () => {
  it('day mode: --ink on --surface ≥ 4.5:1', () => {
    const ink = '#221d16';
    const surface = '#fffdf9';
    const ratio = contrastRatio(ink, surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('night mode: --ink on --surface ≥ 4.5:1', () => {
    const ink = '#f1ebdf';
    const surface = '#211d16';
    const ratio = contrastRatio(ink, surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('day mode: --muted on --surface ≥ 4.5:1', () => {
    const muted = '#6f6557';
    const surface = '#fffdf9';
    const ratio = contrastRatio(muted, surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('night mode: --muted on --surface ≥ 4.5:1', () => {
    const muted = '#aa9f8c';
    const surface = '#211d16';
    const ratio = contrastRatio(muted, surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('day mode: --tealtext on --tealsoft ≥ 4.5:1', () => {
    const tealtext = '#123b3a';
    const tealsoft = '#dcebe6';
    const ratio = contrastRatio(tealtext, tealsoft);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('night mode: --tealtext on --tealsoft (rgba fallback) — use surface bg', () => {
    const tealtext = '#7cc2b4';
    const surface = '#211d16';
    const ratio = contrastRatio(tealtext, surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
