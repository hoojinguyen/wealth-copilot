# eager-bell - Deferred Tasks (Design & Features)

## Interactive Donut Chart Hover Tooltips [Severity: Low / UX]
- **What:** Add interactive hover tooltips to the SVG Ring Chart to display the asset name, quantity, and market value when hovering over chart segments.
- **Why:** The donut chart currently displays percentages in the legend, but hovering over sections does not show specific amounts directly. Adding tooltips makes the chart much more interactive and useful.
- **Pros:** Enhances the UX by providing quick detail-on-hover.
- **Cons:** Requires adding SVG mouse enter/leave handlers and styling a floating tooltip element.
- **Context:** Decided during `/plan-design-review` on 2026-06-26.
- **Depends on:** Frontend layout implementation of the dashboard.
