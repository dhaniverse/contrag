use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContragError {
    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Data source error: {0}")]
    DataSourceError(String),

    #[error("Embedder error: {0}")]
    EmbedderError(String),

    #[error("Vector store error: {0}")]
    VectorStoreError(String),

    #[error("Entity not found: {0}")]
    EntityNotFound(String),

    #[error("Invalid dimension: expected {expected}, got {actual}")]
    DimensionMismatch { expected: usize, actual: usize },

    #[error("HTTP outcall error: {0}")]
    HttpOutcallError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Canister call error: {0}")]
    CanisterCallError(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Context building error: {0}")]
    ContextBuildError(String),
}

pub type Result<T> = std::result::Result<T, ContragError>;

impl From<serde_json::Error> for ContragError {
    fn from(err: serde_json::Error) -> Self {
        ContragError::SerializationError(err.to_string())
    }
}
