# Landing Page Module (`src/landing-page`)

The `landing-page` module delivers a modern, responsive, single-page marketing website for **Stocker** (Canvas Scraper & Intelligence Suite).

## Purpose & Narrative Structure

This page communicates Stocker's identity, mission, and value proposition across four core sections:

1. **Header & Navigation (`.landing-header`)**:
   - Brand indicator and navigation anchors (`Who We Are`, `Our Purpose`, `Features`, `Offerings`).
2. **Hero (`.hero-section`)**:
   - Primary headline, value proposition teaser, key metric highlights, and quick call-to-actions.
3. **Who We Are (`#who-we-are`)**:
   - Background on the team and engineering philosophy behind Stocker.
   - Highlights academic data extraction focus, reliability, and open extensible architecture.
4. **What We Are Here For / Mission (`#mission`)**:
   - The problems Stocker solves: precision scraping, automated delta syncing, and developer-grade exports.
5. **What We Have to Offer (`#features` & `#offerings`)**:
   - Detailed feature breakdown (deep harvesting, smart sync, pipeline normalization, security, analytics, webhooks).
   - Tiered offerings for learners/researchers, educators/departments, and enterprise LMS integrators.
6. **Call To Action & Footer (`.cta-banner`, `.landing-footer`)**:
   - Direct onboarding and repository access links.

## File Structure

```
src/landing-page/
├── LandingPage.tsx   # Core React 19 functional component
├── LandingPage.css   # Responsive layout styles supporting light/dark theme variables
├── index.ts          # Public exports
└── README.md         # Landing page module documentation
```

## Integration

Import and render the landing page anywhere in the React tree:

```tsx
import { LandingPage } from './landing-page/index.ts'

export function App() {
  return <LandingPage />
}
```

## Styling & Theme

The styles in `LandingPage.css` leverage CSS custom properties defined in `src/index.css`:
- `--accent`, `--accent-bg`, `--accent-border`
- `--bg`, `--border`, `--code-bg`, `--social-bg`
- `--text`, `--text-h`

This ensures automatic support for both light and dark system color schemes without additional runtime dependencies.
