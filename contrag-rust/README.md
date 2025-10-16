# ContRAG Rust - ICP Edition

**Bring Retrieval-Augmented Generation (RAG) to Web3 with ICP Canisters**

ContRAG Rust is a powerful library for building RAG systems directly on the Internet Computer Protocol (ICP). Store entity data on-chain, generate embeddings via HTTP outcalls, and build intelligent context for AI applications—all within your canister.

## 🚀 Key Features

- **On-Chain RAG**: Build RAG systems entirely on ICP with stable memory storage
- **External AI Integration**: Use OpenAI, Gemini, or custom embedders via HTTP outcalls
- **Flexible Data Sources**: Read from canister state, stable memory, or inter-canister calls
- **Web3-Native**: Designed specifically for blockchain data and Web3 applications
- **Zero Database Dependencies**: No PostgreSQL, MongoDB, or external vector DBs required
- **Developer-Friendly**: Simple configuration with `.env` for secrets, JSON for schemas

## 📦 Installation

Add to your canister's `Cargo.toml`:

```toml
[dependencies]
contrag-core = { git = "https://github.com/dhaniverse/contrag", branch = "main" }
ic-cdk = "0.13"
ic-cdk-macros = "0.13"
candid = "0.10"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## 🎯 Quick Start

### 1. Define Your Entities

```rust
use contrag_core::prelude::*;
use candid::{CandidType, Deserialize};
use serde::Serialize;

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub order_ids: Vec<String>,
}

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
        ]
    }

    fn relationships(&self) -> Vec<EntityRelationship> {
        self.order_ids
            .iter()
            .map(|id| EntityRelationship {
                field_name: "orders".to_string(),
                target_entity_type: "Order".to_string(),
                target_id: id.clone(),
                relationship_type: RelationshipType::OneToMany,
            })
            .collect()
    }
}
```

### 2. Create Configuration

Create `contrag.config.json`:

```json
{
  "entities": [
    {
      "name": "User",
      "canister_id": "your-canister-id",
      "fetch_method": "get_user",
      "relationships": [],
      "auto_include": true
    }
  ],
  "embedder": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "chunking": {
    "chunk_size": 1000,
    "overlap": 100,
    "include_field_names": true
  },
  "vector_store": {
    "storage_type": "stable_memory",
    "enable_cache": true
  }
}
```

Create `.env` (DO NOT commit):

```bash
OPENAI_API_KEY=sk-your-key-here
```

### 3. Build RAG Context

```rust
use ic_cdk_macros::*;
use contrag_core::prelude::*;
use contrag_core::embedders::openai::OpenAIEmbedder;
use contrag_core::vector_store::stable_memory_store::StableMemoryVectorStore;

#[update]
async fn build_rag_context(user_id: String, api_key: String) -> Result<String, String> {
    // Load configuration
    let config_json = include_str!("../contrag.config.json");
    let config = contrag_core::config::load_config_from_json(config_json)
        .map_err(|e| e.to_string())?;

    // Get user data
    let user = get_user(user_id.clone())
        .ok_or_else(|| "User not found".to_string())?;

    // Build context
    let context_builder = ContextBuilder::new(config.chunking.clone());
    let context = context_builder.build_entity_context(&user);
    let chunks = context_builder.chunk_text(&context);

    // Generate embeddings
    let embedder = OpenAIEmbedder::new(api_key, config.embedder.model.clone());
    let texts: Vec<String> = chunks.iter().map(|c| c.text.clone()).collect();
    let embeddings = embedder.embed(texts.clone())
        .await
        .map_err(|e| e.to_string())?;

    // Store vectors
    let mut vector_store = StableMemoryVectorStore::new();
    let namespace = format!("User:{}", user_id);
    
    for (idx, (chunk, embedding)) in chunks.iter().zip(embeddings).enumerate() {
        let vector = Vector {
            id: format!("{}::chunk_{}", user_id, idx),
            embedding,
            text: chunk.text.clone(),
            metadata: VectorMetadata {
                entity_type: "User".to_string(),
                entity_id: user_id.clone(),
                chunk_index: idx,
                total_chunks: chunks.len(),
                timestamp: ic_cdk::api::time(),
                custom: None,
            },
        };
        vector_store.store(&namespace, vector).await.map_err(|e| e.to_string())?;
    }

    Ok(format!("Built context with {} chunks", chunks.len()))
}
```

### 4. Search Context

```rust
#[update]
async fn search_context(
    user_id: String,
    query: String,
    api_key: String,
) -> Result<Vec<SearchResult>, String> {
    let config_json = include_str!("../contrag.config.json");
    let config = contrag_core::config::load_config_from_json(config_json)
        .map_err(|e| e.to_string())?;

    // Generate query embedding
    let embedder = OpenAIEmbedder::new(api_key, config.embedder.model.clone());
    let query_embeddings = embedder.embed(vec![query])
        .await
        .map_err(|e| e.to_string())?;
    
    let query_embedding = query_embeddings
        .into_iter()
        .next()
        .ok_or_else(|| "No embedding generated".to_string())?;

    // Search vector store
    let vector_store = StableMemoryVectorStore::new();
    let namespace = format!("User:{}", user_id);
    
    vector_store.search(&namespace, query_embedding, 5)
        .await
        .map_err(|e| e.to_string())
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Your ICP Canister (Rust)       │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   contrag-core Library       │  │
│  │                              │  │
│  │  • RagEntity Trait           │  │
│  │  • ContextBuilder            │  │
│  │  • StableMemoryVectorStore   │  │
│  │  • Entity Relationships      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
        │                    │
        ↓                    ↓
┌───────────────┐   ┌────────────────────┐
│ HTTP Outcalls │   │  Stable Memory     │
│               │   │                    │
│ • OpenAI      │   │ • On-chain vectors │
│ • Gemini      │   │ • Persistent state │
│ • Custom APIs │   │ • Upgrade-safe     │
└───────────────┘   └────────────────────┘
```

## 🎨 Core Concepts

### RagEntity Trait

Implement this trait on your canister data structures to enable RAG:

```rust
pub trait RagEntity {
    fn entity_type() -> &'static str;           // e.g., "User", "Order"
    fn entity_id(&self) -> String;              // Unique ID
    fn to_context_map(&self) -> Vec<(String, String)>;  // Flatten to key-value
    fn relationships(&self) -> Vec<EntityRelationship>;   // Related entities
}
```

### Context Building

```rust
let builder = ContextBuilder::new(config.chunking);

// Single entity
let context = builder.build_entity_context(&user);

// Entity with relationships
let related = vec![order1_context, order2_context];
let graph_context = builder.build_graph_context(&user, related);

// Chunk long text
let chunks = builder.chunk_text(&graph_context);
```

### Vector Storage

```rust
let mut store = StableMemoryVectorStore::new();

// Store vector
store.store(namespace, vector).await?;

// Search
let results = store.search(namespace, query_embedding, k).await?;

// Manage
store.count(namespace).await?;
store.delete_namespace(namespace).await?;
```

## 🔧 Configuration

### Entity Configuration

```json
{
  "name": "User",
  "canister_id": "rrkah-fqaaa-aaaaa-aaaaq-cai",
  "fetch_method": "get_user",
  "fetch_many_method": "list_users",
  "relationships": [
    {
      "field_name": "order_ids",
      "target_entity": "Order",
      "relationship_type": "one_to_many"
    }
  ],
  "auto_include": true
}
```

### Embedder Configuration

**OpenAI:**
```json
{
  "provider": "openai",
  "model": "text-embedding-3-small",
  "dimensions": 1536
}
```

**Gemini:**
```json
{
  "provider": "gemini",
  "model": "embedding-001",
  "dimensions": 768
}
```

### Chunking Configuration

```json
{
  "chunk_size": 1000,        // Characters per chunk
  "overlap": 100,            // Overlap between chunks
  "include_field_names": true  // Include "field: value" format
}
```

## 🌟 Advanced Features

### Cached Embeddings

```rust
use contrag_core::embedders::{CachedEmbedder, Embedder};

let embedder = OpenAIEmbedder::new(api_key, model);
let mut cached = CachedEmbedder::new(embedder, 1000); // Cache 1000 entries

let embeddings = cached.embed_with_cache(texts).await?;
```

### Inter-Canister Data Sources

```rust
use contrag_core::data_sources::canister_state::CanisterStateSource;

let source = CanisterStateSource::new(entity_configs);
let user = source.read_entity::<User>("User", "user_123").await?;
```

### Custom Similarity Metrics

```rust
use contrag_core::vector_store::{cosine_similarity, euclidean_distance};

let similarity = cosine_similarity(&embedding1, &embedding2);
let distance = euclidean_distance(&embedding1, &embedding2);
```

## 📊 Comparison: TypeScript vs Rust

| Feature | TypeScript ContRAG | Rust ContRAG (ICP) |
|---------|-------------------|-------------------|
| **Data Sources** | PostgreSQL, MongoDB | Canister state, Stable memory |
| **Vector Storage** | Weaviate, pgvector | On-chain (stable memory) |
| **Embedders** | OpenAI, Gemini | OpenAI, Gemini (HTTP outcalls) |
| **Configuration** | Config file + .env | Config file + .env |
| **Schema Introspection** | ✅ Automatic | ❌ Manual (trait impl) |
| **Runtime** | Node.js | WASM (ICP canister) |
| **Storage Cost** | External DB fees | ~$5/GB/year on-chain |
| **Query Speed** | Fast (indexed DB) | Fast (in-memory) |
| **Web3 Native** | ❌ | ✅ |

## 🎯 Use Cases

1. **DeFi Personalization**: Build user profiles from transaction history
2. **NFT Recommendations**: Suggest NFTs based on user preferences and activity
3. **DAO Governance**: Context-aware proposal summaries
4. **Web3 Social**: Personalized content feeds from on-chain data
5. **Gaming**: Player profiles and achievement context
6. **Identity Systems**: Rich user context from verifiable credentials

## 🚧 Limitations & Roadmap

### Current Limitations

- ❌ No automatic schema introspection (requires manual `RagEntity` impl)
- ❌ Simple cosine similarity (no advanced indexing like HNSW)
- ❌ Single-canister vector storage (no distributed sharding yet)
- ⚠️ HTTP outcall costs (cycles consumed per API call)

### Roadmap

- [ ] Derive macro for `RagEntity` (auto-implementation)
- [ ] HNSW indexing for faster similarity search
- [ ] Multi-canister vector sharding
- [ ] IPFS/Arweave vector storage adapter
- [ ] Preference tracking (port from TypeScript)
- [ ] Cross-chain data sources (Ethereum, Bitcoin)
- [ ] Built-in embedding caching in stable memory

## 📚 Examples

See `/examples/user-canister` for a complete working example with:

- User and Order entities
- Relationship mapping
- Context building
- Vector storage and search
- Demo data seeding

## 🤝 Contributing

Contributions welcome! This is an experimental project bringing RAG to Web3.

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Based on [ContRAG TypeScript](../README.md)
- Built for the Internet Computer Protocol
- Inspired by the vision of AI-powered Web3 applications

---

**Ready to unlock RAG in Web3?** 🚀

Start building intelligent, context-aware canisters today!
