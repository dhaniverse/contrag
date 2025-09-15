# ContRAG - Advanced RAG Integration Library

[![npm version](https://badge.fury.io/js/contrag.svg)](https://badge.fury.io/js/contrag)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ContRAG is a powerful library for building Retrieval-Augmented Generation (RAG) systems that automatically introspect your existing database schema, build comprehensive entity relationship graphs, and create intelligent vector stores for personalized context retrieval.

## 🚀 What's New in v1.1

### Major Features
- **🎯 Master Entity Configuration** - Define entity relationships via config
- **🤖 System Prompt Support** - Customize LLM behavior for different use cases  
- **🔧 Comprehensive CLI Debugging** - Test connections, analyze data, manage vectors
- **📊 Advanced Analytics** - Vector store stats, similarity search, health monitoring
- **⚡ Production Ready** - Batch processing, monitoring, error handling

### Enhanced CLI Commands
```bash
# Configuration & Testing
contrag config init --template mongodb
contrag config validate
contrag test all

# Data Analysis & Debugging
contrag sample --entity User --uid 123
contrag vector stats
contrag vector search --text "user orders"

# Schema & Relationships
contrag introspect --format json
```

## ✨ Key Features

### 🔄 Multi-Database Support
- **PostgreSQL** - Full relational database support with foreign keys
- **MongoDB** - Document database with automatic relationship inference
- **Mixed Environments** - Use MongoDB for primary data, PostgreSQL for vectors

### 🧠 AI Integration
- **OpenAI Embeddings** - GPT-based embedding models
- **Google Gemini** - Advanced embedding capabilities  
- **System Prompts** - Customize AI behavior per use case

### 📦 Vector Storage
- **Weaviate** - Cloud-native vector database
- **pgvector** - PostgreSQL extension for high-performance vectors
- **Automatic Chunking** - Intelligent context splitting with overlap

### 🎯 Entity Relationship Mapping
- **Automatic Schema Detection** - Introspect existing database schemas
- **Master Entity Configuration** - Define primary entities and relationships
- **Time Series Support** - Handle temporal data automatically
- **Complex Relationships** - One-to-one, one-to-many, many-to-many support

## 🛠 Quick Start

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

// Query the context
const response = await sdk.query('users:123', 'What orders has this user placed?');

// Get related sample data
const sampleData = await sdk.getRelatedSampleData('users', '123');
```

## 📋 CLI Commands

### Configuration Management
```bash
contrag config init [--template] [--force]    # Initialize configuration
contrag config validate                       # Validate and test connections
```

### Connection Testing
```bash
contrag test all                             # Test all connections
contrag test db                              # Test database only
contrag test vector                          # Test vector store only
contrag test embedder                        # Test embedder only
```

### Schema Analysis
```bash
contrag introspect [--format json]          # Analyze database schema
contrag sample --entity User [--uid 123]    # Get sample data
```

### Vector Store Management
```bash
contrag vector stats                         # Show statistics
contrag vector namespaces                    # List namespaces
contrag vector search --text "query"        # Search vectors
```

### Context Building & Querying
```bash
contrag build --entity User --uid 123       # Build context
contrag query --namespace User:123 --query "text"  # Query context
```

## 🏗 Architecture

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
                        └───────────────────┘
```

## 🎯 Use Cases

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

### Analytics & Insights
- Analyze user behavior patterns across entities
- Generate business intelligence from relationship data
- Create predictive models from historical patterns

## 📚 Documentation

- **[Enhanced Features Guide](docs/ENHANCED_FEATURES.md)** - Complete feature documentation
- **[MongoDB + Gemini + pgvector Setup](docs/MONGODB_GEMINI_PGVECTOR_SETUP.md)** - Step-by-step integration guide  
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System architecture overview
- **[API Reference](docs/API_REFERENCE.md)** - Complete SDK documentation

## 🔧 Configuration Templates

### Available Templates
- **`basic`** - PostgreSQL + Weaviate + OpenAI (simple setup)
- **`mongodb`** - MongoDB + Weaviate + OpenAI (document database)  
- **`postgres`** - PostgreSQL + pgvector + Gemini (all Postgres)
- **`advanced`** - Full configuration with master entities and system prompts

```bash
# Use templates for quick setup
contrag config init --template mongodb
contrag config init --template postgres  
contrag config init --template advanced
```

## 🌟 Advanced Features

### Master Entity Configuration
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

### System Prompts
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

### Production Monitoring
Built-in health checks and monitoring:

```javascript
// Health monitoring
const dbHealth = await sdk.testDatabaseConnection();
const vectorHealth = await sdk.testVectorStoreConnection();
const stats = await sdk.getVectorStoreStats();
```

## 🚀 Performance & Scalability

- **Batch Processing** - Handle large datasets efficiently
- **Connection Pooling** - Optimize database connections
- **Configurable Chunking** - Balance context size vs. performance
- **Relationship Limits** - Prevent entity graph explosion
- **Caching Support** - Cache frequently accessed data

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - Comprehensive guides and examples  
- **Community** - Join our Discord for discussions

---

**ContRAG v1.1** - Making RAG integration simple, powerful, and production-ready.

## Installation

```bash
npm install contrag
```

## Quick Start

### 1. CLI Usage

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

### 2. SDK Usage

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

// Query for context
const queryResult = await ctx.query("User:user_123", "What orders did I place?");

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

## How It Works

1. **Schema Introspection**: Contrag analyzes your database structure to understand entities and relationships
2. **Entity Graph Building**: Starting from a master entity and UID, it recursively traverses relationships to build a complete graph
3. **Context Generation**: The entity graph is flattened into structured text chunks
4. **Embedding Creation**: Text chunks are converted to embeddings using your chosen provider
5. **Vector Storage**: Embeddings are stored with metadata in your vector database
6. **Querying**: Natural language queries retrieve relevant context chunks

## Architecture

Contrag is built around a plugin architecture:

- **DBPlugin**: Interface for database connections and schema introspection
- **VectorStorePlugin**: Interface for vector storage and retrieval
- **EmbedderPlugin**: Interface for text embedding generation

This design allows easy extension with new databases, vector stores, and embedding providers.

## Time Series Support

Contrag automatically detects and handles time-based data:

- **PostgreSQL**: Identifies timestamp columns and sorts related data chronologically
- **MongoDB**: Detects timestamp fields and time series collections
- **Context Building**: Includes temporal information in generated context

## Example Use Cases

- **Customer Support**: Build context about customer interactions, orders, and support tickets
- **E-commerce**: Generate personalized product recommendations based on user behavior
- **Healthcare**: Create patient-centric views combining medical records, appointments, and treatments
- **Finance**: Build comprehensive user profiles including transactions, accounts, and interactions

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete guide to using Contrag, from setup to advanced features
- **[Database Guide](docs/DATABASE_GUIDE.md)** - Comprehensive database setup, configuration, and optimization
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - Detailed system architecture and design decisions
- **[Setup Guide](docs/SETUP.md)** - Installation and initial configuration
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Testing strategies and examples
- **[Plugin Development](docs/PLUGINS.md)** - How to create custom plugins

### Examples

Check out the `/examples` directory for complete working examples:
- **Financial Game RAG** - AI tutoring system with personalized financial advice
- **E-commerce RAG** - Product recommendations and customer insights
- **Customer Support** - Context-aware support response system

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

## License

MIT