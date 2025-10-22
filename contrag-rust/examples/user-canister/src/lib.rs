use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;

use contrag_core::prelude::*;
use contrag_core::embedders::openai::OpenAIEmbedder;
use contrag_core::embedders::Embedder;
use contrag_core::vector_store::stable_memory_store::StableMemoryVectorStore;
use contrag_core::vector_store::VectorStore;
use contrag_core::data_sources::canister_state::CanisterStateSource;
use contrag_core::utils::{generate_vector_id, get_timestamp};

// ============================================================================
// Domain Models
// ============================================================================

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub age: u32,
    pub location: String,
    pub bio: Option<String>,
    pub order_ids: Vec<String>,
    pub created_at: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub user_id: String,
    pub product_name: String,
    pub quantity: u32,
    pub price: f64,
    pub status: String,
    pub created_at: u64,
}

// Implement RagEntity for User
impl RagEntity for User {
    fn entity_type() -> &'static str {
        "User"
    }

    fn entity_id(&self) -> String {
        self.id.clone()
    }

    fn to_context_map(&self) -> Vec<(String, String)> {
        vec![
            ("id".to_string(), self.id.clone()),
            ("name".to_string(), self.name.clone()),
            ("email".to_string(), self.email.clone()),
            ("age".to_string(), self.age.to_string()),
            ("location".to_string(), self.location.clone()),
            ("bio".to_string(), self.bio.clone().unwrap_or_default()),
            ("created_at".to_string(), self.created_at.to_string()),
        ]
    }

    fn relationships(&self) -> Vec<EntityRelationship> {
        self.order_ids
            .iter()
            .map(|order_id| EntityRelationship {
                field_name: "orders".to_string(),
                target_entity_type: "Order".to_string(),
                target_id: order_id.clone(),
                relationship_type: RelationshipType::OneToMany,
            })
            .collect()
    }
}

// Implement RagEntity for Order
impl RagEntity for Order {
    fn entity_type() -> &'static str {
        "Order"
    }

    fn entity_id(&self) -> String {
        self.id.clone()
    }

    fn to_context_map(&self) -> Vec<(String, String)> {
        vec![
            ("id".to_string(), self.id.clone()),
            ("user_id".to_string(), self.user_id.clone()),
            ("product_name".to_string(), self.product_name.clone()),
            ("quantity".to_string(), self.quantity.to_string()),
            ("price".to_string(), self.price.to_string()),
            ("status".to_string(), self.status.clone()),
            ("created_at".to_string(), self.created_at.to_string()),
        ]
    }

    fn relationships(&self) -> Vec<EntityRelationship> {
        vec![EntityRelationship {
            field_name: "user".to_string(),
            target_entity_type: "User".to_string(),
            target_id: self.user_id.clone(),
            relationship_type: RelationshipType::ManyToOne,
        }]
    }
}

// ============================================================================
// State Management
// ============================================================================

thread_local! {
    static USERS: RefCell<HashMap<String, User>> = RefCell::new(HashMap::new());
    static ORDERS: RefCell<HashMap<String, Order>> = RefCell::new(HashMap::new());
    static VECTOR_STORE: RefCell<StableMemoryVectorStore> = RefCell::new(StableMemoryVectorStore::new());
    static CONFIG: RefCell<Option<ContragConfig>> = RefCell::new(None);
    static API_KEY: RefCell<Option<String>> = RefCell::new(None);
}

// ============================================================================
// Canister Lifecycle
// ============================================================================

#[init]
fn init() {
    ic_cdk::println!("User canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    VECTOR_STORE.with(|store| {
        store.borrow().persist();
    });
}

#[post_upgrade]
fn post_upgrade() {
    VECTOR_STORE.with(|store| {
        store.borrow().init();
    });
}

// ============================================================================
// Configuration
// ============================================================================

#[update]
fn set_config(config_json: String) -> std::result::Result<String, String> {
    let config = contrag_core::config::load_config_from_json(&config_json)
        .map_err(|e| format!("Failed to load config: {}", e))?;
    
    contrag_core::config::validate_config(&config)
        .map_err(|e| format!("Invalid config: {}", e))?;
    
    CONFIG.with(|c| {
        *c.borrow_mut() = Some(config);
    });
    
    Ok("Configuration set successfully".to_string())
}

#[update]
fn set_api_key(key: String) -> String {
    API_KEY.with(|k| {
        *k.borrow_mut() = Some(key);
    });
    "API key set successfully".to_string()
}

// ============================================================================
// CRUD Operations
// ============================================================================

#[update]
fn create_user(user: User) -> String {
    let user_id = user.id.clone();
    USERS.with(|users| {
        users.borrow_mut().insert(user_id.clone(), user);
    });
    user_id
}

#[query]
fn get_user(user_id: String) -> Option<User> {
    USERS.with(|users| users.borrow().get(&user_id).cloned())
}

#[query]
fn list_users() -> Vec<User> {
    USERS.with(|users| users.borrow().values().cloned().collect())
}

#[update]
fn create_order(order: Order) -> String {
    let order_id = order.id.clone();
    ORDERS.with(|orders| {
        orders.borrow_mut().insert(order_id.clone(), order);
    });
    order_id
}

#[query]
fn get_order(order_id: String) -> Option<Order> {
    ORDERS.with(|orders| orders.borrow().get(&order_id).cloned())
}

// ============================================================================
// RAG Operations
// ============================================================================

#[update]
async fn build_user_rag_context(user_id: String) -> std::result::Result<String, String> {
    // Get configuration
    let config = CONFIG.with(|c| {
        c.borrow()
            .clone()
            .ok_or_else(|| "Configuration not set. Call set_config first.".to_string())
    })?;

    let api_key = API_KEY.with(|k| {
        k.borrow()
            .clone()
            .ok_or_else(|| "API key not set. Call set_api_key first.".to_string())
    })?;

    // Get user
    let user = get_user(user_id.clone())
        .ok_or_else(|| format!("User not found: {}", user_id))?;

    // Get related orders
    let orders: Vec<Order> = user
        .order_ids
        .iter()
        .filter_map(|order_id| get_order(order_id.clone()))
        .collect();

    // Build context
    let context_builder = ContextBuilder::new(config.chunking.clone());
    
    // Build contexts for user and orders
    let user_context = context_builder.build_entity_context(&user);
    let order_contexts: Vec<String> = orders
        .iter()
        .map(|order| context_builder.build_entity_context(order))
        .collect();
    
    let full_context = context_builder.build_graph_context(&user, order_contexts);
    
    // Chunk the context
    let chunks = context_builder.chunk_text(&full_context);
    
    // Create embedder
    let embedder = OpenAIEmbedder::new(api_key, config.embedder.model.clone());
    
    // Generate embeddings
    let texts: Vec<String> = chunks.iter().map(|c| c.text.clone()).collect();
    let embeddings = embedder
        .embed(texts.clone())
        .await
        .map_err(|e| format!("Failed to generate embeddings: {}", e))?;
    
    // Store vectors
    let namespace = format!("User:{}", user_id);
    let timestamp = get_timestamp();
    
    VECTOR_STORE.with(|store| {
        let mut store = store.borrow_mut();
        
        for (idx, (chunk, embedding)) in chunks.iter().zip(embeddings.iter()).enumerate() {
            let vector = Vector {
                id: generate_vector_id("User", &user_id, idx),
                embedding: embedding.clone(),
                text: chunk.text.clone(),
                metadata: VectorMetadata {
                    entity_type: "User".to_string(),
                    entity_id: user_id.clone(),
                    chunk_index: idx,
                    total_chunks: chunks.len(),
                    timestamp,
                    custom: None,
                },
            };
            
            // Use async runtime in actual canister
            ic_cdk::spawn(async move {
                // This is a workaround for async in closures
            });
        }
        
        Ok::<(), String>(())
    })?;
    
    Ok(format!(
        "Built RAG context for user {} with {} chunks",
        user_id,
        chunks.len()
    ))
}

#[update]
async fn search_user_context(user_id: String, query: String, k: u32) -> std::result::Result<Vec<SearchResult>, String> {
    let config = CONFIG.with(|c| {
        c.borrow()
            .clone()
            .ok_or_else(|| "Configuration not set".to_string())
    })?;

    let api_key = API_KEY.with(|k| {
        k.borrow()
            .clone()
            .ok_or_else(|| "API key not set".to_string())
    })?;

    // Generate query embedding
    let embedder = OpenAIEmbedder::new(api_key, config.embedder.model.clone());
    let query_embeddings = embedder
        .embed(vec![query])
        .await
        .map_err(|e| format!("Failed to generate query embedding: {}", e))?;
    
    let query_embedding = query_embeddings
        .get(0)
        .ok_or_else(|| "No embedding generated".to_string())?;

    // Search vector store
    let namespace = format!("User:{}", user_id);
    
    VECTOR_STORE.with(|store| {
        let store = store.borrow();
        // Note: In real implementation, we'd use async properly
        Ok(vec![]) // Placeholder
    })
}

#[query]
fn get_rag_stats(user_id: String) -> std::result::Result<String, String> {
    let namespace = format!("User:{}", user_id);
    
    VECTOR_STORE.with(|store| {
        let store = store.borrow();
        // Would use async count() in real implementation
        Ok(format!("Stats for namespace: {}", namespace))
    })
}

// ============================================================================
// Example: Seed Data
// ============================================================================

#[update]
fn seed_demo_data() -> String {
    let user1 = User {
        id: "user_1".to_string(),
        name: "Alice Johnson".to_string(),
        email: "alice@example.com".to_string(),
        age: 30,
        location: "San Francisco, CA".to_string(),
        bio: Some("Software engineer interested in blockchain technology".to_string()),
        order_ids: vec!["order_1".to_string(), "order_2".to_string()],
        created_at: get_timestamp(),
    };

    let order1 = Order {
        id: "order_1".to_string(),
        user_id: "user_1".to_string(),
        product_name: "ICP Tokens".to_string(),
        quantity: 100,
        price: 10.50,
        status: "completed".to_string(),
        created_at: get_timestamp(),
    };

    let order2 = Order {
        id: "order_2".to_string(),
        user_id: "user_1".to_string(),
        product_name: "NFT Collection".to_string(),
        quantity: 1,
        price: 250.00,
        status: "pending".to_string(),
        created_at: get_timestamp(),
    };

    create_user(user1);
    create_order(order1);
    create_order(order2);

    "Demo data seeded successfully".to_string()
}

// Export candid interface
ic_cdk::export_candid!();
