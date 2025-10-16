pub mod canister_state;
pub mod stable_memory;

use candid::CandidType;
use crate::entity::RagEntity;
use crate::error::Result;

/// Trait for data sources that can provide entities
/// 
/// Implement this trait to create custom data sources for your canister.
#[async_trait::async_trait]
pub trait DataSource: Send + Sync {
    /// Read a single entity by ID
    async fn read_entity<T: RagEntity + CandidType>(
        &self,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<T>;

    /// Read multiple entities by IDs
    async fn read_entities<T: RagEntity + CandidType + Send>(
        &self,
        entity_type: &str,
        entity_ids: Vec<String>,
    ) -> Result<Vec<T>>;

    /// Query entities with optional filtering
    /// This is optional and can be implemented for more advanced querying
    async fn query_entities<T: RagEntity + CandidType>(
        &self,
        entity_type: &str,
        filter: Option<String>,
    ) -> Result<Vec<T>> {
        // Default implementation returns empty
        Ok(vec![])
    }
}
