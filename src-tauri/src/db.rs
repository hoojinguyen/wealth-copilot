use rusqlite::{params, Connection};
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionLog {
    pub id: Option<i32>,
    pub asset: String,
    pub action_type: String, // Buy, Sell, Deposit, Withdraw
    pub quantity: f64,
    pub price: f64,
    pub date: String,
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

    // Ensure default portfolio entries exist
    let default_assets = ["Savings", "Gold", "VN30", "Diamond"];
    for asset in default_assets {
        conn.execute(
            "INSERT OR IGNORE INTO user_portfolio (asset, quantity) VALUES (?1, 0.0);",
            [asset],
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
    let mut stmt = conn.prepare("SELECT asset, quantity FROM user_portfolio;")?;
    let portfolio = stmt
        .query_map([], |row| {
            Ok(PortfolioItem {
                asset: row.get(0)?,
                quantity: row.get(1)?,
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
        "SELECT id, asset, action_type, quantity, price, date FROM transaction_logs ORDER BY date DESC, id DESC;",
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
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(PortfolioState {
        portfolio,
        prices,
        transactions,
    })
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

    // Validate asset type
    let valid_assets = ["Savings", "Gold", "VN30", "Diamond"];
    if !valid_assets.contains(&log.asset.as_str()) {
        return Err(AppError::Solver(format!(
            "Invalid asset type: {}",
            log.asset
        )));
    }

    let tx = conn.transaction()?;

    // 1. Insert transaction log
    tx.execute(
        "INSERT INTO transaction_logs (asset, action_type, quantity, price, date)
         VALUES (?1, ?2, ?3, ?4, ?5);",
        params![log.asset, log.action_type, log.quantity, log.price, log.date],
    )?;

    // 2. Retrieve current quantity
    let current_qty: f64 = tx.query_row(
        "SELECT quantity FROM user_portfolio WHERE asset = ?1;",
        [&log.asset],
        |row| row.get(0),
    ).unwrap_or(0.0);

    // 3. Calculate new quantity based on action type
    let delta = match log.action_type.as_str() {
        "Buy" | "Deposit" => log.quantity,
        "Sell" | "Withdraw" => -log.quantity,
        _ => 0.0,
    };

    let new_qty = (current_qty + delta).max(0.0);

    // 4. Update user portfolio
    tx.execute(
        "INSERT OR REPLACE INTO user_portfolio (asset, quantity) VALUES (?1, ?2);",
        params![log.asset, new_qty],
    )?;

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

    // Validate backup data business rules before writing
    let valid_assets = ["Savings", "Gold", "VN30", "Diamond"];
    for item in &state.portfolio {
        if !valid_assets.contains(&item.asset.as_str()) {
            return Err(AppError::InvalidBackup(format!("Invalid asset in backup: {}", item.asset)));
        }
        if item.quantity < 0.0 {
            return Err(AppError::InvalidBackup(format!("Negative quantity for asset: {}", item.asset)));
        }
    }
    for tx_log in &state.transactions {
        if !valid_assets.contains(&tx_log.asset.as_str()) {
            return Err(AppError::InvalidBackup(format!("Invalid asset in transaction log: {}", tx_log.asset)));
        }
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
            "INSERT OR REPLACE INTO user_portfolio (asset, quantity) VALUES (?1, ?2);",
            params![item.asset, item.quantity],
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
            "INSERT INTO transaction_logs (id, asset, action_type, quantity, price, date)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params![log.id, log.asset, log.action_type, log.quantity, log.price, log.date],
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

    // 2. Reset all default assets to 0.0
    let default_assets = ["Savings", "Gold", "VN30", "Diamond"];
    for asset in default_assets {
        tx.execute(
            "INSERT OR REPLACE INTO user_portfolio (asset, quantity) VALUES (?1, 0.0);",
            params![asset],
        )?;
    }

    // 3. Select all remaining transaction logs chronologically
    let mut quantities = std::collections::HashMap::new();
    for asset in &default_assets {
        quantities.insert(asset.to_string(), 0.0);
    }

    {
        let mut stmt = tx.prepare("SELECT asset, action_type, quantity FROM transaction_logs ORDER BY date ASC, id ASC;")?;
        let mut rows = stmt.query([])?;

        while let Some(row) = rows.next()? {
            let asset: String = row.get(0)?;
            let action_type: String = row.get(1)?;
            let quantity: f64 = row.get(2)?;

            let delta = match action_type.as_str() {
                "Buy" | "Deposit" => quantity,
                "Sell" | "Withdraw" => -quantity,
                _ => 0.0,
            };

            if let Some(qty) = quantities.get_mut(&asset) {
                *qty = (*qty + delta).max(0.0);
            }
        }
    }

    // 5. Save recalculated quantities to user_portfolio
    for (asset, qty) in quantities {
        tx.execute(
            "INSERT OR REPLACE INTO user_portfolio (asset, quantity) VALUES (?1, ?2);",
            params![asset, qty],
        )?;
    }

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
