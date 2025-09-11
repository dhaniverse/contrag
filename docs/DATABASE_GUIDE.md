# Contrag Database Guide

## Overview

This guide provides comprehensive information about setting up, configuring, and using databases with Contrag. Contrag supports multiple database types through its plugin architecture, with primary focus on MongoDB for document storage and PostgreSQL with pgvector for vector operations.

## Table of Contents

1. [Supported Databases](#supported-databases)
2. [MongoDB Setup](#mongodb-setup)
3. [PostgreSQL with pgvector Setup](#postgresql-with-pgvector-setup)
4. [Schema Design](#schema-design)
5. [Data Relationships](#data-relationships)
6. [Performance Optimization](#performance-optimization)
7. [Backup and Maintenance](#backup-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Supported Databases

### Primary Databases
- **MongoDB** - Document storage, schema introspection, entity relationships
- **PostgreSQL + pgvector** - Vector embeddings, similarity search
- **Weaviate** - Alternative vector database (experimental)

### Configuration Matrix

| Use Case | Primary DB | Vector Store | Best For |
|----------|------------|--------------|----------|
| Document + RAG | MongoDB | pgvector | Complex schemas, relationships |
| Simple RAG | MongoDB | Weaviate | Quick setup, prototyping |
| High Performance | PostgreSQL | pgvector | Enterprise, high throughput |

## MongoDB Setup

### Docker Setup (Recommended)

```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:7.0
    container_name: contrag_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: contrag_test
    volumes:
      - mongodb_data:/data/db
      - ./docker:/docker-entrypoint-initdb.d
    networks:
      - contrag_network

volumes:
  mongodb_data:

networks:
  contrag_network:
    driver: bridge
```

### Manual Setup

```bash
# Install MongoDB
brew install mongodb-community@7.0

# Start MongoDB service
brew services start mongodb-community@7.0

# Connect to MongoDB shell
mongosh "mongodb://localhost:27017"
```

### Configuration

```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "mongodb://admin:password@localhost:27017",
      "database": "contrag_test"
    }
  }
}
```

### Schema Examples

#### Simple E-commerce Schema
```javascript
// Users Collection
{
  _id: ObjectId("..."),
  email: "user@example.com",
  name: "John Doe",
  preferences: {
    theme: "dark",
    notifications: true
  },
  createdAt: ISODate("2024-01-01T00:00:00Z")
}

// Orders Collection
{
  _id: ObjectId("..."),
  user_id: "507f1f77bcf86cd799439011", // String reference
  items: [
    {
      product_id: "prod_123",
      quantity: 2,
      price: 29.99
    }
  ],
  total: 59.98,
  status: "completed",
  createdAt: ISODate("2024-01-01T00:00:00Z")
}
```

#### Complex Financial Game Schema
```javascript
// Users Collection
{
  _id: ObjectId("64a1b2c3d4e5f6789abcdef1"),
  email: "player@game.com",
  gameUsername: "InvestorPro",
  gameData: {
    level: 15,
    experience: 2850,
    totalWealth: 125000,
    achievements: ["first_deposit", "stock_trader"],
    preferences: {
      soundEnabled: true,
      language: "en"
    }
  },
  createdAt: ISODate("2024-08-01T10:00:00Z")
}

// Bank Accounts Collection
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1", // String reference to User._id
  accountType: "savings",
  balance: 45000.75,
  interestRate: 3.5,
  transactions: [
    {
      type: "deposit",
      amount: 5000,
      timestamp: ISODate("2024-08-01T10:00:00Z"),
      description: "Initial deposit"
    }
  ]
}

// Stock Portfolios Collection
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1",
  totalValue: 85234.50,
  holdings: [
    {
      stockId: "TECH001",
      stockName: "TechCorp",
      quantity: 100,
      purchasePrice: 450.00,
      currentPrice: 478.90,
      sector: "Technology"
    }
  ],
  lastUpdated: ISODate("2024-09-01T15:30:00Z")
}
```

### Indexing Strategy

```javascript
// Essential Indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ gameUsername: 1 }, { unique: true })
db.users.createIndex({ "gameData.level": 1 })

// Relationship Indexes
db.bankAccounts.createIndex({ userId: 1 })
db.stockPortfolios.createIndex({ userId: 1 })
db.achievements.createIndex({ userId: 1 })
db.stockTransactions.createIndex({ userId: 1, timestamp: -1 })

// Query Optimization Indexes
db.stockTransactions.createIndex({ userId: 1, type: 1, timestamp: -1 })
db.gameSessions.createIndex({ userId: 1, endTime: -1 })
```

## PostgreSQL with pgvector Setup

### Docker Setup

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: contrag_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: contrag_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-pgvector.sql:/docker-entrypoint-initdb.d/init-pgvector.sql
    networks:
      - contrag_network
```

### Manual Setup

```bash
# Install PostgreSQL
brew install postgresql@16

# Install pgvector extension
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

# Start PostgreSQL
brew services start postgresql@16

# Create database and enable extension
createdb contrag_test
psql contrag_test -c "CREATE EXTENSION vector;"
```

### Configuration

```json
{
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "contrag_test",
      "user": "postgres",
      "password": "password"
    }
  }
}
```

### Vector Table Schema

```sql
-- Auto-created by Contrag
CREATE TABLE contrag_embeddings (
    id SERIAL PRIMARY KEY,
    namespace VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(768), -- Dimension auto-detected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX ON contrag_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON contrag_embeddings (namespace);
CREATE INDEX ON contrag_embeddings USING gin (metadata);
```

## Schema Design

### Entity Relationship Patterns

#### 1. ObjectId to String References
```javascript
// Parent Document (MongoDB ObjectId)
{
  _id: ObjectId("64a1b2c3d4e5f6789abcdef1"),
  name: "John Doe"
}

// Child Document (String reference)
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1", // String representation
  data: "..."
}
```

#### 2. Embedded vs Referenced Data
```javascript
// Embedded (for small, related data)
{
  _id: ObjectId("..."),
  user: {
    name: "John",
    email: "john@example.com"
  },
  preferences: {
    theme: "dark",
    notifications: true
  }
}

// Referenced (for large, separate entities)
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1",
  largeDataArray: [/* hundreds of items */]
}
```

### Best Practices

1. **Use String References** for cross-collection relationships
2. **Embed Small Data** directly in documents
3. **Reference Large Data** in separate collections
4. **Index Foreign Keys** for relationship queries
5. **Use Consistent Naming** (userId, productId, etc.)

## Data Relationships

### Relationship Detection

Contrag automatically detects relationships based on:
- Field name patterns (`userId`, `user_id`, `productId`)
- Value type matching (ObjectId ↔ String)
- Schema analysis

### Manual Relationship Definition

```javascript
// In your schema definition
const relationships = {
  users: {
    hasMany: [
      { collection: 'bankAccounts', foreignKey: 'userId' },
      { collection: 'stockPortfolios', foreignKey: 'userId' },
      { collection: 'achievements', foreignKey: 'userId' }
    ]
  },
  orders: {
    belongsTo: [
      { collection: 'users', localKey: 'user_id', foreignKey: '_id' }
    ]
  }
};
```

### Building Entity Graphs

```javascript
// Build comprehensive user context
const entityGraph = await sdk.getEntityGraph('users', userId);
console.log('Related entities:', entityGraph.relatedEntities);

// Generate context from multiple collections
const chunks = await sdk.generateContextChunks('users', userId);
console.log('Generated chunks:', chunks.length);
```

## Performance Optimization

### MongoDB Optimization

```javascript
// Efficient queries
db.orders.find({ user_id: "123" }).sort({ createdAt: -1 }).limit(10)

// Aggregation pipelines for complex queries
db.users.aggregate([
  { $match: { "gameData.level": { $gte: 10 } } },
  { $lookup: {
      from: "stockPortfolios",
      localField: "_id",
      foreignField: "userId",
      as: "portfolios"
    }
  },
  { $unwind: "$portfolios" },
  { $group: {
      _id: "$_id",
      totalWealth: { $sum: "$portfolios.totalValue" }
    }
  }
])
```

### pgvector Optimization

```sql
-- Optimize vector search
SET ivfflat.probes = 10;

-- Use appropriate index type
CREATE INDEX ON contrag_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Query optimization
SELECT content, metadata, 
       embedding <=> '[0.1,0.2,...]' AS distance
FROM contrag_embeddings
WHERE namespace = 'users:123'
ORDER BY embedding <=> '[0.1,0.2,...]'
LIMIT 5;
```

### Caching Strategy

```javascript
// Namespace caching
const cache = new Map();

async function getCachedNamespace(entity, uid) {
  const key = `${entity}:${uid}`;
  
  if (!cache.has(key)) {
    const result = await sdk.buildFor(entity, uid);
    cache.set(key, result);
  }
  
  return cache.get(key);
}
```

## Backup and Maintenance

### MongoDB Backup

```bash
# Full database backup
mongodump --uri="mongodb://admin:password@localhost:27017/contrag_test" --out=./backups/

# Collection-specific backup
mongodump --uri="mongodb://admin:password@localhost:27017/contrag_test" --collection=users --out=./backups/

# Restore
mongorestore --uri="mongodb://admin:password@localhost:27017/contrag_test" ./backups/contrag_test/
```

### PostgreSQL Backup

```bash
# Full database backup
pg_dump -h localhost -U postgres -d contrag_test > backup.sql

# Vector data backup
pg_dump -h localhost -U postgres -d contrag_test -t contrag_embeddings > vectors_backup.sql

# Restore
psql -h localhost -U postgres -d contrag_test < backup.sql
```

### Maintenance Tasks

```javascript
// Clean up old embeddings
await sdk.vectorStore.deleteNamespace('users:old_user_id');

// Rebuild corrupted indexes
db.users.reIndex();

// Update vector embeddings
await sdk.rebuildNamespace('users', userId);
```

## Troubleshooting

### Common Issues

#### 1. Relationship Detection Fails
```bash
# Symptoms
- Only main entity data in chunks
- No related entities found
- Empty entity graphs

# Solutions
- Check field naming consistency (userId vs user_id)
- Verify data types (ObjectId vs String)
- Add manual relationship definitions
```

#### 2. Vector Dimension Mismatch
```bash
# Symptoms
- "dimension mismatch" errors
- Failed embedding insertions

# Solutions
- Check embedding model dimensions (Gemini: 768, OpenAI: 1536)
- Recreate vector table with correct dimensions
- Update configuration
```

#### 3. Performance Issues
```bash
# Symptoms
- Slow queries
- High memory usage
- Timeout errors

# Solutions
- Add appropriate indexes
- Optimize query patterns
- Use aggregation pipelines
- Implement caching
```

### Debug Commands

```javascript
// Check schema detection
const schema = await sdk.introspectSchema();
console.log('Detected entities:', schema.map(e => e.name));

// Verify relationships
const graph = await sdk.getEntityGraph('users', userId);
console.log('Related entities:', graph.relatedEntities);

// Test vector storage
const result = await sdk.query(namespace, 'test query', 1);
console.log('Retrieved chunks:', result.chunks.length);
```

### Logging and Monitoring

```javascript
// Enable debug logging
const sdk = new ContragSDK(config, { debug: true });

// Monitor performance
console.time('buildNamespace');
const result = await sdk.buildFor('users', userId);
console.timeEnd('buildNamespace');

// Check vector store stats
const stats = await sdk.vectorStore.getStats();
console.log('Vector store stats:', stats);
```

## Code Examples

### Basic Setup
```javascript
const { ContragSDK } = require('contrag');

const config = {
  database: {
    plugin: 'mongodb',
    config: {
      url: 'mongodb://admin:password@localhost:27017',
      database: 'contrag_test'
    }
  },
  vectorStore: {
    plugin: 'pgvector',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'contrag_test',
      user: 'postgres',
      password: 'password'
    }
  }
};

const sdk = new ContragSDK();
await sdk.configure(config);
```

### Multi-Entity RAG
```javascript
// Build comprehensive user profile
const entityTypes = ['users', 'bankAccounts', 'stockPortfolios', 'achievements'];
const namespaces = {};

for (const entityType of entityTypes) {
  namespaces[entityType] = await sdk.buildFor(entityType, userId);
}

// Query multiple namespaces
const context = await Promise.all([
  sdk.query(namespaces.users.namespace, question, 2),
  sdk.query(namespaces.bankAccounts.namespace, question, 1),
  sdk.query(namespaces.stockPortfolios.namespace, question, 1)
]);

const combinedChunks = context.flatMap(result => result.chunks);
```

### Custom Schema Integration
```javascript
// Financial game integration
class FinancialGameRAG {
  constructor(sdk) {
    this.sdk = sdk;
    this.entityTypes = [
      'users', 'bankAccounts', 'stockPortfolios', 
      'achievements', 'stockTransactions'
    ];
  }

  async buildPlayerProfile(playerId) {
    const namespaces = {};
    
    for (const entityType of this.entityTypes) {
      try {
        namespaces[entityType] = await this.sdk.buildFor(entityType, playerId);
      } catch (error) {
        console.warn(`Failed to build ${entityType} namespace:`, error.message);
      }
    }
    
    return namespaces;
  }

  async getFinancialAdvice(playerId, question) {
    const namespaces = await this.buildPlayerProfile(playerId);
    
    const context = await Promise.all(
      Object.values(namespaces).map(ns => 
        this.sdk.query(ns.namespace, question, 1)
      )
    );
    
    return context.flatMap(result => result.chunks);
  }
}
```

## Migration Guide

### From Single to Multi-Database
```javascript
// Old configuration
{
  "database": {
    "plugin": "mongodb",
    "config": { "url": "..." }
  }
}

// New configuration
{
  "database": {
    "plugin": "mongodb",
    "config": { "url": "..." }
  },
  "vectorStore": {
    "plugin": "pgvector",
    "config": { "host": "localhost", "port": 5432 }
  }
}
```

### Schema Evolution
```javascript
// Migrate existing data
async function migrateSchema() {
  const users = await db.collection('users').find({}).toArray();
  
  for (const user of users) {
    // Add new fields
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          'gameData.totalWealth': calculateWealth(user),
          'lastMigration': new Date()
        }
      }
    );
  }
}
```

This comprehensive database guide provides everything needed to effectively use databases with Contrag, from basic setup to advanced optimization techniques.
