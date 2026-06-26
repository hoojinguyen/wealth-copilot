# Wealth Copilot Developer Guide

## Build and Run Commands
- **Dev Server (web preview):** `npm run dev`
- **Tauri Dev (native desktop app):** `npm run tauri dev`
- **Build Tauri App:** `npm run tauri build`
- **Run Tests:** `npx vitest run`
- **Run Scraper:** `python3 scripts/scraper.py`

---

## Code Style & Rules
- **Formatting:** Clean React JS code, standard ES6 imports.
- **Tauri Core integration:** Import from `./tauri-client` instead of `@tauri-apps/api/core` to support running the frontend app in standard browser preview mode (falls back to a mock SQLite client and JS solver).

---

## Testing
See [TESTING.md](file:///Users/hoojinguyen/Documents/antigravity/eager-bell/TESTING.md) for full instructions.
- **Run command:** `npx vitest run`
- **Test expectations:**
  - 100% test coverage is the goal — tests make vibe coding safe.
  - When writing new functions, write a corresponding test.
  - When fixing a bug, write a regression test.
  - When adding error handling, write a test that triggers the error.
  - When adding a conditional (if/else, switch), write tests for BOTH paths.
  - Never commit code that makes existing tests fail.
