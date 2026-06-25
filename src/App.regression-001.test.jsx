import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

// Regression: ISSUE-001 — App crashes on browser load due to missing Tauri injection
// Found by /qa on 2026-06-26
// Report: .gstack/qa-reports/qa-report-localhost-1420-2026-06-26.md

test("should load the application and render successfully in a browser environment", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  } else {
    const mockStorage = {};
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => { mockStorage[key] = String(val); },
      clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
    };
    global.window.localStorage = global.localStorage;
  }

  render(<App />);

  // Wait for the main title to appear
  const title = await screen.findByText("eager-bell", {}, { timeout: 2000 });
  expect(title).toBeInTheDocument();

  // Verify that the table header is loaded
  const tableHeader = await screen.findByText("Tổng quan danh mục hiện tại");
  expect(tableHeader).toBeInTheDocument();

  // Verify asset items are listed
  expect(screen.getAllByText("Tiết kiệm").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Vàng SJC").length).toBeGreaterThan(0);
});
