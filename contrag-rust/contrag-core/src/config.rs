use serde::{Deserialize, Serialize};
use crate::error::{ContragError, Result};

/// Main configuration for ContRAG
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ContragConfig {
    /// Entity configurations
    pub entities: Vec<EntityConfig>,
    
    /// Embedder configuration
    pub embedder: EmbedderConfigDef,
    
    /// Chunking configuration
    pub chunking: ChunkingConfig,
    
    /// Vector store configuration
    pub vector_store: VectorStoreConfig,
    
    /// Optional system prompt for context generation
    pub system_prompt: Option<String>,
}

/// Entity configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EntityConfig {
    /// Entity type name (e.g., "User", "Order")
    pub name: String,
    
    /// Canister ID where this entity's data lives
    pub canister_id: String,
    
    /// Method name to call to fetch a single entity (e.g., "get_user")
    pub fetch_method: String,
    
    /// Method name to call to fetch multiple entities (e.g., "get_users")
    pub fetch_many_method: Option<String>,
    
    /// Relationships to other entities
    pub relationships: Vec<RelationshipConfig>,
    
    /// Whether to include this entity in automatic context building
    pub auto_include: bool,
}

/// Relationship configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RelationshipConfig {
    /// Field name in the source entity that contains the reference
    pub field_name: String,
    
    /// Target entity type
    pub target_entity: String,
    
    /// Relationship type
    pub relationship_type: String, // "one_to_one", "one_to_many", etc.
}

/// Embedder provider configuration (from config file)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EmbedderConfigDef {
    /// Provider: "openai" or "gemini"
    pub provider: String,
    
    /// Model name
    pub model: String,
    
    /// Expected dimensions
    pub dimensions: usize,
    
    /// API endpoint (optional, uses default if not provided)
    pub api_endpoint: Option<String>,
}

/// Chunking configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChunkingConfig {
    /// Chunk size in characters
    pub chunk_size: usize,
    
    /// Overlap between chunks in characters
    pub overlap: usize,
    
    /// Whether to include field names in chunks
    pub include_field_names: bool,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            chunk_size: 1000,
            overlap: 100,
            include_field_names: true,
        }
    }
}

/// Vector store configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VectorStoreConfig {
    /// Storage type: "stable_memory" or "hybrid"
    pub storage_type: String,
    
    /// Maximum vectors to keep in hot storage (for hybrid mode)
    pub max_hot_vectors: Option<usize>,
    
    /// Whether to enable caching
    pub enable_cache: bool,
}

impl Default for VectorStoreConfig {
    fn default() -> Self {
        Self {
            storage_type: "stable_memory".to_string(),
            max_hot_vectors: Some(10000),
            enable_cache: true,
        }
    }
}

/// Environment variables structure
#[derive(Clone, Debug)]
pub struct EnvVars {
    pub openai_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
}

/// Load configuration from a JSON file
/// 
/// This expects the config file to NOT contain API keys.
/// API keys should be loaded separately from environment variables.
pub fn load_config_from_json(json_str: &str) -> Result<ContragConfig> {
    serde_json::from_str(json_str)
        .map_err(|e| ContragError::ConfigError(format!("Failed to parse config: {}", e)))
}

/// Validate configuration
pub fn validate_config(config: &ContragConfig) -> Result<()> {
    if config.entities.is_empty() {
        return Err(ContragError::InvalidConfig(
            "At least one entity must be configured".to_string(),
        ));
    }

    if config.embedder.dimensions == 0 {
        return Err(ContragError::InvalidConfig(
            "Embedder dimensions must be greater than 0".to_string(),
        ));
    }

    if config.chunking.chunk_size == 0 {
        return Err(ContragError::InvalidConfig(
            "Chunk size must be greater than 0".to_string(),
        ));
    }

    if config.chunking.overlap >= config.chunking.chunk_size {
        return Err(ContragError::InvalidConfig(
            "Overlap must be less than chunk size".to_string(),
        ));
    }

    // Validate entity configurations
    for entity in &config.entities {
        if entity.name.is_empty() {
            return Err(ContragError::InvalidConfig(
                "Entity name cannot be empty".to_string(),
            ));
        }
        if entity.canister_id.is_empty() {
            return Err(ContragError::InvalidConfig(
                format!("Canister ID for entity '{}' cannot be empty", entity.name),
            ));
        }
    }

    Ok(())
}

/// Helper to create a minimal config for testing
pub fn create_default_config() -> ContragConfig {
    ContragConfig {
        entities: vec![],
        embedder: EmbedderConfigDef {
            provider: "openai".to_string(),
            model: "text-embedding-3-small".to_string(),
            dimensions: 1536,
            api_endpoint: None,
        },
        chunking: ChunkingConfig::default(),
        vector_store: VectorStoreConfig::default(),
        system_prompt: None,
    }
}

/// Load configuration with merged environment variables
/// 
/// This is the main entry point for loading configuration.
/// It reads the config file and merges it with environment variables.
pub fn load_config(config_json: &str, env_vars: EnvVars) -> Result<ContragConfig> {
    let config = load_config_from_json(config_json)?;
    validate_config(&config)?;
    Ok(config)
}
