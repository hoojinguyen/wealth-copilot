import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const ASSET_COLORS = {
  Savings: "#4f46e5",
  Gold: "#f59e0b",
  VN30: "#06b6d4",
  Diamond: "#ec4899"
};

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

function App() {
  // App State
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
  const [formAsset, setFormAsset] = useState("Savings");
  const [formAction, setFormAction] = useState("Deposit");
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  // Backup States
  const [showBackupDrawer, setShowBackupDrawer] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [importText, setImportText] = useState("");

  // Load state on startup
  useEffect(() => {
    loadPortfolioData();
  }, []);

  // Re-run rebalancer when lambda or portfolio/prices change
  useEffect(() => {
    if (portfolio.length > 0 && prices.length > 0) {
      calculateRebalancing();
    }
  }, [lambda, portfolio, prices]);

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
      setErrorMsg(`Lỗi tối ưu hóa danh mục: ${err}`);
    }
  }

  async function handleAddTransaction(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const qty = parseFloat(formQty);
    let price = parseFloat(formPrice);

    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Số lượng giao dịch phải lớn hơn 0");
      return;
    }

    // For Savings, price is always 1.0 (cash quantity)
    if (formAsset === "Savings") {
      price = 1.0;
    } else if (isNaN(price) || price <= 0) {
      setErrorMsg("Giá giao dịch phải lớn hơn 0");
      return;
    }

    try {
      const log = {
        id: null,
        asset: formAsset,
        action_type: formAction,
        quantity: qty,
        price: price,
        date: formDate
      };
      
      await invoke("save_transaction", { log });
      setSuccessMsg("Đã ghi nhận giao dịch thành công!");
      
      // Reset form quantity
      setFormQty("");
      setFormPrice("");
      
      // Reload database state
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(String(err));
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

  // Calculate prices map
  const latestPrices = {
    Savings: 1.0,
    Gold: 83000000.0,
    VN30: 21500.0,
    Diamond: 28500.0
  };
  prices.forEach(p => {
    latestPrices[p.asset] = p.price;
  });

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
      nameVi: ASSET_NAMES_VI[item.asset] || item.asset,
      price: latestPrices[item.asset],
      value,
      color: ASSET_COLORS[item.asset] || "#cccccc"
    };
  });

  const totalPortfolioValue = portfolioWithValues.reduce((sum, item) => sum + item.value, 0);

  // Generate rebalancing suggestions
  const suggestions = [];
  let hasWithdrawalWarning = false;
  let hasGoldWarning = false;

  if (totalPortfolioValue > 0 && optimalResult) {
    portfolioWithValues.forEach((item, index) => {
      const currentWeight = item.value / totalPortfolioValue;
      const optimalWeight = optimalResult.weights[item.asset] || 0.0;
      const diffWeight = optimalWeight - currentWeight;
      
      // Suggest trade if deviation is >= 5%
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
            actionDescription = `Mua thêm ${qtyDiff.toFixed(2)} ${unit} ${ASSET_NAMES_VI[item.asset]} (khoảng ${formatVND(diffValue)})`;
          } else {
            actionDescription = `Bán bớt ${qtyDiff.toFixed(2)} ${unit} ${ASSET_NAMES_VI[item.asset]} (khoảng ${formatVND(Math.abs(diffValue))})`;
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
  const circumference = 2 * Math.PI * radius; // ~345.57

  return (
    <div className="app-container">
      <header>
        <div className="brand-section">
          <h1>eager-bell</h1>
          <p>Cố Vấn Phân Bổ & Tái Cơ Cấu Tài Sản Cá Nhân Thông Minh (Việt Nam)</p>
        </div>
        <div className="header-actions">
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

      {/* Backup Drawer */}
      {showBackupDrawer && (
        <div className="backup-drawer card" style={{ marginBottom: "1.5rem" }}>
          <h3>Quản lý sao lưu dữ liệu</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
            <div>
              <label>Dữ liệu sao lưu hiện tại (JSON)</label>
              <textarea 
                className="backup-textarea" 
                readOnly 
                value={backupText} 
                placeholder="Click 'Xuất sao lưu' để tạo mã backup..."
              />
              <button className="btn-secondary btn-small" onClick={handleExportBackup}>
                Xuất sao lưu & Sao chép
              </button>
            </div>
            <div>
              <label>Dán dữ liệu sao lưu để khôi phục</label>
              <textarea 
                className="backup-textarea" 
                value={importText} 
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Dán nội dung JSON sao lưu vào đây..."
              />
              <button className="btn-primary btn-small" onClick={handleImportBackup}>
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
        <div className="dashboard-grid">
          {/* LEFT COLUMN: Current Portfolio & Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
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
                        stroke="#222436"
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
                              strokeLinecap={percentage > 0.03 ? "round" : "butt"}
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
                      <span className="legend-label">{item.nameVi}</span>
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
                    <th>Số lượng</th>
                    <th>Giá trị thị trường</th>
                    <th>Tỷ trọng</th>
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
                        {item.asset === "Savings" 
                          ? formatVND(item.quantity)
                          : `${item.quantity.toLocaleString("vi-VN")} ${item.asset === "Gold" ? "lượng" : "CCQ"}`}
                      </td>
                      <td>{formatVND(item.value)}</td>
                      <td>
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
                    <label>Loại tài sản</label>
                    <select 
                      value={formAsset} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormAsset(val);
                        // Auto adjust action type based on asset
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
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Hành động</label>
                    <select 
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
                    <label>
                      {formAsset === "Savings" ? "Số tiền nạp/rút (VND)" : "Số lượng giao dịch (lượng/CCQ)"}
                    </label>
                    <input 
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
                      <label>Giá thị trường lúc giao dịch (đ/lượng hoặc đ/CCQ)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder={`Giá hiện tại: ${latestPrices[formAsset].toLocaleString("vi-VN")}đ`}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label>Ngày giao dịch</label>
                  <input 
                    type="date" 
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary btn-full">
                  Lưu giao dịch & Cập nhật
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Rebalancer Adviser */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Risk Appetite & Optimal Portfolio */}
            <div className="card">
              <h2>Đề xuất phân bổ tài sản thông minh</h2>
              
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Kéo thanh trượt để điều chỉnh khẩu vị rủi ro. Ứng dụng sẽ tính toán lại tỷ trọng tối ưu hóa Sharpe Ratio (Markowitz QP) bằng động cơ solver Clarabel trong Rust.
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
                  <span>Liều lĩnh (Lợi nhuận cao)</span>
                  <span>An toàn (Lợi nhuận ổn định)</span>
                </div>
              </div>

              {/* Optimal Allocation Results */}
              {optimalResult && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                    Tỷ trọng tối ưu đề xuất (λ = {lambda.toFixed(1)})
                  </h3>
                  
                  {portfolioWithValues.map((item, index) => {
                    const optWeight = (optimalResult.weights[item.asset] || 0.0) * 100;
                    return (
                      <div key={item.asset} style={{ margin: "0.75rem 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className={`asset-dot ${item.asset.toLowerCase()}`}></span>
                            <strong>{item.nameVi}</strong>
                          </span>
                          <span style={{ marginLeft: "auto", fontWeight: "700" }}>{optWeight.toFixed(1)}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: "100%", height: "8px", backgroundColor: "#232430", borderRadius: "4px", overflow: "hidden" }}>
                          <div 
                            style={{ 
                              width: `${optWeight}%`, 
                              height: "100%", 
                              backgroundColor: item.color,
                              transition: "width 0.4s ease"
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.25rem", padding: "0.75rem", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Lợi nhuận kỳ vọng danh mục</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-success)", marginTop: "2px" }}>
                        {(optimalResult.expected_return * 100).toFixed(2)}% / năm
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Rủi ro dao động (Volatility)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-error)", marginTop: "2px" }}>
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
                  Danh mục hiện tại đã đạt trạng thái cân bằng tối ưu (độ lệch các tài sản đều dưới 5%). Không cần thực hiện giao dịch tái cơ cấu nào.
                </div>
              ) : (
                <div className="suggestion-list">
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    Cần thực hiện các giao dịch sau để giảm thiểu rủi ro và tối đa hóa Sharpe Ratio:
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
                    Đề xuất trên yêu cầu giảm số dư Tiết kiệm. Việc rút trước hạn tại Việt Nam sẽ chịu phạt lãi suất (bị đưa về mức không kỳ hạn ~0.1%/năm). Hãy cân nhắc chờ sổ tiết kiệm đáo hạn hoặc sử dụng các nguồn vốn nhàn rỗi khác.
                  </span>
                </div>
              )}

              {hasGoldWarning && (
                <div className="alert alert-warning">
                  <span className="alert-title">⚠️ Cảnh báo thanh khoản SJC Gold</span>
                  <span className="alert-content">
                    Vàng SJC tại Việt Nam chịu sự quản lý chặt chẽ. Chênh lệch mua-bán lớn (thường 2M - 4M VND/lượng) có thể làm giảm hiệu quả tái cân bằng ngắn hạn. Đề xuất này thích hợp cho chiến lược tích lũy dài hạn.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
