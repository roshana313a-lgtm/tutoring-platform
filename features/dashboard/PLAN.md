# Dashboard UI Enhancement — PLAN

## Scope

Enhance the existing role-based dashboard with a modern SaaS-style visual layer:
Lucide iconography, a richer sidebar and top bar, elevated statistic cards, status
badges, a weekly activity chart placeholder, and entry animations.

No authentication, router, or backend logic is changed by this plan.

## Dependencies & Rationale

- `lucide-vue-next` (`^1.0.0`): provides tree-shakeable, accessible Vue icon components
  for sidebar items, top-bar actions, statistic cards, trend indicators, and status
  badges. It avoids hand-maintained inline SVG markup and has no runtime service or
  backend dependency.

No other new dependencies are introduced. Charts are rendered with CSS bars rather
than a charting library to keep the bundle and dependency surface small.

## Implementation Outline

1. Add a reusable `StatusBadge` component for completed / pending / cancelled states.
2. Extend `DashboardLayout.vue` with icons, search, notifications, settings, avatar,
   sidebar footer, and smooth active-link indicators.
3. Extend `DashboardPage.vue` with gradient stat cards, trend indicators, status
   badges in the recent-activity table, a weekly CSS bar chart, and entrance
   animations.
4. Keep all existing role labels, route names, and auth behavior unchanged.

## Verification

- `npm run test`
- `npm run type-check`
- `npm run build`
