# Redesign Accessibility Checklist

Use before approving a direction for production implementation.

## Global

- [ ] Color contrast ≥ 4.5:1 for body text; ≥ 3:1 for large text and UI components
- [ ] Focus visible on keyboard tab through all interactive elements
- [ ] Skip link targets `#main` content
- [ ] `prefers-reduced-motion` disables non-essential animation
- [ ] Touch targets ≥ 44×44 CSS px on mobile
- [ ] No information conveyed by color alone (correct/incorrect, flagged)

## Session setup

- [ ] All inputs have accessible names (`Mode`, `Question count`, blueprint, timer)
- [ ] Error states announced (invalid count, empty bank)
- [ ] Primary CTA (“Start session”) is first focusable action after skip link

## Active question

- [ ] Stem announced as heading; options as radio/checkbox groups
- [ ] Complex-combo instructions programmatically associated
- [ ] Timer updates do not steal focus
- [ ] Flag/bookmark controls have accessible names

## Exam vs Study

- [ ] Exam mode hides explanations until submit (no accidental reveal)
- [ ] Submit confirmation is keyboard-operable and readable by screen readers

## Score and history

- [ ] Charts have text alternatives or data table fallback
- [ ] Trend deltas readable without relying on green/red alone

## Media / README

- [ ] `<video>` includes `aria-label`
- [ ] Poster images have meaningful filenames; alt text where used as `<img>`
- [ ] Autoplay videos are `muted` with `controls`

## Disclaimer

- [ ] Study-aid disclaimer remains modal or banner on first visit
- [ ] No ABTC/PSI endorsement language
