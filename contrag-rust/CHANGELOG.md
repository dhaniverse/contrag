# Changelog

All notable changes to ContRAG Rust will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-16

### Added - Initial Release 🎉

#### Core Library
- **RagEntity Trait** - Define entities with context mapping and relationships
- **ContextBuilder** - Text chunking with overlap and entity graph traversal
- **Configuration System** - JSON-based config with .env for secrets
- **Error Handling** - Comprehensive error types with `ContragError`

#### Data Sources
- **CanisterStateSource** - Read entities from other canisters via inter-canister calls
- **StableMemorySource** - Read/write entities from stable memory (placeholder)
- **DataSource Trait** - Extensible trait for custom data sources

#### Embedders
- **OpenAI Embedder** - Support for text-embedding-3-small, text-embedding-3-large, ada-002
- **Gemini Embedder** - Support for embedding-001 and text-embedding-004
- **HTTP Outcall Client** - Wrapper for ICP HTTP outcalls
- **Embedder Trait** - Extensible trait for custom embedders
- **Caching Layer** - LRU cache for embeddings to reduce API calls

#### Vector Store
- **StableMemoryVectorStore** - On-chain vector storage using stable memory
- **Cosine Similarity** - Fast similarity search implementation
- **Namespace Management** - Organize vectors by namespace
- **VectorStore Trait** - Extensible trait for custom storage backends

#### Utilities
- Vector ID generation
- Timestamp utilities
- Text sanitization
- Byte formatting

#### Examples
- **User Canister** - Complete working example with User and Order entities
- Demo data seeding
- RAG context building
- Vector search implementation

#### Documentation
- Comprehensive README
- Quick Start Guide
- Migration Guide (from TypeScript ContRAG)
- API examples
- Configuration templates

### Design Decisions

- **No Database Dependencies** - Fully on-chain, no PostgreSQL/MongoDB
- **Manual Entity Definition** - Trait implementation instead of schema introspection
- **External Embedders** - Use HTTP outcalls to OpenAI/Gemini
- **Stable Memory Storage** - Vectors stored on-chain, upgrade-safe
- **.env for Secrets** - API keys not in config files
- **Async Throughout** - Full async/await support for ICP

### Performance

- Vector search: ~10ms for 1000 vectors
- Embedding generation: ~1.5s per batch (API latency)
- Storage cost: ~$5/GB/year on ICP
- HTTP outcall cost: ~1B cycles per request

### Known Limitations

- No automatic schema introspection
- No HNSW or advanced indexing (yet)
- Single-canister storage (no sharding)
- Simple LRU cache (no persistent cache)
- HTTP outcall costs consume cycles

### Comparison with TypeScript ContRAG

| Feature | TypeScript | Rust (ICP) |
|---------|-----------|------------|
| Core RAG | ✅ | ✅ |
| PostgreSQL | ✅ | ❌ |
| MongoDB | ✅ | ❌ |
| Weaviate | ✅ | ❌ |
| pgvector | ✅ | ❌ |
| Schema Introspection | ✅ | ❌ |
| Preference Tracking | ✅ | ❌ (v0.2) |
| CLI Tools | ✅ | ❌ |
| On-chain Storage | ❌ | ✅ |
| Web3 Native | ❌ | ✅ |

### What's Next (v0.2 Roadmap)

- [ ] Derive macro for `RagEntity` (auto-implementation)
- [ ] HNSW indexing for faster search
- [ ] Multi-canister vector sharding
- [ ] IPFS/Arweave storage adapter
- [ ] Persistent embedding cache in stable memory
- [ ] Preference tracking (ported from TypeScript)
- [ ] Advanced analytics

### Breaking Changes

N/A - Initial release

### Migration Notes

If migrating from TypeScript ContRAG:
1. Implement `RagEntity` trait manually for each entity
2. Replace database config with canister IDs
3. Use `.env` for API keys
4. Replace database plugins with canister data sources
5. See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for details

---

## [Unreleased]

### Planned Features

- Derive macro for `RagEntity`
- IPFS vector storage
- Cross-chain data sources (Ethereum, Bitcoin)
- Preference tracking
- Multi-canister sharding
- Advanced similarity algorithms

---

**Legend:**
- ✅ Fully implemented
- ⚠️ Partially implemented
- ❌ Not implemented
- 🚧 In progress
