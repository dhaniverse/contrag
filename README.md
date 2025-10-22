# ContRAG - Advanced RAG Integration Library

[![npm version](https://badge.fury.io/js/contrag.svg)](https://badge.fury.io/js/contrag)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- Architecture diagram -->
![ContRAG Architecture](/assets/contrag-mermaid.png)

**ContRAG** is a powerful library for building Retrieval-Augmented Generation (RAG) systems that automatically introspect your existing database schema, build comprehensive entity relationship graphs, and create intelligent vector stores for personalized context retrieval.

**Available for both Web2 (TypeScript/Node.js) and Web3 (Rust/ICP)** — ContRAG brings production-ready RAG capabilities to traditional and decentralized applications.

## Table of Contents

- [What's New in v1.3](#whats-new-in-v13)
- [Key Features](#key-features)
- [Why ContRAG for ICP](#why-contrag-for-icp)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Supported Plugins](#supported-plugins)
- [CLI Commands](#cli-commands)
- [SDK Usage](#sdk-usage)
- [Use Cases](#use-cases)
- [Documentation](#documentation)
- [Configuration Templates](#configuration-templates)
- [Advanced Features](#advanced-features)
- [Performance & Scalability](#performance--scalability)
- [Development](#development)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## What's New in v1.3

### Intelligent Preference Tracking (NEW)
- **AI-Powered Preference Extraction** - Automatically identify user preferences from natural conversation
- **Smart User Profiling** - Build dynamic user profiles that evolve with interactions
- **Seamless Integration** - Optional preference tracking with simple API flag
- **Multi-Domain Support** - Works across finance, e-commerce, content, and custom domains
- **Privacy-First Design** - Configurable data retention and anonymization options

### Enhanced Features from v1.1
- **Master Entity Configuration** - Define entity relationships via config
- **System Prompt Support** - Customize LLM behavior for different use cases  
- **Comprehensive CLI Debugging** - Test connections, analyze data, manage vectors
- **Smart Compatibility Testing** - Detect and auto-fix dimension mismatches, connection issues
- **Advanced Analytics** - Vector store stats, similarity search, health monitoring
- **Production Ready** - Batch processing, monitoring, error handling

## Key Features

### Multi-Database Support
- **PostgreSQL** - Full relational database support with foreign keys
- **MongoDB** - Document database with automatic relationship inference
- **Mixed Environments** - Use MongoDB for primary data, PostgreSQL for vectors

### AI Integration
- **OpenAI Embeddings** - GPT-based embedding models
- **Google Gemini** - Advanced embedding capabilities  
- **System Prompts** - Customize AI behavior per use case

### Vector Storage
- **Weaviate** - Cloud-native vector database
- **pgvector** - PostgreSQL extension for high-performance vectors
- **Automatic Chunking** - Intelligent context splitting with overlap

### Intelligent User Personalization
- **Automatic Preference Learning** - Extract preferences from natural conversation
- **Dynamic User Profiles** - Build evolving user profiles from interactions
- **Multi-Domain Support** - Finance, e-commerce, content, and custom domains
- **Privacy Controls** - Configurable data retention and anonymization

### Entity Relationship Mapping
- **Automatic Schema Detection** - Introspect existing database schemas
- **Master Entity Configuration** - Define primary entities and relationships
- **Time Series Support** - Handle temporal data automatically
- **Complex Relationships** - One-to-one, one-to-many, many-to-many support

## Quick Start

### Installation

```bash
npm install contrag

# For global CLI access
npm install -g contrag
```

### Basic Setup

```bash
# Initialize configuration
contrag config init --template basic

# Edit contrag.config.json with your credentials
# Test connections
contrag config validate
```

### Example Configuration

```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "mongodb://localhost:27017",
      "database": "your_app"
    }
  },
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "vectors",
      "user": "postgres",
      "password": "password"
    }
  },
  "embedder": {
    "plugin": "gemini",
    "config": {
      "apiKey": "your-gemini-api-key",
      "model": "embedding-001"
    }
  },
  "masterEntities": [
    {
      "name": "users",
      "primaryKey": "_id",
      "relationships": {
        "orders": {
          "entity": "orders",
          "type": "one-to-many",
          "localKey": "_id",
          "foreignKey": "user_id"
        }
      }
    }
  ],
  "systemPrompts": {
    "default": "You are a helpful assistant with access to user data.",
    "recommendations": "Focus on personalized product recommendations."
  },
  "preferences": {
    "enabled": true,
    "extractionModel": "gpt-4",
    "confidenceThreshold": 0.7,
    "storage": {
      "table": "user_preferences",
      "retentionDays": 365
    },
    "privacy": {
      "anonymize": false,
      "requireConsent": true
    }
  }
}
```

### SDK Usage

```javascript
const { ContragSDK } = require('contrag');

const sdk = new ContragSDK();
await sdk.configure(config);

// Build context for a user
const result = await sdk.buildFor('users', '123');

// Query with automatic preference tracking (NEW in v1.3)
const response = await sdk.query({
  userId: 'user123', 
  query: 'I like large cap tech stocks. What should I invest in?',
  masterEntity: 'users'
}, { preferenceTracking: true });

// Access extracted preferences
console.log(response.preferences); // Newly extracted user preferences
console.log(response.context);     // RAG context with preference-aware results

// Get related sample data
const sampleData = await sdk.getRelatedSampleData('users', '123');

// Manage user preferences
const userPrefs = await sdk.getUserPreferences('user123');
await sdk.updateUserPreferences('user123', newPreferences);
```

## Installation

```bash
npm install contrag
```

### CLI Usage

Initialize configuration:
```bash
npx contrag init
```

Introspect your database schema:
```bash
npx contrag introspect
```

Build personalized context for a user:
```bash
npx contrag build --entity User --uid 123
```

Query the built context:
```bash
npx contrag query --namespace User:123 --query "What orders did I place?"
```

### SDK Usage

```typescript
import { ContragSDK, ContragConfig } from 'contrag';

const config: ContragConfig = {
  database: {
    plugin: 'postgres',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      user: 'postgres',
      password: 'password'
    }
  },
  vectorStore: {
    plugin: 'weaviate',
    config: {
      url: 'http://localhost:8080'
    }
  },
  embedder: {
    plugin: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY
    }
  }
};

const ctx = new ContragSDK();
await ctx.configure(config);

// Build personalized vector store
const result = await ctx.buildFor("User", "user_123");

// Query with preference tracking (NEW in v1.3)  
const queryResult = await ctx.query({
  userId: "user_123",
  query: "I prefer sustainable investments. What should I invest in?", 
  masterEntity: "User"
}, { preferenceTracking: true });

// Access both context and extracted preferences
console.log('Context chunks:', queryResult.chunks);
console.log('Extracted preferences:', queryResult.preferences);

// Use the retrieved context with your LLM
for (const chunk of queryResult.chunks) {
  console.log(chunk.content);
}
```

## Configuration

### Configuration File

Create a `contrag.config.json` file:

```json
{
  "database": {
    "plugin": "postgres",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "myapp",
      "user": "postgres",
      "password": "password"
    }
  },
  "vectorStore": {
    "plugin": "weaviate",
    "config": {
      "url": "http://localhost:8080"
    }
  },
  "embedder": {
    "plugin": "openai",
    "config": {
      "apiKey": "your-openai-api-key"
    }
  },
  "contextBuilder": {
    "chunkSize": 1000,
    "overlap": 200
  },
  "preferences": {
    "enabled": true,
    "extractionModel": "gpt-4",
    "confidenceThreshold": 0.7
  }
}
```

### Environment Variables

```bash
# Database
CONTRAG_DB_PLUGIN=postgres
CONTRAG_DB_HOST=localhost
CONTRAG_DB_PORT=5432
CONTRAG_DB_NAME=myapp
CONTRAG_DB_USER=postgres
CONTRAG_DB_PASSWORD=password

# For MongoDB
CONTRAG_DB_PLUGIN=mongodb
CONTRAG_DB_URL=mongodb://localhost:27017
CONTRAG_DB_NAME=myapp

# Vector Store
CONTRAG_VECTOR_PLUGIN=weaviate
CONTRAG_VECTOR_URL=http://localhost:8080
CONTRAG_VECTOR_API_KEY=optional-api-key

# Embedder
CONTRAG_EMBEDDER_PLUGIN=openai
CONTRAG_OPENAI_API_KEY=your-openai-api-key
CONTRAG_OPENAI_MODEL=text-embedding-ada-002

# Preferences (NEW in v1.3)
CONTRAG_PREFERENCES_ENABLED=true
CONTRAG_PREFERENCES_MODEL=gpt-4
CONTRAG_PREFERENCES_CONFIDENCE=0.7
```

## Supported Plugins

### Database Plugins

#### PostgreSQL (`postgres`)
- Uses `INFORMATION_SCHEMA` and `pg_catalog` for schema introspection
- Supports foreign key relationships and time series data
- Handles complex multi-table joins automatically

```json
{
  "database": {
    "plugin": "postgres",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "myapp",
      "user": "postgres",
      "password": "password"
    }
  }
}
```

#### MongoDB (`mongodb`)
- Document sampling for schema inference
- Supports ObjectId references and embedded relationships
- Time series collections with timestamp field detection

```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "mongodb://localhost:27017",
      "database": "myapp"
    }
  }
}
```

### Vector Store Plugins

#### Weaviate (`weaviate`)
- Automatic schema creation
- Vector similarity search
- Metadata filtering and namespacing

```json
{
  "vectorStore": {
    "plugin": "weaviate",
    "config": {
      "url": "http://localhost:8080",
      "apiKey": "optional-api-key"
    }
  }
}
```

### Embedder Plugins

#### OpenAI Embeddings (`openai`)
- Support for all OpenAI embedding models
- Configurable model selection
- Batch processing for efficiency

```json
{
  "embedder": {
    "plugin": "openai",
    "config": {
      "apiKey": "your-openai-api-key",
      "model": "text-embedding-ada-002"
    }
  }
}
```

## CLI Commands

### Preference Management (NEW)
```bash
contrag preferences show --user-id user123      # View user preferences  
contrag preferences export --user-id user123    # Export to JSON
contrag preferences clear --user-id user123     # Clear old preferences
contrag preferences analyze --query "text"      # Test preference extraction
contrag analytics preferences                   # Preference analytics
```

### Configuration Management
```bash
contrag config init [--template] [--force]    # Initialize configuration
contrag config validate                       # Validate and test connections
contrag config view                           # View current configuration
```

### Connection Testing
```bash
contrag test all                             # Test all connections
contrag test db                              # Test database only
contrag test vector                          # Test vector store only
contrag test embedder                        # Test embedder only
```

### Compatibility Testing
```bash
contrag compatibility test                    # Run comprehensive compatibility tests
contrag compat test --database-only          # Test database compatibility only
contrag compat test --vector-store-only      # Test vector store compatibility only
contrag compat test --embedder-only          # Test embedder compatibility only
contrag compat test --dimensions-only        # Test dimension compatibility only
contrag compat fix-dimensions                # Auto-fix dimension mismatches
contrag compat validate-config               # Validate configuration schema
```

### Schema Analysis
```bash
contrag introspect [--format json]          # Analyze database schema
contrag sample --entity User [--uid 123]    # Get sample data
contrag sample unified --master-entity users # Get unified sample data
```

### Vector Store Management
```bash
contrag vector stats                         # Show statistics
contrag vector namespaces                    # List namespaces
contrag vector search --text "query"        # Search vectors
contrag vector clear                         # Clear all vectors
```

### Context Building & Querying
```bash
contrag build --entity User --uid 123       # Build context
contrag query --namespace User:123 --query "text"  # Query context
```

## How It Works

1. **Schema Introspection**: Contrag analyzes your database structure to understand entities and relationships
2. **Entity Graph Building**: Starting from a master entity and UID, it recursively traverses relationships to build a complete graph
3. **Context Generation**: The entity graph is flattened into structured text chunks
4. **Preference Extraction** (NEW): AI analyzes user queries to extract preferences and interests automatically
5. **Embedding Creation**: Text chunks are converted to embeddings using your chosen provider
6. **Vector Storage**: Embeddings are stored with metadata in your vector database
7. **Preference Storage**: Extracted preferences are stored and linked to user profiles
8. **Querying**: Natural language queries retrieve relevant context chunks enhanced with user preferences

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Database │    │   AI Embeddings  │    │  Vector Storage │
│                 │    │                  │    │                 │
│  PostgreSQL     │────│     OpenAI       │────│    Weaviate     │
│  MongoDB        │    │     Gemini       │    │    pgvector     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │                   │
                        │   ContRAG SDK     │
                        │   - Schema Analysis│
                        │   - Relationship  │
                        │     Mapping       │
                        │   - Context Build │
                        │   - Query Engine  │
                        │   - Preference    │
                        │     Tracking      │
                        └───────────────────┘
```

## Use Cases

### E-commerce Personalization
- Build user profiles from order history, preferences, and behavior
- Generate personalized product recommendations
- Provide context-aware customer support

### CRM Enhancement  
- Create comprehensive customer profiles from interactions
- Generate insights from deal history and communications
- Enable intelligent lead scoring and recommendations

### Content Management
- Build user reading history and preferences
- Generate personalized content recommendations
- Create context-aware search and discovery

### Financial Services
- Analyze user behavior patterns across entities
- Generate business intelligence from relationship data
- Create predictive models from historical patterns with user preferences

### Example Use Cases

- **Customer Support**: Build context about customer interactions, orders, and support tickets with personalized preferences
- **E-commerce**: Generate personalized product recommendations based on user behavior and stated preferences
- **Financial Services**: Create investment recommendations based on user risk tolerance and stated preferences
- **Healthcare**: Build patient-centric views combining medical records, appointments, treatments, and care preferences
- **Finance**: Build comprehensive user profiles including transactions, accounts, interactions, and investment preferences

## Why ContRAG for ICP

The Internet Computer Protocol enables truly decentralized applications, but integrating AI with on-chain data has been a critical missing piece. **ContRAG solves this fundamental challenge** by bringing Retrieval-Augmented Generation directly to ICP canisters.

### The Problem: AI & Web3 Don't Mix (Yet)

ICP canisters hold rich, verifiable data — user profiles, transaction histories, DAO governance records, game state, NFT metadata — but leveraging this data for intelligent AI experiences has required compromising Web3 principles:

- **Export to Centralized DBs**: Moving data off-chain to traditional vector databases defeats decentralization
- **Trust External Services**: Relying on hosted AI platforms introduces central points of failure
- **Lose Provenance**: Off-chain processing breaks the chain of verifiable computation
- **High Latency**: Cross-network queries to external vector stores add unacceptable delays

### The Solution: On-Chain RAG with External Intelligence

ContRAG's Rust implementation (`contrag-core`) brings a hybrid architecture specifically designed for ICP:

**On-Chain Components (Preserved Decentralization)**
- Vector embeddings stored in canister stable memory
- Entity data remains in canister state
- Semantic search executes locally on-chain
- All data ownership stays with the canister

**Off-Chain Components (Leveraging Best AI Models)**
- HTTP outcalls to OpenAI/Gemini for embedding generation only
- No data persistence externally — embeddings returned to canister
- Pay-per-use with ICP cycles (predictable costs)
- Access to cutting-edge AI without compromising sovereignty

### Key Benefits for ICP Ecosystem

**1. True Data Sovereignty**
- Vectors live in stable memory, never leave the canister
- Survive upgrades through stable storage patterns
- No external dependencies for storage or retrieval
- Full cryptographic verifiability maintained

**2. Intelligent Decentralized Apps**
- **DeFi**: Personalized investment recommendations from transaction history
- **DAOs**: Semantic search across proposals, votes, and governance discussions
- **NFTs**: Content-based discovery and recommendation engines
- **Social**: Context-aware feeds from on-chain social graphs
- **Gaming**: Player profiling and dynamic content generation

**3. Developer Experience**
- Trait-based API (`RagEntity`) integrates with existing canister types
- Automatic context building from entity relationships
- Built-in chunking, embedding management, and vector search
- Works with standard Rust/WASM canister patterns

**4. Cost-Effective AI**
- Vector storage: ~$5/GB/year (ICP stable memory pricing)
- Embedding generation: Pay only for HTTP outcalls when needed
- No recurring SaaS fees for external vector databases
- Predictable cycle consumption model

**5. Production-Ready Features**
- Stable memory persistence (upgrade-safe)
- Caching to minimize API costs
- Inter-canister data source support
- Configurable chunking strategies
- Multiple embedder support (OpenAI, Gemini, custom)

### Getting Started with ICP

**For Canister Developers**
```toml
[dependencies]
contrag-core = "0.1"
```

See the [Rust/ICP documentation](contrag-rust/README.md) and [example canister](contrag-rust/examples/user-canister) for complete implementation guides.

**Learn More**: Read the [full ICP value proposition](ICP_VALUE_PROPOSITION.md) for detailed technical advantages, use cases, and market opportunities.

## Architecture Overview

ContRAG operates across two platforms with unified RAG principles:

**Platform Selection Guide:**
- **TypeScript/Web2**: Choose for traditional web apps, existing database integrations, and rapid prototyping with automatic schema introspection
- **Rust/ICP Web3**: Choose for decentralized applications requiring on-chain data sovereignty, verifiable AI context, and censorship-resistant semantic search

See the [full architecture comparison](ARCHITECTURE_DIAGRAM.md) for detailed technical diagrams and platform differences.

## Time Series Support

Contrag automatically detects and handles time-based data:

- **PostgreSQL**: Identifies timestamp columns and sorts related data chronologically
- **MongoDB**: Detects timestamp fields and time series collections
- **Context Building**: Includes temporal information in generated context

## Documentation

### Core Documentation
- **[v1.3.0 Release Notes](docs/v1.3.0_RELEASE_NOTES.md)** - New preference tracking features, migration guide, and breaking changes
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Complete system architecture with preference tracking integration
- **[Enhanced Features Guide](docs/ENHANCED_FEATURES.md)** - Detailed feature documentation including preference tracking
- **[System Diagrams](docs/SYSTEM_DIAGRAMS_v1.3.0.md)** - High-level and low-level architecture diagrams in markdown format

### User Guides & Tutorials
- **[User Guide](docs/USER_GUIDE.md)** - Complete guide to using ContRAG from setup to advanced features
- **[Preference Tracking Guide](docs/USER_GUIDE_v1.3.0_PREFERENCES.md)** - Comprehensive preference tracking usage patterns and best practices
- **[Database Guide](docs/DATABASE_GUIDE.md)** - Database setup, configuration, and optimization for all supported databases

### Development & Integration
- **[Setup Guide](docs/SETUP.md)** - Installation, configuration, and initial setup
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Testing strategies, examples, and best practices
- **[Plugin Development](docs/PLUGINS.md)** - How to create custom database, vector store, and embedder plugins
- **[Local Testing Guide](docs/LOCAL_TESTING.md)** - Local development and testing setup
- **[Compatibility Guide](docs/COMPATIBILITY_GUIDE.md)** - Cross-platform compatibility information

### Deployment & Operations
- **[Publishing Guide](docs/PUBLISHING_GUIDE.md)** - Package publishing and distribution
- **[Project Summary](docs/PROJECT_SUMMARY.md)** - High-level project overview and components
- **[Dimension Analysis](docs/DIMENSION_ANALYSIS_AND_FIXES.md)** - Vector dimension compatibility and fixes
- **[MongoDB + Gemini + pgvector Setup](docs/MONGODB_GEMINI_PGVECTOR_SETUP.md)** - Specific integration guide

### Configuration Templates

#### Available Templates
- **`basic`** - PostgreSQL + Weaviate + OpenAI (simple setup)
- **`mongodb`** - MongoDB + Weaviate + OpenAI (document database)  
- **`postgres`** - PostgreSQL + pgvector + Gemini (all Postgres)
- **`advanced`** - Full configuration with master entities, system prompts, and preference tracking

```bash
# Use templates for quick setup
contrag config init --template mongodb
contrag config init --template postgres  
contrag config init --template advanced
```

### Advanced Features

#### Master Entity Configuration
Define complex entity relationships and traversal rules:

```json
{
  "masterEntities": [
    {
      "name": "User",
      "primaryKey": "id",
      "relationships": {
        "orders": {"entity": "Order", "type": "one-to-many", ...},
        "profile": {"entity": "UserProfile", "type": "one-to-one", ...}
      },
      "sampleFilters": {"active": true}
    }
  ]
}
```

#### System Prompts
Customize AI behavior for different scenarios:

```json
{
  "systemPrompts": {
    "default": "General assistant behavior...",
    "recommendations": "Focus on product recommendations...",  
    "support": "Provide customer support...",
    "analytics": "Analyze data patterns..."
  }
}
```

#### Production Monitoring
Built-in health checks and monitoring:

```javascript
// Health monitoring
const dbHealth = await sdk.testDatabaseConnection();
const vectorHealth = await sdk.testVectorStoreConnection();
const stats = await sdk.getVectorStoreStats();
```

### Performance & Scalability

- **Batch Processing** - Handle large datasets efficiently
- **Connection Pooling** - Optimize database connections
- **Configurable Chunking** - Balance context size vs. performance
- **Relationship Limits** - Prevent entity graph explosion
- **Caching Support** - Cache frequently accessed data
- **Preference Caching** - Intelligent caching for extracted preferences and user profiles

## Development

```bash
git clone https://github.com/yourusername/contrag
cd contrag
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Development with Watch Mode

```bash
npm run build:watch
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - Comprehensive guides and examples  
- **Community** - Join our Discord for discussions

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**ContRAG v1.3** - Making RAG integration simple, powerful, and intelligently personalized.
