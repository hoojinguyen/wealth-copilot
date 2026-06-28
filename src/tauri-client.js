const isTauri = typeof window !== "undefined" && (window.__TAURI_INTERNALS__ !== undefined || window.__TAURI__ !== undefined);

export async function invoke(cmd, args) {
  if (isTauri) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke(cmd, args);
  } else {
    return browserMockInvoke(cmd, args);
  }
}

// ==========================================
// Browser Fallback (Mock Database & Solver)
// ==========================================

const defaultSeedData = [
  {"date": "2026-06-15", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-15", "asset": "Gold", "price": 82000000.0},
  {"date": "2026-06-15", "asset": "VN30", "price": 21000.0},
  {"date": "2026-06-15", "asset": "Diamond", "price": 28000.0},

  {"date": "2026-06-16", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-16", "asset": "Gold", "price": 82200000.0},
  {"date": "2026-06-16", "asset": "VN30", "price": 21100.0},
  {"date": "2026-06-16", "asset": "Diamond", "price": 28150.0},

  {"date": "2026-06-17", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-17", "asset": "Gold", "price": 82100000.0},
  {"date": "2026-06-17", "asset": "VN30", "price": 20950.0},
  {"date": "2026-06-17", "asset": "Diamond", "price": 27900.0},

  {"date": "2026-06-18", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-18", "asset": "Gold", "price": 82300000.0},
  {"date": "2026-06-18", "asset": "VN30", "price": 21050.0},
  {"date": "2026-06-18", "asset": "Diamond", "price": 28000.0},

  {"date": "2026-06-19", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-19", "asset": "Gold", "price": 82500000.0},
  {"date": "2026-06-19", "asset": "VN30", "price": 21300.0},
  {"date": "2026-06-19", "asset": "Diamond", "price": 28300.0},

  {"date": "2026-06-20", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-20", "asset": "Gold", "price": 82400000.0},
  {"date": "2026-06-20", "asset": "VN30", "price": 21200.0},
  {"date": "2026-06-20", "asset": "Diamond", "price": 28200.0},

  {"date": "2026-06-21", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-21", "asset": "Gold", "price": 82600000.0},
  {"date": "2026-06-21", "asset": "VN30", "price": 21400.0},
  {"date": "2026-06-21", "asset": "Diamond", "price": 28400.0},

  {"date": "2026-06-22", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-22", "asset": "Gold", "price": 82700000.0},
  {"date": "2026-06-22", "asset": "VN30", "price": 21500.0},
  {"date": "2026-06-22", "asset": "Diamond", "price": 28600.0},

  {"date": "2026-06-23", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-23", "asset": "Gold", "price": 82500000.0},
  {"date": "2026-06-23", "asset": "VN30", "price": 21350.0},
  {"date": "2026-06-23", "asset": "Diamond", "price": 28450.0},

  {"date": "2026-06-24", "asset": "Savings", "price": 0.055},
  {"date": "2026-06-24", "asset": "Gold", "price": 82800000.0},
  {"date": "2026-06-24", "asset": "VN30", "price": 21600.0},
  {"date": "2026-06-24", "asset": "Diamond", "price": 28700.0}
];

function getBrowserData() {
  let prices = localStorage.getItem("eb_prices");
  let portfolio = localStorage.getItem("eb_portfolio");
  let transactions = localStorage.getItem("eb_transactions");
  let settings = localStorage.getItem("eb_settings");
  let macros = localStorage.getItem("eb_macro_indicators");

  if (!prices) {
    prices = JSON.stringify(defaultSeedData);
    localStorage.setItem("eb_prices", prices);
  }
  if (!portfolio) {
    portfolio = JSON.stringify([
      { asset: "Savings", quantity: 100000000.0, asset_type: "Liquid", purchase_price: 1.0, realized_pnl: 0.0 },
      { asset: "Gold", quantity: 2.0, asset_type: "Liquid", purchase_price: 82000000.0, realized_pnl: 0.0 },
      { asset: "VN30", quantity: 1000.0, asset_type: "Liquid", purchase_price: 21000.0, realized_pnl: 0.0 },
      { asset: "Diamond", quantity: 1500.0, asset_type: "Liquid", purchase_price: 28000.0, realized_pnl: 0.0 }
    ]);
    localStorage.setItem("eb_portfolio", portfolio);
  }
  if (!transactions) {
    transactions = JSON.stringify([
      { id: 1, asset: "Savings", action_type: "Deposit", quantity: 100000000.0, price: 1.0, date: "2026-06-15", fee: 0.0, tax: 0.0 },
      { id: 2, asset: "Gold", action_type: "Buy", quantity: 2.0, price: 82000000.0, date: "2026-06-15", fee: 0.0, tax: 0.0 },
      { id: 3, asset: "VN30", action_type: "Buy", quantity: 1000.0, price: 21000.0, date: "2026-06-15", fee: 0.0, tax: 0.0 },
      { id: 4, asset: "Diamond", action_type: "Buy", quantity: 1500.0, price: 28000.0, date: "2026-06-15", fee: 0.0, tax: 0.0 }
    ]);
    localStorage.setItem("eb_transactions", transactions);
  }
  if (!settings) {
    settings = JSON.stringify({ gemini_api_key: "", proxy_url: "" });
    localStorage.setItem("eb_settings", settings);
  }
  if (!macros) {
    macros = JSON.stringify([
      { key: "Savings Interest Rate 12M", value: 0.055, description: "Average 12-month deposit rate of Big4 banks", updated_at: "2026-06-25" },
      { key: "USD/VND Exchange Rate", value: 25450.0, description: "State Bank of Vietnam USD/VND central rate", updated_at: "2026-06-25" },
      { key: "VN-Index", value: 1280.5, description: "Vietnam HOSE stock index", updated_at: "2026-06-25" },
      { key: "CPI Inflation", value: 0.042, description: "Annual CPI inflation rate", updated_at: "2026-06-25" }
    ]);
    localStorage.setItem("eb_macro_indicators", macros);
  }

  return {
    prices: JSON.parse(prices),
    portfolio: JSON.parse(portfolio),
    transactions: JSON.parse(transactions),
    settings: JSON.parse(settings),
    macros: JSON.parse(macros)
  };
}

function recalculateLocalPortfolio(transactions, existingPortfolio) {
  const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || (a.id || 0) - (b.id || 0));
  const assetsWithLogs = new Set(transactions.map(t => t.asset));
  const states = {};

  // Copy preserved items into states. If they have logs, reset figures. Otherwise preserve them exactly.
  existingPortfolio.forEach(item => {
    if (assetsWithLogs.has(item.asset)) {
      states[item.asset] = {
        asset: item.asset,
        quantity: 0.0,
        asset_type: item.asset_type || "Liquid",
        purchase_price: 0.0,
        realized_pnl: 0.0
      };
    } else {
      states[item.asset] = {
        asset: item.asset,
        quantity: item.quantity || 0.0,
        asset_type: item.asset_type || "Liquid",
        purchase_price: item.purchase_price || 0.0,
        realized_pnl: item.realized_pnl || 0.0
      };
    }
  });

  // Ensure defaults are initialized
  const defaults = ["Savings", "Gold", "VN30", "Diamond"];
  defaults.forEach(d => {
    if (!states[d]) {
      states[d] = { asset: d, quantity: 0.0, asset_type: "Liquid", purchase_price: 0.0, realized_pnl: 0.0 };
    }
  });

  // Run chronological recalculation
  sortedTxs.forEach(tx => {
    if (!states[tx.asset]) {
      const isStatic = tx.asset.toLowerCase().includes("bất động sản") || 
                     tx.asset.toLowerCase().includes("nhà đất") || 
                     tx.asset.toLowerCase().includes("đất") || 
                     tx.asset.toLowerCase().includes("static") ||
                     tx.asset.toLowerCase().includes("property") ||
                     tx.asset.toLowerCase().includes("real estate") ||
                     tx.asset.toLowerCase().includes("land");
      states[tx.asset] = {
        asset: tx.asset,
        quantity: 0.0,
        asset_type: isStatic ? "Static" : "Liquid",
        purchase_price: 0.0,
        realized_pnl: 0.0
      };
    }
    
    const state = states[tx.asset];
    const fee = tx.fee || 0.0;
    const tax = tx.tax || 0.0;

    if (tx.action_type === "Buy" || tx.action_type === "Deposit") {
      const oldQty = state.quantity;
      const oldCost = state.purchase_price;
      state.quantity += tx.quantity;
      if (state.quantity > 0.0) {
        if (tx.asset === "Savings") {
          state.purchase_price = 1.0;
        } else {
          state.purchase_price = ((oldQty * oldCost) + (tx.quantity * tx.price) + fee) / state.quantity;
        }
      } else {
        state.purchase_price = 0.0;
      }
    } else if (tx.action_type === "Sell" || tx.action_type === "Withdraw") {
      const oldQty = state.quantity;
      const oldCost = state.purchase_price;
      const soldQty = Math.min(tx.quantity, oldQty);
      state.quantity = Math.max(0.0, oldQty - tx.quantity);
      
      if (tx.asset !== "Savings" && oldQty > 0.0) {
        const pnl = soldQty * (tx.price - oldCost) - fee - tax;
        state.realized_pnl += pnl;
      }
      if (state.quantity === 0.0) {
        state.purchase_price = 0.0;
      }
    }
  });

  return Object.values(states);
}

async function browserMockInvoke(cmd, args) {
  // Simulate native IPC latency
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const data = getBrowserData();

  if (cmd === "get_portfolio") {
    return {
      portfolio: data.portfolio,
      prices: data.prices,
      transactions: data.transactions
    };
  }

  if (cmd === "get_user_settings") {
    return data.settings;
  }

  if (cmd === "save_user_settings") {
    const { api_key, proxy_url, apiKey, proxyUrl } = args;
    const finalKey = api_key !== undefined ? api_key : apiKey;
    const finalProxy = proxy_url !== undefined ? proxy_url : proxyUrl;
    localStorage.setItem("eb_settings", JSON.stringify({ gemini_api_key: finalKey, proxy_url: finalProxy }));
    return;
  }

  if (cmd === "get_macro_indicators") {
    return data.macros;
  }

  if (cmd === "save_transaction") {
    const { log } = args;
    if (log.quantity <= 0 || !isFinite(log.quantity)) {
      throw new Error("Quantity must be a positive finite number");
    }
    if (log.price <= 0 || !isFinite(log.price)) {
      throw new Error("Price must be a positive finite number");
    }
    if (!log.date || !log.date.trim()) {
      throw new Error("Transaction date is required");
    }

    const newId = data.transactions.length > 0 ? Math.max(...data.transactions.map(t => t.id || 0)) + 1 : 1;
    const newTx = {
      ...log,
      id: newId,
      fee: log.fee || 0.0,
      tax: log.tax || 0.0
    };

    const updatedTransactions = [newTx, ...data.transactions];
    localStorage.setItem("eb_transactions", JSON.stringify(updatedTransactions));

    const updatedPortfolio = recalculateLocalPortfolio(updatedTransactions, data.portfolio);
    localStorage.setItem("eb_portfolio", JSON.stringify(updatedPortfolio));
    return;
  }

  if (cmd === "delete_transaction") {
    const { id } = args;
    const deletedTx = data.transactions.find(t => t.id === id);
    const remainingTransactions = data.transactions.filter(t => t.id !== id);
    localStorage.setItem("eb_transactions", JSON.stringify(remainingTransactions));

    let portfolio = data.portfolio;
    if (deletedTx) {
      const assetHasLogs = remainingTransactions.some(t => t.asset === deletedTx.asset);
      if (!assetHasLogs) {
        portfolio = portfolio.filter(item => item.asset !== deletedTx.asset);
      }
    }

    const updatedPortfolio = recalculateLocalPortfolio(remainingTransactions, portfolio);
    localStorage.setItem("eb_portfolio", JSON.stringify(updatedPortfolio));
    return;
  }

  if (cmd === "import_draft_transactions") {
    const { items } = args;
    
    // Validate each draft item before importing
    for (const item of items) {
      if (!item.asset || !item.asset.trim()) {
        throw new Error("Asset symbol is required");
      }
      if (item.quantity <= 0 || !isFinite(item.quantity)) {
        throw new Error("Quantity must be a positive finite number");
      }
      if (item.purchase_price <= 0 || !isFinite(item.purchase_price)) {
        throw new Error("Price must be a positive finite number");
      }
      if (!item.date || !item.date.trim()) {
        throw new Error("Transaction date is required");
      }
    }

    let transactions = JSON.parse(localStorage.getItem("eb_transactions") || "[]");
    let nextId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id || 0)) + 1 : 1;

    for (const item of items) {
      transactions.unshift({
        id: nextId++,
        asset: item.asset,
        action_type: "Buy",
        quantity: item.quantity,
        price: item.purchase_price,
        date: item.date,
        fee: 0.0,
        tax: 0.0
      });
    }

    localStorage.setItem("eb_transactions", JSON.stringify(transactions));
    
    let portfolio = JSON.parse(localStorage.getItem("eb_portfolio") || "[]");
    const updatedPortfolio = recalculateLocalPortfolio(transactions, portfolio);
    localStorage.setItem("eb_portfolio", JSON.stringify(updatedPortfolio));
    return;
  }

  if (cmd === "fetch_historical_prices") {
    const { symbol } = args;
    const rawSymbol = symbol.trim().toUpperCase();
    let prices = JSON.parse(localStorage.getItem("eb_prices") || "[]");
    const existing = prices.filter(p => p.asset === rawSymbol);
    
    if (existing.length === 0) {
      const dates = [...new Set(prices.map(p => p.date))].sort();
      const mockRecords = dates.map((date, idx) => ({
        date,
        asset: rawSymbol,
        price: 22000.0 + idx * 100.0 + (Math.random() - 0.5) * 400
      }));
      prices = [...prices, ...mockRecords];
      localStorage.setItem("eb_prices", JSON.stringify(prices));
    }

    let portfolio = JSON.parse(localStorage.getItem("eb_portfolio") || "[]");
    if (!portfolio.find(p => p.asset === rawSymbol)) {
      portfolio.push({
        asset: rawSymbol,
        quantity: 0.0,
        asset_type: "Liquid",
        purchase_price: 0.0,
        realized_pnl: 0.0
      });
      localStorage.setItem("eb_portfolio", JSON.stringify(portfolio));
    }

    return prices.filter(p => p.asset === rawSymbol);
  }

  if (cmd === "parse_screenshot") {
    const mockParsed = [
      { asset: "HPG", quantity: 500.0, purchase_price: 28500.0 },
      { asset: "FUEVFVND", quantity: 1000.0, purchase_price: 24500.0 },
      { asset: "VCB", quantity: 200.0, purchase_price: 92000.0 }
    ];
    return JSON.stringify(mockParsed);
  }

  if (cmd === "generate_wealth_advice") {
    const { lang } = args || {};
    if (lang === "vi") {
      return "### Đề xuất Cố vấn Tài chính AI từ Gemini (Bản Thử Nghiệm)\n\n" +
        "Dựa trên cơ cấu tài sản hiện tại và các chỉ số kinh tế vĩ mô tại Việt Nam:\n\n" +
        "1. **Đánh giá danh mục:** Danh mục của bạn có tính đa dạng hóa tốt nhờ sự phân bổ giữa Tiết kiệm (an toàn) và cổ phiếu/vàng. Tuy nhiên, tỷ trọng tiền mặt hiện đang cao hơn mức cần thiết nếu xét theo khẩu vị rủi ro trung bình.\n" +
        "2. **Phân tích vĩ mô:** Trong bối cảnh lạm phát duy trì ổn định ở mức 3.8% và tỷ giá USD/VND ở mức 25,450, việc nắm giữ một phần vàng SJC và quỹ ETF VN30 là chiến lược phòng thủ và tăng trưởng hiệu quả.\n" +
        "3. **Tái phân bổ:** Khuyến nghị thực hiện theo gợi ý từ solver để chuyển bớt một phần tiền gửi tiết kiệm sang ETF VN30 và ETF Diamond khi chỉ số VN-Index điều chỉnh về vùng hỗ trợ. Việc này giúp cải thiện lợi nhuận kỳ vọng của danh mục dài hạn lên mức trên 12%/năm.";
    } else {
      return "### AI Wealth Advisor Proposal from Gemini (Mock Demo)\n\n" +
        "Based on your current asset structure and macroeconomic indicators in Vietnam:\n\n" +
        "1. **Portfolio Evaluation:** Your portfolio is well-diversified due to the allocation between Savings (safe) and stocks/gold. However, the cash/savings ratio is currently higher than necessary considering a moderate risk profile.\n" +
        "2. **Macro Analysis:** With inflation stable at 3.8% and the USD/VND exchange rate at 25,450, holding SJC Gold and VN30 ETF remains an effective defensive and growth strategy.\n" +
        "3. **Rebalancing:** We recommend shifting a portion of your Savings to VN30 and Diamond ETFs when the VN-Index consolidates near key support levels. This will improve the long-term expected return of your portfolio to over 12% annually.";
    }
  }

  if (cmd === "run_rebalancer") {
    const { lambda } = args;
    if (lambda <= 0 || !isFinite(lambda)) {
      throw new Error("Risk aversion lambda must be a positive finite number");
    }

    const liquidAssets = data.portfolio
      .filter(item => item.asset_type === "Liquid")
      .map(item => item.asset);

    if (liquidAssets.length === 0) {
      throw new Error("No liquid assets found to optimize");
    }

    const { covMatrix, expectedReturns } = calculateCovarianceAndReturns(data.prices, liquidAssets);
    return solveQP(covMatrix, expectedReturns, liquidAssets, lambda);
  }

  if (cmd === "sync_market_data") {
    const today = new Date().toISOString().split("T")[0];
    const prices = data.prices;

    const todayPrices = prices.filter(p => p.date === today);
    if (todayPrices.length === 0) {
      const latestDate = [...new Set(prices.map(p => p.date))].sort().pop();
      const latest = prices.filter(p => p.date === latestDate);

      const newRecords = latest.map(p => {
        let price = p.price;
        if (p.asset === "Gold") price += (Math.random() - 0.5) * 500000;
        else if (p.asset === "VN30") price += (Math.random() - 0.5) * 200;
        else if (p.asset === "Diamond") price += (Math.random() - 0.5) * 250;
        return { date: today, asset: p.asset, price: parseFloat(price.toFixed(2)) };
      });

      const updatedPrices = [...prices, ...newRecords];
      localStorage.setItem("eb_prices", JSON.stringify(updatedPrices));
    }
    return;
  }

  if (cmd === "export_backup") {
    const backupObj = {
      version: 1,
      data: data
    };
    return JSON.stringify(backupObj, null, 2);
  }

  if (cmd === "import_backup") {
    const { backupJson } = args;
    try {
      const parsed = JSON.parse(backupJson);
      if (!parsed.version || !parsed.data || !parsed.data.portfolio || !parsed.data.prices || !parsed.data.transactions) {
        throw new Error("Invalid backup format");
      }
      localStorage.setItem("eb_portfolio", JSON.stringify(parsed.data.portfolio));
      localStorage.setItem("eb_prices", JSON.stringify(parsed.data.prices));
      localStorage.setItem("eb_transactions", JSON.stringify(parsed.data.transactions));
      if (parsed.data.settings) localStorage.setItem("eb_settings", JSON.stringify(parsed.data.settings));
      if (parsed.data.macros) localStorage.setItem("eb_macro_indicators", JSON.stringify(parsed.data.macros));
    } catch (e) {
      throw new Error("JSON parse error or invalid backup format: " + e.message);
    }
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

function calculateCovarianceAndReturns(prices, assets) {
  const dateMap = {};
  prices.forEach(p => {
    if (!dateMap[p.date]) {
      dateMap[p.date] = {};
    }
    dateMap[p.date][p.asset] = p.price;
  });

  const dates = Object.keys(dateMap).sort();
  if (dates.length < 3) {
    throw new Error("Require at least 3 dates of historical price records");
  }

  const numAssets = assets.length;
  const numDates = dates.length;

  const priceMatrix = [];
  
  // Verify price availability and apply Forward-Fill / Backward-Fill fallback
  for (let i = 0; i < numAssets; i++) {
    const asset = assets[i];
    let hasAnyPrice = false;
    for (let t = 0; t < numDates; t++) {
      if (dateMap[dates[t]][asset] !== undefined) {
        hasAnyPrice = true;
        break;
      }
    }
    if (!hasAnyPrice) {
      throw new Error(`No price history found for asset ${asset}`);
    }
  }

  for (let t = 0; t < numDates; t++) {
    const date = dates[t];
    const row = [];
    for (let i = 0; i < numAssets; i++) {
      const asset = assets[i];
      let price = dateMap[date][asset];
      
      if (price === undefined) {
        // Try forward-fill
        let foundPrev = null;
        for (let prevT = t - 1; prevT >= 0; prevT--) {
          if (dateMap[dates[prevT]][asset] !== undefined) {
            foundPrev = dateMap[dates[prevT]][asset];
            break;
          }
        }
        if (foundPrev !== null) {
          price = foundPrev;
        } else {
          // Backward-fill fallback
          let foundNext = null;
          for (let nextT = t + 1; nextT < numDates; nextT++) {
            if (dateMap[dates[nextT]][asset] !== undefined) {
              foundNext = dateMap[dates[nextT]][asset];
              break;
            }
          }
          price = foundNext;
        }
      }
      row.push(price);
    }
    priceMatrix.push(row);
  }

  const isSavingsAsset = (name) => name === "Savings" || name === "Tiết kiệm";

  const numReturns = numDates - 1;
  const returnMatrix = [];
  for (let t = 0; t < numReturns; t++) {
    const row = [];
    for (let i = 0; i < numAssets; i++) {
      const asset = assets[i];
      if (isSavingsAsset(asset)) {
        row.push(priceMatrix[t + 1][i] / 250.0);
      } else {
        const pPrev = priceMatrix[t][i];
        const pCurr = priceMatrix[t + 1][i];
        row.push((pCurr - pPrev) / pPrev);
      }
    }
    returnMatrix.push(row);
  }

  const expectedReturns = [];
  for (let i = 0; i < numAssets; i++) {
    const asset = assets[i];
    if (isSavingsAsset(asset)) {
      expectedReturns.push(priceMatrix[numDates - 1][i]);
    } else {
      let sum = 0;
      for (let t = 0; t < numReturns; t++) {
        sum += returnMatrix[t][i];
      }
      expectedReturns.push((sum / numReturns) * 250.0);
    }
  }

  const colMeans = [];
  for (let i = 0; i < numAssets; i++) {
    const asset = assets[i];
    if (isSavingsAsset(asset)) {
      colMeans.push(expectedReturns[i] / 250.0);
    } else {
      let sum = 0;
      for (let t = 0; t < numReturns; t++) {
        sum += returnMatrix[t][i];
      }
      colMeans.push(sum / numReturns);
    }
  }

  const covMatrix = [];
  for (let i = 0; i < numAssets; i++) {
    const row = [];
    for (let j = 0; j < numAssets; j++) {
      const meanI = colMeans[i];
      const meanJ = colMeans[j];

      let sum = 0;
      for (let t = 0; t < numReturns; t++) {
        sum += (returnMatrix[t][i] - meanI) * (returnMatrix[t][j] - meanJ);
      }
      const cov = sum / (numReturns - 1);
      let val = cov * 250.0;
      if (i === j) {
        val += 1e-6; // Regularization
      }
      row.push(val);
    }
    covMatrix.push(row);
  }

  return { covMatrix, expectedReturns };
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function solveQP(cov, R, assets, lambda) {
  const n = assets.length;

  let bestWeights = new Array(n).fill(1.0 / n);
  let bestVal = Infinity;

  // Use Mulberry32 seedable generator for deterministic optimization results
  const rng = mulberry32(42);

  // Run 10000 random samples to find the minimum of the quadratic objective
  for (let step = 0; step < 10000; step++) {
    const w = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const val = rng();
      w.push(val);
      sum += val;
    }
    for (let i = 0; i < n; i++) {
      w[i] /= sum;
    }

    let variance = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        variance += w[r] * cov[r][c] * w[c];
      }
    }

    let expectedReturn = 0;
    for (let r = 0; r < n; r++) {
      expectedReturn += w[r] * R[r];
    }

    const objVal = 0.5 * lambda * variance - expectedReturn;

    if (objVal < bestVal) {
      bestVal = objVal;
      bestWeights = [...w];
    }
  }

  let expectedReturn = 0;
  for (let r = 0; r < n; r++) {
    expectedReturn += bestWeights[r] * R[r];
  }

  let variance = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      variance += bestWeights[r] * cov[r][c] * bestWeights[c];
    }
  }
  const volatility = Math.sqrt(variance);

  const weightsMap = {};
  assets.forEach((asset, idx) => {
    weightsMap[asset] = bestWeights[idx];
  });

  return {
    weights: weightsMap,
    expected_return: expectedReturn,
    volatility: volatility
  };
}
