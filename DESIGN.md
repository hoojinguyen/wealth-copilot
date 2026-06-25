# Design System & Style Reference: eager-bell

This document serves as the visual reference and design system documentation for the `eager-bell` asset rebalancer web application.

---

## 🎨 Color Palette & Variables

We use a curated, dark-themed glassmorphism color palette with vibrant accents to create a premium, state-of-the-art interface.

### Backgrounds & Containers
- **Main Background (`--bg-main`):** `#0b0c10`
  - *Details:* Uses subtle radial gradients highlighting the corners:
    - `rgba(79, 70, 229, 0.05)` (Indigo highlight) at `10% 20%`
    - `rgba(236, 72, 153, 0.05)` (Pink highlight) at `90% 80%`
- **Card Background (`--bg-card`):** `#15161e`
- **Card Hover Background (`--bg-card-hover`):** `#1c1d27`
- **Borders (`--border-color`):** `rgba(255, 255, 255, 0.06)`

### Asset Category Colors
Each asset class is visually distinguished by a distinct color code used in badges, charts, and progress bars:
- **Savings (Tiết kiệm):** `#4f46e5` (Indigo)
- **Gold (Vàng SJC):** `#f59e0b` (Amber)
- **VN30 (ETF VN30):** `#06b6d4` (Cyan)
- **Diamond (ETF Diamond):** `#ec4899` (Pink)

### System Alerts & Feedback
- **Success:** `#10b981` (Emerald Green)
- **Warning:** `#f59e0b` (Amber)
- **Error:** `#ef4444` (Rose Red)

---

## ✍️ Typography

- **Font Family (`--font-main`):** `'Outfit'`, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
  - *Details:* Imported from Google Fonts, utilizing weights `300`, `400`, `500`, `600`, `700`, and `800`.
- **Headings:**
  - **App Title (Brand):** `1.8rem` with `font-weight: 700`. Employs a linear gradient: `linear-gradient(135deg, #a5b4fc, #6366f1)`.
  - **Section Titles (Card Headers):** `1.25rem` with `font-weight: 600`.
- **Body & Captions:**
  - **Body text:** `0.85rem` - `0.9rem`.
  - **Small / Meta text:** `0.75rem`.

---

## 📐 Layout & Spacing

- **Container:** Max width of `1200px`, centered with `2rem` padding (`1rem` on mobile).
- **Dashboard Grid:** `1.2fr 1fr` 2-column layout with a gap of `1.5rem` to accommodate asymmetric dashboard items.
- **Card Layout:** Rounded corners with `16px` border-radius (`border-radius: 16px`), padding `1.5rem`.

---

## 📱 Mobile Responsiveness

The interface adapts smoothly to smaller screens using CSS media queries:

### 1. Viewport Breakpoint: `900px` (Tablet / Laptop)
- The asymmetric `dashboard-grid` collapses from 2 columns to a single-column layout:
  ```css
  @media (max-width: 900px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }
  ```

### 2. Viewport Breakpoint: `768px` (Small Tablet / Landscape Mobile)
- Container padding is reduced to `1rem` to maximize horizontal space.
- Header items stack vertically:
  ```css
  @media (max-width: 768px) {
    .app-container {
      padding: 1rem;
    }
    header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
  ```

### 3. Viewport Breakpoint: `600px` (Mobile Devices)
- **Automatic Zoom Prevention:** Form input font-size is forced to `16px` (`font-size: 16px !important`). This prevents Safari and Chrome on iOS from automatically zooming into the input fields on focus, preserving layout stability.
- **Form Grid:** Stacks from 2 columns to a single column to keep input fields wide enough for comfortable typing.
- **Tap Targets:** Interactive targets (buttons, links) are given a minimum height of `44px` to comply with touch accessibility guidelines:
  ```css
  @media (max-width: 600px) {
    .btn-primary, .btn-secondary, button {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
  ```
