import { useState, useEffect, useMemo } from "react";
import { invoke } from "./tauri-client";
import "./App.css";

const TRANSLATIONS = {
  en: {
    title: "Wealth Copilot",
    subtitle: "Local-first Smart Asset Allocation & Rebalancing Advisor (Vietnam)",
    lightMode: "☀️ Light Mode",
    darkMode: "🌙 Dark Mode",
    apiSettings: "⚙️ API Settings",
    backupRestore: "Backup / Restore",
    syncMarketPrices: "Sync Market Prices",
    syncing: "Syncing...",
    syncWarningTitle: "⚠️ Market price data is not up to date",
    syncWarningContent: "Last market price sync was {date} ({days} days ago). Please click 'Sync Market Prices' to use the latest data.",
    systemError: "System Error",
    saveSettingsSuccess: "API Key & Proxy settings saved successfully!",
    saveSettingsError: "Error saving settings: {err}",
    syncSuccess: "Market price data synced successfully from GitHub!",
    backupExportSuccess: "Backup exported and copied to clipboard successfully!",
    backupImportSuccess: "Data restored from backup successfully!",
    deleteTxSuccess: "Transaction deleted successfully!",
    addTxSuccess: "Recorded transaction {asset} successfully!",
    qtyError: "Transaction quantity must be greater than 0",
    priceError: "Transaction price must be greater than 0",
    draftInvalidRows: "Draft table contains invalid rows. Please check ticker, quantity, and cost basis.",
    screenshotParsed: "Portfolio screenshot parsed! Please verify and edit in the Draft Panel below.",
    screenshotError: "Screenshot parsing error: {err}. Please configure Gemini API Key and ensure internet connectivity.",
    imageReadError: "Error reading image file",
    draftSavedSuccess: "Successfully imported all items from draft table into SQLite!",
    portfolioSavedError: "Error saving portfolio: {err}",
    aiAdvisorError: "Error generating AI report: {err}",
    pasteBackupPrompt: "Please paste JSON backup data to restore",
    deleteTxConfirm: "Are you sure you want to delete this transaction? Portfolio weights will be recalculated.",
    apiConfigTitle: "⚙️ Gemini API & Network Configuration",
    apiKeyLabel: "Gemini API Key (stored securely locally)",
    apiKeyPlaceholder: "Paste API Key from Google AI Studio...",
    proxyUrlLabel: "Custom Proxy / Endpoint (Optional for Vietnam)",
    proxyUrlPlaceholder: "E.g., http://localhost:7890 or Reverse Proxy Endpoint",
    saveConfigBtn: "Save Configuration",
    cancelBtn: "Cancel",
    backupTitle: "Data Backup Management",
    currentBackupLabel: "Current Backup Data (JSON)",
    exportBackupPlaceholder: "Click 'Export Backup' to generate backup data...",
    exportCopyBtn: "Export Backup & Copy",
    importBackupLabel: "Paste backup data to restore",
    importBackupPlaceholder: "Paste JSON backup content here...",
    restoreBtn: "Restore from Paste",
    welcomeTitle: "👋 Welcome to Wealth Copilot!",
    welcomeSubtitle: "Your local-first application for multi-asset management in Vietnam.",
    onboardingStep1: "Configure API Key: Click '⚙️ API Settings' at the top to save your personal Gemini API key.",
    onboardingStep2: "Auto-import Portfolio: Drag and drop or upload brokerage screenshots (like TCBS) to parse automatically.",
    onboardingStep3: "Manual Import & Fallback: Add any asset tickers manually, and adjust brokerage fees & taxes.",
    screenshotParserTitle: "📸 Screenshot Parser (OCR)",
    screenshotParserSubtitle: "Upload portfolio screenshot from TCBS or other brokers for automated ingestion.",
    screenshotZoneParsing: "Gemini Vision is parsing...",
    screenshotZoneIdle: "Drag & drop image here or click to upload",
    draftTitle: "📋 Draft Table",
    addRowBtn: "+ Add Row",
    colAsset: "Ticker",
    colQty: "Qty",
    colCostBasis: "Cost Basis",
    colActions: "Actions",
    deleteBtn: "Delete",
    saveBtn: "Save",
    totalValueLabel: "Total Portfolio Value",
    localFirstValuation: "Local-first Valuation",
    expectedReturnLabel: "Expected Return",
    perYear: "/ year",
    volatilityLabel: "Volatility",
    sharpeRatioLabel: "Sharpe Ratio",
    riskAdjustedReturnLabel: "Risk-adjusted Return",
    totalAssetsChartCenter: "Total Assets",
    legendStatic: "(Static)",
    liquidLabel: "Liquid",
    staticLabel: "Static/Locked",
    portfolioOverviewTitle: "Current Portfolio Overview",
    tableHeaderAsset: "Asset",
    tableHeaderType: "Type",
    tableHeaderQty: "Quantity",
    tableHeaderCostBasis: "Avg Cost Basis",
    tableHeaderTotalValue: "Total Value",
    tableHeaderWeight: "Weight",
    unitTael: "taels",
    unitShare: "shares",
    recordTxTitle: "Record Asset Transaction",
    formAssetClassLabel: "Asset Class",
    optionSavings: "Savings",
    optionGold: "SJC Gold",
    optionVN30: "VN30 ETF",
    optionDiamond: "Diamond ETF",
    optionCustom: "Other (Custom Ticker)...",
    formCustomTickerLabel: "Enter custom asset ticker",
    formCustomTickerPlaceholder: "E.g., HPG, TCB, VCB, VCG...",
    formActionLabel: "Action",
    optionDeposit: "Deposit",
    optionWithdraw: "Withdraw",
    optionBuy: "Buy",
    optionSell: "Sell",
    amountDepositWithdrawLabel: "Amount to deposit/withdraw (VND)",
    txQtyLabel: "Transaction quantity (taels/shares)",
    txPriceLabel: "Transaction price per unit (VND)",
    currentPriceLabel: "Current price: {price}đ",
    enterTxPricePlaceholder: "Enter transaction price...",
    feeLabel: "Transaction Fee (VND) - default 0.15%",
    taxLabel: "Selling Tax (VND) - default 0.1% (on Sell)",
    txDateLabel: "Transaction Date",
    saveTxBtn: "Save Transaction & Recalculate",
    historyTitle: "Transaction History",
    historyEmptyState: "No transactions recorded yet.",
    historyHeaderDate: "Date",
    historyHeaderAsset: "Asset",
    historyHeaderAction: "Action",
    historyHeaderQty: "Qty",
    historyHeaderPrice: "Price",
    historyHeaderFeeTax: "Fee / Tax",
    historyHeaderActions: "Action",
    historyFeeLabel: "Fee",
    historyTaxLabel: "Tax",
    historyActionDeposit: "Deposit",
    historyActionWithdraw: "Withdraw",
    historyActionBuy: "Buy",
    historyActionSell: "Sell",
    solverTitle: "Optimal Asset Allocation Suggestion",
    solverSubtitle: "Adjust risk aversion coefficient λ to recalculate optimal Sharpe ratio weights using Clarabel (Rust).",
    riskAversionLabel: "Risk Aversion Coefficient (λ)",
    riskAversionAggressive: "Aggressive (Max Sharpe)",
    riskAversionConservative: "Conservative (Min Volatility)",
    solverOptimalWeightsHeader: "Proposed Optimal Weights (λ = {lambda})",
    solverVolLabel: "Annual Volatility",
    solverRetLabel: "Expected return of optimal portfolio",
    rebalanceTitle: "Rebalancing Trade Suggestions",
    rebalanceEmptyState: "Portfolio is in optimal balance (deviations < 5%). No trades required.",
    rebalanceSubtitle: "Execute the following trades to optimize your Sharpe ratio:",
    deviationLabel: "Deviated {dev}% from target weight",
    badgeBuy: "BUY",
    badgeSell: "SELL",
    savingsWithdrawalWarningTitle: "⚠️ Pre-mature Savings Withdrawal Warning",
    savingsWithdrawalWarningContent: "The proposal suggests reducing Savings balance. In Vietnam, pre-mature bank withdrawals usually lose accrued interest (reverted to ~0.1% demand deposit rate). Consider waiting for maturity or using idle cash instead.",
    goldLiquidityWarningTitle: "⚠️ SJC Gold Liquidity Warning",
    goldLiquidityWarningContent: "SJC gold in Vietnam is heavily regulated. Large bid-ask spreads (2M - 4M VND) may reduce rebalancing efficiency in the short term. This suggestion is best suited for long-term accumulation.",
    aiAdvisorTitle: "🤖 AI Strategic Advisor (Gemini Advisor)",
    aiAdvisorSubtitle: "Combines your portfolio, macroeconomic indicators, and optimizer results to deliver a comprehensive financial strategy report.",
    aiAdvisorLoading: "Gemini is generating analysis report...",
    aiAdvisorRegenerateBtn: "🔄 Regenerate Advice",
    aiAdvisorGetBtn: "💡 Get AI Strategic Advice",
    loadingSqlite: "Loading SQLite database...",
    actionDepositSavings: "Deposit {val} to Savings",
    actionWithdrawSavings: "Withdraw {val} from Savings",
    actionBuyAsset: "Buy {qty} {unit} of {asset} (~{val})",
    actionSellAsset: "Sell {qty} {unit} of {asset} (~{val})",
  },
  vi: {
    title: "Wealth Copilot",
    subtitle: "Cố Vấn Tài Sản & Tái Cơ Cấu Thông Minh local-first (Việt Nam)",
    lightMode: "☀️ Light Mode",
    darkMode: "🌙 Dark Mode",
    apiSettings: "⚙️ Cài đặt API",
    backupRestore: "Sao lưu / Khôi phục",
    syncMarketPrices: "Đồng bộ giá thị trường",
    syncing: "Đang đồng bộ...",
    syncWarningTitle: "⚠️ Dữ liệu giá thị trường chưa đồng bộ mới nhất",
    syncWarningContent: "Lần đồng bộ giá thị trường gần nhất là {date} (đã quá {days} ngày). Hãy bấm 'Đồng bộ giá thị trường' để solver sử dụng dữ liệu mới nhất.",
    systemError: "Lỗi hệ thống",
    saveSettingsSuccess: "Lưu cài đặt API Key & Proxy thành công!",
    saveSettingsError: "Lỗi lưu cài đặt: {err}",
    syncSuccess: "Đồng bộ dữ liệu giá từ GitHub thành công!",
    backupExportSuccess: "Đã xuất bản sao lưu và tự động sao chép vào clipboard!",
    backupImportSuccess: "Khôi phục dữ liệu từ bản sao lưu thành công!",
    deleteTxSuccess: "Đã xóa giao dịch thành công!",
    addTxSuccess: "Đã ghi nhận giao dịch {asset} thành công!",
    qtyError: "Số lượng giao dịch phải lớn hơn 0",
    priceError: "Giá giao dịch phải lớn hơn 0",
    draftInvalidRows: "Bảng nháp có dòng không hợp lệ. Vui lòng kiểm tra lại mã, số lượng và giá vốn.",
    screenshotParsed: "Đã phân tích ảnh chụp danh mục! Vui lòng đối chiếu và chỉnh sửa trong Bảng Duyệt Nháp bên dưới.",
    screenshotError: "Lỗi bóc tách ảnh: {err}. Hãy cấu hình Gemini API Key và đảm bảo kết nối mạng không bị chặn.",
    imageReadError: "Lỗi đọc file ảnh",
    draftSavedSuccess: "Đã thêm toàn bộ danh mục từ bảng duyệt nháp vào SQLite thành công!",
    portfolioSavedError: "Lỗi lưu danh mục: {err}",
    aiAdvisorError: "Lỗi sinh báo cáo AI: {err}",
    pasteBackupPrompt: "Vui lòng dán dữ liệu sao lưu JSON cần khôi phục",
    deleteTxConfirm: "Bạn có chắc chắn muốn xóa giao dịch này không? Tỷ trọng danh mục sẽ được tính toán lại.",
    apiConfigTitle: "⚙️ Cấu hình Gemini API & Kết nối mạng",
    apiKeyLabel: "Gemini API Key (lưu trữ local bảo mật)",
    apiKeyPlaceholder: "Dán API Key từ Google AI Studio...",
    proxyUrlLabel: "Custom Proxy / Endpoint (Tùy chọn cho Việt Nam)",
    proxyUrlPlaceholder: "Ví dụ: http://localhost:7890 hoặc Reverse Proxy Endpoint",
    saveConfigBtn: "Lưu Cấu Hình",
    cancelBtn: "Hủy",
    backupTitle: "Quản lý sao lưu dữ liệu",
    currentBackupLabel: "Dữ liệu sao lưu hiện tại (JSON)",
    exportBackupPlaceholder: "Click 'Xuất sao lưu' để tạo mã backup...",
    exportCopyBtn: "Xuất sao lưu & Sao chép",
    importBackupLabel: "Dán dữ liệu sao lưu để khôi phục",
    importBackupPlaceholder: "Dán nội dung JSON sao lưu vào đây...",
    restoreBtn: "Khôi phục từ bản dán",
    welcomeTitle: "👋 Chào mừng đến với Wealth Copilot!",
    welcomeSubtitle: "Ứng dụng local-first của bạn hỗ trợ quản lý đa tài sản tùy chọn ở Việt Nam.",
    onboardingStep1: "Cấu hình API Key: Bấm \"⚙️ Cài đặt API\" ở góc trên bên trái để lưu khóa Gemini cá nhân của bạn.",
    onboardingStep2: "Nhập danh mục tự động: Kéo thả hoặc tải ảnh chụp màn hình sàn giao dịch (như TCBS) vào khu vực bóc tách để nhập liệu siêu tốc.",
    onboardingStep3: "Nhập thủ công hoặc fallback: Tự do gõ mã tài sản bất kỳ, điều chỉnh Phí và Thuế giao dịch của các sàn Việt Nam.",
    screenshotParserTitle: "📸 Bóc tách ảnh chụp màn hình",
    screenshotParserSubtitle: "Tải lên ảnh chụp danh mục tài sản từ TCBS hoặc sàn Việt Nam khác để phân tích tự động.",
    screenshotZoneParsing: "Gemini Vision đang bóc tách...",
    screenshotZoneIdle: "Kéo & thả ảnh vào đây hoặc click để chọn",
    draftTitle: "📋 Bản nháp",
    addRowBtn: "+ Thêm dòng",
    colAsset: "Mã",
    colQty: "SL",
    colCostBasis: "Giá vốn",
    colActions: "Hành động",
    deleteBtn: "Xóa",
    saveBtn: "Lưu",
    totalValueLabel: "Tổng giá trị tài sản",
    localFirstValuation: "Định giá local-first",
    expectedReturnLabel: "Lợi nhuận kỳ vọng",
    perYear: "/ năm",
    volatilityLabel: "Độ biến động (Volatility)",
    sharpeRatioLabel: "Chỉ số Sharpe",
    riskAdjustedReturnLabel: "Tỷ suất sinh lời",
    totalAssetsChartCenter: "Tổng tài sản",
    legendStatic: "(Tĩnh)",
    liquidLabel: "Thanh khoản",
    staticLabel: "Tĩnh/Khóa",
    portfolioOverviewTitle: "Tổng quan danh mục hiện tại",
    tableHeaderAsset: "Tài sản",
    tableHeaderType: "Loại",
    tableHeaderQty: "Số lượng",
    tableHeaderCostBasis: "Giá vốn TB",
    tableHeaderTotalValue: "Tổng giá trị",
    tableHeaderWeight: "Tỷ trọng",
    unitTael: "lượng",
    unitShare: "CCQ",
    recordTxTitle: "Ghi nhận giao dịch tài sản",
    formAssetClassLabel: "Loại tài sản",
    optionSavings: "Tiết kiệm",
    optionGold: "Vàng SJC",
    optionVN30: "ETF VN30",
    optionDiamond: "ETF Diamond",
    optionCustom: "Khác (Nhập mã tự chọn)...",
    formCustomTickerLabel: "Nhập mã tài sản tự chọn",
    formCustomTickerPlaceholder: "Ví dụ: HPG, TCB, VCB, VCG...",
    formActionLabel: "Hành động",
    optionDeposit: "Gửi thêm (Deposit)",
    optionWithdraw: "Rút tiền (Withdraw)",
    optionBuy: "Mua vào (Buy)",
    optionSell: "Bán ra (Sell)",
    amountDepositWithdrawLabel: "Số tiền nạp/rút (VND)",
    txQtyLabel: "Số lượng giao dịch (lượng/CCQ)",
    txPriceLabel: "Giá thị trường lúc giao dịch (đ/đơn vị)",
    currentPriceLabel: "Giá hiện tại: {price}đ",
    enterTxPricePlaceholder: "Nhập giá giao dịch...",
    feeLabel: "Phí giao dịch (VND) - mặc định 0.15%",
    taxLabel: "Thuế bán (VND) - mặc định 0.1% (khi Bán)",
    txDateLabel: "Ngày giao dịch",
    saveTxBtn: "Lưu giao dịch & Cập nhật",
    historyTitle: "Lịch sử giao dịch",
    historyEmptyState: "Chưa có giao dịch nào được ghi nhận.",
    historyHeaderDate: "Ngày",
    historyHeaderAsset: "Tài sản",
    historyHeaderAction: "Hành động",
    historyHeaderQty: "Số lượng",
    historyHeaderPrice: "Giá",
    historyHeaderFeeTax: "Phí / Thuế",
    historyHeaderActions: "Thao tác",
    historyFeeLabel: "Phí",
    historyTaxLabel: "Thuế",
    historyActionDeposit: "Nạp tiền",
    historyActionWithdraw: "Rút tiền",
    historyActionBuy: "Mua vào",
    historyActionSell: "Bán ra",
    solverTitle: "Đề xuất phân bổ tài sản tối ưu",
    solverSubtitle: "Điều chỉnh hệ số ngại rủi ro λ để solver Clarabel (Rust) tính toán lại tỷ trọng tối ưu hóa Sharpe Ratio.",
    riskAversionLabel: "Hệ số ngại rủi ro (Risk Aversion λ)",
    riskAversionAggressive: "Liều lĩnh (Max Sharpe)",
    riskAversionConservative: "An toàn (Min Volatility)",
    solverOptimalWeightsHeader: "Tỷ trọng tối ưu đề xuất (λ = {lambda})",
    solverVolLabel: "Rủi ro dao động",
    solverRetLabel: "Lợi nhuận kỳ vọng",
    rebalanceTitle: "Đề xuất giao dịch tái cơ cấu",
    rebalanceEmptyState: "Danh mục hiện tại đã đạt trạng thái cân bằng tối ưu (độ lệch dưới 5%). Không cần giao dịch tái cơ cấu nào.",
    rebalanceSubtitle: "Thực hiện các lệnh giao dịch sau để tối đa hóa Sharpe Ratio:",
    deviationLabel: "Lệch {dev}% so với tối ưu",
    badgeBuy: "MUA VÀO",
    badgeSell: "BÁN RA",
    savingsWithdrawalWarningTitle: "⚠️ Cảnh báo rút tiết kiệm trước hạn",
    savingsWithdrawalWarningContent: "Đề xuất yêu cầu giảm số dư Tiết kiệm. Việc rút trước hạn tại Việt Nam sẽ chịu phạt lãi suất (bị đưa về mức không kỳ hạn ~0.1%/năm). Hãy cân nhắc chờ sổ tiết kiệm đáo hạn hoặc sử dụng các nguồn vốn nhàn rỗi khác.",
    goldLiquidityWarningTitle: "⚠️ Cảnh báo thanh khoản SJC Gold",
    goldLiquidityWarningContent: "Vàng SJC tại Việt Nam chịu sự quản lý chặt chẽ. Chênh lệch mua-bán lớn (2M - 4M VND) có thể làm giảm hiệu quả tái cân bằng ngắn hạn. Đề xuất này thích hợp cho chiến lược tích lũy dài hạn.",
    aiAdvisorTitle: "🤖 Cố vấn Chiến lược AI (Gemini Advisor)",
    aiAdvisorSubtitle: "Tích hợp danh mục hiện tại, các chỉ số kinh tế vĩ mô chính sách ở Việt Nam và kết quả solver để phân tích chiến lược tài sản toàn diện.",
    aiAdvisorLoading: "Gemini đang sinh báo cáo phân tích...",
    aiAdvisorRegenerateBtn: "🔄 Tạo lại tư vấn",
    aiAdvisorGetBtn: "💡 Nhận Cố vấn Chiến lược AI",
    loadingSqlite: "Đang tải dữ liệu SQLite...",
    actionDepositSavings: "Gửi thêm {val} vào Tiết kiệm",
    actionWithdrawSavings: "Rút {val} từ Tiết kiệm",
    actionBuyAsset: "Mua thêm {qty} {unit} {asset} (khoảng {val})",
    actionSellAsset: "Bán bớt {qty} {unit} {asset} (khoảng {val})",
  }
};

const ASSET_NAMES_VI = {
  Savings: "Tiết kiệm",
  Gold: "Vàng SJC",
  VN30: "ETF VN30",
  Diamond: "ETF Diamond"
};

const ASSET_NAMES_EN = {
  Savings: "Savings",
  Gold: "SJC Gold",
  VN30: "VN30 ETF",
  Diamond: "Diamond ETF"
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
  if (assetName === "Tiết kiệm" || assetName === "Savings") return defaultColors.Savings;
  if (assetName === "Vàng SJC" || assetName === "Gold") return defaultColors.Gold;

  let hash = 0;
  for (let i = 0; i < assetName.length; i++) {
    hash = assetName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function getAssetDisplayName(asset, lang) {
  if (lang === "vi") {
    return ASSET_NAMES_VI[asset] || asset;
  }
  return ASSET_NAMES_EN[asset] || asset;
}

function App() {
  // Language & Translation State
  const [lang, setLang] = useState(() => localStorage.getItem("eb_lang") || "en");

  function t(key, params = {}) {
    let val = TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"]?.[key] || key;
    Object.keys(params).forEach(p => {
      val = val.replace(`{${p}}`, params[p]);
    });
    return val;
  }

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
      console.error(t("systemError") + ":", err);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("save_user_settings", { api_key: apiKey, proxy_url: proxyUrl });
      setSuccessMsg(t("saveSettingsSuccess"));
      setShowSettings(false);
    } catch (err) {
      setErrorMsg(t("saveSettingsError", { err }));
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
      console.warn("Error optimizing portfolio:", err);
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
      setErrorMsg(t("qtyError"));
      return;
    }

    if (formAsset === "Savings") {
      price = 1.0;
    } else if (isNaN(price) || price <= 0) {
      setErrorMsg(t("priceError"));
      return;
    }

    try {
      // Sync Yahoo Finance data first if it's a new custom stock
      if (formAssetSelect === "Custom" && formAssetCustom.trim()) {
        try {
          await invoke("fetch_historical_prices", { symbol: formAssetCustom });
        } catch (err) {
          console.warn(`Could not fetch historical prices for ${formAssetCustom}: ${err}`);
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
      setSuccessMsg(t("addTxSuccess", { asset: getAssetDisplayName(formAsset, lang) }));
      
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
          setSuccessMsg(t("screenshotParsed"));
        } else {
          throw new Error(t("draftInvalidRows"));
        }
      } catch (err) {
        setErrorMsg(t("screenshotError", { err }));
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg(t("imageReadError"));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveDraft() {
    setErrorMsg("");
    setSuccessMsg("");
    
    for (const item of draftItems) {
      if (!item.asset.trim() || item.quantity <= 0 || item.purchase_price <= 0) {
        setErrorMsg(t("draftInvalidRows"));
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
          console.warn(`Could not fetch historical prices for ${item.asset}: ${e}`);
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

      setSuccessMsg(t("draftSavedSuccess"));
      setDraftItems([]);
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(t("portfolioSavedError", { err }));
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
      const advice = await invoke("generate_wealth_advice", { lang });
      setAdvisorText(advice);
    } catch (err) {
      setErrorMsg(t("aiAdvisorError", { err }));
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
      setSuccessMsg(t("syncSuccess"));
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
      setSuccessMsg(t("backupExportSuccess"));
    } catch (err) {
      setErrorMsg(String(err));
    }
  }

  async function handleImportBackup() {
    if (!importText.trim()) {
      setErrorMsg(t("pasteBackupPrompt"));
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("import_backup", { backupJson: importText });
      setSuccessMsg(t("backupImportSuccess"));
      setImportText("");
      setShowBackupDrawer(false);
      await loadPortfolioData();
    } catch (err) {
      setErrorMsg(String(err));
    }
  }

  async function handleDeleteTransaction(id) {
    if (!window.confirm(t("deleteTxConfirm"))) {
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await invoke("delete_transaction", { id });
      setSuccessMsg(t("deleteTxSuccess"));
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
      nameVi: getAssetDisplayName(item.asset, lang),
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
            actionDescription = t("actionDepositSavings", { val: formatVND(diffValue) });
          } else {
            actionDescription = t("actionWithdrawSavings", { val: formatVND(Math.abs(diffValue)) });
            hasWithdrawalWarning = true;
          }
        } else {
          const qtyDiff = Math.abs(diffValue / latestPrices[item.asset]);
          const unit = item.asset === "Gold" ? t("unitTael") : t("unitShare");
          
          if (isBuy) {
            actionDescription = t("actionBuyAsset", { qty: qtyDiff.toFixed(2), unit, asset: getAssetDisplayName(item.asset, lang), val: formatVND(diffValue) });
          } else {
            actionDescription = t("actionSellAsset", { qty: qtyDiff.toFixed(2), unit, asset: getAssetDisplayName(item.asset, lang), val: formatVND(Math.abs(diffValue)) });
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
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <div className="header-actions">
          {/* Language Toggle */}
          <button 
            className="btn-secondary btn-small"
            style={{ fontWeight: "bold" }}
            onClick={() => {
              const nextLang = lang === "en" ? "vi" : "en";
              setLang(nextLang);
              localStorage.setItem("eb_lang", nextLang);
            }}
          >
            🌐 {lang === "en" ? "VI" : "EN"}
          </button>
          {/* Theme switch button */}
          <button 
            className="btn-secondary btn-small"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? t("lightMode") : t("darkMode")}
          </button>
          <button 
            className="btn-secondary btn-small"
            onClick={() => setShowSettings(!showSettings)}
          >
            {t("apiSettings")}
          </button>
          <button 
            className="btn-secondary btn-small"
            onClick={() => setShowBackupDrawer(!showBackupDrawer)}
          >
            {t("backupRestore")}
          </button>
          <button 
            className="btn-primary btn-small" 
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading && <span className="spinner"></span>}
            {syncLoading ? t("syncing") : t("syncMarketPrices")}
          </button>
        </div>
      </header>

      {/* Warning Banner */}
      {isSyncWarning && (
        <div className="alert alert-warning-sync">
          <span className="alert-title">{t("syncWarningTitle")}</span>
          <span className="alert-content">
            {t("syncWarningContent", { date: latestPriceDate || "unknown", days: latestPriceDate ? String(Math.ceil(Math.abs(new Date() - new Date(latestPriceDate)) / (1000 * 60 * 60 * 24))) : "unknown" })}
          </span>
        </div>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div className="alert alert-error">
          <span className="alert-title">{t("systemError")}</span>
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
          <h3>{t("apiConfigTitle")}</h3>
          <form onSubmit={handleSaveSettings} style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-group">
                <label htmlFor="settings-api-key">{t("apiKeyLabel")}</label>
                <input 
                  id="settings-api-key"
                  type="password" 
                  placeholder={t("apiKeyPlaceholder")}
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="settings-proxy-url">{t("proxyUrlLabel")}</label>
                <input 
                  id="settings-proxy-url"
                  type="text" 
                  placeholder={t("proxyUrlPlaceholder")}
                  value={proxyUrl} 
                  onChange={(e) => setProxyUrl(e.target.value)} 
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary btn-small">{t("saveConfigBtn")}</button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowSettings(false)}>{t("cancelBtn")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Backup Drawer */}
      {showBackupDrawer && (
        <div className="backup-drawer">
          <h3>{t("backupTitle")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
            <div>
              <label htmlFor="backup-export-text">{t("currentBackupLabel")}</label>
              <textarea 
                id="backup-export-text"
                className="backup-textarea" 
                readOnly 
                value={backupText} 
                placeholder={t("exportBackupPlaceholder")}
              />
              <button className="btn btn-secondary btn-small" onClick={handleExportBackup}>
                {t("exportCopyBtn")}
              </button>
            </div>
            <div>
              <label htmlFor="backup-import-text">{t("importBackupLabel")}</label>
              <textarea 
                id="backup-import-text"
                className="backup-textarea" 
                value={importText} 
                onChange={(e) => setImportText(e.target.value)}
                placeholder={t("importBackupPlaceholder")}
              />
              <button className="btn btn-primary btn-small" onClick={handleImportBackup}>
                {t("restoreBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <span className="spinner" style={{ width: "32px", height: "32px" }}></span>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>{t("loadingSqlite")}</p>
        </div>
      ) : (
        <>
          {transactions.length === 0 && (
            <div className="onboarding-banner">
              <h3>{t("welcomeTitle")}</h3>
              <p>{t("welcomeSubtitle")}</p>
              <ol style={{ fontSize: "0.85rem", paddingLeft: "1.2rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                <li><strong>{t("onboardingStep1")}</strong></li>
                <li><strong>{t("onboardingStep2")}</strong></li>
                <li><strong>{t("onboardingStep3")}</strong></li>
              </ol>
            </div>
          )}

          <div className="dashboard-container">
            {/* SIDEBAR ON THE LEFT */}
            <aside className="app-sidebar">
              {/* Screenshot Ingestion Area */}
              <div className="sidebar-section">
                <h2>{t("screenshotParserTitle")}</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: "1.4" }}>
                  {t("screenshotParserSubtitle")}
                </p>
                <div className="screenshot-zone" style={{ position: "relative" }}>
                  {isUploading ? (
                    <div>
                      <span className="spinner" style={{ width: "24px", height: "24px", display: "inline-block" }}></span>
                      <p style={{ marginTop: "0.5rem" }}>{t("screenshotZoneParsing")}</p>
                    </div>
                  ) : (
                    <div>
                      <p>{t("screenshotZoneIdle")}</p>
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
                      <h3>{t("draftTitle")}</h3>
                      <button className="btn btn-secondary btn-xs" onClick={handleAddDraftItem}>{t("addRowBtn")}</button>
                    </div>
                    <table style={{ width: "100%", marginBottom: "1rem" }}>
                      <thead>
                        <tr>
                          <th>{t("colAsset")}</th>
                          <th className="num-col">{t("colQty")}</th>
                          <th className="num-col">{t("colCostBasis")}</th>
                          <th style={{ width: "60px", textAlign: "center" }}>{t("colActions")}</th>
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
                                {t("deleteBtn")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-primary btn-xs" style={{ flex: 1 }} onClick={handleSaveDraft}>{t("saveBtn")}</button>
                      <button className="btn btn-secondary btn-xs" onClick={() => setDraftItems([])}>{t("cancelBtn")}</button>
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
                  <span className="stat-label">{t("totalValueLabel")}</span>
                  <span className="stat-value">{formatVND(totalPortfolioValue)}</span>
                  <span className="stat-sub" style={{ color: "var(--color-success)" }}>{t("localFirstValuation")}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">{t("expectedReturnLabel")}</span>
                  <span className="stat-value">
                    {optimalResult ? `${(optimalResult.expected_return * 100).toFixed(2)}%` : "—"}
                  </span>
                  <span className="stat-sub" style={{ color: "var(--text-secondary)" }}>{t("perYear")}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">{t("volatilityLabel")}</span>
                  <span className="stat-value">
                    {optimalResult ? `${(optimalResult.volatility * 100).toFixed(2)}%` : "—"}
                  </span>
                  <span className="stat-sub" style={{ color: "var(--text-secondary)" }}>{t("perYear")}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">{t("sharpeRatioLabel")}</span>
                  <span className="stat-value">
                    {optimalResult && optimalResult.volatility > 0 
                      ? (optimalResult.expected_return / optimalResult.volatility).toFixed(2)
                      : "—"}
                  </span>
                  <span className="stat-sub" style={{ color: "var(--color-success)" }}>{t("riskAdjustedReturnLabel")}</span>
                </div>
              </div>

              {/* 2-Column Core Split Layout */}
              <div className="main-grid-split">
                
                {/* Left Split Column: Portfolio list table, record form, transaction history */}
                <div className="content-column">
                  
                  {/* Portfolio Status Card */}
                  <div className="card">
                    <h2>{t("portfolioOverviewTitle")}</h2>
                    
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
                          <div className="chart-total-label">{t("totalAssetsChartCenter")}</div>
                        </div>
                      </div>

                      {/* Legend list */}
                      <div className="chart-legend">
                        {portfolioWithValues.map(item => (
                          <div key={item.asset} className={`legend-item ${item.asset.toLowerCase()}`}>
                            <span className="legend-label">
                              {item.nameVi} 
                              {item.asset_type === "Static" && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}> {t("legendStatic")}</span>}
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
                          <th>{t("tableHeaderAsset")}</th>
                          <th>{t("tableHeaderType")}</th>
                          <th className="num-col">{t("tableHeaderQty")}</th>
                          <th className="num-col">{t("tableHeaderCostBasis")}</th>
                          <th className="num-col">{t("tableHeaderTotalValue")}</th>
                          <th className="num-col">{t("tableHeaderWeight")}</th>
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
                                {item.asset_type === "Liquid" ? t("liquidLabel") : t("staticLabel")}
                              </span>
                            </td>
                            <td className="num-col">
                              {item.asset === "Savings" 
                                ? formatVND(item.quantity)
                                : `${item.quantity.toLocaleString("vi-VN")} ${item.asset === "Gold" ? t("unitTael") : t("unitShare")}`}
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
                    <h2>{t("recordTxTitle")}</h2>
                    <form onSubmit={handleAddTransaction}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="form-asset-select">{t("formAssetClassLabel")}</label>
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
                            <option value="Savings">{t("optionSavings")}</option>
                            <option value="Gold">{t("optionGold")}</option>
                            <option value="VN30">{t("optionVN30")}</option>
                            <option value="Diamond">{t("optionDiamond")}</option>
                            <option value="Custom">{t("optionCustom")}</option>
                          </select>
                        </div>

                        {formAssetSelect === "Custom" && (
                          <div className="form-group">
                            <label htmlFor="form-asset-custom">{t("formCustomTickerLabel")}</label>
                            <input 
                              id="form-asset-custom"
                              type="text" 
                              required
                              placeholder={t("formCustomTickerPlaceholder")}
                              value={formAssetCustom}
                              onChange={(e) => setFormAssetCustom(e.target.value.toUpperCase())}
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label htmlFor="form-action-select">{t("formActionLabel")}</label>
                          <select 
                            id="form-action-select"
                            value={formAction} 
                            onChange={(e) => setFormAction(e.target.value)}
                          >
                            {formAsset === "Savings" ? (
                              <>
                                <option value="Deposit">{t("optionDeposit")}</option>
                                <option value="Withdraw">{t("optionWithdraw")}</option>
                              </>
                            ) : (
                              <>
                                <option value="Buy">{t("optionBuy")}</option>
                                <option value="Sell">{t("optionSell")}</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="form-quantity-input">
                            {formAsset === "Savings" ? t("amountDepositWithdrawLabel") : t("txQtyLabel")}
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
                            <label htmlFor="form-price-input">{t("txPriceLabel")}</label>
                            <input 
                              id="form-price-input"
                              type="number" 
                              step="any"
                              placeholder={latestPrices[formAsset] !== undefined ? t("currentPriceLabel", { price: latestPrices[formAsset].toLocaleString("vi-VN") }) : t("enterTxPricePlaceholder")}
                              value={formPrice}
                              onChange={(e) => setFormPrice(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      {formAsset !== "Savings" && (
                        <div className="form-grid" style={{ marginTop: "0.5rem" }}>
                          <div className="form-group">
                            <label htmlFor="form-fee-input">{t("feeLabel")}</label>
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
                            <label htmlFor="form-tax-input">{t("taxLabel")}</label>
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
                        <label htmlFor="form-date-input">{t("txDateLabel")}</label>
                        <input 
                          id="form-date-input"
                          type="date" 
                          required
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary btn-full">
                        {t("saveTxBtn")}
                      </button>
                    </form>
                  </div>

                  {/* Transaction History Card */}
                  <div className="card transaction-history-card">
                    <h2>{t("historyTitle")}</h2>
                    {transactions.length === 0 ? (
                      <div className="empty-state">{t("historyEmptyState")}</div>
                    ) : (
                      <div className="transaction-list-container">
                        <table className="transaction-table">
                          <thead>
                            <tr>
                              <th>{t("historyHeaderDate")}</th>
                              <th>{t("historyHeaderAsset")}</th>
                              <th>{t("historyHeaderAction")}</th>
                              <th className="num-col">{t("historyHeaderQty")}</th>
                              <th className="num-col">{t("historyHeaderPrice")}</th>
                              <th>{t("historyHeaderFeeTax")}</th>
                              <th style={{ width: "60px", textAlign: "center" }}>{t("historyHeaderActions")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((tx) => (
                              <tr key={tx.id}>
                                <td>{tx.date}</td>
                                <td>{getAssetDisplayName(tx.asset, lang)}</td>
                                <td>
                                  <span className={`tx-action-badge ${(tx.action_type === 'Buy' || tx.action_type === 'Deposit') ? 'buy' : 'sell'}`}>
                                    {tx.action_type === 'Deposit' ? t("historyActionDeposit") :
                                     tx.action_type === 'Withdraw' ? t("historyActionWithdraw") :
                                     tx.action_type === 'Buy' ? t("historyActionBuy") : t("historyActionSell")}
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
                                      {tx.fee ? `${t("historyFeeLabel")}: ${formatVND(tx.fee)}` : ""}
                                      {tx.tax ? ` | ${t("historyTaxLabel")}: ${formatVND(tx.tax)}` : ""}
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    className="btn-danger btn-xs"
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                  >
                                    {t("deleteBtn")}
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
                    <h2>{t("solverTitle")}</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      {t("solverSubtitle")}
                    </p>

                    {/* Slider lambda */}
                    <div className="slider-container">
                      <div className="slider-header">
                        <span className="slider-title">{t("riskAversionLabel")}</span>
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
                        <span>{t("riskAversionAggressive")}</span>
                        <span>{t("riskAversionConservative")}</span>
                      </div>
                    </div>

                    {/* Optimal Allocation Results */}
                    {optimalResult && (
                      <div style={{ marginTop: "1rem" }}>
                        <h3 style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                          {t("solverOptimalWeightsHeader", { lambda: lambda.toFixed(1) })}
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
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("expectedReturnLabel")}</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-success)", marginTop: "2px", fontFamily: "JetBrains Mono" }}>
                              {(optimalResult.expected_return * 100).toFixed(2)}% {t("perYear")}
                            </div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("solverVolLabel")}</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-error)", marginTop: "2px", fontFamily: "JetBrains Mono" }}>
                              {(optimalResult.volatility * 100).toFixed(2)}% {t("perYear")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rebalancing Suggestion Card */}
                  <div className="card">
                    <h2>{t("rebalanceTitle")}</h2>

                    {suggestions.length === 0 ? (
                      <div className="empty-state">
                        {t("rebalanceEmptyState")}
                      </div>
                    ) : (
                      <div className="suggestion-list">
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                          {t("rebalanceSubtitle")}
                        </p>
                        
                        {suggestions.map((sug) => (
                          <div key={sug.asset} className="suggestion-item">
                            <div className="suggestion-details">
                              <span className="suggestion-action">{sug.action}</span>
                              <span className="suggestion-reason">
                                {t("deviationLabel", { dev: sug.deviation > 0 ? `+${sug.deviation}` : sug.deviation })}
                              </span>
                            </div>
                            <span className={`suggestion-badge ${sug.isBuy ? 'buy' : 'sell'}`}>
                              {sug.isBuy ? t("badgeBuy") : t("badgeSell")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Warnings */}
                    {hasWithdrawalWarning && (
                      <div className="alert alert-warning">
                        <span className="alert-title">{t("savingsWithdrawalWarningTitle")}</span>
                        <span className="alert-content">
                          {t("savingsWithdrawalWarningContent")}
                        </span>
                      </div>
                    )}

                    {hasGoldWarning && (
                      <div className="alert alert-warning">
                        <span className="alert-title">{t("goldLiquidityWarningTitle")}</span>
                        <span className="alert-content">
                          {t("goldLiquidityWarningContent")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Strategic Advisor Tab */}
                  <div className="card">
                    <h2>{t("aiAdvisorTitle")}</h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      {t("aiAdvisorSubtitle")}
                    </p>

                    {advisorLoading ? (
                      <div style={{ textAlign: "center", padding: "1.5rem" }}>
                        <span className="spinner" style={{ width: "24px", height: "24px" }}></span>
                        <p style={{ marginTop: "0.5rem" }}>{t("aiAdvisorLoading")}</p>
                      </div>
                    ) : advisorText ? (
                      <div className="advisor-report-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="advisor-report-window">{advisorText}</div>
                        <button className="btn btn-secondary btn-small" style={{ width: "auto", alignSelf: "flex-start" }} onClick={handleGenerateAdvice}>{t("aiAdvisorRegenerateBtn")}</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary btn-full" onClick={handleGenerateAdvice}>
                        {t("aiAdvisorGetBtn")}
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
