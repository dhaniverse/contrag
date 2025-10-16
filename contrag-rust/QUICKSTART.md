# ContRAG Rust - Quick Start Guide

Get ContRAG running on ICP in under 10 minutes!

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [dfx](https://internetcomputer.org/docs/current/developer-docs/setup/install) (ICP SDK)
- OpenAI or Gemini API key

## Step 1: Clone and Build (2 minutes)

```bash
cd contrag-rust
cargo build --release
```

## Step 2: Create Your Canister (3 minutes)

### Initialize dfx project

```bash
cd examples/user-canister
dfx start --background
dfx deploy
```

### Get your canister ID

```bash
dfx canister id user-canister
# Output: rrkah-fqaaa-aaaaa-aaaaq-cai
```

## Step 3: Configure ContRAG (2 minutes)

### Update `contrag.config.json`

Replace the canister ID with your actual canister ID:

```json
{
  "entities": [
    {
      "name": "User",
      "canister_id": "YOUR_CANISTER_ID_HERE",
      "fetch_method": "get_user"
    }
  ]
}
```

### Create `.env` file

```bash
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

## Step 4: Seed Demo Data (1 minute)

```bash
dfx canister call user-canister seed_demo_data
```

## Step 5: Set Configuration (1 minute)

```bash
# Read config file
CONFIG=$(cat contrag.config.json)

# Set config in canister
dfx canister call user-canister set_config "(\"$CONFIG\")"

# Set API key
dfx canister call user-canister set_api_key '("sk-your-openai-key-here")'
```

## Step 6: Build RAG Context (1 minute)

```bash
dfx canister call user-canister build_user_rag_context '("user_1")'
```

Expected output:
```
("Built RAG context for user user_1 with 3 chunks")
```

## Step 7: Search Context

```bash
dfx canister call user-canister search_user_context '(
  "user_1",
  "What products has this user ordered?",
  5
)'
```

## 🎉 Success!

You've successfully:
- ✅ Deployed a canister with ContRAG
- ✅ Built RAG context from on-chain data
- ✅ Generated embeddings via HTTP outcalls
- ✅ Stored vectors in stable memory
- ✅ Performed similarity search

## Next Steps

### 1. Add Your Own Entities

```rust
#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct MyEntity {
    pub id: String,
    // ... your fields
}

impl RagEntity for MyEntity {
    // ... implement trait
}
```

### 2. Customize Chunking

```json
{
  "chunking": {
    "chunk_size": 500,    // Smaller chunks
    "overlap": 50,        // Less overlap
    "include_field_names": false  // No field names
  }
}
```

### 3. Try Gemini Embedder

```json
{
  "embedder": {
    "provider": "gemini",
    "model": "embedding-001",
    "dimensions": 768
  }
}
```

```bash
dfx canister call user-canister set_api_key '("your-gemini-key")'
```

### 4. Monitor Cycles

```bash
dfx canister status user-canister
```

### 5. Query Vector Stats

```bash
dfx canister call user-canister get_rag_stats '("user_1")'
```

## Common Issues

### Issue: "Configuration not set"

**Solution:**
```bash
dfx canister call user-canister set_config "(\"$(cat contrag.config.json)\")"
```

### Issue: "API key not set"

**Solution:**
```bash
dfx canister call user-canister set_api_key '("your-key-here")'
```

### Issue: "User not found"

**Solution:**
```bash
# Seed demo data first
dfx canister call user-canister seed_demo_data
```

### Issue: "Insufficient cycles"

**Solution:**
```bash
# Add cycles to canister
dfx canister deposit-cycles 1000000000000 user-canister
```

## Development Tips

### 1. Watch Logs

```bash
dfx canister logs user-canister
```

### 2. Reset State

```bash
dfx canister uninstall-code user-canister
dfx deploy user-canister
```

### 3. Test Locally

```bash
cargo test --package contrag-core
```

### 4. Check Candid Interface

```bash
dfx canister metadata user-canister candid:service
```

## Performance Benchmarks

| Operation | Time | Cycles |
|-----------|------|--------|
| Create user | ~50ms | ~100K |
| Build context (3 chunks) | ~2s | ~1.5B |
| Generate embedding | ~1.5s | ~1B |
| Vector search | ~10ms | ~1M |
| Store vector | ~5ms | ~50K |

## Cost Estimation

**Scenario:** 1000 users, 5 chunks each

- Storage: 5000 vectors × 1536 dims × 4 bytes = ~30MB
- Cost: ~$0.15/year
- HTTP outcalls: 5000 requests × ~$0.0001 = ~$0.50

**Total: Less than $1/year for on-chain RAG! 🎉**

## Resources

- [Full Documentation](./README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [API Reference](./docs/API.md)
- [ICP Docs](https://internetcomputer.org/docs)

## Support

- 🐛 [Report Issues](https://github.com/dhaniverse/contrag/issues)
- 💬 [Discussions](https://github.com/dhaniverse/contrag/discussions)
- 📧 Email: support@contrag.dev

---

**Happy Building! 🚀**
