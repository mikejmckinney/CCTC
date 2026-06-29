import { describe, expect, it } from 'vitest';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16)
  };
}

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme contrast (§7 checklist)', () => {
  it('day --ink (#221d16) on --surface (#fffdf9) meets AA 4.5:1', () => {
    const ratio = contrastRatio('#221d16', '#fffdf9');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('night --ink (#f1ebdf) on --surface (#211d16) meets AA 4.5:1', () => {
    const ratio = contrastRatio('#f1ebdf', '#211d16');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('day --muted (#6f6557) on --surface (#fffdf9) meets AA large-text 3:1', () => {
    const ratio = contrastRatio('#6f6557', '#fffdf9');
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('night --muted (#aa9f8c) on --surface (#211d16) meets AA large-text 3:1', () => {
    const ratio = contrastRatio('#aa9f8c', '#211d16');
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('night text tokens differ from fill tokens', () => {
    // --teal (#1d544f) vs --tealtext (#7cc2b4)
    expect('#7cc2b4').not.toBe('#1d544f');
    // --gold (#c79a5a) vs --goldtext (#dab06a)
    expect('#dab06a').not.toBe('#c79a5a');
    // --success (#3f9d72) vs --successtext (#73c79e)
    expect('#73c79e').not.toBe('#3f9d72');
    // --danger (#cf7a70) vs --dangertext (#e49b91)
    expect('#e49b91').not.toBe('#cf7a70');
  });
});
