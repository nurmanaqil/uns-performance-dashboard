# Reference UI Implementation Plan
Goal: implement approved DESIGN.md v2 without changing backend or metric calculations.
Architecture: reuse existing dashboard components; shared theme tokens and one scoped motion hook.
Stack: existing Next.js/React/Tailwind/Recharts plus requested GSAP ScrollTrigger.
Spec: ../../../../DESIGN.md and root PRD v2.
- [x] Preserve original UI files, update font/palette/responsive component styling.
- [x] Add short grouped KPI entrance and once-only section reveals; cleanup, reduced motion and print final states.
- [x] Run TypeScript, existing tests, production build and rendered desktop/mobile interaction checks.
Review: filters and exports retained; provenance copy accurate; no secret access; no server changes.
Ruling: retain existing components rather than rewrite; only GSAP dependency is necessary, use gsap.context for React cleanup.

Final UI checks passed; see review artifacts.
