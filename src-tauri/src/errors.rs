use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Solver error: {0}")]
    Solver(String),

    #[error("Rate limit exceeded. Please try again later.")]
    RateLimitExceeded,

    #[error("Database is empty. Please sync market data or load seed data first.")]
    EmptyDatabase,

    #[error("Invalid backup file: {0}")]
    InvalidBackup(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        use serde::ser::SerializeStruct;
        let code = match self {
            AppError::Db(_) => "DATABASE_ERROR",
            AppError::Network(_) => "NETWORK_ERROR",
            AppError::Json(_) => "JSON_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Solver(_) => "SOLVER_ERROR",
            AppError::RateLimitExceeded => "RATE_LIMIT_EXCEEDED",
            AppError::EmptyDatabase => "EMPTY_DATABASE",
            AppError::InvalidBackup(_) => "INVALID_BACKUP",
        };
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", code)?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}
