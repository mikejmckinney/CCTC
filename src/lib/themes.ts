export type ThemeId = 'clinical' | 'warm' | 'modern';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  philosophy: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  clinical: {
    id: 'clinical',
    name: 'Clinical Clarity',
    description: 'Cool, sterile, medical-grade precision. Data-dense layouts optimized for scan-and-absorb reading.',
    philosophy: 'EHR-inspired. Blue-based trust palette. Tight spacing. Border-based hierarchy.',
  },
  warm: {
    id: 'warm',
    name: 'Warm Professional',
    description: 'Evolves the current CCTC DNA. Earthy teal with amber warmth. Comfortable for long study sessions.',
    philosophy: 'Warm cream backgrounds. Fraunces headings. Glass-morphism accents. Amber CTAs.',
  },
  modern: {
    id: 'modern',
    name: 'Modern Dashboard',
    description: 'Dark-first, contemporary SaaS. High contrast data visualization. Linear/Vercel aesthetic.',
    philosophy: 'Lavender accent. Surface-lift hierarchy. Compact density. Keyboard-first.',
  },
};
