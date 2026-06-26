# eager-bell - Deferred Tasks (Design & Features)

## Interactive Donut Chart Hover Tooltips [Severity: Low / UX]
- **What:** Add interactive hover tooltips to the SVG Ring Chart to display the asset name, quantity, and market value when hovering over chart segments.
- **Why:** The donut chart currently displays percentages in the legend, but hovering over sections does not show specific amounts directly. Adding tooltips makes the chart much more interactive and useful.
- **Pros:** Enhances the UX by providing quick detail-on-hover.
- **Cons:** Requires adding SVG mouse enter/leave handlers and styling a floating tooltip element.
- **Context:** Decided during `/plan-design-review` on 2026-06-26.
- **Depends on:** Frontend layout implementation of the dashboard.

## Multi-Asset Onboarding Setup Flow [Severity: Medium / UX]
- **What:** Design a step-by-step onboarding wizard for new users to initialize their multi-asset portfolio (Real estate, Savings, Gold, Stocks, Bonds, Crypto, Cash) and configure their Gemini API Key.
- **Why:** The introduction of custom multi-asset classes makes the first-time setup complex. A guided wizard ensures users classify their assets correctly (Liquid vs. Static) and input their initial balances easily without manual database editing.
- **Pros:** Significantly improves user activation and onboarding experience.
- **Cons:** High development effort, requires multiple custom UI wizard screens.
- **Context:** Deferred during `/office-hours` on 2026-06-26 to focus on MVP screenshot & manual transaction ledger.
- **Depends on:** Dynamic SQLite schema and transaction recording backend.
