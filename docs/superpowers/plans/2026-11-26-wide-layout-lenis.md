# Wide Layout and Lenis Implementation Plan
Goal: efficient desktop sizing and requested smooth scroll without changing data logic.
Spec: root DESIGN.md and PRD, Layout and Lenis update.
- [x] Inspect current layout and dependency; extract local tokens with SkillUI.
- [x] Widen shared container, compact hero/KPIs and adapt product grid.
- [x] Add one Lenis instance linked to GSAP with native nested controls, reduced motion and print cleanup.
- [x] Verify production build and fixture-based desktop/mobile/scroll/print tests.

Verified: build exit 0; fixture-based Playwright passed widths 375/768/1440/1788/1920, no overflow, container 1600px at 1788px, Lenis wheel/keyboard, reduced motion, print teardown/restart, charts, tabs, theme and CSV. Actual API data not tested.
