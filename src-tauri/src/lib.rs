pub mod errors;
pub mod db;
pub mod solver;
pub mod sync;

use errors::AppError;
use db::PortfolioState;
use solver::SolverResult;
use tauri::Manager;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    pub cache: Mutex<solver::SolverCache>,
}

#[tauri::command]
fn get_portfolio(state: tauri::State<'_, AppState>) -> Result<PortfolioState, AppError> {
    let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::get_portfolio_state(&conn)
}

#[tauri::command]
fn save_transaction(
    state: tauri::State<'_, AppState>,
    log: db::TransactionLog,
) -> Result<(), AppError> {
    if log.quantity <= 0.0 || !log.quantity.is_finite() {
        return Err(AppError::Solver("Quantity must be a positive finite number".to_string()));
    }
    if log.price <= 0.0 || !log.price.is_finite() {
        return Err(AppError::Solver("Price must be a positive finite number".to_string()));
    }
    if log.date.trim().is_empty() {
        return Err(AppError::Solver("Transaction date is required".to_string()));
    }

    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::save_transaction_and_update_portfolio(&mut conn, log)?;
    
    // Clear solver cache when transactions are modified
    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    cache.covariance = None;
    cache.expected_returns = None;

    Ok(())
}

#[tauri::command]
fn run_rebalancer(
    state: tauri::State<'_, AppState>,
    lambda: f64,
) -> Result<SolverResult, AppError> {
    if lambda <= 0.0 || !lambda.is_finite() {
        return Err(AppError::Solver("Risk aversion lambda must be a positive finite number".to_string()));
    }

    let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    let state_data = db::get_portfolio_state(&conn)?;

    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;

    let liquid_assets: Vec<String> = state_data.portfolio.iter()
        .filter(|item| item.asset_type == "Liquid")
        .map(|item| item.asset.clone())
        .collect();

    if liquid_assets.is_empty() {
        return Err(AppError::Solver("No liquid assets found to optimize".to_string()));
    }

    // Check if cache has values
    if cache.covariance.is_none() || cache.expected_returns.is_none() {
        // Ensure database has enough historical data
        let (cov, ret) = solver::calculate_covariance_and_returns(&state_data.prices, &liquid_assets)?;
        cache.covariance = Some(cov);
        cache.expected_returns = Some(ret);
    }

    let cov = cache.covariance.as_ref().unwrap();
    let ret = cache.expected_returns.as_ref().unwrap();

    solver::run_optimizer(cov, ret, &liquid_assets, lambda)
}

#[tauri::command]
fn sync_market_data(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    // 1. Run the sync process network call OUTSIDE of database mutex lock
    let synced_prices = sync::perform_sync_network("hoojinguyen", "wealth-copilot")?;

    // 2. Acquire lock only to write to SQLite
    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    sync::write_synced_prices(&mut conn, &synced_prices)?;

    let state_data = db::get_portfolio_state(&conn)?;
    let liquid_assets: Vec<String> = state_data.portfolio.iter()
        .filter(|item| item.asset_type == "Liquid")
        .map(|item| item.asset.clone())
        .collect();

    // 3. Update the solver cache immediately
    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    if !liquid_assets.is_empty() {
        let (cov, ret) = solver::calculate_covariance_and_returns(&synced_prices, &liquid_assets)?;
        cache.covariance = Some(cov);
        cache.expected_returns = Some(ret);
    } else {
        cache.covariance = None;
        cache.expected_returns = None;
    }

    Ok(())
}

#[tauri::command]
fn export_backup(state: tauri::State<'_, AppState>) -> Result<String, AppError> {
    let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::export_backup_json(&conn)
}

#[tauri::command]
fn delete_transaction(state: tauri::State<'_, AppState>, id: i32) -> Result<(), AppError> {
    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::delete_transaction_and_recalculate_portfolio(&mut conn, id)?;

    // Clear solver cache
    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    cache.covariance = None;
    cache.expected_returns = None;

    Ok(())
}

#[tauri::command]
fn import_backup(state: tauri::State<'_, AppState>, backup_json: String) -> Result<(), AppError> {
    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::import_backup_json(&mut conn, &backup_json)?;

    // Clear the cache since pricing data was reset
    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    cache.covariance = None;
    cache.expected_returns = None;

    Ok(())
}

#[tauri::command]
fn import_draft_transactions(
    state: tauri::State<'_, AppState>,
    items: Vec<db::DraftItem>,
) -> Result<(), AppError> {
    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::import_draft_transactions(&mut conn, items)?;

    // Clear solver cache
    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    cache.covariance = None;
    cache.expected_returns = None;

    Ok(())
}

#[tauri::command]
fn get_user_settings(state: tauri::State<'_, AppState>) -> Result<std::collections::HashMap<String, String>, AppError> {
    let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    let mut map = std::collections::HashMap::new();
    if let Some(key) = db::get_setting(&conn, "gemini_api_key")? {
        map.insert("gemini_api_key".to_string(), key);
    }
    if let Some(url) = db::get_setting(&conn, "proxy_url")? {
        map.insert("proxy_url".to_string(), url);
    }
    Ok(map)
}

#[tauri::command]
fn save_user_settings(
    state: tauri::State<'_, AppState>,
    api_key: String,
    proxy_url: String,
) -> Result<(), AppError> {
    let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    db::set_setting(&conn, "gemini_api_key", &api_key)?;
    db::set_setting(&conn, "proxy_url", &proxy_url)?;
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct MacroIndicator {
    pub key: String,
    pub value: f64,
    pub description: Option<String>,
    pub updated_at: String,
}

#[tauri::command]
async fn get_macro_indicators(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MacroIndicator>, AppError> {
    let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    let mut stmt = conn.prepare("SELECT key, value, description, updated_at FROM macro_indicators;")?;
    let indicators = stmt
        .query_map([], |row| {
            Ok(MacroIndicator {
                key: row.get(0)?,
                value: row.get(1)?,
                description: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(indicators)
}

fn unix_to_date(ts_sec: i64) -> String {
    let days_since_epoch = ts_sec / 86400;
    let mut days = days_since_epoch;
    let mut year = 1970;
    
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if is_leap { 366 } else { 365 };
        if days >= days_in_year {
            days -= days_in_year;
            year += 1;
        } else {
            break;
        }
    }
    
    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let month_lengths = if is_leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    
    let mut month = 1;
    for &length in month_lengths.iter() {
        if days >= length {
            days -= length;
            month += 1;
        } else {
            break;
        }
    }
    
    let day = days + 1;
    format!("{:04}-{:02}-{:02}", year, month, day)
}

#[tauri::command]
async fn fetch_historical_prices(
    state: tauri::State<'_, AppState>,
    symbol: String,
) -> Result<Vec<db::AssetPriceRecord>, AppError> {
    let raw_symbol = symbol.trim().to_uppercase();
    if raw_symbol.is_empty() {
        return Err(AppError::Solver("Symbol cannot be empty".to_string()));
    }

    let yf_symbol = if raw_symbol.len() == 3 && !raw_symbol.contains('.') {
        format!("{}.HM", raw_symbol)
    } else {
        raw_symbol.clone()
    };

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Network(e))?;

    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=1y&interval=1d",
        yf_symbol
    );

    let response = client.get(&url).send().await.map_err(|e| AppError::Network(e))?;
    if !response.status().is_success() {
        return Err(AppError::Solver(format!(
            "Failed to fetch historical prices for symbol {} from Yahoo Finance. Status: {}",
            yf_symbol,
            response.status()
        )));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| AppError::Solver(e.to_string()))?;

    let result_arr = json.pointer("/chart/result").and_then(|v| v.as_array())
        .ok_or_else(|| AppError::Solver("Invalid response format from Yahoo Finance".to_string()))?;
        
    if result_arr.is_empty() {
        return Err(AppError::Solver("No historical data returned from Yahoo Finance".to_string()));
    }
    
    let result = &result_arr[0];
    let timestamps = result.pointer("/timestamp").and_then(|v| v.as_array())
        .ok_or_else(|| AppError::Solver("Missing timestamps in Yahoo Finance response".to_string()))?;
        
    let closes = result.pointer("/indicators/quote/0/close").and_then(|v| v.as_array())
        .ok_or_else(|| AppError::Solver("Missing close prices in Yahoo Finance response".to_string()))?;

    if timestamps.len() != closes.len() {
        return Err(AppError::Solver("Mismatch between timestamps and close prices count".to_string()));
    }

    let mut records = Vec::new();
    for (t, c) in timestamps.iter().zip(closes.iter()) {
        let ts_sec = t.as_i64().ok_or_else(|| AppError::Solver("Invalid timestamp format".to_string()))?;
        let price = match c.as_f64() {
            Some(p) => p,
            None => continue,
        };
        if price <= 0.0 {
            continue;
        }

        let date_str = unix_to_date(ts_sec);
        
        records.push(db::AssetPriceRecord {
            date: date_str,
            asset: raw_symbol.clone(),
            price,
        });
    }

    if records.is_empty() {
        return Err(AppError::Solver("No valid historical price records parsed".to_string()));
    }

    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    sync::write_synced_prices(&mut conn, &records)?;

    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    cache.covariance = None;
    cache.expected_returns = None;

    Ok(records)
}

#[tauri::command]
async fn parse_screenshot(
    state: tauri::State<'_, AppState>,
    image_base64: String,
) -> Result<String, AppError> {
    let (api_key, proxy_url) = {
        let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
        let api_key = db::get_setting(&conn, "gemini_api_key")?.ok_or_else(|| {
            AppError::Solver("Gemini API key is not configured. Please set it in Settings.".to_string())
        })?;
        let proxy_url = db::get_setting(&conn, "proxy_url")?;
        (api_key, proxy_url)
    };

    let mut mime_type = "image/png".to_string();
    let mut raw_base64 = image_base64.clone();
    if image_base64.starts_with("data:") {
        if let Some(comma_idx) = image_base64.find(',') {
            let prefix = &image_base64[..comma_idx];
            if prefix.contains("image/jpeg") || prefix.contains("image/jpg") {
                mime_type = "image/jpeg".to_string();
            } else if prefix.contains("image/webp") {
                mime_type = "image/webp".to_string();
            }
            raw_base64 = image_base64[comma_idx + 1..].to_string();
        }
    }

    let mut builder = reqwest::Client::builder();
    if let Some(ref proxy_str) = proxy_url {
        if proxy_str.starts_with("http") && !proxy_str.contains("v1beta") && !proxy_str.contains("v1") && !proxy_str.contains("googleapis.com") {
            if let Ok(proxy) = reqwest::Proxy::all(proxy_str) {
                builder = builder.proxy(proxy);
            }
        }
    }
    let client = builder.build().map_err(|e| AppError::Network(e))?;

    let url = if let Some(ref proxy) = proxy_url {
        if proxy.contains("/v1beta") || proxy.contains("/v1") {
            format!("{}?key={}", proxy.trim_end_matches('?'), api_key)
        } else {
            format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key)
        }
    } else {
        format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key)
    };

    let payload = serde_json::json!({
        "contents": [
            {
                "parts": [
                    {
                        "text": "Extract all stock and fund portfolio items from this Vietnamese brokerage screenshot (e.g. TCBS). Return ONLY a JSON array of objects with fields: asset (the stock or fund ticker symbol in uppercase, e.g. HPG, FUEVFVND, VCB. Do not include exchange suffixes here), quantity (as a number), and purchase_price (average cost/giá vốn as a number). If quantity or purchase_price is not found, exclude that item. Do not include any markdown formatting, backticks, or comments. Just the raw JSON array."
                    },
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": raw_base64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    });

    let response = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| AppError::Network(e))?;
        
    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Solver(format!("Gemini API error: {}", text)));
    }
    
    let resp_json: serde_json::Value = response.json().await.map_err(|e| AppError::Solver(e.to_string()))?;
    
    let extracted_text = resp_json
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Solver("Failed to extract text from Gemini response".to_string()))?;
        
    Ok(extracted_text.to_string())
}

#[tauri::command]
async fn generate_wealth_advice(
    state: tauri::State<'_, AppState>,
) -> Result<String, AppError> {
    let (api_key, proxy_url, state_data, indicators) = {
        let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
        let api_key = db::get_setting(&conn, "gemini_api_key")?.ok_or_else(|| {
            AppError::Solver("Gemini API key is not configured. Please set it in Settings.".to_string())
        })?;
        let proxy_url = db::get_setting(&conn, "proxy_url")?;
        
        let state_data = db::get_portfolio_state(&conn)?;
        
        let mut stmt = conn.prepare("SELECT key, value, description, updated_at FROM macro_indicators;")?;
        let indicators = stmt
            .query_map([], |row| {
                Ok(MacroIndicator {
                    key: row.get(0)?,
                    value: row.get(1)?,
                    description: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
            
        (api_key, proxy_url, state_data, indicators)
    };

    let liquid_assets: Vec<String> = state_data.portfolio.iter()
        .filter(|item| item.asset_type == "Liquid")
        .map(|item| item.asset.clone())
        .collect();
        
    let rebalance_weights = if !liquid_assets.is_empty() {
        if let Ok((cov, ret)) = solver::calculate_covariance_and_returns(&state_data.prices, &liquid_assets) {
            solver::run_optimizer(&cov, &ret, &liquid_assets, 5.0).ok()
        } else {
            None
        }
    } else {
        None
    };

    let mut prompt = String::new();
    prompt.push_str("Bạn là một Cố vấn Tài chính AI chuyên nghiệp tại Việt Nam. ");
    prompt.push_str("Hãy phân tích danh mục tài sản hiện tại của người dùng, kết hợp với các chỉ số vĩ mô hiện tại và gợi ý phân bổ tối ưu từ thuật toán tối ưu hóa (Clarabel Solver), để đưa ra các đề xuất chiến lược tài chính chi tiết, rõ ràng bằng tiếng Việt.\n\n");
    
    prompt.push_str("### 1. Danh mục tài sản hiện tại của người dùng:\n");
    for item in &state_data.portfolio {
        prompt.push_str(&format!(
            "- Tên tài sản: {}, Số lượng: {}, Loại: {}, Giá vốn: {}, Lãi/lỗ thực tế tích lũy: {}\n",
            item.asset, item.quantity, item.asset_type, item.purchase_price, item.realized_pnl
        ));
    }
    
    prompt.push_str("\n### 2. Các chỉ số kinh tế vĩ mô hiện tại:\n");
    for ind in &indicators {
        prompt.push_str(&format!(
            "- {} ({}): {} (Cập nhật: {})\n",
            ind.description.as_deref().unwrap_or("Chỉ số"), ind.key, ind.value, ind.updated_at
        ));
    }
    
    prompt.push_str("\n### 3. Tỷ trọng gợi ý tối ưu từ thuật toán Clarabel Solver (chỉ áp dụng cho tài sản Liquid):\n");
    if let Some(res) = rebalance_weights {
        for (asset, weight) in &res.weights {
            prompt.push_str(&format!("- {}: {:.2}%\n", asset, weight * 100.0));
        }
        prompt.push_str(&format!("- Kỳ vọng lợi nhuận danh mục tối ưu: {:.2}%\n", res.expected_return * 100.0));
        prompt.push_str(&format!("- Độ biến động danh mục tối ưu: {:.2}%\n", res.volatility * 100.0));
    } else {
        prompt.push_str("- Không có gợi ý phân bổ (dữ liệu lịch sử giá chưa đủ hoặc danh mục rỗng).\n");
    }
    
    prompt.push_str("\n### Yêu cầu báo cáo cố vấn:\n");
    prompt.push_str("1. Đánh giá cấu trúc danh mục tài sản hiện tại (tính thanh khoản, rủi ro, phân bổ nhóm tài sản Liquid/Static).\n");
    prompt.push_str("2. Bình luận tác động của các chỉ số vĩ mô (lãi suất, lạm phát, tỷ giá, VN-Index) tới danh mục đầu tư.\n");
    prompt.push_str("3. Giải thích và nhận định về tỷ trọng gợi ý từ Clarabel Solver. Làm thế nào người dùng có thể thực hiện tái cơ cấu danh mục để tiến gần hơn đến tỷ trọng này một cách an toàn.\n");
    prompt.push_str("4. Đưa ra 3-4 khuyến nghị hành động cụ thể để gia tăng tài sản bền vững.\n\n");
    prompt.push_str("Báo cáo cần trình bày chuyên nghiệp, sử dụng định dạng Markdown đẹp mắt, có tiêu đề rõ ràng, không dùng các ký tự lạ hoặc thông tin giả định không có căn cứ.");

    let mut builder = reqwest::Client::builder();
    if let Some(ref proxy_str) = proxy_url {
        if proxy_str.starts_with("http") && !proxy_str.contains("v1beta") && !proxy_str.contains("v1") && !proxy_str.contains("googleapis.com") {
            if let Ok(proxy) = reqwest::Proxy::all(proxy_str) {
                builder = builder.proxy(proxy);
            }
        }
    }
    let client = builder.build().map_err(|e| AppError::Network(e))?;

    let url = if let Some(ref proxy) = proxy_url {
        if proxy.contains("/v1beta") || proxy.contains("/v1") {
            format!("{}?key={}", proxy.trim_end_matches('?'), api_key)
        } else {
            format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key)
        }
    } else {
        format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}", api_key)
    };

    let payload = serde_json::json!({
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    });

    let response = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| AppError::Network(e))?;
        
    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::Solver(format!("Gemini API error: {}", text)));
    }
    
    let resp_json: serde_json::Value = response.json().await.map_err(|e| AppError::Solver(e.to_string()))?;
    
    let extracted_text = resp_json
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Solver("Failed to extract text from Gemini response".to_string()))?;
        
    Ok(extracted_text.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Retrieve local app data directory for SQLite DB storage
            let app_data_dir = app.path().app_data_dir().expect("Failed to get App Data directory");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create App Data directory");
            
            let db_path = app_data_dir.join("wealth-copilot.db");
            let mut conn = rusqlite::Connection::open(db_path).expect("Failed to open SQLite database");

            db::init_db(&conn)?;
            db::seed_if_empty(&mut conn)?;

            app.manage(AppState {
                db: Mutex::new(conn),
                cache: Mutex::default(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_portfolio,
            save_transaction,
            delete_transaction,
            run_rebalancer,
            sync_market_data,
            export_backup,
            import_backup,
            get_macro_indicators,
            fetch_historical_prices,
            parse_screenshot,
            generate_wealth_advice,
            get_user_settings,
            save_user_settings,
            import_draft_transactions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
