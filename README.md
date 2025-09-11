# Contrag

**Context Graph Builder** - A comprehensive Retrieval-Augmented Generation (RAG) system that intelligently builds context from your databases to power AI applications. Automatically understands data relationships and creates semantic search capabilities across complex database schemas.

## 🚀 Key Features

- **🔍 Smart Schema Introspection** - Automatically understands your database structure  
- **🕸️ Entity Relationship Mapping** - Discovers and maps data relationships
- **🧠 Multi-Model AI Support** - Works with OpenAI, Gemini, Claude, and more
- **📊 Multi-Database Support** - MongoDB, PostgreSQL, MySQL, and vector databases
- **⚡ High Performance** - Optimized chunking and embedding strategies
- **🔌 Plugin Architecture** - Extensible and customizable
- **🖥️ CLI & SDK** - Both command-line tools and programmatic API
- **📦 Zero Configuration** - Works with environment variables or config files

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