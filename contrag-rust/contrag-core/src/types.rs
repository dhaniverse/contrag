use candid::CandidType;
use serde::{Deserialize, Serialize};

/// Vector representation with metadata
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct Vector {
    pub id: String,
    pub embedding: Vec<f32>,
    pub text: String,
    pub metadata: VectorMetadata,
}

/// Metadata associated with a vector
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct VectorMetadata {
    pub entity_type: String,
    pub entity_id: String,
    pub chunk_index: usize,
    pub total_chunks: usize,
    pub timestamp: u64,
    pub custom: Option<String>, // JSON string for custom metadata
}

/// Search result from vector store
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct SearchResult {
    pub vector_id: String,
    pub text: String,
    pub score: f32,
    pub metadata: VectorMetadata,
}

/// Text chunk with overlap
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TextChunk {
    pub text: String,
    pub start_idx: usize,
    pub end_idx: usize,
    pub chunk_index: usize,
}

/// Entity graph node
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EntityNode {
    pub entity_type: String,
    pub entity_id: String,
    pub context_map: Vec<(String, String)>,
    pub relationships: Vec<EntityRelationship>,
}

/// Entity relationship definition
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct EntityRelationship {
    pub field_name: String,
    pub target_entity_type: String,
    pub target_id: String,
    pub relationship_type: RelationshipType,
}

/// Relationship cardinality types
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub enum RelationshipType {
    OneToOne,
    OneToMany,
    ManyToOne,
    ManyToMany,
}

/// Embedding model configuration
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EmbedderConfig {
    pub provider: String, // "openai" or "gemini"
    pub model: String,
    pub dimensions: usize,
    pub api_key: String, // Will be loaded from .env
}

/// HTTP outcall request
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
}

/// HTTP outcall response
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

/// Connection test result
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct ConnectionTestResult {
    pub plugin: String,
    pub connected: bool,
    pub latency: Option<u64>,
    pub error: Option<String>,
    pub details: Option<String>,
}
