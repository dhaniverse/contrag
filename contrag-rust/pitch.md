# ContRAG (Rust) 

Problem
- On-chain data (user profiles, transactions, game state, DAO records) is rich but hard to use for advanced AI experiences. Developers either export data off-chain or rely on centralized vector DBs, losing verifiability, latency, or Web3-native guarantees.

Solution
- ContRAG brings Retrieval-Augmented Generation (RAG) to ICP canisters: store, index, and search vectors in stable memory while calling external embedders/LLMs via HTTP outcalls. This keeps sensitive data and provenance on-chain while leveraging best-in-class models off-chain.

Why ICP-first
- Data ownership & verifiability: canister state is canonical. Keeping vectors and context on-chain preserves provenance and auditability.
- Low-latency on-chain queries: local stable-memory vector stores enable fast similarity search without cross-network roundtrips.
- Upgrade-safe persistence: stable memory holds vectors through upgrades.

Benefits & Use Cases
- Personalized UX: deliver context-aware responses, recommendations, and summaries using each user's own on-chain history.
- On-chain search & discovery: let DAOs, marketplaces, and games query semantic indexes directly inside canisters.
- Audit-ready AI: provenance-preserving RAG for compliance, dispute resolution, and escrowed decisioning.
- Gas/Cost model fit: embeddings are generated off-chain (cycles paid for HTTP outcalls), while storage and retrieval stay on-chain—simple cost predictability.

Market & Timing
- AI + Web3 convergence: demand is rising for on-chain-aware AI experiences (NFT recommender systems, DAO assistants, on-chain identity agents).
- First-mover advantage: few projects combine WASM canister storage with RAG primitives tailored for ICP.
- Growing LLM ecosystem: stable, performant embedders (OpenAI, Gemini) + modular embedding cache patterns lower API cost and accelerate adoption.

Why ContRAG (Rust) now
- Rust/WASM is the native canister environment—ContRAG delivers production-quality patterns (RagEntity trait, ContextBuilder, StableMemory vector store) that integrate directly into canisters.
- Minimal trust model: sensitive text remains on-chain; only vector generation is federated to trusted embedders.
- Developer ergonomics: simple trait-based API and example `user-canister` show fast integration.

Call to action
- For engineers: try the `examples/user-canister` to see RAG built from on-chain user data.
- For canister teams & DAOs: pilot ContRAG for one dataset (profiles, proposals, or transactions) and measure UX improvement.
- For ecosystem contributors: collaborate on HNSW indexing and IPFS-backed vector sharding to scale storage.

Contact & Next step
- Repo: https://github.com/dhaniverse/contrag
- Try: add `contrag-core` to your canister and run the demo seed; open an issue or PR to start a pilot.

