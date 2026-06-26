# Testing in Wealth Copilot

> "100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower."

## Testing Stack
- **Framework:** Vitest (v4)
- **Environment:** jsdom (for DOM and localStorage simulation)
- **Helper Utilities:** `@testing-library/react` and `@testing-library/jest-dom`

---

## How to Run Tests

### Run All Tests (Once)
```bash
npx vitest run
```

### Run in Watch Mode (For Development)
```bash
npx vitest
```

---

## Test Layers & Conventions

### 1. File Naming
- All test files should end with `.test.js`, `.test.jsx`, or `.regression-*.test.jsx`.
- Store tests next to the components they test in `src/` or in `src/test/`.

### 2. Regression Tests
When a bug is found and fixed via the QA pipeline, a regression test must be added to ensure it never occurs again.
- Name: `{ComponentName}.regression-{number}.test.{ext}`
- Standard Attribution Header:
  ```javascript
  // Regression: ISSUE-NNN — {what broke}
  // Found by /qa on {YYYY-MM-DD}
  // Report: .gstack/qa-reports/qa-report-{domain}-{date}.md
  ```

---

## Example Test Structure
```javascript
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders the app layout successfully", async () => {
  render(<App />);
  const element = await screen.findByText("Wealth Copilot");
  expect(element).toBeInTheDocument();
});
```
