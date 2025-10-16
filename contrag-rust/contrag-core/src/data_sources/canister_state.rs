use candid::{CandidType, Principal, encode_one, decode_one};
use crate::data_sources::DataSource;
use crate::entity::RagEntity;
use crate::error::{ContragError, Result};
use crate::config::EntityConfig;

/// Data source that reads from other ICP canisters via inter-canister calls
pub struct CanisterStateSource {
    entity_configs: std::collections::HashMap<String, EntityConfig>,
}

impl CanisterStateSource {
    /// Create a new canister state source with entity configurations
    pub fn new(entity_configs: Vec<EntityConfig>) -> Self {
        let mut map = std::collections::HashMap::new();
        for config in entity_configs {
            map.insert(config.name.clone(), config);
        }
        Self {
            entity_configs: map,
        }
    }

    /// Get entity configuration by type
    fn get_config(&self, entity_type: &str) -> Result<&EntityConfig> {
        self.entity_configs
            .get(entity_type)
            .ok_or_else(|| {
                ContragError::ConfigError(format!("No configuration found for entity type: {}", entity_type))
            })
    }

    /// Make inter-canister call to fetch entity
    /// 
    /// Note: This is a placeholder for the actual ICP inter-canister call.
    /// In a real canister, you would use ic_cdk::call
    async fn call_canister<T: CandidType>(
        &self,
        canister_id: Principal,
        method: &str,
        args: Vec<u8>,
    ) -> Result<T> {
        // This would be implemented using ic_cdk::call in actual canister code
        // For now, this is a placeholder that will be replaced in the canister implementation
        
        #[cfg(target_family = "wasm")]
        {
            use ic_cdk::api::call::call_raw;
            
            let result = call_raw(canister_id, method, args, 0)
                .await
                .map_err(|(code, msg)| {
                    ContragError::CanisterCallError(format!("Call failed: {:?} - {}", code, msg))
                })?;
            
            decode_one(&result).map_err(|e| {
                ContragError::CanisterCallError(format!("Failed to decode response: {}", e))
            })
        }
        
        #[cfg(not(target_family = "wasm"))]
        {
            Err(ContragError::CanisterCallError(
                "Canister calls only work in WASM environment".to_string()
            ))
        }
    }
}

#[async_trait::async_trait]
impl DataSource for CanisterStateSource {
    async fn read_entity<T: RagEntity + CandidType>(
        &self,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<T> {
        let config = self.get_config(entity_type)?;
        
        let canister_id = Principal::from_text(&config.canister_id)
            .map_err(|e| ContragError::ConfigError(format!("Invalid canister ID: {}", e)))?;
        
        // Encode the entity_id as argument
        let args = encode_one(&entity_id)
            .map_err(|e| ContragError::SerializationError(format!("Failed to encode args: {}", e)))?;
        
        self.call_canister(canister_id, &config.fetch_method, args)
            .await
    }

    async fn read_entities<T: RagEntity + CandidType + Send>(
        &self,
        entity_type: &str,
        entity_ids: Vec<String>,
    ) -> Result<Vec<T>> {
        let mut entities = vec![];
        
        // Fetch entities one by one
        // TODO: Optimize with batch fetch if fetch_many_method is configured
        for id in entity_ids {
            match self.read_entity(entity_type, &id).await {
                Ok(entity) => entities.push(entity),
                Err(e) => {
                    ic_cdk::println!("Failed to fetch entity {} of type {}: {:?}", id, entity_type, e);
                    // Continue with other entities
                }
            }
        }
        
        Ok(entities)
    }

    async fn query_entities<T: RagEntity + CandidType>(
        &self,
        entity_type: &str,
        _filter: Option<String>,
    ) -> Result<Vec<T>> {
        let config = self.get_config(entity_type)?;
        
        if let Some(fetch_many_method) = &config.fetch_many_method {
            let canister_id = Principal::from_text(&config.canister_id)
                .map_err(|e| ContragError::ConfigError(format!("Invalid canister ID: {}", e)))?;
            
            let args = encode_one(&_filter)
                .map_err(|e| ContragError::SerializationError(format!("Failed to encode args: {}", e)))?;
            
            self.call_canister(canister_id, fetch_many_method, args)
                .await
        } else {
            Ok(vec![])
        }
    }
}

/// Helper to create a canister state source from config
pub fn create_from_config(entity_configs: Vec<EntityConfig>) -> CanisterStateSource {
    CanisterStateSource::new(entity_configs)
}
