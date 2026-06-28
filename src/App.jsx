import { useState, useEffect, useMemo } from "react";
import { invoke } from "./tauri-client";
import "./App.css";

const ASSET_NAMES_VI = {
  Savings: "Tiết kiệm",
  Gold: "Vàng SJC",
  VN30: "ETF VN30",
  Diamond: "ETF Diamond"
};

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND"
});

function formatVND(value) {
  return vndFormatter.format(value).replace("₫", "đ");
}

// Dynamic color generator based on HSL hashing
function getAssetColor(assetName) {
  const defaultColors = {
    Savings: "#4f46e5",
    Gold: "#f59e0b",
    VN30: "#06b6d4",
    Diamond: "#ec4899"
  };
  if (defaultColors[assetName]) return defaultColors[assetName];
  if (assetName === "Tiết kiệm") return defaultColors.Savings;
  if (assetName === "Vàng SJC") return defaultColors.Gold;

  let hash = 0;
  for (let i = 0; i < assetName.length; i++) {
    hash = assetName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function getAssetDisplayName(asset) {
  return ASSET_NAMES_VI[asset] || asset;
}

function App() {
  // App State & Theme
  const [theme, setTheme] = useState("dark");
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lambda, setLambda] = useState(5.0);
  const [optimalResult, setOptimalResult] = useState(null);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Transaction Form States
  const [formAssetSelect, setFormAssetSelect] = useState("Savings");
  const [formAssetCustom, setFormAssetCustom] = useState("");
  const [formAction, setFormAction] = useState("Deposit");
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formFee, setFormFee] = useState("");
  const [formTax, setFormTax] = useState("");

  const formAsset = formAssetSelect === "Custom" ? formAssetCustom : formAssetSelect;

  // Settings States
  const [apiKey, setApiKey] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Ingestion & Draft Table States
  const [isUploading, setIsUploading] = useState(false);
  const [draftItems, setDraftItems] = useState([]); // [{ asset, quantity, purchase_price }]

  // Advisor States
  const [advisorText, setAdvisorText] = useState("");
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Backup States
  const [showBackupDrawer, setShowBackupDrawer] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [importText, setImportText] = useState("");

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load state on startup
  useEffect(() => {
    loadPortfolioData();
    loadUserSettings();
  }, []);

  // Re-run rebalancer when lambda or portfolio/prices change
  useEffect(() => {
    const liquidAssets = portfolio.filter(item => item.asset_type === "Liquid");
    if (liquidAssets.length > 0 && prices.length > 0) {
      calculateRebalancing();
    } else {
      setOptimalResult(null);
    }
  }, [lambda, portfolio, prices]);

  // Auto calculate transaction fees and taxes based on Vietnamese brokerage defaults
  useEffect(() => {
    const qty = parseFloat(formQty) || 0;
    const price = parseFloat(formPrice) || 0;
    const total = qty * price;
    
    if (formAsset === "Savings") {
      setFormFee("0");
      setFormTax("0");
    } else {
      // 0.15% transaction fee default
      setFormFee((total * 0.0015).toFixed(0));
      if (formAction === "Sell") {
        // 0.1% sell tax default
        setFormTax((total * 0.001).toFixed(0));
      } else {
        setFormTax("0");
      }
    }
  }, [formQty, formPrice, formAsset, formAction]);

  async function loadUserSettings() {
    try {
      const settings = await invoke("get_user_settings");
      if (settings.gemini_api_key) setApiKey(settings.gemini_api_key);
      if (settings.proxy_url) setProxyUrl(settings.proxy_url);
    } catch (err) {
      console.error("Lỗi tải cài đặt:", err);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("save_user_settings", { api_key: apiKey, proxy_url: proxyUrl });
      setSuccessMsg("Lưu cài đặt API Key & Proxy thành công!");
      setShowSettings(false);
    } catch (err) {
      setErrorMsg(`Lỗi lưu cài đặt: ${err}`);
    }
  }

  async function loadPortfolioData() {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const state = await invoke("get_portfolio");
      setPortfolio(state.portfolio);
      setPrices(state.prices);
      setTransactions(state.transactions);
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function calculateRebalancing() {
    try {
      const result = await invoke("run_rebalancer", { lambda });
      setOptimalResult(result);
    } catch (err) {
      console.warn(`Lỗi tối ưu hóa danh mục: ${err}`);
    }
  }

  async function handleAddTransaction(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const qty = parseFloat(formQty);
    let price = parseFloat(formPrice);
    const fee = parseFloat(formFee) || 0.0;
    const tax = parseFloat(formTax) || 0.0;

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Số lượng giao dịch phải lớn hơn 0");
      return;
    }

    if (formAsset === "Savings") {
      price = 1.0;
    } else if (isNaN(price) || price <= 0) {
      setErrorMsg("Giá giao dịch phải lớn hơn 0");
      return;
    }

    try {
      // Sync Yahoo Finance data first if it's a new custom stock
      if (formAssetSelect === "Custom" && formAssetCustom.trim()) {
        try {
          await invoke("fetch_historical_prices", { symbol: formAssetCustom });
        } catch (err) {
          console.warn(`Không tải được giá lịch sử cho ${formAssetCustom}: ${err}`);
        }
      }

      const log = {
        id: null,
        asset: formAsset,
        action_type: formAction,
        quantity: qty,
        price: price,
        date: formDate,
        fee: fee,
        tax: tax
      };
      
      await invoke("save_transaction", { log });
      setSuccessMsg(`Đã ghi nhận giao dịch ${getAssetDisplayName(formAsset)} thành công!`);
      
      // Reset form fields
      setFormQty("");
      setFormPrice("");
      setFormAssetCustom("");
      
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(String(err));
    }
  }

  async function handleScreenshotChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setDraftItems([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      try {
        const jsonResult = await invoke("parse_screenshot", { imageBase64: base64 });
        const parsed = JSON.parse(jsonResult);
        if (Array.isArray(parsed)) {
          setDraftItems(parsed.map(item => ({
            asset: String(item.asset || "").trim().toUpperCase(),
            quantity: parseFloat(item.quantity) || 0.0,
            purchase_price: parseFloat(item.purchase_price) || 0.0
          })));
          setSuccessMsg("Đã phân tích ảnh chụp danh mục! Vui lòng đối chiếu và chỉnh sửa trong Bảng Duyệt Nháp bên dưới.");
        } else {
          throw new Error("Phản hồi bóc tách từ Gemini không đúng định dạng mảng");
        }
      } catch (err) {
        setErrorMsg(`Lỗi bóc tách ảnh: ${err}. Hãy cấu hình Gemini API Key và đảm bảo kết nối mạng không bị chặn.`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Lỗi đọc file ảnh");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveDraft() {
    setErrorMsg("");
    setSuccessMsg("");
    
    for (const item of draftItems) {
      if (!item.asset.trim() || item.quantity <= 0 || item.purchase_price <= 0) {
        setErrorMsg("Bảng nháp có dòng không hợp lệ. Vui lòng kiểm tra lại mã, số lượng và giá vốn.");
        return;
      }
    }

    try {
      setIsLoading(true);
      
      // Sync Yahoo Finance data first
      for (const item of draftItems) {
        try {
          await invoke("fetch_historical_prices", { symbol: item.asset });
        } catch (e) {
          console.warn(`Không tải được giá lịch sử cho ${item.asset}: ${e}`);
        }
      }

      const date = new Date().toISOString().split("T")[0];
      const itemsToImport = draftItems.map(item => ({
        asset: item.asset,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        date
      }));

      await invoke("import_draft_transactions", { items: itemsToImport });

      setSuccessMsg("Đã thêm toàn bộ danh mục từ bảng duyệt nháp vào SQLite thành công!");
      setDraftItems([]);
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(`Lỗi lưu danh mục: ${err}`);
      setIsLoading(false);
    }
  }

  function handleUpdateDraftItem(index, field, value) {
    setDraftItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        let parsedVal = value;
        if (field === "quantity" || field === "purchase_price") {
          parsedVal = parseFloat(value) || 0.0;
        } else if (field === "asset") {
          parsedVal = String(value).toUpperCase();
        }
        return { ...item, [field]: parsedVal };
      }
      return item;
    }));
  }

  function handleDeleteDraftItem(index) {
    setDraftItems(prev => prev.filter((_, idx) => idx !== index));
  }

  function handleAddDraftItem() {
    setDraftItems(prev => [...prev, { asset: "", quantity: 0.0, purchase_price: 0.0 }]);
  }

  async function handleGenerateAdvice() {
    setAdvisorLoading(true);
    setErrorMsg("");
    setAdvisorText("");
    try {
      const advice = await invoke("generate_wealth_advice");
      setAdvisorText(advice);
    } catch (err) {
      setErrorMsg(`Lỗi sinh báo cáo AI: ${err}`);
    } finally {
      setAdvisorLoading(false);
    }
  }

  async function handleSync() {
    setSyncLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("sync_market_data");
      setSuccessMsg("Đồng bộ dữ liệu giá từ GitHub thành công!");
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleExportBackup() {
    setErrorMsg("");
    try {
      const backup = await invoke("export_backup");
      setBackupText(backup);
      await navigator.clipboard.writeText(backup);
      setSuccessMsg("Đã xuất bản sao lưu và tự động sao chép vào clipboard!");
    } catch (err) {
      setErrorMsg(String(err));
    }
  }

  async function handleImportBackup() {
    if (!importText.trim()) {
      setErrorMsg("Vui lòng dán dữ liệu sao lưu JSON cần khôi phục");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("import_backup", { backupJson: importText });
      setSuccessMsg("Khôi phục dữ liệu từ bản sao lưu thành công!");
      setImportText("");
      setShowBackupDrawer(false);
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(String(err));
    }
  }

  async function handleDeleteTransaction(id) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa giao dịch này không? Tỷ trọng danh mục sẽ được tính toán lại.")) {
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("delete_transaction", { id });
      setSuccessMsg("Đã xóa giao dịch thành công!");
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(String(err));
    }
  }

  // Calculate prices map
  const latestPrices = useMemo(() => {
    const map = {
      Savings: 1.0,
      Gold: 83000000.0,
      VN30: 21500.0,
      Diamond: 28500.0
    };
    prices.forEach(p => {
      map[p.asset] = p.price;
    });
    portfolio.forEach(item => {
      if (map[item.asset] === undefined) {
        map[item.asset] = item.purchase_price || 0.0;
      }
    });
    return map;
  }, [prices, portfolio]);

  // Calculate current asset values and total portfolio value
  const portfolioWithValues = portfolio.map(item => {
    let value = 0;
    if (item.asset === "Savings") {
      value = item.quantity;
    } else {
      value = item.quantity * latestPrices[item.asset];
    }
    return {
      ...item,
      nameVi: getAssetDisplayName(item.asset),
      price: latestPrices[item.asset],
      value,
      color: getAssetColor(item.asset)
    };
  });

  const totalPortfolioValue = portfolioWithValues.reduce((sum, item) => sum + item.value, 0);

  // Warning Banner calculation
  const latestPriceDate = useMemo(() => {
    if (prices.length === 0) return null;
    const dates = prices.map(p => p.date);
    dates.sort();
    return dates[dates.length - 1];
  }, [prices]);

  const isSyncWarning = useMemo(() => {
    if (!latestPriceDate) return true;
    const latest = new Date(latestPriceDate);
    const today = new Date();
    const diffTime = Math.abs(today - latest);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 5;
  }, [latestPriceDate]);

  // Generate rebalancing suggestions (skip Static assets)
  const suggestions = [];
  let hasWithdrawalWarning = false;
  let hasGoldWarning = false;

  if (totalPortfolioValue > 0 && optimalResult) {
    portfolioWithValues.forEach((item) => {
      if (item.asset_type === "Static") return; // ignore static assets in rebalancing
      
      const currentWeight = item.value / totalPortfolioValue;
      const optimalWeight = optimalResult.weights[item.asset] || 0.0;
      const diffWeight = optimalWeight - currentWeight;
      
      if (Math.abs(diffWeight) >= 0.05) {
        const diffValue = diffWeight * totalPortfolioValue;
        let actionDescription = "";
        let isBuy = diffValue > 0;
        
        if (item.asset === "Savings") {
          if (isBuy) {
            actionDescription = `Gửi thêm ${formatVND(diffValue)} vào Tiết kiệm`;
          } else {
            actionDescription = `Rút ${formatVND(Math.abs(diffValue))} từ Tiết kiệm`;
            hasWithdrawalWarning = true;
          }
        } else {
          const qtyDiff = Math.abs(diffValue / latestPrices[item.asset]);
          const unit = item.asset === "Gold" ? "lượng" : "CCQ";
          
          if (isBuy) {
            actionDescription = `Mua thêm ${qtyDiff.toFixed(2)} ${unit} ${getAssetDisplayName(item.asset)} (khoảng ${formatVND(diffValue)})`;
          } else {
            actionDescription = `Bán bớt ${qtyDiff.toFixed(2)} ${unit} ${getAssetDisplayName(item.asset)} (khoảng ${formatVND(Math.abs(diffValue))})`;
          }
          
          if (item.asset === "Gold") {
            hasGoldWarning = true;
          }
        }

        suggestions.push({
          asset: item.asset,
          nameVi: item.nameVi,
          isBuy,
          action: actionDescription,
          deviation: Math.round(diffWeight * 100)
        });
      }
    });
  }

  // Render Ring Chart SVG path helper
  const size = 160;
  const radius = 55;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="app-container">
      <header>
        <div className="brand-section">
          <h1>Wealth Copilot</h1>
          <p>Cố Vấn Tài Sản & Tái Cơ Cấu Thông Minh local-first (Việt Nam)</p>
        </div>
        <div className="header-actions">
          {/* Theme switch button */}
          <button 
            className="btn-secondary btn-small"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          <button 
            className="btn-secondary btn-small"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Cài đặt API
          </button>
          <button 
            className="btn-secondary btn-small"
            onClick={() => setShowBackupDrawer(!showBackupDrawer)}
          >
            Sao lưu / Khôi phục
          </button>
          <button 
            className="btn-primary btn-small" 
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading && <span className="spinner"></span>}
            {syncLoading ? "Đang đồng bộ..." : "Đồng bộ giá thị trường"}
          </button>
        </div>
      </header>

      {/* Warning Banner */}
      {isSyncWarning && (
        <div className="alert alert-warning-sync">
          <span className="alert-title">⚠️ Dữ liệu giá thị trường chưa đồng bộ mới nhất</span>
          <span className="alert-content">
            Lần đồng bộ giá thị trường gần nhất là <strong>{latestPriceDate || "chưa rõ"}</strong> (đã quá 5 ngày). Hãy bấm <strong>"Đồng bộ giá thị trường"</strong> để solver sử dụng dữ liệu mới nhất.
          </span>
        </div>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div className="alert alert-error">
          <span className="alert-title">Lỗi hệ thống</span>
          <span className="alert-content">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-info">
          <span className="alert-content">{successMsg}</span>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-drawer">
          <h3>⚙️ Cấu hình Gemini API & Kết nối mạng</h3>
          <form onSubmit={handleSaveSettings} style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-group">
                <label htmlFor="settings-api-key">Gemini API Key (lưu trữ local bảo mật)</label>
                <input 
                  id="settings-api-key"
                  type="password" 
                  placeholder="Dán API Key từ Google AI Studio..." 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="settings-proxy-url">Custom Proxy / Endpoint (Tùy chọn cho Việt Nam)</label>
                <input 
                  id="settings-proxy-url"
                  type="text" 
                  placeholder="Ví dụ: http://localhost:7890 hoặc Reverse Proxy Endpoint" 
                  value={proxyUrl} 
                  onChange={(e) => setProxyUrl(e.target.value)} 
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary btn-small">Lưu Cấu Hình</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowSettings(false)}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      {/* Backup Drawer */}
      {showBackupDrawer && (
        <div className="backup-drawer">
          <h3>Quản lý sao lưu dữ liệu</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
            <div>
              <label htmlFor="backup-export-text">Dữ liệu sao lưu hiện tại (JSON)</label>
              <textarea 
                id="backup-export-text"
                className="backup-textarea" 
                readOnly 
                value={backupText} 
                placeholder="Click 'Xuất sao lưu' để tạo mã backup..."
              />
              <button className="btn btn-secondary btn-small" onClick={handleExportBackup}>
                Xuất sao lưu & Sao chép
              </button>
            </div>
            <div>
              <label htmlFor="backup-import-text">Dán dữ liệu sao lưu để khôi phục</label>
              <textarea 
                id="backup-import-text"
                className="backup-textarea" 
                value={importText} 
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Dán nội dung JSON sao lưu vào đây..."
              />
              <button className="btn btn-primary btn-small" onClick={handleImportBackup}>
                Khôi phục từ bản dán
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <span className="spinner" style={{ width: "32px", height: "32px" }}></span>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Đang tải dữ liệu SQLite...</p>
        </div>
      ) : (
        <>
          {transactions.length === 0 && (
            <div className="onboarding-banner">
              <h3>👋 Chào mừng đến với Wealth Copilot!</h3>
              <p>
                Ứng dụng local-first của bạn hỗ trợ quản lý đa tài sản tùy chọn ở Việt Nam.
              </p>
              <ol style={{ fontSize: "0.85rem", paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                <li><strong>Cấu hình API Key:</strong> Bấm "⚙️ Cài đặt API" ở góc trên bên trái để lưu khóa Gemini cá nhân của bạn.</li>
                <li><strong>Nhập danh mục tự động:</strong> Kéo thả hoặc tải ảnh chụp màn hình sàn giao dịch (như TCBS) vào khu vực bóc tách để nhập liệu siêu tốc.</li>
                <li><strong>Nhập thủ công hoặc fallback:</strong> Tự do gõ mã tài sản bất kỳ, điều chỉnh Phí và Thuế giao dịch của các sàn Việt Nam.</li>
              </ol>
            </div>
          )}

          <div className="dashboard-container">
            {/* SIDEBAR ON THE LEFT */}
            <aside className="app-sidebar">
              {/* Screenshot Ingestion Area */}
              <div className="sidebar-section">
                <h2>📸 Bóc tách ảnh chụp màn hình</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.4" }}>
                  Tải lên ảnh chụp danh mục tài sản từ TCBS hoặc sàn Việt Nam khác để phân tích tự động.
                </p>
                <div className="screenshot-zone" style={{ position: "relative" }}>
                  {isUploading ? (
                    <div>
                      <span className="spinner" style={{ width: "24px", height: "24px", display: "inline-block" }}></span>
                      <p style={{ marginTop: "0.5rem" }}>Gemini Vision đang bóc tách...</p>
                    </div>
                  ) : (
                    <div>
                      <p>Kéo & thả ảnh vào đây hoặc click để chọn</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleScreenshotChange} 
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                      />
                    </div>
                  )}
                </div>

                {/* Verify Draft Table */}
                {draftItems.length > 0 && (
                  <div className="draft-table-section" style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <h3>📋 Bản nháp</h3>
                      <button className="btn btn-secondary btn-xs" onClick={handleAddDraftItem}>+ Thêm dòng</button>
                    </div>
                    <table style={{ width: "100%", marginBottom: "1rem" }}>
                      <thead>
                        <tr>
                          <th>Mã</th>
                          <th className="num-col">SL</th>
                          <th className="num-col">Giá vốn</th>
                          <th style={{ width: "60px", textAlign: "center" }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <input 
                                type="text" 
                                className="table-input"
                                value={item.asset} 
                                onChange={(e) => handleUpdateDraftItem(idx, "asset", e.target.value)} 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="table-input num-col"
                                value={item.quantity || ""} 
                                onChange={(e) => handleUpdateDraftItem(idx, "quantity", e.target.value)} 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="table-input num-col"
                                value={item.purchase_price || ""} 
                                onChange={(e) => handleUpdateDraftItem(idx, "purchase_price", e.target.value)} 
                              />
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button 
                                className="btn btn-secondary btn-xs" 
                                style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "#dc3545", color: "white", border: "none" }}
                                onClick={() => handleDeleteDraftItem(idx)}
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-primary btn-xs" style={{ flex: 1 }} onClick={handleSaveDraft}>Lưu</button>
                      <button className="btn btn-secondary btn-xs" onClick={() => setDraftItems([])}>Hủy</button>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* MAIN DASHBOARD PANEL ON THE RIGHT */}
            <div className="main-panel">
              
              {/* Top Stats Bar */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Tổng giá trị tài sản</span>
                  <span className="stat-value">{formatVND(totalPortfolioValue)}</span>
                  <span className="stat-sub" style={{ color: "var(--color-success)" }}>Định giá local-first</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Lợi nhuận kỳ vọng</span>
                  <span className="stat-value">
                    {optimalResult ? `${(optimalResult.expected_return * 100).toFixed(2)}%` : "—"}
                  </span>
                  <span className="stat-sub" style={{ color: "var(--text-secondary)" }}>/ năm</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Độ biến động (Volatility)</span>
                  <span className="stat-value">
                    {optimalResult ? `${(optimalResult.volatility * 100).toFixed(2)}%` : "—"}
                  </span>
                  <span className="stat-sub" style={{ color: "var(--text-secondary)" }}>/ năm</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Chỉ số Sharpe</span>
                  <span className="stat-value">
                    {optimalResult && optimalResult.volatility > 0 
                      ? (optimalResult.expected_return / optimalResult.volatility).toFixed(2)
                      : "—"}
                  </span>
                  <span className="stat-sub" style={{ color: "var(--color-success)" }}>Tỷ suất sinh lời</span>
                </div>
              </div>

              {/* 2-Column Core Split Layout */}
              <div className="main-grid-split">
                
                {/* Left Split Column: Portfolio list table, record form, transaction history */}
                <div className="content-column">
                  
                  {/* Portfolio Status Card */}
                  <div className="card">
                    <h2>Tổng quan danh mục hiện tại</h2>
                    
                    <div className="chart-section">
                      {/* SVG Ring Chart */}
                      <div className="chart-container">
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
                          {totalPortfolioValue === 0 ? (
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              fill="none"
                              stroke="var(--border)"
                              strokeWidth={strokeWidth}
                            />
                          ) : (
                            (() => {
                              let accumulated = 0;
                              return portfolioWithValues.map(item => {
                                const percentage = item.value / totalPortfolioValue;
                                const strokeLength = percentage * circumference;
                                const strokeOffset = circumference - strokeLength + accumulated;
                                accumulated -= strokeLength;
                                
                                if (percentage === 0) return null;

                                return (
                                  <circle
                                    key={item.asset}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="none"
                                    stroke={item.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeOffset}
                                    style={{ transition: "stroke-dashoffset 0.4s ease" }}
                                  />
                                );
                              });
                            })()
                          )}
                        </svg>
                        <div className="chart-center-text">
                          <div className="chart-total-value">
                            {formatVND(totalPortfolioValue)}
                          </div>
                          <div className="chart-total-label">Tổng tài sản</div>
                        </div>
                      </div>

                      {/* Legend list */}
                      <div className="chart-legend">
                        {portfolioWithValues.map(item => (
                          <div key={item.asset} className={`legend-item ${item.asset.toLowerCase()}`}>
                            <span className="legend-label">
                              {item.nameVi} 
                              {item.asset_type === "Static" && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}> (Tĩnh)</span>}
                            </span>
                            <span className="legend-value">
                              {totalPortfolioValue > 0 
                                ? `${((item.value / totalPortfolioValue) * 100).toFixed(1)}%` 
                                : "0.0%"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Table of Assets */}
                    <table>
                      <thead>
                        <tr>
                          <th>Tài sản</th>
                          <th>Loại</th>
                          <th className="num-col">Số lượng</th>
                          <th className="num-col">Giá vốn TB</th>
                          <th className="num-col">Tổng giá trị</th>
                          <th className="num-col">Tỷ trọng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioWithValues.map(item => (
                          <tr key={item.asset}>
                            <td>
                              <span className="asset-badge">
                                <span className={`asset-dot ${item.asset.toLowerCase()}`}></span>
                                {item.nameVi}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.8rem", color: item.asset_type === "Liquid" ? "var(--color-success)" : "var(--text-secondary)" }}>
                                {item.asset_type === "Liquid" ? "Thanh khoản" : "Tĩnh/Khóa"}
                              </span>
                            </td>
                            <td className="num-col">
                              {item.asset === "Savings" 
                                ? formatVND(item.quantity)
                                : `${item.quantity.toLocaleString("vi-VN")} ${item.asset === "Gold" ? "lượng" : "CCQ"}`}
                            </td>
                            <td className="num-col">{item.asset === "Savings" ? "—" : formatVND(item.purchase_price)}</td>
                            <td className="num-col">{formatVND(item.value)}</td>
                            <td className="num-col">
                              {totalPortfolioValue > 0 
                                ? `${((item.value / totalPortfolioValue) * 100).toFixed(1)}%`
                                : "0.0%"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Record Transaction Form */}
                  <div className="card">
                    <h2>Ghi nhận giao dịch tài sản</h2>
                    <form onSubmit={handleAddTransaction}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="form-asset-select">Loại tài sản</label>
                          <select 
                            id="form-asset-select"
                            value={formAssetSelect} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormAssetSelect(val);
                              if (val === "Savings") {
                                setFormAction("Deposit");
                              } else {
                                setFormAction("Buy");
                              }
                            }}
                          >
                            <option value="Savings">Tiết kiệm</option>
                            <option value="Gold">Vàng SJC</option>
                            <option value="VN30">ETF VN30</option>
                            <option value="Diamond">ETF Diamond</option>
                            <option value="Custom">Khác (Nhập mã tự chọn)...</option>
                          </select>
                        </div>

                        {formAssetSelect === "Custom" && (
                          <div className="form-group">
                            <label htmlFor="form-asset-custom">Nhập mã tài sản tự chọn</label>
                            <input 
                              id="form-asset-custom"
                              type="text" 
                              required
                              placeholder="Ví dụ: HPG, TCB, VCB, VCG..." 
                              value={formAssetCustom}
                              onChange={(e) => setFormAssetCustom(e.target.value.toUpperCase())}
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label htmlFor="form-action-select">Hành động</label>
                          <select 
                            id="form-action-select"
                            value={formAction} 
                            onChange={(e) => setFormAction(e.target.value)}
                          >
                            {formAsset === "Savings" ? (
                              <>
                                <option value="Deposit">Gửi thêm (Deposit)</option>
                                <option value="Withdraw">Rút tiền (Withdraw)</option>
                              </>
                            ) : (
                              <>
                                <option value="Buy">Mua vào (Buy)</option>
                                <option value="Sell">Bán ra (Sell)</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="form-quantity-input">
                            {formAsset === "Savings" ? "Số tiền nạp/rút (VND)" : "Số lượng giao dịch (lượng/CCQ)"}
                          </label>
                          <input 
                            id="form-quantity-input"
                            type="number" 
                            step="any"
                            required
                            placeholder={formAsset === "Savings" ? "Ví dụ: 10000000" : "Ví dụ: 2.5"} 
                            value={formQty}
                            onChange={(e) => setFormQty(e.target.value)}
                          />
                        </div>

                        {formAsset !== "Savings" && (
                          <div className="form-group">
                            <label htmlFor="form-price-input">Giá thị trường lúc giao dịch (đ/đơn vị)</label>
                            <input 
                              id="form-price-input"
                              type="number" 
                              step="any"
                              placeholder={latestPrices[formAsset] !== undefined ? `Giá hiện tại: ${latestPrices[formAsset].toLocaleString("vi-VN")}đ` : "Nhập giá giao dịch..."}
                              value={formPrice}
                              onChange={(e) => setFormPrice(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      {formAsset !== "Savings" && (
                        <div className="form-grid" style={{ marginTop: "0.5rem" }}>
                          <div className="form-group">
                            <label htmlFor="form-fee-input">Phí giao dịch (VND) - mặc định 0.15%</label>
                            <input 
                              id="form-fee-input"
                              type="number" 
                              step="any"
                              placeholder="Phí giao dịch..."
                              value={formFee}
                              onChange={(e) => setFormFee(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="form-tax-input">Thuế bán (VND) - mặc định 0.1% (khi Bán)</label>
                            <input 
                              id="form-tax-input"
                              type="number" 
                              step="any"
                              placeholder="Thuế giao dịch..."
                              value={formTax}
                              disabled={formAction !== "Sell"}
                              onChange={(e) => setFormTax(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="form-group" style={{ marginBottom: "1rem", marginTop: "0.5rem" }}>
                        <label htmlFor="form-date-input">Ngày giao dịch</label>
                        <input 
                          id="form-date-input"
                          type="date" 
                          required
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary btn-full">
                        Lưu giao dịch & Cập nhật
                      </button>
                    </form>
                  </div>

                  {/* Transaction History Card */}
                  <div className="card transaction-history-card">
                    <h2>Lịch sử giao dịch</h2>
                    {transactions.length === 0 ? (
                      <div className="empty-state">Chưa có giao dịch nào được ghi nhận.</div>
                    ) : (
                      <div className="transaction-list-container">
                        <table className="transaction-table">
                          <thead>
                            <tr>
                              <th>Ngày</th>
                              <th>Tài sản</th>
                              <th>Hành động</th>
                              <th className="num-col">Số lượng</th>
                              <th className="num-col">Giá</th>
                              <th>Phí / Thuế</th>
                              <th style={{ width: "60px", textAlign: "center" }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((tx) => (
                              <tr key={tx.id}>
                                <td>{tx.date}</td>
                                <td>{getAssetDisplayName(tx.asset)}</td>
                                <td>
                                  <span className={`tx-action-badge ${(tx.action_type === 'Buy' || tx.action_type === 'Deposit') ? 'buy' : 'sell'}`}>
                                    {tx.action_type === 'Deposit' ? 'Nạp tiền' :
                                     tx.action_type === 'Withdraw' ? 'Rút tiền' :
                                     tx.action_type === 'Buy' ? 'Mua vào' : 'Bán ra'}
                                  </span>
                                </td>
                                <td className="num-col">
                                  {tx.asset === 'Savings' ? formatVND(tx.quantity) : tx.quantity.toLocaleString('vi-VN')}
                                </td>
                                <td className="num-col">
                                  {tx.asset === 'Savings' ? '—' : formatVND(tx.price)}
                                </td>
                                <td>
                                  {tx.asset === 'Savings' ? '—' : (
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                      {tx.fee ? `Phí: ${formatVND(tx.fee)}` : ""}
                                      {tx.tax ? ` | Thuế: ${formatVND(tx.tax)}` : ""}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    className="btn-danger btn-xs"
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                  >
                                    Xóa
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Split Column: Solver allocations, recommendations, AI advisor */}
                <div className="content-column">
                  
                  {/* Risk Appetite & Optimal Portfolio */}
                  <div className="card">
                    <h2>Đề xuất phân bổ tài sản tối ưu</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      Điều chỉnh hệ số ngại rủi ro λ để solver Clarabel (Rust) tính toán lại tỷ trọng tối ưu hóa Sharpe Ratio.
                    </p>

                    {/* Slider lambda */}
                    <div className="slider-container">
                      <div className="slider-header">
                        <span className="slider-title">Hệ số ngại rủi ro (Risk Aversion λ)</span>
                        <span className="slider-value">{lambda.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="10.0" 
                        step="0.5" 
                        value={lambda}
                        onChange={(e) => setLambda(parseFloat(e.target.value))}
                      />
                      <div className="slider-labels">
                        <span>Liều lĩnh (Max Sharpe)</span>
                        <span>An toàn (Min Volatility)</span>
                      </div>
                    </div>

                    {/* Optimal Allocation Results */}
                    {optimalResult && (
                      <div style={{ marginTop: "1rem" }}>
                        <h3 style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                          Tỷ trọng tối ưu đề xuất (λ = {lambda.toFixed(1)})
                        </h3>
                        
                        {portfolioWithValues.map((item) => {
                          if (item.asset_type === "Static") return null;
                          const optWeight = (optimalResult.weights[item.asset] || 0.0) * 100;
                          return (
                            <div key={item.asset} className="allocation-bar-wrapper">
                              <div className="allocation-bar-info">
                                <span className="asset-badge">
                                  <span className={`asset-dot ${item.asset.toLowerCase()}`}></span>
                                  <strong>{item.nameVi}</strong>
                                </span>
                                <span style={{ marginLeft: "auto", fontWeight: "700" }} className="num-col">{optWeight.toFixed(1)}%</span>
                              </div>
                              {/* Progress Bar */}
                              <div className="allocation-bar-bg">
                                <div 
                                  className="allocation-bar-fill"
                                  style={{ 
                                    width: `${optWeight}%`, 
                                    backgroundColor: item.color
                                  }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem", padding: "0.75rem", backgroundColor: "var(--bg-main)", border: "1px solid var(--border)" }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Lợi nhuận kỳ vọng</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-success)", marginTop: "2px", fontFamily: "JetBrains Mono" }}>
                              {(optimalResult.expected_return * 100).toFixed(2)}% / năm
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Rủi ro dao động</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-error)", marginTop: "2px", fontFamily: "JetBrains Mono" }}>
                              {(optimalResult.volatility * 100).toFixed(2)}% / năm
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rebalancing Suggestion Card */}
                  <div className="card">
                    <h2>Đề xuất giao dịch tái cơ cấu</h2>

                    {suggestions.length === 0 ? (
                      <div className="empty-state">
                        Danh mục hiện tại đã đạt trạng thái cân bằng tối ưu (độ lệch dưới 5%). Không cần giao dịch tái cơ cấu nào.
                      </div>
                    ) : (
                      <div className="suggestion-list">
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                          Thực hiện các lệnh giao dịch sau để tối đa hóa Sharpe Ratio:
                        </p>
                        
                        {suggestions.map((sug) => (
                          <div key={sug.asset} className="suggestion-item">
                            <div className="suggestion-details">
                              <span className="suggestion-action">{sug.action}</span>
                              <span className="suggestion-reason">
                                Lệch {sug.deviation > 0 ? `+${sug.deviation}%` : `${sug.deviation}%`} so với tối ưu
                              </span>
                            </div>
                            <span className={`suggestion-badge ${sug.isBuy ? 'buy' : 'sell'}`}>
                              {sug.isBuy ? "MUA VÀO" : "BÁN RA"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Warnings */}
                    {hasWithdrawalWarning && (
                      <div className="alert alert-warning">
                        <span className="alert-title">⚠️ Cảnh báo rút tiết kiệm trước hạn</span>
                        <span className="alert-content">
                          Đề xuất yêu cầu giảm số dư Tiết kiệm. Việc rút trước hạn tại Việt Nam sẽ chịu phạt lãi suất (bị đưa về mức không kỳ hạn ~0.1%/năm). Hãy cân nhắc chờ sổ tiết kiệm đáo hạn hoặc sử dụng các nguồn vốn nhàn rỗi khác.
                        </span>
                      </div>
                    )}

                    {hasGoldWarning && (
                      <div className="alert alert-warning">
                        <span className="alert-title">⚠️ Cảnh báo thanh khoản SJC Gold</span>
                        <span className="alert-content">
                          Vàng SJC tại Việt Nam chịu sự quản lý chặt chẽ. Chênh lệch mua-bán lớn (2M - 4M VND) có thể làm giảm hiệu quả tái cân bằng ngắn hạn. Đề xuất này thích hợp cho chiến lược tích lũy dài hạn.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Strategic Advisor Tab */}
                  <div className="card">
                    <h2>🤖 Cố vấn Chiến lược AI (Gemini Advisor)</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      Tích hợp danh mục hiện tại, các chỉ số kinh tế vĩ mô chính sách ở Việt Nam và kết quả solver để phân tích chiến lược tài sản toàn diện.
                    </p>

                    {advisorLoading ? (
                      <div style={{ textAlign: "center", padding: "1.5rem" }}>
                        <span className="spinner" style={{ width: "24px", height: "24px" }}></span>
                        <p style={{ marginTop: "0.5rem" }}>Gemini đang sinh báo cáo phân tích...</p>
                      </div>
                    ) : advisorText ? (
                      <div className="advisor-report-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="advisor-report-window">{advisorText}</div>
                        <button className="btn btn-secondary btn-small" style={{ width: "auto", alignSelf: "flex-start" }} onClick={handleGenerateAdvice}>🔄 Tạo lại tư vấn</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary btn-full" onClick={handleGenerateAdvice}>
                        💡 Nhận Cố vấn Chiến lược AI
                      </button>
                    )}
                  </div>

                </div>

              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
