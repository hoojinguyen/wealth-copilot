# Wealth Copilot

Smart personal asset allocation and rebalancing advisor tailored for Vietnam. A local-first, highly secure application built on **Tauri + React + Rust**.

## 🎨 Key Features

- **Portfolio Optimization**: Utilizes Rust's **Clarabel** convex optimization solver to compute optimal asset weights using the Markowitz model based on your Risk Aversion ($\lambda$).
- **Support for Vietnam & Custom Asset Classes**:
  - Bank Savings, SJC Gold bar, VN30 ETF (E1VFVN30), Diamond ETF (FUEVFVND).
  - Add and manage any custom asset ticker under "Custom", with dynamic HSL hashing for consistent color coding on the donut chart.
- **AI Advisor & Document Parser**:
  - Get deep insights, portfolio structural analysis, and step-by-step actions in your selected language via the integrated Gemini AI Advisor.
  - Automatically parse screenshots of brokerage platforms (such as TCBS) using Gemini Vision, with a preview/edit draft table before saving to SQLite.
  - Save your personal Gemini API Key and local Reverse Proxy/Endpoint URL in settings to prevent connectivity issues.
- **Automatic Market Sync**: Sync the latest SJC gold prices, ETF values, and savings interest rates directly from the repository's GitHub Releases.
- **Secure & Local-First**: All transaction logs and portfolios are stored securely in a local SQLite database on your machine.
- **Backup & Restore**: Easily export your data as a JSON string to backup or restore your portfolio across devices.

## 🚀 Development Guide

See [CLAUDE.md](file:///Users/hoojinguyen/Documents/antigravity/eager-bell/CLAUDE.md) for more details.

### System Requirements
- **Node.js** (Version 20 or higher)
- **Rust & Cargo** (For compiling Tauri backend)

### Start Development Server
```bash
# Install dependencies
npm install

# Run frontend in browser preview mode
npm run dev

# Run desktop Tauri app in development mode
npm run tauri dev
```

### Testing
```bash
# Run unit and regression tests
npx vitest run
```
