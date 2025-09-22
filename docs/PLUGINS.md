# Contrag Plugins Guide

Contrag uses a plugin architecture to support different databases, vector stores, and embedding providers. This allows you to choose the best combination for your use case and easily extend the system with new integrations.

## Plugin Architecture

Each plugin type implements a specific interface:

- **Database Plugins** (`DBPlugin`) - Handle schema introspection and entity graph building
- **Vector Store Plugins** (`VectorStorePlugin`) - Store and query vector embeddings  
- **Embedder Plugins** (`EmbedderPlugin`) - Generate text embeddings

## Database Plugins

### PostgreSQL Plugin (`postgres`)

**Use Cases:**
- Traditional relational databases with well-defined schemas
- Applications with complex foreign key relationships
- Time series data with timestamp columns
- ACID compliance requirements
- Existing PostgreSQL infrastructure

**Features:**
- ✅ Full INFORMATION_SCHEMA introspection
- ✅ Foreign key relationship mapping
- ✅ Recursive entity graph traversal
- ✅ Time series detection via timestamp columns
- ✅ Complex JOIN operations
- ✅ Support for views and materialized views

**Configuration:**
```json
{
  "database": {
    "plugin": "postgres",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "your_app_db",
      "user": "postgres",
      "password": "your_password",
      "ssl": false
    }
  }
}
```

**Example Schema Support:**
```sql
-- Users with orders and payments
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR, email VARCHAR, created_at TIMESTAMP);
CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), total DECIMAL, created_at TIMESTAMP);
CREATE TABLE payments (id SERIAL PRIMARY KEY, order_id INTEGER REFERENCES orders(id), amount DECIMAL, status VARCHAR);
```

**Best For:**
- E-commerce platforms
- CRM systems  
- Financial applications
- Enterprise software with normalized data

---

### MongoDB Plugin (`mongodb`)

**Use Cases:**
- Document-based applications
- Flexible, evolving schemas
- Embedded relationships and arrays
- Time series collections
- Microservices with document storage

**Features:**
- ✅ Document sampling for schema inference
- ✅ ObjectId reference detection
- ✅ Embedded document relationships
- ✅ Array field relationship mapping
- ✅ Time series collection support
- ✅ Flexible schema adaptation

**Configuration:**
```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "mongodb://localhost:27017",
      "database": "your_app_db",
      "options": {
        "maxPoolSize": 10
      }
    }
  }
}
```

**Example Schema Support:**
```javascript
// Users with embedded and referenced relationships
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  addresses: [{ type: "home", street: "123 Main St" }],  // Embedded
  order_ids: [ObjectId("..."), ObjectId("...")],        // References
  created_at: ISODate("2024-01-01")
}
```

**Best For:**
- Content management systems
- IoT applications with sensor data
- Social media platforms
- Real-time analytics
- Rapid prototyping

## Vector Store Plugins

### Weaviate Plugin (`weaviate`)

**Use Cases:**
- Semantic search applications
- Large-scale vector operations
- Production vector databases
- Multi-tenant applications
- Advanced vector analytics

**Features:**
- ✅ Automatic schema creation and management
- ✅ Vector similarity search with multiple algorithms
- ✅ Metadata filtering and faceted search
- ✅ Namespacing for multi-tenancy
- ✅ GraphQL query interface
- ✅ Built-in machine learning modules

**Configuration:**
```json
{
  "vectorStore": {
    "plugin": "weaviate",
    "config": {
      "url": "http://localhost:8080",
      "apiKey": "optional-api-key",
      "timeout": 60000
    }
  }
}
```

**Docker Setup:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  weaviate:
    image: semitechnologies/weaviate:latest
    ports:
      - "8080:8080"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'none'
    volumes:
      - weaviate_data:/var/lib/weaviate
volumes:
  weaviate_data:
```

**Best For:**
- Production applications
- Complex vector queries
- Multi-modal data (text, images, etc.)
- Scalable vector search
- Advanced analytics dashboards

---

### pgvector Plugin (`pgvector`)

**Use Cases:**
- PostgreSQL-first architectures
- Unified data and vector storage
- Cost-effective vector search
- Existing PostgreSQL expertise
- Simple deployment requirements

**Features:**
- ✅ Native PostgreSQL vector operations
- ✅ SQL-based vector queries
- ✅ Automatic table and index creation
- ✅ ACID compliance for vectors
- ✅ Familiar SQL interface
- ✅ Integrated with existing PostgreSQL tools

**Configuration:**
```json
{
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "vectors_db",
      "user": "postgres",
      "password": "your_password"
    }
  }
}
```

**PostgreSQL Setup:**
```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Contrag will automatically create tables like:
CREATE TABLE contrag_embeddings (
  id SERIAL PRIMARY KEY,
  namespace TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Best For:**
- PostgreSQL-centric applications
- Budget-conscious deployments
- Simple vector search requirements
- SQL-familiar teams
- Unified database management

## Embedder Plugins

### OpenAI Embeddings Plugin (`openai`)

**Use Cases:**
- High-quality text embeddings
- Production applications
- Multi-language support
- Established ML pipelines
- Commercial applications

**Features:**
- ✅ Support for all OpenAI embedding models
- ✅ Configurable model selection
- ✅ Batch processing for efficiency
- ✅ Automatic rate limiting handling
- ✅ Error recovery and retries

**Configuration:**
```json
{
  "embedder": {
    "plugin": "openai",
    "config": {
      "apiKey": "sk-...",
      "model": "text-embedding-ada-002",
      "batchSize": 100,
      "timeout": 30000
    }
  }
}
```

**Supported Models:**
- `text-embedding-ada-002` (1536 dimensions) - Most cost-effective
- `text-embedding-3-small` (1536 dimensions) - Better performance
- `text-embedding-3-large` (3072 dimensions) - Highest quality

**Best For:**
- Production applications
- High-quality embeddings
- Multi-language content
- Commercial use cases
- Established workflows

---

### Gemini Embeddings Plugin (`gemini`)  New!

**Use Cases:**
- Free tier development and testing
- Google Cloud integrations
- Multi-modal embeddings (future)
- Cost-effective production
- Experimental projects

**Features:**
- ✅ Free tier with generous limits
- ✅ High-quality embeddings
- ✅ Fast processing
- ✅ Google Cloud integration
- ✅ Multi-language support

**Configuration:**
```json
{
  "embedder": {
    "plugin": "gemini",
    "config": {
      "apiKey": "your-gemini-api-key",
      "model": "embedding-001"
    }
  }
}
```

**Best For:**
- Development and testing
- Cost-sensitive applications
- Google ecosystem integration
- Rapid prototyping
- Educational projects

## Plugin Selection Guide

### Choosing Database Plugins

| Use Case | Recommended Plugin | Why |
|----------|-------------------|-----|
| E-commerce, CRM | PostgreSQL | Strong relationships, ACID compliance |
| Content Management | MongoDB | Flexible schema, embedded data |
| IoT, Time Series | Both | PostgreSQL for structured, MongoDB for flexible |
| Analytics | PostgreSQL | SQL queries, complex relationships |
| Microservices | MongoDB | Document-based, service boundaries |

### Choosing Vector Store Plugins

| Use Case | Recommended Plugin | Why |
|----------|-------------------|-----|
| Production Scale | Weaviate | Advanced features, scalability |
| PostgreSQL Shop | pgvector | Unified stack, SQL familiarity |
| Budget Conscious | pgvector | Lower operational costs |
| Complex Queries | Weaviate | Advanced search capabilities |
| Simple Requirements | pgvector | Easier setup and maintenance |

### Choosing Embedder Plugins

| Use Case | Recommended Plugin | Why |
|----------|-------------------|-----|
| Production | OpenAI | Proven quality, reliability |
| Development/Testing | Gemini | Free tier, good quality |
| Multi-language | OpenAI | Extensive language support |
| Google Cloud | Gemini | Native integration |
| Budget Sensitive | Gemini | Free tier, lower costs |

## Creating Custom Plugins

Contrag's plugin architecture makes it easy to add support for new systems:

### Database Plugin Example
```typescript
import { DBPlugin, EntitySchema, EntityGraph } from 'contrag';

export class CustomDBPlugin implements DBPlugin {
  name = 'custom-db';
  
  async connect(config: any): Promise<void> {
    // Connect to your database
  }
  
  async introspectSchema(): Promise<EntitySchema[]> {
    // Return schema information
  }
  
  async buildEntityGraph(entity: string, uid: string): Promise<EntityGraph> {
    // Build relationship graph
  }
  
  // ... implement other required methods
}
```

### Vector Store Plugin Example
```typescript
import { VectorStorePlugin, EmbeddedChunk, ContextChunk } from 'contrag';

export class CustomVectorPlugin implements VectorStorePlugin {
  name = 'custom-vector';
  
  async connect(config: any): Promise<void> {
    // Connect to vector database
  }
  
  async store(chunks: EmbeddedChunk[]): Promise<void> {
    // Store vectors
  }
  
  async query(namespace: string, query: string, limit?: number): Promise<ContextChunk[]> {
    // Query vectors
  }
  
  // ... implement other required methods
}
```

## Plugin Combinations

### Recommended Stacks

**Development Stack:**
- Database: MongoDB (easy setup)
- Vector Store: Weaviate (Docker)  
- Embedder: Gemini (free tier)

**Production Stack (Cost-Effective):**
- Database: PostgreSQL
- Vector Store: pgvector
- Embedder: Gemini

**Production Stack (High-Performance):**
- Database: PostgreSQL
- Vector Store: Weaviate
- Embedder: OpenAI

**Hybrid Stack:**
- Database: PostgreSQL + MongoDB (different services)
- Vector Store: Weaviate
- Embedder: OpenAI

## Troubleshooting

### Common Plugin Issues

1. **Connection Timeouts**: Increase timeout values in plugin config
2. **Memory Issues**: Reduce batch sizes for embedding plugins
3. **Rate Limits**: Implement exponential backoff in custom plugins
4. **Schema Conflicts**: Use separate databases for different environments

### Performance Optimization

1. **Database Plugins**: Use connection pooling, optimize queries
2. **Vector Plugins**: Batch operations, use appropriate indexes
3. **Embedder Plugins**: Process in parallel, cache results

### Monitoring

Monitor plugin performance:
- Connection health
- Query response times
- Error rates
- Resource usage

Each plugin logs key metrics for observability and debugging.
