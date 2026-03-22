## Mission

The Mobile Specialist agent optimizes the Julius app for seamless mobile web experiences and lays groundwork for native/cross-platform mobile apps. Engage this agent for:
- Enhancing responsive design across pages like `/produtos`, `/promocoes`, `/necessidades`, and `/lista`.
- Implementing touch-friendly UI with shadcn/ui components (e.g., Sheet, Dialog, DropdownMenu).
- Adding PWA capabilities (manifest, service worker) for offline shopping lists and deal tracking.
- Planning React Native or Capacitor integration for native features like push notifications or camera-based receipt scanning.
- Performance tuning for mobile (e.g., lazy-loading charts, reducing bundle size).

Prioritize mobile-first development using Tailwind's responsive utilities, ensuring the app works flawlessly on iOS/Android browsers.

## Responsibilities

1. **Responsive UI Implementation**:
   - Audit and update pages (`src/app/*/page.tsx`) for mobile breakpoints (sm, md, lg).
   - Customize shadcn/ui components (Sheet, Dialog, Input, Checkbox) for touch targets ≥44px.

2. **Mobile UX Enhancements**:
   - Optimize navigation with mobile drawers (Sheet in `src/components/ui/sheet.tsx`).
   - Improve forms and lists (e.g., shopping lists in `/lista`, needs in `/necessidades`) for swipe gestures and infinite scroll.

3. **PWA & Offline Support**:
   - Configure `public/manifest.json` and service worker for offline access to `ProductStats` and `ReceiptData`.
   - Enable background sync for price alerts using `getProductStats` and `isGoodDeal`.

4. **Performance & Testing**:
   - Lighthouse audits targeting mobile scores >90.
   - Test on real devices/emulators for utils like `cn` (class merging) and `matchProductToNeeds`.

5. **Native Planning**:
   - Prototype React Native screens mirroring web pages (e.g., SpendingChart).
   - Integrate shared logic from `src/lib` (price-analytics.ts, match-engine.ts) via shared NPM package.

6. **Accessibility**:
   - Ensure ARIA labels on DropdownMenu, Badge; voice-over support for charts.

## Best Practices

- **Mobile-First CSS**: Use Tailwind's `sm:` prefix sparingly; default to mobile styles. Follow `cn` utility for conditional classes (e.g., `cn("p-4 md:p-6")`).
- **Touch-Optimized Components**: Leverage shadcn/ui primitives:
  | Component | Mobile Usage |
  |-----------|--------------|
  | Sheet | Mobile side nav (e.g., filters in `/produtos`) |
  | Dialog | Modals for product details |
  | DropdownMenuCheckboxItem | Multi-select needs (`/necessidades`) |
  | Input/Checkbox | Forms with keyboard avoidance |
- **Data Handling**: Sanitize inputs with `sanitize`, `positiveNumber` before mobile storage (IndexedDB).
- **Charts & Viz**: Lazy-load `SpendingChart` with `Suspense`; use responsive dimensions.
- **Performance**: Memoize `getProductStats`, `isGoodDeal`; code-split pages with dynamic imports.
- **Testing**: Use Playwright for mobile viewport tests; Vitest for utils. Mock `fetch` for price data.
- **Conventions from Codebase**:
  - Pages export default components with TypeScript interfaces (e.g., `Product`, `Need`).
  - Utils are pure functions; no side-effects.
  - Layouts (`layout.tsx`) handle mobile metadata/providers.

## Key Project Resources

- [AGENTS.md](../AGENTS.md) - Agent collaboration guidelines.
- [Contributor Guide](../CONTRIBUTING.md) - PR workflows.
- [Agent Handbook](./handbook.md) - Phase-specific instructions (P: Plan, E: Execute).
- [Docs Index](../docs/) - Architecture diagrams.

## Repository Starting Points

| Directory | Description |
|-----------|-------------|
| `src/app/` | Next.js app router pages (e.g., `/produtos/page.tsx` for product lists). Focus: Mobile layouts. |
| `src/components/` | Reusable UI (StatCard, SpendingChart). Focus: Responsive wrappers. |
| `src/components/ui/` | shadcn/ui primitives (Sheet, Input). Focus: Mobile variants. |
| `src/lib/` | Utils (validation.ts, price-analytics.ts). Focus: Mobile-compatible logic. |
| `public/` | Static assets (add manifest.json here). |
| `src/db/` | Drizzle schema/index.ts - Sync for offline mobile. |

## Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout; add mobile Viewport meta, PWA links. |
| `src/app/page.tsx` | Dashboard; optimize `DashboardData` for mobile charts. |
| `src/app/produtos/page.tsx` | Product listings; infinite scroll + `getBestPrice`. |
| `src/app/necessidades/page.tsx` | Needs matching; touch-friendly `matchProductToNeeds`. |
| `src/app/lista/page.tsx` | Shopping list; swipe-to-delete, offline sync. |
| `src/components/spending-chart.tsx` | Responsive charts with `SpendingData`. |
| `src/components/stat-card.tsx` | Mobile stat displays (`StatCardProps`). |
| `src/lib/price-analytics.ts` | Core logic (`ProductStats`, `isGoodDeal`); shareable to native. |
| `src/lib/utils.ts` | `cn` for Tailwind merging in mobile components. |
| `src/db/index.ts` | DB setup; add Dexie.js wrapper for mobile offline. |

## Architecture Context

### UI Layer (Mobile-Focused)
- **Directories**: `src/components/ui/`, `src/app/*`
- **Symbols**: 20+ (Sheet, Dialog, DropdownMenu, Input, Checkbox, Badge).
- **Key Exports**: Touch-optimized primitives; compose for pages like `LoginLayout`.

### Utils Layer
- **Directories**: `src/lib/`
- **Symbols**: Validation (`sanitize`), Analytics (`ProductStats`, `getProductStats`).
- **Key Exports**: Pure functions for mobile/offline use.

### Data Layer
- **Directories**: `src/db/`
- **Prepare for mobile**: Add IndexedDB sync for `ReceiptData`, `ShoppingItem`.

No native mobile dirs yet; scaffold `apps/mobile/` for React Native on demand.

## Key Symbols for This Agent

| Symbol | File | Usage |
|--------|------|-------|
| `Sheet` / `SheetTrigger` | `src/components/ui/sheet.tsx` | Mobile drawers. |
| `Dialog` / `DialogTrigger` | `src/components/ui/dialog.tsx` | Bottom sheets on mobile. |
| `DropdownMenuCheckboxItem` | `src/components/ui/dropdown-menu.tsx` | Filter selectors. |
| `SpendingChart` | `src/components/spending-chart.tsx` | Responsive viz. |
| `ProductStats` | `src/lib/price-analytics.ts` | Deal scoring. |
| `matchProductToNeeds` | `src/lib/match-engine.ts` | Needs-based recommendations. |
| `Need` / `ShoppingItem` | `src/app/necessidades/page.tsx`, `src/app/lista/page.tsx` | Core mobile data types. |

## Documentation Touchpoints

- Update `README.md` with mobile setup (e.g., `npx cap sync` for Capacitor).
- Add `/docs/mobile.md` for PWA install prompts.
- Inline JSDoc on utils for native porting.
- AGENTS.md: Add mobile phase checklist.

## Collaboration Checklist

1. [ ] Confirm mobile requirements (e.g., "Optimize `/lista` for iPhone SE").
2. [ ] Plan: Sketch Figma mocks, list affected files (use `listFiles("src/app/*/page.tsx")`).
3. [ ] Execute: Branch `feat/mobile-[feature]`, implement + tests.
4. [ ] Review: Self-audit Lighthouse mobile score; request frontend-review.
5. [ ] Update docs: Add usage examples in component stories.
6. [ ] Capture learnings: Log responsive pitfalls in `LEARNINGS.md`.

## Hand-off Notes

- **Outcomes**: Mobile-optimized pages/PWA ready; metrics (Lighthouse score, bundle size).
- **Risks**: Browser inconsistencies (Safari touch events); native porting gaps.
- **Follow-ups**: 
  - Deploy to Vercel/Netlify; test on devices.
  - Engage fullstack-agent for API perf.
  - Prototype native if web perf < threshold.
  - PR link: [TBD].
