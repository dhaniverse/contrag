pub mod config;
pub mod context_builder;
pub mod data_sources;
pub mod embedders;
pub mod entity;
pub mod error;
pub mod types;
pub mod utils;
pub mod vector_store;

// Re-exports for convenience
pub use config::{ContragConfig, EntityConfig, load_config};
pub use context_builder::ContextBuilder;
pub use entity::{RagEntity, EntityRelationship, RelationshipType};
pub use error::{ContragError, Result};
pub use types::*;

// Prelude module for common imports
pub mod prelude {
    pub use crate::config::{ContragConfig, EntityConfig};
    pub use crate::context_builder::ContextBuilder;
    pub use crate::entity::{RagEntity, EntityRelationship, RelationshipType};
    pub use crate::error::{ContragError, Result};
    pub use crate::types::*;
    pub use crate::data_sources::DataSource;
    pub use crate::embedders::Embedder;
    pub use crate::vector_store::VectorStore;
}
