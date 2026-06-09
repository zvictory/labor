# Labor — Project Rules

This document establishes strict architectural and dependency boundaries for the Labor codebase to prevent version conflicts, rogue routing, and logical fragmentation.

## 1. Dependency Lock (Hard-Pinned Core Frontend Versions)
All core frontend dependencies must be locked to their verified production versions. Do not update or use features from later minor/patch versions:
- **React**: `19.2.6`
- **React DOM**: `19.2.6`
- **Next.js**: `15.5.18`
- **Tailwind CSS**: `4.3.0`
- **PostCSS / @tailwindcss/postcss**: `4.3.0`
- **@tanstack/react-query**: `5.59.0`
- **Zustand**: `5.0.13`
- **TypeScript**: `5.6.2`

## 2. Unified Catalog Routing Rule
Rogue standalone catalog or listing views are strictly forbidden. 
- All entity filters (including but not limited to **brands**, **perfumers**, and **notes**) must route directly to the unified global catalog/shop page via URL search parameters (e.g., `/shop?brand=slug`, `/shop?note=slug`, `/shop?perfumer=slug`).
- Any listing view or interaction on brands, notes, or perfumers landing pages should redirect or link directly to the unified `/shop` (or `/catalog`) route using these query params to preserve a single source of truth for product display, search, and pagination.
