use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use crate::errors::AppError;

const BUNDLED_SEED_DATA: &str = include_str!("seed_data.json");

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AssetPriceRecord {
    pub date: String,
    pub asset: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortfolioItem {
    pub asset: String,
    pub quantity: f64,
    pub asset_type: String, // "Liquid" or "Static"
    pub purchase_price: f64,
    pub realized_pnl: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionLog {
    pub id: Option<i32>,
    pub asset: String,
    pub action_type: String, // Buy, Sell, Deposit, Withdraw
    pub quantity: f64,
    pub price: f64,
    pub date: String,
    pub fee: Option<f64>,
    pub tax: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortfolioState {
    pub portfolio: Vec<PortfolioItem>,
    pub prices: Vec<AssetPriceRecord>,
    pub transactions: Vec<TransactionLog>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionedBackup {
    pub version: i32,
    pub data: PortfolioState,
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1;")?;
    let val: Option<String> = stmt.query_row([key], |row| row.get(0)).optional()?;
    Ok(val)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2);",
        params![key, value],
    )?;
    Ok(())
}

pub fn init_db(conn: &Connection) -> Result<(), AppError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS asset_prices (
            date TEXT NOT NULL,
            asset TEXT NOT NULL,
            price REAL NOT NULL,
            PRIMARY KEY (date, asset)
        );",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_portfolio (
            asset TEXT PRIMARY KEY,
            quantity REAL NOT NULL
        );",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS transaction_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset TEXT NOT NULL,
            action_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            date TEXT NOT NULL
        );",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_transaction_logs_date ON transaction_logs (date, id);",
        [],
    )?;

    // Safe migration: Add asset_type, purchase_price, realized_pnl to user_portfolio if they do not exist
    let mut stmt = conn.prepare("PRAGMA table_info(user_portfolio);")?;
    let user_portfolio_cols: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<_, _>>()?;

    if !user_portfolio_cols.contains("asset_type") {
        conn.execute("ALTER TABLE user_portfolio ADD COLUMN asset_type TEXT DEFAULT 'Liquid';", [])?;
    }
    if !user_portfolio_cols.contains("purchase_price") {
        conn.execute("ALTER TABLE user_portfolio ADD COLUMN purchase_price REAL DEFAULT 0.0;", [])?;
    }
    if !user_portfolio_cols.contains("realized_pnl") {
        conn.execute("ALTER TABLE user_portfolio ADD COLUMN realized_pnl REAL DEFAULT 0.0;", [])?;
    }

    // Safe migration: Add fee, tax to transaction_logs if they do not exist
    let mut stmt = conn.prepare("PRAGMA table_info(transaction_logs);")?;
    let transaction_logs_cols: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<_, _>>()?;

    if !transaction_logs_cols.contains("fee") {
        conn.execute("ALTER TABLE transaction_logs ADD COLUMN fee REAL DEFAULT 0.0;", [])?;
    }
    if !transaction_logs_cols.contains("tax") {
        conn.execute("ALTER TABLE transaction_logs ADD COLUMN tax REAL DEFAULT 0.0;", [])?;
    }

    // Create settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
        [],
    )?;

    // Create macro_indicators table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS macro_indicators (
            key TEXT PRIMARY KEY,
            value REAL NOT NULL,
            description TEXT,
            updated_at TEXT NOT NULL
        );",
        [],
    )?;

    // Ensure default portfolio entries exist
    let default_assets = [
        ("Savings", "Liquid"),
        ("Gold", "Liquid"),
        ("VN30", "Liquid"),
        ("Diamond", "Liquid"),
    ];
    for (asset, atype) in default_assets {
        conn.execute(
            "INSERT OR IGNORE INTO user_portfolio (asset, quantity, asset_type, purchase_price, realized_pnl) VALUES (?1, 0.0, ?2, 0.0, 0.0);",
            params![asset, atype],
        )?;
    }

    Ok(())
}

pub fn seed_if_empty(conn: &mut Connection) -> Result<(), AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM asset_prices;",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        let records: Vec<AssetPriceRecord> = serde_json::from_str(BUNDLED_SEED_DATA)?;
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare(
                "INSERT OR REPLACE INTO asset_prices (date, asset, price) VALUES (?1, ?2, ?3);",
            )?;

            for record in records {
                stmt.execute(params![record.date, record.asset, record.price])?;
            }
        }
        tx.commit()?;
    }

    Ok(())
}

pub fn get_portfolio_state(conn: &Connection) -> Result<PortfolioState, AppError> {
    // 1. Fetch user portfolio
    let mut stmt = conn.prepare("SELECT asset, quantity, asset_type, purchase_price, realized_pnl FROM user_portfolio;")?;
    let portfolio = stmt
        .query_map([], |row| {
            Ok(PortfolioItem {
                asset: row.get(0)?,
                quantity: row.get(1)?,
                asset_type: row.get(2)?,
                purchase_price: row.get(3)?,
                realized_pnl: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // 2. Fetch price history
    let mut stmt = conn.prepare("SELECT date, asset, price FROM asset_prices ORDER BY date ASC;")?;
    let prices = stmt
        .query_map([], |row| {
            Ok(AssetPriceRecord {
                date: row.get(0)?,
                asset: row.get(1)?,
                price: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // 3. Fetch transaction logs
    let mut stmt = conn.prepare(
        "SELECT id, asset, action_type, quantity, price, date, fee, tax FROM transaction_logs ORDER BY date DESC, id DESC;",
    )?;
    let transactions = stmt
        .query_map([], |row| {
            Ok(TransactionLog {
                id: Some(row.get(0)?),
                asset: row.get(1)?,
                action_type: row.get(2)?,
                quantity: row.get(3)?,
                price: row.get(4)?,
                date: row.get(5)?,
                fee: row.get(6)?,
                tax: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(PortfolioState {
        portfolio,
        prices,
        transactions,
    })
}

fn recalculate_portfolio_state(tx: &rusqlite::Transaction) -> Result<(), AppError> {
    // 1. Read existing asset types from user_portfolio to preserve them
    let mut stmt = tx.prepare("SELECT asset, asset_type FROM user_portfolio;")?;
    let mut preserved_types = std::collections::HashMap::new();
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let asset: String = row.get(0)?;
        let atype: String = row.get(1)?;
        preserved_types.insert(asset, atype);
    }

    // 2. Clear user_portfolio
    tx.execute("DELETE FROM user_portfolio;", [])?;

    // 3. Define state map
    struct AssetState {
        quantity: f64,
        purchase_price: f64,
        realized_pnl: f64,
        asset_type: String,
    }

    let mut states: std::collections::HashMap<String, AssetState> = std::collections::HashMap::new();

    // Initialize default assets
    let default_assets = [
        ("Savings", "Liquid"),
        ("Gold", "Liquid"),
        ("VN30", "Liquid"),
        ("Diamond", "Liquid"),
    ];
    for (asset, atype) in default_assets {
        states.insert(
            asset.to_string(),
            AssetState {
                quantity: 0.0,
                purchase_price: 0.0,
                realized_pnl: 0.0,
                asset_type: atype.to_string(),
            },
        );
    }

    // 4. Retrieve all transaction logs chronologically
    let mut stmt = tx.prepare(
        "SELECT asset, action_type, quantity, price, fee, tax FROM transaction_logs ORDER BY date ASC, id ASC;"
    )?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let asset: String = row.get(0)?;
        let action_type: String = row.get(1)?;
        let quantity: f64 = row.get(2)?;
        let price: f64 = row.get(3)?;
        let fee: f64 = row.get::<_, Option<f64>>(4)?.unwrap_or(0.0);
        let tax: f64 = row.get::<_, Option<f64>>(5)?.unwrap_or(0.0);

        // Find or create asset state
        let state = states.entry(asset.clone()).or_insert_with(|| {
            let atype = if let Some(t) = preserved_types.get(&asset) {
                t.clone()
            } else {
                let lower_name = asset.to_lowercase();
                if lower_name.contains("bất đồng sản")
                    || lower_name.contains("bất động sản")
                    || lower_name.contains("nhà đất")
                    || lower_name.contains("đất")
                    || lower_name.contains("static")
                {
                    "Static".to_string()
                } else {
                    "Liquid".to_string()
                }
            };
            AssetState {
                quantity: 0.0,
                purchase_price: 0.0,
                realized_pnl: 0.0,
                asset_type: atype,
            }
        });

        match action_type.as_str() {
            "Buy" | "Deposit" => {
                let old_qty = state.quantity;
                let old_price = state.purchase_price;
                state.quantity += quantity;
                
                if state.quantity > 0.0 {
                    if asset == "Savings" {
                        state.purchase_price = 1.0;
                    } else {
                        state.purchase_price = ((old_qty * old_price) + (quantity * price) + fee) / state.quantity;
                    }
                } else {
                    state.purchase_price = 0.0;
                }
            }
            "Sell" | "Withdraw" => {
                let old_qty = state.quantity;
                let old_price = state.purchase_price;
                let qty_sold = quantity.min(old_qty);
                
                state.quantity = (old_qty - quantity).max(0.0);
                
                if asset != "Savings" && old_qty > 0.0 {
                    let pnl = qty_sold * (price - old_price) - fee - tax;
                    state.realized_pnl += pnl;
                }
                
                if state.quantity == 0.0 {
                    state.purchase_price = 0.0;
                }
            }
            _ => {}
        }
    }

    // 5. Save all states back to user_portfolio
    let mut stmt = tx.prepare(
        "INSERT INTO user_portfolio (asset, quantity, asset_type, purchase_price, realized_pnl)
         VALUES (?1, ?2, ?3, ?4, ?5);"
    )?;
    for (asset, state) in states {
        stmt.execute(params![
            asset,
            state.quantity,
            state.asset_type,
            state.purchase_price,
            state.realized_pnl
        ])?;
    }

    Ok(())
}

pub fn save_transaction_and_update_portfolio(
    conn: &mut Connection,
    log: TransactionLog,
) -> Result<(), AppError> {
    // Validate action type
    let valid_actions = ["Buy", "Sell", "Deposit", "Withdraw"];
    if !valid_actions.contains(&log.action_type.as_str()) {
        return Err(AppError::Solver(format!(
            "Invalid transaction action type: {}",
            log.action_type
        )));
    }

    let tx = conn.transaction()?;

    // 1. Insert transaction log
    tx.execute(
        "INSERT INTO transaction_logs (asset, action_type, quantity, price, date, fee, tax)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);",
        params![log.asset, log.action_type, log.quantity, log.price, log.date, log.fee, log.tax],
    )?;

    // 2. Recalculate
    recalculate_portfolio_state(&tx)?;

    tx.commit()?;
    Ok(())
}

pub fn export_backup_json(conn: &Connection) -> Result<String, AppError> {
    let state = get_portfolio_state(conn)?;
    let backup = VersionedBackup {
        version: 1,
        data: state,
    };
    let json = serde_json::to_string_pretty(&backup)?;
    Ok(json)
}

pub fn import_backup_json(conn: &mut Connection, backup_json: &str) -> Result<(), AppError> {
    let backup: VersionedBackup = serde_json::from_str(backup_json)
        .map_err(|e| AppError::InvalidBackup(e.to_string()))?;

    if backup.version != 1 {
        return Err(AppError::InvalidBackup(format!(
            "Unsupported backup version: {}",
            backup.version
        )));
    }

    let state = backup.data;

    // Validate backup data business rules before writing (relaxed validator - D6)
    for item in &state.portfolio {
        if item.quantity < 0.0 {
            return Err(AppError::InvalidBackup(format!("Negative quantity for asset: {}", item.asset)));
        }
    }
    for tx_log in &state.transactions {
        if tx_log.quantity < 0.0 || tx_log.price < 0.0 {
            return Err(AppError::InvalidBackup("Negative quantity or price in transaction log".to_string()));
        }
    }

    let tx = conn.transaction()?;

    // Clear existing data
    tx.execute("DELETE FROM asset_prices;", [])?;
    tx.execute("DELETE FROM user_portfolio;", [])?;
    tx.execute("DELETE FROM transaction_logs;", [])?;

    // Restore user portfolio
    for item in state.portfolio {
        tx.execute(
            "INSERT OR REPLACE INTO user_portfolio (asset, quantity, asset_type, purchase_price, realized_pnl) VALUES (?1, ?2, ?3, ?4, ?5);",
            params![item.asset, item.quantity, item.asset_type, item.purchase_price, item.realized_pnl],
        )?;
    }

    // Restore asset prices
    for price in state.prices {
        tx.execute(
            "INSERT OR REPLACE INTO asset_prices (date, asset, price) VALUES (?1, ?2, ?3);",
            params![price.date, price.asset, price.price],
        )?;
    }

    // Restore transaction logs
    for log in state.transactions {
        tx.execute(
            "INSERT INTO transaction_logs (id, asset, action_type, quantity, price, date, fee, tax)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8);",
            params![log.id, log.asset, log.action_type, log.quantity, log.price, log.date, log.fee, log.tax],
        )?;
    }

    tx.commit()?;
    Ok(())
}

pub fn delete_transaction_and_recalculate_portfolio(
    conn: &mut Connection,
    id: i32,
) -> Result<(), AppError> {
    let tx = conn.transaction()?;

    // 1. Delete transaction log
    tx.execute("DELETE FROM transaction_logs WHERE id = ?1;", [id])?;

    // 2. Recalculate
    recalculate_portfolio_state(&tx)?;

    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_delete_transaction_recalculation() {
        let mut conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();

        // 1. Deposit 1000 to Savings
        let log1 = TransactionLog {
            id: None,
            asset: "Savings".to_string(),
            action_type: "Deposit".to_string(),
            quantity: 1000.0,
            price: 1.0,
            date: "2026-06-25".to_string(),
            fee: None,
            tax: None,
        };
        save_transaction_and_update_portfolio(&mut conn, log1).unwrap();

        // 2. Deposit 500 to Savings
        let log2 = TransactionLog {
            id: None,
            asset: "Savings".to_string(),
            action_type: "Deposit".to_string(),
            quantity: 500.0,
            price: 1.0,
            date: "2026-06-26".to_string(),
            fee: None,
            tax: None,
        };
        save_transaction_and_update_portfolio(&mut conn, log2).unwrap();

        // Get transaction ids
        let state = get_portfolio_state(&conn).unwrap();
        assert_eq!(state.transactions.len(), 2);
        let id_to_delete = state.transactions[1].id.unwrap(); // first log (log1) chronologically is second in desc order

        let savings = state.portfolio.iter().find(|i| i.asset == "Savings").unwrap();
        assert_eq!(savings.quantity, 1500.0);

        // 3. Delete log1 (1000)
        delete_transaction_and_recalculate_portfolio(&mut conn, id_to_delete).unwrap();

        let state_after = get_portfolio_state(&conn).unwrap();
        let savings_after = state_after.portfolio.iter().find(|i| i.asset == "Savings").unwrap();
        assert_eq!(savings_after.quantity, 500.0);
        assert_eq!(state_after.transactions.len(), 1);
    }

    #[test]
    fn test_save_transaction_clipping() {
        let mut conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        
        let log = TransactionLog {
            id: None,
            asset: "Gold".to_string(),
            action_type: "Sell".to_string(),
            quantity: 5.0,
            price: 100.0,
            date: "2026-06-26".to_string(),
            fee: None,
            tax: None,
        };
        save_transaction_and_update_portfolio(&mut conn, log).unwrap();
        
        let state = get_portfolio_state(&conn).unwrap();
        let gold = state.portfolio.iter().find(|i| i.asset == "Gold").unwrap();
        assert_eq!(gold.quantity, 0.0); // clipped to 0.0
    }

    #[test]
    fn test_import_invalid_backup() {
        let mut conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();

        let result = import_backup_json(&mut conn, "{invalid json}");
        assert!(matches!(result, Err(AppError::InvalidBackup(_))));

        let result_bad_version = import_backup_json(&mut conn, "{\"version\": 2, \"data\": {\"portfolio\":[],\"prices\":[],\"transactions\":[]}}");
        assert!(result_bad_version.is_err());
    }

    #[test]
    fn test_db_empty_and_normal_operations() {
        let mut conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();

        let state = get_portfolio_state(&conn).unwrap();
        assert_eq!(state.portfolio.len(), 4);
        assert_eq!(state.prices.len(), 0);
        assert_eq!(state.transactions.len(), 0);

        seed_if_empty(&mut conn).unwrap();
        let state_seeded = get_portfolio_state(&conn).unwrap();
        assert!(state_seeded.prices.len() > 0);
    }
}
