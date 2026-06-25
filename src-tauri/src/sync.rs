use crate::errors::AppError;
use crate::db::AssetPriceRecord;
use serde::Deserialize;
use std::io::Read;
use flate2::read::GzDecoder;
use rusqlite::{params, Connection};

#[derive(Deserialize, Debug)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Deserialize, Debug)]
struct GitHubRelease {
    assets: Vec<GitHubAsset>,
}

pub fn perform_sync_network(
    repo_owner: &str,
    repo_name: &str,
) -> Result<Vec<AssetPriceRecord>, AppError> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("eager-bell-app")
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    // 1. Get latest release metadata from GitHub API
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        repo_owner, repo_name
    );

    let response = client.get(&url).send()?;

    // Handle rate limit (403 Forbidden with x-ratelimit-remaining = 0)
    if response.status() == reqwest::StatusCode::FORBIDDEN {
        if let Some(remaining) = response.headers().get("x-ratelimit-remaining") {
            if remaining == "0" {
                return Err(AppError::RateLimitExceeded);
            }
        }
    }

    if !response.status().is_success() {
        let err = response.error_for_status().err().unwrap_or_else(|| {
            reqwest::blocking::Client::new()
                .get("http://invalid")
                .send()
                .unwrap_err()
        });
        return Err(AppError::Network(err));
    }

    let release: GitHubRelease = response.json()?;

    // 2. Find market_data.json.gz asset
    let asset = release
        .assets
        .iter()
        .find(|a| a.name == "market_data.json.gz")
        .ok_or_else(|| {
            AppError::Solver("market_data.json.gz asset not found in latest release".to_string())
        })?;

    // 3. Download the asset
    let download_resp = client.get(&asset.browser_download_url).send()?;
    if !download_resp.status().is_success() {
        let err = download_resp.error_for_status().err().unwrap_or_else(|| {
            reqwest::blocking::Client::new()
                .get("http://invalid")
                .send()
                .unwrap_err()
        });
        return Err(AppError::Network(err));
    }

    let bytes = download_resp.bytes()?;

    // 4. Decompress the gzip file
    let mut decoder = GzDecoder::new(&bytes[..]);
    let mut decompressed_json = String::new();
    decoder.read_to_string(&mut decompressed_json)?;

    // 5. Parse JSON
    let records: Vec<AssetPriceRecord> = serde_json::from_str(&decompressed_json)?;

    if records.is_empty() {
        return Err(AppError::Solver("Downloaded market data is empty".to_string()));
    }

    Ok(records)
}

pub fn write_synced_prices(
    conn: &mut Connection,
    records: &[AssetPriceRecord],
) -> Result<(), AppError> {
    let tx = conn.transaction()?;
    {
        let mut stmt = tx.prepare_cached(
            "INSERT OR REPLACE INTO asset_prices (date, asset, price) VALUES (?1, ?2, ?3);",
        )?;

        for record in records {
            stmt.execute(params![record.date, record.asset, record.price])?;
        }
    }
    tx.commit()?;
    Ok(())
}
