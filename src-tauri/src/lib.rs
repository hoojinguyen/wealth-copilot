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
    db::save_transaction_and_update_portfolio(&mut conn, log)
}

#[tauri::command]
fn run_rebalancer(
    state: tauri::State<'_, AppState>,
    lambda: f64,
) -> Result<SolverResult, AppError> {
    if lambda <= 0.0 || !lambda.is_finite() {
        return Err(AppError::Solver("Risk aversion lambda must be a positive finite number".to_string()));
    }

    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;

    // Check if cache has values
    if cache.covariance.is_none() || cache.expected_returns.is_none() {
        let conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
        let state_data = db::get_portfolio_state(&conn)?;
        
        // Ensure database has enough historical data
        let (cov, ret) = solver::calculate_covariance_and_returns(&state_data.prices)?;
        cache.covariance = Some(cov);
        cache.expected_returns = Some(ret);
    }

    let cov = cache.covariance.as_ref().unwrap();
    let ret = cache.expected_returns.as_ref().unwrap();

    solver::run_optimizer(cov, ret, lambda)
}

#[tauri::command]
fn sync_market_data(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    // 1. Run the sync process network call OUTSIDE of database mutex lock
    let synced_prices = sync::perform_sync_network("hoojinguyen", "eager-bell")?;

    // 2. Acquire lock only to write to SQLite
    let mut conn = state.db.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    sync::write_synced_prices(&mut conn, &synced_prices)?;

    // 3. Update the solver cache immediately
    let mut cache = state.cache.lock().map_err(|_| AppError::Solver("Mutex lock poisoned".to_string()))?;
    let (cov, ret) = solver::calculate_covariance_and_returns(&synced_prices)?;
    cache.covariance = Some(cov);
    cache.expected_returns = Some(ret);

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Retrieve local app data directory for SQLite DB storage
            let app_data_dir = app.path().app_data_dir().expect("Failed to get App Data directory");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create App Data directory");
            
            let db_path = app_data_dir.join("eager-bell.db");
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
            import_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
