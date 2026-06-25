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

  if (!prices) {
    prices = JSON.stringify(defaultSeedData);
    localStorage.setItem("eb_prices", prices);
  }
  if (!portfolio) {
    portfolio = JSON.stringify([
      { asset: "Savings", quantity: 100000000.0 },
      { asset: "Gold", quantity: 2.0 },
      { asset: "VN30", quantity: 1000.0 },
      { asset: "Diamond", quantity: 1500.0 }
    ]);
    localStorage.setItem("eb_portfolio", portfolio);
  }
  if (!transactions) {
    transactions = JSON.stringify([
      { id: 1, asset: "Savings", action_type: "Deposit", quantity: 100000000.0, price: 1.0, date: "2026-06-15" },
      { id: 2, asset: "Gold", action_type: "Buy", quantity: 2.0, price: 82000000.0, date: "2026-06-15" },
      { id: 3, asset: "VN30", action_type: "Buy", quantity: 1000.0, price: 21000.0, date: "2026-06-15" },
      { id: 4, asset: "Diamond", action_type: "Buy", quantity: 1500.0, price: 28000.0, date: "2026-06-15" }
    ]);
    localStorage.setItem("eb_transactions", transactions);
  }

  return {
    prices: JSON.parse(prices),
    portfolio: JSON.parse(portfolio),
    transactions: JSON.parse(transactions)
  };
}

async function browserMockInvoke(cmd, args) {
  // Simulate native IPC latency
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const data = getBrowserData();

  if (cmd === "get_portfolio") {
    return data;
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
    const newTx = { ...log, id: newId };

    const updatedTransactions = [newTx, ...data.transactions];
    localStorage.setItem("eb_transactions", JSON.stringify(updatedTransactions));

    // Update portfolio quantity
    const updatedPortfolio = data.portfolio.map(item => {
      if (item.asset === log.asset) {
        let q = item.quantity;
        if (log.action_type === "Deposit" || log.action_type === "Buy") {
          q += log.quantity;
        } else if (log.action_type === "Withdraw" || log.action_type === "Sell") {
          q -= log.quantity;
        }
        return { ...item, quantity: q };
      }
      return item;
    });
    localStorage.setItem("eb_portfolio", JSON.stringify(updatedPortfolio));
    return;
  }

  if (cmd === "run_rebalancer") {
    const { lambda } = args;
    if (lambda <= 0 || !isFinite(lambda)) {
      throw new Error("Risk aversion lambda must be a positive finite number");
    }
    const { covMatrix, expectedReturns } = calculateCovarianceAndReturns(data.prices);
    return solveQP(covMatrix, expectedReturns, lambda);
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
    } catch (e) {
      throw new Error("Lỗi phân tích cú pháp JSON hoặc định dạng bản sao lưu không hợp lệ: " + e.message);
    }
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

function calculateCovarianceAndReturns(prices) {
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

  const assets = ["Savings", "Gold", "VN30", "Diamond"];
  const numAssets = assets.length;
  const numDates = dates.length;

  const priceMatrix = [];
  for (let t = 0; t < numDates; t++) {
    const dayPrices = dateMap[dates[t]];
    const row = [];
    for (let i = 0; i < numAssets; i++) {
      const price = dayPrices[assets[i]];
      if (price === undefined) {
        throw new Error(`Missing price for ${assets[i]} on date ${dates[t]}`);
      }
      row.push(price);
    }
    priceMatrix.push(row);
  }

  const numReturns = numDates - 1;
  const returnMatrix = [];
  for (let t = 0; t < numReturns; t++) {
    const row = [];
    const rateT = priceMatrix[t + 1][0];
    row.push(rateT / 250.0);

    for (let i = 1; i < numAssets; i++) {
      const pPrev = priceMatrix[t][i];
      const pCurr = priceMatrix[t + 1][i];
      row.push((pCurr - pPrev) / pPrev);
    }
    returnMatrix.push(row);
  }

  const expectedReturns = [];
  expectedReturns.push(priceMatrix[numDates - 1][0]);
  for (let i = 1; i < numAssets; i++) {
    let sum = 0;
    for (let t = 0; t < numReturns; t++) {
      sum += returnMatrix[t][i];
    }
    expectedReturns.push((sum / numReturns) * 250.0);
  }

  const colMeans = [];
  colMeans.push(expectedReturns[0] / 250.0);
  for (let i = 1; i < numAssets; i++) {
    let sum = 0;
    for (let t = 0; t < numReturns; t++) {
      sum += returnMatrix[t][i];
    }
    colMeans.push(sum / numReturns);
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

function solveQP(cov, R, lambda) {
  const assets = ["Savings", "Gold", "VN30", "Diamond"];
  const n = assets.length;

  let bestWeights = null;
  let bestVal = Infinity;

  const step = 0.01;
  const numSteps = 100;

  for (let i0 = 0; i0 <= numSteps; i0++) {
    const w0 = i0 / numSteps;
    for (let i1 = 0; i1 <= numSteps - i0; i1++) {
      const w1 = i1 / numSteps;
      for (let i2 = 0; i2 <= numSteps - i0 - i1; i2++) {
        const w2 = i2 / numSteps;
        const w3 = 1.0 - w0 - w1 - w2;

        const w = [w0, w1, w2, w3];

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
