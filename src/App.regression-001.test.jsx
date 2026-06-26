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
  const title = await screen.findByText("Wealth Copilot", {}, { timeout: 2000 });
  expect(title).toBeInTheDocument();

  // Verify that the table header is loaded
  const tableHeader = await screen.findByText("Tổng quan danh mục hiện tại");
  expect(tableHeader).toBeInTheDocument();

  // Verify asset items are listed
  expect(screen.getAllByText("Tiết kiệm").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Vàng SJC").length).toBeGreaterThan(0);
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
  const selectElement = await screen.findByLabelText("Loại tài sản", { exact: false });
  expect(selectElement).toBeInTheDocument();

  // Change selection to Custom
  const fireEvent = (await import("@testing-library/react")).fireEvent;
  fireEvent.change(selectElement, { target: { value: "Custom" } });

  // Custom asset input should appear
  const customInput = await screen.findByPlaceholderText("Ví dụ: HPG, TCB, VCB, VCG...");
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
  const selectElement = await screen.findByLabelText("Loại tài sản", { exact: false });
  fireEvent.change(selectElement, { target: { value: "Custom" } });

  // 2. Type custom asset symbol
  const customInput = await screen.findByPlaceholderText("Ví dụ: HPG, TCB, VCB, VCG...");
  fireEvent.change(customInput, { target: { value: "HPG" } });

  // 3. Fill quantity
  const qtyInput = await screen.findByLabelText("Số lượng giao dịch (lượng/CCQ)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "10" } });

  // 4. Fill price
  const priceInput = await screen.findByLabelText("Giá thị trường lúc giao dịch", { exact: false });
  fireEvent.change(priceInput, { target: { value: "26000" } });

  // 5. Submit form
  const submitButton = screen.getByRole("button", { name: /Lưu giao dịch & Cập nhật/i });
  fireEvent.click(submitButton);

  // 6. Verify success message appears
  const successMsg = await screen.findByText(/Đã ghi nhận giao dịch/i);
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
  const settingsBtn = screen.getByRole("button", { name: /⚙️ Cài đặt API/i });
  fireEvent.click(settingsBtn);

  // 2. Locate Settings elements
  const apiKeyInput = await screen.findByLabelText("Gemini API Key (lưu trữ local bảo mật)", { exact: false });
  const proxyUrlInput = await screen.findByLabelText("Custom Proxy / Endpoint (Tùy chọn cho Việt Nam)", { exact: false });

  fireEvent.change(apiKeyInput, { target: { value: "test-api-key" } });
  fireEvent.change(proxyUrlInput, { target: { value: "http://localhost:8080" } });

  const saveSettingsBtn = screen.getByRole("button", { name: /Lưu Cấu Hình/i });
  fireEvent.click(saveSettingsBtn);

  // 3. Toggle Backup drawer
  const backupBtn = screen.getByRole("button", { name: /Sao lưu \/ Khôi phục/i });
  fireEvent.click(backupBtn);

  // 4. Locate Backup elements
  const exportTextarea = await screen.findByLabelText("Dữ liệu sao lưu hiện tại (JSON)", { exact: false });
  const importTextarea = await screen.findByLabelText("Dán dữ liệu sao lưu để khôi phục", { exact: false });
  expect(exportTextarea).toBeInTheDocument();
  expect(importTextarea).toBeInTheDocument();

  // Trigger export
  const exportBtn = screen.getByRole("button", { name: /Xuất sao lưu & Sao chép/i });
  fireEvent.click(exportBtn);

  // Trigger import
  fireEvent.change(importTextarea, { target: { value: "[]" } });
  const importBtn = screen.getByRole("button", { name: /Khôi phục từ bản dán/i });
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
  const selectElement = await screen.findByLabelText("Loại tài sản", { exact: false });
  fireEvent.change(selectElement, { target: { value: "Gold" } });

  // 2. Verify fee/tax calculations
  const qtyInput = await screen.findByLabelText("Số lượng giao dịch (lượng/CCQ)", { exact: false });
  fireEvent.change(qtyInput, { target: { value: "2" } });

  const priceInput = await screen.findByLabelText("Giá thị trường lúc giao dịch", { exact: false });
  fireEvent.change(priceInput, { target: { value: "83000000" } });

  const feeInput = await screen.findByLabelText("Phí giao dịch (VND) - mặc định 0.15%", { exact: false });
  // fee = 2 * 83000000 * 0.0015 = 249000
  expect(feeInput.value).toBe("249000");

  // Select Sell
  const actionSelect = await screen.findByLabelText("Hành động", { exact: false });
  fireEvent.change(actionSelect, { target: { value: "Sell" } });

  const taxInput = await screen.findByLabelText("Thuế bán (VND) - mặc định 0.1%", { exact: false });
  // tax = 2 * 83000000 * 0.001 = 166000
  expect(taxInput.value).toBe("166000");
});
