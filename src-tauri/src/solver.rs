use crate::errors::AppError;
use crate::db::AssetPriceRecord;
use nalgebra::{DMatrix, DVector};
use clarabel::algebra::CscMatrix;
use clarabel::solver::{DefaultSolver, DefaultSettingsBuilder, SupportedConeT, SolverStatus, IPSolver};
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
pub struct SolverResult {
    pub weights: HashMap<String, f64>,
    pub expected_return: f64,
    pub volatility: f64,
}

#[derive(Debug, Default)]
pub struct SolverCache {
    pub covariance: Option<DMatrix<f64>>,
    pub expected_returns: Option<DVector<f64>>,
}

pub fn calculate_covariance_and_returns(
    prices: &[AssetPriceRecord],
) -> Result<(DMatrix<f64>, DVector<f64>), AppError> {
    // 1. Group prices by date
    let mut date_map: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for p in prices {
        date_map
            .entry(p.date.clone())
            .or_default()
            .insert(p.asset.clone(), p.price);
    }

    // Sort dates chronologically
    let mut dates: Vec<String> = date_map.keys().cloned().collect();
    dates.sort();

    if dates.is_empty() {
        return Err(AppError::EmptyDatabase);
    }

    if dates.len() < 3 {
        return Err(AppError::Solver(
            "Require at least 3 dates of historical price records to calculate covariance".to_string(),
        ));
    }

    let assets = vec!["Savings", "Gold", "VN30", "Diamond"];
    let num_assets = assets.len();
    let num_dates = dates.len();

    // 2. Build daily prices matrix
    // rows: dates, cols: assets
    let mut price_matrix = DMatrix::zeros(num_dates, num_assets);
    for (t, date) in dates.iter().enumerate() {
        let day_prices = date_map.get(date).unwrap();
        for (i, asset) in assets.iter().enumerate() {
            let price = day_prices.get(*asset).copied().ok_or_else(|| {
                AppError::Solver(format!("Missing price for {} on date {}", asset, date))
            })?;
            price_matrix[(t, i)] = price;
        }
    }

    // 3. Calculate daily returns
    // Savings (index 0) return is annual_rate / 250
    // Other assets return is (P_t - P_{t-1}) / P_{t-1}
    let num_returns = num_dates - 1;
    let mut return_matrix = DMatrix::zeros(num_returns, num_assets);
    for t in 0..num_returns {
        // Savings daily return
        let rate_t = price_matrix[(t + 1, 0)];
        return_matrix[(t, 0)] = rate_t / 250.0;

        for i in 1..num_assets {
            let p_prev = price_matrix[(t, i)];
            let p_curr = price_matrix[(t + 1, i)];
            if p_prev <= 0.0 || p_curr <= 0.0 {
                return Err(AppError::Solver(format!(
                    "Invalid price found for asset {} at index {}",
                    assets[i], t
                )));
            }
            return_matrix[(t, i)] = (p_curr - p_prev) / p_prev;
        }
    }

    // 4. Calculate expected returns (annualized)
    let mut expected_returns = DVector::zeros(num_assets);
    // Savings expected return is simply the latest rate
    expected_returns[0] = price_matrix[(num_dates - 1, 0)];
    for i in 1..num_assets {
        let sum: f64 = return_matrix.column(i).sum();
        expected_returns[i] = (sum / num_returns as f64) * 250.0;
    }

    // 5. Calculate covariance matrix (annualized)
    // Precompute column means to avoid O(N) calls inside nested loops
    let mut col_means = vec![0.0; num_assets];
    for i in 0..num_assets {
        col_means[i] = if i == 0 { expected_returns[0] / 250.0 } else { return_matrix.column(i).mean() };
    }

    let mut cov_matrix = DMatrix::zeros(num_assets, num_assets);
    for i in 0..num_assets {
        for j in 0..num_assets {
            let mean_i = col_means[i];
            let mean_j = col_means[j];

            let mut sum = 0.0;
            for t in 0..num_returns {
                sum += (return_matrix[(t, i)] - mean_i) * (return_matrix[(t, j)] - mean_j);
            }
            let cov = sum / (num_returns - 1) as f64;
            cov_matrix[(i, j)] = cov * 250.0;
        }
    }

    // 6. Regularize covariance matrix with epsilon padding (10^-6) on the diagonal
    let epsilon = 1e-6;
    for i in 0..num_assets {
        cov_matrix[(i, i)] += epsilon;
    }

    Ok((cov_matrix, expected_returns))
}

pub fn run_optimizer(
    cov_matrix: &DMatrix<f64>,
    expected_returns: &DVector<f64>,
    lambda: f64,
) -> Result<SolverResult, AppError> {
    let n = 4; // number of assets

    // P matrix = lambda * covariance
    let p_mat = cov_matrix * lambda;

    // Build P in Clarabel triplet format (Symmetric upper-triangular)
    let mut p_rows = Vec::new();
    let mut p_cols = Vec::new();
    let mut p_vals = Vec::new();
    for i in 0..n {
        for j in i..n {
            p_rows.push(i);
            p_cols.push(j);
            p_vals.push(p_mat[(i, j)]);
        }
    }
    let p = CscMatrix::new_from_triplets(n, n, p_rows, p_cols, p_vals);

    // q vector = -expected_returns
    let mut q = vec![0.0; n];
    for i in 0..n {
        q[i] = -expected_returns[i];
    }

    // Constraints:
    // Row 0: sum of weights = 1.0  => w0 + w1 + w2 + w3 + s_eq = 1.0 (s_eq in ZeroCone)
    // Row 1..4: w_i >= 0  => -w_i + s_i = 0.0 (s_i in NonnegativeCone)
    let a_rows = vec![0, 0, 0, 0, 1, 2, 3, 4];
    let a_cols = vec![0, 1, 2, 3, 0, 1, 2, 3];
    let a_vals = vec![1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0];
    let a = CscMatrix::new_from_triplets(5, n, a_rows, a_cols, a_vals);

    let b = vec![1.0, 0.0, 0.0, 0.0, 0.0];

    let cones = vec![
        SupportedConeT::ZeroConeT(1),
        SupportedConeT::NonnegativeConeT(4),
    ];

    let settings = DefaultSettingsBuilder::default()
        .verbose(false)
        .build()
        .map_err(|e| AppError::Solver(e.to_string()))?;

    let mut solver = DefaultSolver::new(&p, &q, &a, &b, &cones, settings);
    solver.solve();

    if matches!(solver.info.status, SolverStatus::Solved) {
        let weights = solver.solution.x.clone();
        
        // Calculate portfolio expected return and variance
        let w_vec = DVector::from_vec(weights.clone());
        let p_return = w_vec.dot(expected_returns);
        let p_variance = w_vec.dot(&(cov_matrix * &w_vec));
        let p_volatility = p_variance.sqrt();

        let mut weights_map = HashMap::new();
        let assets = vec!["Savings", "Gold", "VN30", "Diamond"];
        for (i, asset) in assets.iter().enumerate() {
            weights_map.insert(asset.to_string(), weights[i]);
        }

        Ok(SolverResult {
            weights: weights_map,
            expected_return: p_return,
            volatility: p_volatility,
        })
    } else {
        Err(AppError::Solver(format!(
            "Clarabel solver failed to converge. Status: {:?}",
            solver.info.status
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_covariance_empty_or_single_date() {
        let prices = vec![];
        let result = calculate_covariance_and_returns(&prices);
        assert!(matches!(result, Err(AppError::EmptyDatabase)));

        let prices_one = vec![
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Savings".to_string(), price: 0.05 },
        ];
        let result_one = calculate_covariance_and_returns(&prices_one);
        assert!(result_one.is_err());
    }

    #[test]
    fn test_calculate_covariance_invalid_price() {
        let prices = vec![
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Savings".to_string(), price: 0.05 },
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Gold".to_string(), price: 0.0 }, // invalid
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "VN30".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Diamond".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "Savings".to_string(), price: 0.05 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "Gold".to_string(), price: 80.0 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "VN30".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "Diamond".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "Savings".to_string(), price: 0.05 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "Gold".to_string(), price: 80.0 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "VN30".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "Diamond".to_string(), price: 10.0 },
        ];
        let result = calculate_covariance_and_returns(&prices);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_covariance_normal_path() {
        let prices = vec![
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Savings".to_string(), price: 0.05 },
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Gold".to_string(), price: 80.0 },
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "VN30".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-25".to_string(), asset: "Diamond".to_string(), price: 10.0 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "Savings".to_string(), price: 0.05 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "Gold".to_string(), price: 81.0 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "VN30".to_string(), price: 10.1 },
            AssetPriceRecord { date: "2026-06-26".to_string(), asset: "Diamond".to_string(), price: 10.2 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "Savings".to_string(), price: 0.05 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "Gold".to_string(), price: 82.0 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "VN30".to_string(), price: 10.2 },
            AssetPriceRecord { date: "2026-06-27".to_string(), asset: "Diamond".to_string(), price: 10.4 },
        ];
        let (cov, ret) = calculate_covariance_and_returns(&prices).unwrap();
        assert_eq!(cov.nrows(), 4);
        assert_eq!(ret.len(), 4);

        // run optimizer
        let result = run_optimizer(&cov, &ret, 5.0).unwrap();
        assert_eq!(result.weights.len(), 4);
        assert!(result.weights.contains_key("Savings"));
        assert!(result.weights.contains_key("Gold"));
    }
}
