# Kazi design system

The tokens live in one place: [`src/app/globals.css`](../src/app/globals.css). Run the app and open `/design-system` to see everything rendered.

"Kazi" is a working name. It is set once in [`src/lib/brand.ts`](../src/lib/brand.ts).

## Rules of thumb

- The page is cream (`bg-bg`). Cards and inputs are white (`bg-surface`).
- Deep green (`primary`) is the main action. One primary button per screen.
- Amber is the accent: the small fill inside icons, the Worker badge, one highlight per screen. Text on amber is `ink`. For amber-toned text use `amber-ink`.
- `sprout` is only the Intern badge fill.
- `danger` is only for errors and scam warnings. "Not selected" is never red.
- No blue. The default Tailwind palette is switched off, so only the tokens below exist.
- Everything tappable is at least 48px tall (`min-h-12`).
- Plain English, sentence case, no emoji. Money is `KES 35,000`. Places are `Town, County`.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| `bg` | `#faf6ec` | Page background |
| `surface` | `#ffffff` | Cards, sheets, inputs |
| `surface-sunken` | `#f1ecdf` | Quiet fills, Sent pill |
| `ink` | `#1f2421` | Main text |
| `ink-muted` | `#5a635d` | Secondary text |
| `line` | `#e4dece` | Decorative dividers |
| `control` | `#7d877f` | Input and outline-button borders |
| `primary` | `#0f5c3f` | Main action, links, Employer badge, Verified seal |
| `primary-strong` | `#0a4530` | Hover and pressed |
| `primary-soft` | `#e3f1e8` | Selected filters, Seen pill |
| `on-primary` | `#ffffff` | Text on green fills |
| `sprout` | `#2f9e5b` | Intern badge fill |
| `sprout-ink` | `#1d7a43` | Intern label text |
| `amber` | `#f5a524` | Accent, Worker badge fill |
| `amber-ink` | `#8a5200` | Amber-toned text |
| `amber-soft` | `#fdf0d3` | Shortlisted pill, tips |
| `danger` | `#b3261e` | Errors, scam warnings |
| `danger-soft` | `#fbe9e7` | Error background |

Use them as Tailwind classes: `bg-primary`, `text-ink-muted`, `border-line`.

## Type

One family, Plus Jakarta Sans (weights 400, 600, 700, 800), self-hosted through `next/font`.

| Class | Size / line | Weight | Use |
|---|---|---|---|
| `text-display` | 32 / 40 | 800 | Landing headline |
| `text-title-lg` | 24 / 32 | 700 | Page titles |
| `text-title-md` | 20 / 28 | 700 | Section headings |
| `text-title-sm` | 17 / 24 | 600 | Card titles |
| `text-body` | 16 / 24 | 400 | Reading text, inputs |
| `text-body-sm` | 14 / 20 | 400 | Secondary lines |
| `text-label` | 14 / 20 | 600 | Buttons, labels, chips |
| `text-caption` | 12 / 16 | 600 | Pills, badge captions |

## Spacing, shape, elevation

- Spacing follows Tailwind's 4px step: `p-4` is 16px (phone gutter and card padding), `gap-6` is 24px (between desktop columns).
- Corners: `rounded-sm` 8, `rounded-md` 12 (inputs), `rounded-lg` 16 (cards), `rounded-xl` 24 (sheets), `rounded-pill` (buttons, chips).
- Shadows: `shadow-sm` for resting cards, `shadow-md` for menus and sheets. Nothing else.
- Desktop content width: `max-w-content` (1128px).
- Focus ring: 2px solid `primary`, 2px offset, set globally.

## Components

| Component | File | Notes |
|---|---|---|
| `Icon` | `src/components/ui/Icon.tsx` | 11 icons: home, jobs, attachments, applications, alerts, profile, search, location, verified, filter, switch-account. Pass `label` only when the icon stands alone. |
| `RoleBadge`, `VerifiedSeal` | `src/components/ui/RoleBadge.tsx` | Worker hexagon, Intern leaf, Employer shield. `verified` adds the seal. Sizes 24, 40, 64. |
| `Button`, `buttonClasses` | `src/components/ui/Button.tsx` | Variants: primary, secondary, ghost, danger. Use `buttonClasses` on links. |
| `Card` | `src/components/ui/Card.tsx` | White surface on the cream page. |
| `TextField`, `SelectField` | `src/components/ui/Field.tsx` | Always labelled, with hint and error text wired for screen readers. |
| `StatusPill`, `TypeChip` | `src/components/ui/Pills.tsx` | Application status and post type. |
| `JobCard` | `src/components/JobCard.tsx` | One post in a list, with an action slot. |
