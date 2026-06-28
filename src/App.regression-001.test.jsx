import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

// Regression: ISSUE-001 — App crashes on browser load due to missing Tauri injection
// Found by /qa on 2026-06-26
// Report: .gstack/qa-reports/qa-report-localhost-1420-2026-06-26.md

test("should load the application and render successfully in a browser environment (default English)", async () => {
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
  const title = await screen.findByText("Wealth Copilot", {}, { timeout: 2000 });
  expect(title).toBeInTheDocument();

  // Verify that the table header is loaded
  const tableHeader = await screen.findByText("Portfolio Overview");
  expect(tableHeader).toBeInTheDocument();

  // Verify asset items are listed (English by default)
  expect(screen.getAllByText("Savings").length).toBeGreaterThan(0);
  expect(screen.getAllByText("SJC Gold").length).toBeGreaterThan(0);
});

test("should support language toggling between English and Vietnamese", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
  render(<App />);
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  // 1. Initially it should show English
  const englishHeader = await screen.findByText("Portfolio Overview");
  expect(englishHeader).toBeInTheDocument();

  // 2. Click the language toggle button to switch to Vietnamese (the button text is "🌐 VI" when current is English)
  const toggleBtn = screen.getByText(/🌐 VI/i);
  expect(toggleBtn).toBeInTheDocument();
  fireEvent.click(toggleBtn);

  // 3. Now it should show Vietnamese
  const vietnameseHeader = await screen.findByText("Tổng quan danh mục hiện tại");
  expect(vietnameseHeader).toBeInTheDocument();

  // 4. Toggle back to English (the button text is "🌐 EN" when current is Vietnamese)
  const toggleBackBtn = screen.getByText(/🌐 EN/i);
  expect(toggleBackBtn).toBeInTheDocument();
  fireEvent.click(toggleBackBtn);

  // 5. It should show English again
  expect(screen.queryByText("Tổng quan danh mục hiện tại")).not.toBeInTheDocument();
  expect(screen.getByText("Portfolio Overview")).toBeInTheDocument();
});

test("should allow selecting Custom option without crashing", async () => {
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

  // Wait for the asset select dropdown
  const selectElement = await screen.findByLabelText("Asset Class", { exact: false });
  expect(selectElement).toBeInTheDocument();

  // Change selection to Custom
  const fireEvent = (await import("@testing-library/react")).fireEvent;
  fireEvent.change(selectElement, { target: { value: "Custom" } });

  // Custom asset input should appear
  const customInput = await screen.findByPlaceholderText("e.g. HPG, TCB, VCB, VCG...");
  expect(customInput).toBeInTheDocument();

  // Type a custom asset name
  fireEvent.change(customInput, { target: { value: "HPG" } });
  expect(customInput.value).toBe("HPG");
});

test("should successfully add a custom asset transaction", async () => {
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

  const fireEvent = (await import("@testing-library/react")).fireEvent;

  // 1. Change selection to Custom
  const selectElement = await screen.findByLabelText("Asset Class", { exact: false });
  fireEvent.change(selectElement, { target: { value: "Custom" } });

  // 2. Type custom asset symbol
  const customInput = await screen.findByPlaceholderText("e.g. HPG, TCB, VCB, VCG...");
  fireEvent.change(customInput, { target: { value: "HPG" } });

  // 3. Fill quantity
  const qtyInput = await screen.findByLabelText("Transaction Quantity (Tael/Share)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "10" } });

  // 4. Fill price
  const priceInput = await screen.findByLabelText("Market Price at Transaction", { exact: false });
  fireEvent.change(priceInput, { target: { value: "26000" } });

  // 5. Submit form
  const submitButton = screen.getByRole("button", { name: /Save Transaction & Update/i });
  fireEvent.click(submitButton);

  // 6. Verify success message appears
  const successMsg = await screen.findByText(/Recorded transaction/i);
  expect(successMsg).toBeInTheDocument();
});

test("should allow configuring Settings and using Backup/Restore drawer without crashing", async () => {
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
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  // 1. Toggle Settings drawer
  const settingsBtn = screen.getByRole("button", { name: /⚙️ API Settings/i });
  fireEvent.click(settingsBtn);

  // 2. Locate Settings elements
  const apiKeyInput = await screen.findByLabelText("Gemini API Key (secure local storage)", { exact: false });
  const proxyUrlInput = await screen.findByLabelText("Custom Proxy / Endpoint (Optional for Vietnam)", { exact: false });

  fireEvent.change(apiKeyInput, { target: { value: "test-api-key" } });
  fireEvent.change(proxyUrlInput, { target: { value: "http://localhost:8080" } });

  const saveSettingsBtn = screen.getByRole("button", { name: /Save Configuration/i });
  fireEvent.click(saveSettingsBtn);

  // 3. Toggle Backup drawer
  const backupBtn = screen.getByRole("button", { name: /Backup \/ Restore/i });
  fireEvent.click(backupBtn);

  // 4. Locate Backup elements
  const exportTextarea = await screen.findByLabelText("Current Backup Data (JSON)", { exact: false });
  const importTextarea = await screen.findByLabelText("Paste backup data to restore", { exact: false });
  expect(exportTextarea).toBeInTheDocument();
  expect(importTextarea).toBeInTheDocument();

  // Trigger export
  const exportBtn = screen.getByRole("button", { name: /Export Backup & Copy/i });
  fireEvent.click(exportBtn);

  // Trigger import
  fireEvent.change(importTextarea, { target: { value: "[]" } });
  const importBtn = screen.getByRole("button", { name: /Restore from paste/i });
  fireEvent.click(importBtn);
});

test("should show correct warnings and auto calculate fees/taxes", async () => {
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
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  // 1. Select Gold
  const selectElement = await screen.findByLabelText("Asset Class", { exact: false });
  fireEvent.change(selectElement, { target: { value: "Gold" } });

  // 2. Verify fee/tax calculations
  const qtyInput = await screen.findByLabelText("Transaction Quantity (Tael/Share)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "2" } });

  const priceInput = await screen.findByLabelText("Market Price at Transaction", { exact: false });
  fireEvent.change(priceInput, { target: { value: "83000000" } });

  const feeInput = await screen.findByLabelText("Transaction Fee (VND) - default 0.15%", { exact: false });
  // fee = 2 * 83000000 * 0.0015 = 249000
  expect(feeInput.value).toBe("249000");

  // Select Sell
  const actionSelect = await screen.findByLabelText("Action", { exact: false });
  fireEvent.change(actionSelect, { target: { value: "Sell" } });

  const taxInput = await screen.findByLabelText("Sell Tax (VND) - default 0.1%", { exact: false });
  // tax = 2 * 83000000 * 0.001 = 166000
  expect(taxInput.value).toBe("166000");
});

test("should show error when quantity is <= 0 or invalid", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
  render(<App />);
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  const selectElement = await screen.findByLabelText("Asset Class", { exact: false });
  fireEvent.change(selectElement, { target: { value: "VN30" } });

  const qtyInput = await screen.findByLabelText("Transaction Quantity (Tael/Share)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "-5" } });

  const priceInput = await screen.findByLabelText("Market Price at Transaction", { exact: false });
  fireEvent.change(priceInput, { target: { value: "21000" } });

  const submitButton = screen.getByRole("button", { name: /Save Transaction & Update/i });
  fireEvent.click(submitButton);

  const errorMsg = await screen.findByText("Transaction quantity must be greater than 0");
  expect(errorMsg).toBeInTheDocument();
});

test("should show error when price is <= 0 or invalid for non-savings assets", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
  render(<App />);
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  const selectElement = await screen.findByLabelText("Asset Class", { exact: false });
  fireEvent.change(selectElement, { target: { value: "VN30" } });

  const qtyInput = await screen.findByLabelText("Transaction Quantity (Tael/Share)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "10" } });

  const priceInput = await screen.findByLabelText("Market Price at Transaction", { exact: false });
  fireEvent.change(priceInput, { target: { value: "-2000" } });

  const submitButton = screen.getByRole("button", { name: /Save Transaction & Update/i });
  fireEvent.click(submitButton);

  const errorMsg = await screen.findByText("Transaction price must be greater than 0");
  expect(errorMsg).toBeInTheDocument();
});

test("should default price to 1.0 for Savings asset", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
  render(<App />);
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  const selectElement = await screen.findByLabelText("Asset Class", { exact: false });
  fireEvent.change(selectElement, { target: { value: "Savings" } });

  const qtyInput = await screen.findByLabelText("Deposit/Withdraw Amount (VND)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "5000000" } });

  const submitButton = screen.getByRole("button", { name: /Save Transaction & Update/i });
  fireEvent.click(submitButton);

  const successMsg = await screen.findByText(/Recorded transaction Savings successfully!/i);
  expect(successMsg).toBeInTheDocument();
});

test("should show error on invalid JSON backup restore", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
  render(<App />);
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  const backupBtn = screen.getByRole("button", { name: /Backup \/ Restore/i });
  fireEvent.click(backupBtn);

  const importTextarea = await screen.findByLabelText("Paste backup data to restore", { exact: false });
  fireEvent.change(importTextarea, { target: { value: "invalid-json-content" } });

  const importBtn = screen.getByRole("button", { name: /Restore from paste/i });
  fireEvent.click(importBtn);

  const errorMsg = await screen.findByText(/JSON parse error or invalid backup format/i);
  expect(errorMsg).toBeInTheDocument();
});

test("should allow deleting a transaction", async () => {
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
  const originalConfirm = window.confirm;
  window.confirm = () => true;

  render(<App />);
  const fireEvent = (await import("@testing-library/react")).fireEvent;

  const deleteButtons = await screen.findAllByRole("button", { name: /Delete/i });
  expect(deleteButtons.length).toBeGreaterThan(0);

  fireEvent.click(deleteButtons[0]);

  const successMsg = await screen.findByText(/Deleted transaction successfully!/i);
  expect(successMsg).toBeInTheDocument();

  window.confirm = originalConfirm;
});
