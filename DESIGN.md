# Design System — Wealth Copilot

This document serves as the visual reference and design system documentation for the `wealth-copilot` asset rebalancer web application, implementing the **Swiss Editorial** style.

---

## 📐 Product Context
- **What this is:** Cố vấn phân bổ và tái cơ cấu danh mục tài sản cá nhân thông minh tại Việt Nam.
- **Who it's for:** Nhà đầu tư cá nhân tại Việt Nam muốn tối ưu hóa danh mục đầu tư theo lý thuyết danh mục hiện đại (Markowitz).
- **Space/industry:** Personal Finance / Wealth Management (Tài chính cá nhân / Quản lý tài sản).
- **Project type:** Desktop App (Tauri) + Web App (React).

---

## 🎨 Aesthetic Direction
- **Direction:** Swiss Editorial (Tạp chí Thụy Sĩ)
- **Decoration level:** Minimal (Không họa tiết trang trí thừa, tập trung vào cấu trúc lưới phẳng và độ tương phản)
- **Mood:** Tối giản cực đoan, chuyên nghiệp, rõ ràng tuyệt đối, độ tin cậy và chính xác cao.
- **Reference sites:** Phong cách thiết kế Swiss Modernist, Wise, Wealthfront, Betterment.

---

## ✍️ Typography
- **Display/Headings:** Clash Grotesk — Tạo điểm nhấn tiêu đề sắc sảo, hình học ấn tượng và hiện đại.
- **Body:** Geist — Phông chữ không chân (sans-serif) tối giản và rõ ràng tuyệt đối, dễ đọc ở mọi kích thước.
- **UI/Labels:** Geist (cùng phông với Body).
- **Data/Tables:** JetBrains Mono — Định dạng monospace đặc chủng giúp các con số tài chính gióng thẳng hàng dọc hoàn hảo, tạo cảm giác chính xác tuyệt đối.
- **Code:** JetBrains Mono.
- **Loading:** CDN từ Google Fonts (Geist, JetBrains Mono) và Fontshare (Clash Grotesk).
- **Scale:**
  - **App Title / Hero:** `2.25rem` (36px) / `font-weight: 700` / `letter-spacing: -0.02em`
  - **Section Title (Card Header):** `1.5rem` (24px) / `font-weight: 700` / `letter-spacing: -0.01em`
  - **Card Title:** `1.1rem` (18px) / `font-weight: 700`
  - **Body Text:** `0.95rem` (15px) / `font-weight: 400`
  - **Table / Data Text:** `0.875rem` (14px) / `font-weight: 500`
  - **Muted Label / Small:** `0.75rem` (12px) / `font-weight: 600`

---

## 🎨 Color Palette & Variables
We use a highly-contrasted black & white base palette with clean asset category colors, supporting both Dark and Light modes.

### 1. Dark Mode (`data-theme="dark"`)
- **Main Background (`--bg-main`):** `#000000` (Pure Black)
- **Surface / Card Background (`--bg-surface`):** `#121212`
- **Surface Hover (`--bg-surface-hover`):** `#1c1c1c`
- **Primary Text (`--text-primary`):** `#ffffff` (Pure White)
- **Secondary Text (`--text-secondary`):** `#a0a0a0`
- **Muted Text (`--text-muted`):** `#555555`
- **Borders (`--border`):** `#262626`
- **Accent Color (`--accent`):** `#ffffff`
- **Accent Hover (`--accent-hover`):** `#e0e0e0`

### 2. Light Mode (`data-theme="light"`)
- **Main Background (`--bg-main`):** `#ffffff` (Pure White)
- **Surface / Card Background (`--bg-surface`):** `#f5f5f5`
- **Surface Hover (`--bg-surface-hover`):** `#eeeeee`
- **Primary Text (`--text-primary`):** `#000000` (Pure Black)
- **Secondary Text (`--text-secondary`):** `#4a4a4a`
- **Muted Text (`--text-muted`):** `#9b9b9b`
- **Borders (`--border`):** `#000000` (Strong black outlines)
- **Accent Color (`--accent`):** `#000000`
- **Accent Hover (`--accent-hover`):** `#262626`

### 3. Asset Category Colors
Each asset class is visually distinguished by a distinct color code:
- **Savings (Tiết kiệm):**
  - *Dark Mode:* `#2979ff`
  - *Light Mode:* `#0d47a1`
- **Gold SJC (Vàng miếng):**
  - *Dark Mode:* `#ffb300`
  - *Light Mode:* `#ff6f00`
- **VN30 (ETF VN30):**
  - *Dark Mode:* `#00e5ff`
  - *Light Mode:* `#006064`
- **Diamond (ETF Diamond):**
  - *Dark Mode:* `#ff1744`
  - *Light Mode:* `#b71c1c`

### 4. System Alerts & Feedback
- **Success:**
  - *Dark Mode:* `#00e676`
  - *Light Mode:* `#1b5e20`
- **Warning:**
  - *Dark Mode:* `#ffea00`
  - *Light Mode:* `#f57f17`
- **Error:**
  - *Dark Mode:* `#ff1744`
  - *Light Mode:* `#b71c1c`

---

## 📐 Spacing & Layout
- **Base Unit:** 4px
- **Density:** Compact
- **Scale:** `2xs(2px)` `xs(4px)` `sm(8px)` `md(16px)` `lg(24px)` `xl(32px)` `2xl(48px)` `3xl(64px)`
- **Grid Layout:** 12-column grid for major layouts; asymmetric 2-column grid (`1.2fr 1fr`) for dashboard pages with `1.5rem` gaps.
- **Max Content Width:** `1200px`
- **Border Radius:** `0px` (Strictly sharp square corners for all buttons, input fields, cards, and modal components).

---

## 🎬 Motion & Transitions
- **Approach:** Minimal-functional (Hiệu ứng phản hồi xúc giác nhanh, tránh chuyển động thừa thãi làm giảm sự chuyên nghiệp).
- **Easing:**
  - Enter: `ease-out`
  - Exit: `ease-in`
  - Move: `ease-in-out`
- **Duration:**
  - Micro (buttons, toggles hover): `50ms` - `100ms`
  - Short (modal transitions, tab swaps): `150ms` - `250ms`

---

## 📝 Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-26 | Initial design system created | Created by /design-consultation based on 5 design system alternatives, selecting Swiss Editorial. |
