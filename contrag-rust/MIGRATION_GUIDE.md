# ContRAG Rust - Migration Guide

## Migrating from TypeScript to Rust (ICP)

This guide helps you understand what was ported, what changed, and how to adapt your existing ContRAG workflows.

## ✅ What Was Ported (Core 40%)

### 1. **Context Building** (100% ported)
- ✅ Entity graph traversal
- ✅ Text chunking with overlap
- ✅ Relationship mapping
- ✅ Field flattening

### 2. **Embedder Integration** (95% ported)
- ✅ OpenAI embeddings
- ✅ Gemini embeddings
- ✅ System prompts
- ✅ Batch processing
- ✅ Caching layer
- ⚠️ HTTP outcalls replace direct SDK calls

### 3. **Vector Storage** (80% ported)
- ✅ Vector storage and retrieval
- ✅ Cosine similarity search
- ✅ Namespace management
- ⚠️ Stable memory instead of external DB
- ❌ No HNSW indexing (yet)

### 4. **Configuration** (90% ported)
- ✅ JSON-based entity configuration
- ✅ .env for secrets
- ✅ Embedder settings
- ✅ Chunking parameters
- ❌ No database connection strings

## ❌ What Was NOT Ported

### 1. **Database Plugins**
- ❌ PostgreSQL plugin
- ❌ MongoDB plugin
- ❌ pgvector store
- ❌ Weaviate integration

**Replacement**: `CanisterStateSource` + `StableMemoryVectorStore`

### 2. **Schema Introspection**
- ❌ Automatic table/collection scanning
- ❌ Foreign key detection
- ❌ Dynamic relationship inference

**Replacement**: Manual `RagEntity` trait implementation

### 3. **CLI Tools**
- ❌ `contrag init`
- ❌ `contrag test-connection`
- ❌ `contrag build-context`

**Replacement**: Use Candid UI and canister methods

### 4. **Preference Tracking**
- ❌ Automatic preference extraction
- ❌ User profiling
- ❌ Preference analytics

**Status**: Coming in v0.2

## 🔄 Key Differences

### Configuration

**TypeScript:**
```json
{
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "user": "user",
    "password": "password"
  }
}
```

**Rust (ICP):**
```json
{
  "entities": [
    {
      "name": "User",
      "canister_id": "rrkah-fqaaa-aaaaa-aaaaq-cai",
      "fetch_method": "get_user"
    }
  ]
}
```

### Entity Definition

**TypeScript (Automatic):**
```typescript
// ContRAG reads from database schema automatically
// No code needed!
```

**Rust (Manual):**
```rust
impl RagEntity for User {
    fn entity_type() -> &'static str { "User" }
    fn entity_id(&self) -> String { self.id.clone() }
    fn to_context_map(&self) -> Vec<(String, String)> {
        vec![("id", self.id), ("name", self.name)]
    }
    fn relationships(&self) -> Vec<EntityRelationship> {
        vec![/* ... */]
    }
}
```

### Data Access

**TypeScript:**
```typescript
const contextBuilder = new ContextBuilder(config);
await contextBuilder.buildContext('User', 'user_123');
```

**Rust:**
```rust
let builder = ContextBuilder::new(config.chunking);
let user = get_user(user_id)?;
let context = builder.build_entity_context(&user);
```

### Vector Storage

**TypeScript:**
```typescript
const store = new PgVectorStore(config);
await store.store(namespace, vectors);
```

**Rust:**
```rust
let mut store = StableMemoryVectorStore::new();
store.store(&namespace, vector).await?;
```

## 🎯 Migration Steps

### Step 1: Identify Your Entities

**From TypeScript:**
```sql
-- Your PostgreSQL schema
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);
```

**To Rust:**
```rust
#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
}
```

### Step 2: Implement RagEntity

```rust
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
        // Define relationships here
        vec![]
    }
}
```

### Step 3: Update Configuration

**From:**
```json
{
  "database": { ... },
  "vectorStore": {
    "type": "pgvector",
    "connection": "postgresql://..."
  }
}
```

**To:**
```json
{
  "entities": [
    {
      "name": "User",
      "canister_id": "your-canister-id",
      "fetch_method": "get_user"
    }
  ],
  "vector_store": {
    "storage_type": "stable_memory"
  }
}
```

### Step 4: Update API Calls

**From TypeScript:**
```typescript
await sdk.buildContext({
  masterEntity: 'User',
  entityId: 'user_123',
});
```

**To Rust:**
```rust
build_user_rag_context("user_123".to_string()).await?;
```

## 💡 Best Practices

### 1. Keep API Keys Secure

**❌ Don't:**
```rust
let api_key = "sk-1234...".to_string(); // Hardcoded
```

**✅ Do:**
```rust
// Pass as parameter from client
async fn build_context(api_key: String) { ... }

// Or store in canister state (encrypted)
```

### 2. Batch Operations

**❌ Don't:**
```rust
for text in texts {
    let embedding = embedder.embed(vec![text]).await?;
}
```

**✅ Do:**
```rust
let embeddings = embedder.embed(texts).await?;
```

### 3. Use Caching

```rust
let mut cached = CachedEmbedder::new(embedder, 1000);
let embeddings = cached.embed_with_cache(texts).await?;
```

### 4. Handle Errors Gracefully

```rust
match build_context(user_id).await {
    Ok(result) => ic_cdk::println!("Success: {}", result),
    Err(e) => {
        ic_cdk::println!("Error: {}", e);
        // Implement retry logic or fallback
    }
}
```

## 🚀 Performance Considerations

### Cycle Costs

| Operation | Cycles (Approx) |
|-----------|-----------------|
| HTTP outcall (embedding) | ~1B per request |
| Stable memory read | ~10K per read |
| Stable memory write | ~50K per write |
| Vector search (in-memory) | ~1M per search |

### Optimization Tips

1. **Cache embeddings** in stable memory
2. **Batch HTTP outcalls** (up to 100 texts per request)
3. **Use namespaces** to partition data
4. **Implement lazy loading** for large entity graphs

## 🎓 Learning Resources

- [ICP Rust CDK Docs](https://docs.rs/ic-cdk)
- [Stable Structures Guide](https://docs.rs/ic-stable-structures)
- [HTTP Outcalls Tutorial](https://internetcomputer.org/docs/current/developer-docs/integrations/https-outcalls/)

## ❓ FAQ

**Q: Why no automatic schema introspection?**  
A: ICP canisters don't expose SQL-like schemas. Data is in compiled WASM, so manual trait implementation is required.

**Q: Can I use PostgreSQL/MongoDB with ICP?**  
A: Not directly. You can query external databases via HTTP outcalls, but it defeats the purpose of on-chain RAG.

**Q: How much does vector storage cost?**  
A: ~$5/GB/year on ICP stable memory. Very affordable for most use cases.

**Q: Can I use other embedders?**  
A: Yes! Implement the `Embedder` trait and use any API accessible via HTTP outcalls.

**Q: What about IPFS/Arweave storage?**  
A: Coming soon! You'll be able to store vectors off-chain while keeping metadata on-chain.

## 🐛 Troubleshooting

### "Configuration not set" error

```rust
// Make sure to call set_config first
set_config(config_json).await?;
```

### "HTTP outcall failed" error

- Check API key is valid
- Verify network connectivity
- Ensure sufficient cycles

### "Dimension mismatch" error

```rust
// Ensure embedder dimensions match config
{
  "embedder": {
    "model": "text-embedding-3-small",
    "dimensions": 1536  // Must match model
  }
}
```

## 🎯 Next Steps

1. Try the example canister in `/examples/user-canister`
2. Implement `RagEntity` for your domain models
3. Test with small datasets first
4. Monitor cycle consumption
5. Scale gradually

---

**Questions?** Open an issue on GitHub!
