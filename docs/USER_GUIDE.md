# Contrag User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Configuration](#configuration)
4. [Basic Usage](#basic-usage)
5. [Advanced Features](#advanced-features)
6. [Integration Patterns](#integration-patterns)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Examples](#examples)

## Getting Started

### What is Contrag?

Contrag is a comprehensive Retrieval-Augmented Generation (RAG) system that intelligently builds context from your databases to power AI applications. It automatically understands your data relationships and creates semantic search capabilities across complex database schemas.

### Key Features

- ** Smart Schema Introspection** - Automatically understands your database structure
- **Entity Relationship Mapping** - Discovers and maps data relationships
- ** Multi-Model AI Support** - Works with OpenAI, Gemini, Claude, and more
- ** Multi-Database Support** - MongoDB, PostgreSQL, MySQL, and vector databases
- ** High Performance** - Optimized chunking and embedding strategies
- **🔌 Plugin Architecture** - Extensible and customizable

### Quick Start

```bash
# Install
npm install contrag

# Basic setup
const { ContragSDK } = require('contrag');

const sdk = new ContragSDK();
await sdk.configure({
  database: {
    plugin: 'mongodb',
    config: { url: 'mongodb://localhost:27017', database: 'mydb' }
  },
  vectorStore: {
    plugin: 'pgvector',
    config: { host: 'localhost', port: 5432 }
  },
  embedder: {
    plugin: 'openai',
    config: { apiKey: 'your-api-key' }
  }
});

// Build context for an entity
const result = await sdk.buildFor('users', 'user123');

// Query with natural language
const answer = await sdk.query(result.namespace, 'What are this user's preferences?');
console.log(answer.chunks[0].content);
```

## Core Concepts

### Entities

An **entity** represents a collection or table in your database. Contrag automatically discovers entities and their relationships.

```javascript
// Examples of entities
- users (from MongoDB users collection)
- orders (from PostgreSQL orders table)
- products (from MySQL products table)
```

### Namespaces

A **namespace** is a semantic container that holds all context data for a specific entity instance.

```javascript
// Namespace examples
'users:john_doe_123'        // All data related to user john_doe_123
'orders:order_456'          // All data related to order 456
'companies:acme_corp'       // All data related to ACME Corporation
```

### Context Chunks

**Context chunks** are semantically meaningful pieces of information that Contrag creates from your data. Each chunk contains:

- **Content** - The actual text content
- **Metadata** - Entity type, ID, timestamp, etc.
- **Embedding** - Vector representation for similarity search

### Entity Graphs

An **entity graph** shows how different entities relate to each other around a central entity.

```javascript
// Example entity graph for a user
{
  "entity": "users",
  "uid": "user123",
  "relatedEntities": [
    { "entity": "orders", "count": 15 },
    { "entity": "reviews", "count": 8 },
    { "entity": "wishlist_items", "count": 23 }
  ]
}
```

## Configuration

### Basic Configuration

```javascript
const config = {
  // Database configuration
  database: {
    plugin: 'mongodb',
    config: {
      url: 'mongodb://localhost:27017',
      database: 'myapp'
    }
  },
  
  // Vector store configuration
  vectorStore: {
    plugin: 'pgvector',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'vectors',
      user: 'postgres',
      password: 'password'
    }
  },
  
  // AI embeddings configuration
  embedder: {
    plugin: 'openai',
    config: {
      apiKey: 'your-openai-api-key',
      model: 'text-embedding-ada-002'
    }
  },
  
  // Context building settings
  contextBuilder: {
    chunkSize: 1000,        // Maximum chunk size in characters
    overlap: 200,           // Overlap between chunks
    maxDepth: 3,            // Maximum relationship depth
    includeMetadata: true   // Include metadata in chunks
  }
};
```

### Environment Variables

```bash
# Create .env file
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
MONGODB_URL=mongodb://localhost:27017
POSTGRES_URL=postgresql://user:pass@localhost:5432/db
```

### Configuration File

```json
// contrag.config.json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "${MONGODB_URL}",
      "database": "production"
    }
  },
  "vectorStore": {
    "plugin": "pgvector", 
    "config": {
      "connectionString": "${POSTGRES_URL}"
    }
  },
  "embedder": {
    "plugin": "openai",
    "config": {
      "apiKey": "${OPENAI_API_KEY}"
    }
  }
}
```

## Basic Usage

### 1. Initialize SDK

```javascript
const { ContragSDK } = require('contrag');

// From configuration object
const sdk = new ContragSDK();
await sdk.configure(config);

// From configuration file
const sdk = new ContragSDK('./contrag.config.json');

// With inline configuration
const sdk = new ContragSDK({
  database: { plugin: 'mongodb', config: { /* ... */ } }
});
```

### 2. Explore Your Schema

```javascript
// Get all entities in your database
const schema = await sdk.introspectSchema();
console.log('Available entities:', schema.map(e => e.name));

// Get details about a specific entity
const userEntity = schema.find(e => e.name === 'users');
console.log('User fields:', userEntity.fields);
```

### 3. Build Entity Context

```javascript
// Build context for a specific user
const buildResult = await sdk.buildFor('users', 'user123');
console.log('Namespace created:', buildResult.namespace);
console.log('Chunks generated:', buildResult.chunks);

// Build with options
const result = await sdk.buildFor('users', 'user123', {
  depth: 2,           // Include 2 levels of relationships
  limit: 500,         // Limit to 500 related records
  includeFields: ['name', 'email', 'preferences']
});
```

### 4. Query with Natural Language

```javascript
// Simple query
const result = await sdk.query(
  'users:user123', 
  'What are this user's recent orders?',
  3  // Return top 3 most relevant chunks
);

result.chunks.forEach(chunk => {
  console.log('Relevance:', chunk.score);
  console.log('Content:', chunk.content);
  console.log('Source:', chunk.metadata.entity);
});
```

### 5. Generate Context-Aware Responses

```javascript
// Get context and generate AI response
const context = await sdk.query(
  'users:user123',
  'What products does this user like?'
);

// Use context with your AI model
const prompt = `
Based on this user data:
${context.chunks.map(c => c.content).join('\n\n')}

Recommend 3 products this user would enjoy and explain why.
`;

const response = await yourAIModel.generate(prompt);
```

## Advanced Features

### Multi-Entity Context Building

```javascript
// Build context for multiple related entities
async function buildComprehensiveProfile(userId) {
  const entityTypes = ['users', 'orders', 'reviews', 'wishlist_items'];
  const namespaces = {};
  
  for (const entityType of entityTypes) {
    try {
      namespaces[entityType] = await sdk.buildFor(entityType, userId);
    } catch (error) {
      console.warn(`Could not build ${entityType}:`, error.message);
    }
  }
  
  return namespaces;
}

// Query across multiple namespaces
async function getComprehensiveContext(userId, question) {
  const namespaces = await buildComprehensiveProfile(userId);
  
  const contexts = await Promise.all(
    Object.values(namespaces).map(ns => 
      sdk.query(ns.namespace, question, 2)
    )
  );
  
  return contexts.flatMap(ctx => ctx.chunks);
}
```

### Custom Chunking Strategies

```javascript
// Custom chunking function
function customChunker(data, options) {
  const chunks = [];
  
  // Split by semantic boundaries (e.g., paragraphs)
  const sections = data.split('\n\n');
  
  for (const section of sections) {
    if (section.length > options.chunkSize) {
      // Split large sections
      const subChunks = splitLargeSection(section, options.chunkSize);
      chunks.push(...subChunks);
    } else {
      chunks.push(section);
    }
  }
  
  return chunks;
}

// Use custom chunker
const sdk = new ContragSDK(config, {
  chunker: customChunker
});
```

### Relationship Mapping

```javascript
// Define custom relationships
const relationships = {
  users: {
    hasMany: [
      { collection: 'orders', foreignKey: 'userId' },
      { collection: 'reviews', foreignKey: 'authorId' },
      { collection: 'addresses', foreignKey: 'userId' }
    ]
  },
  orders: {
    belongsTo: [
      { collection: 'users', localKey: 'userId', foreignKey: '_id' }
    ],
    hasMany: [
      { collection: 'order_items', foreignKey: 'orderId' }
    ]
  }
};

// Configure SDK with custom relationships
const sdk = new ContragSDK(config, { relationships });
```

### Performance Optimization

```javascript
// Batch operations
const users = ['user1', 'user2', 'user3'];
const buildPromises = users.map(userId => 
  sdk.buildFor('users', userId)
);
const results = await Promise.all(buildPromises);

// Caching
class ContragCache {
  constructor() {
    this.cache = new Map();
  }
  
  async getOrBuild(entity, uid) {
    const key = `${entity}:${uid}`;
    
    if (!this.cache.has(key)) {
      const result = await sdk.buildFor(entity, uid);
      this.cache.set(key, result);
    }
    
    return this.cache.get(key);
  }
}

const cache = new ContragCache();
const result = await cache.getOrBuild('users', 'user123');
```

## Integration Patterns

### Express.js Integration

```javascript
const express = require('express');
const { ContragSDK } = require('contrag');

const app = express();
const sdk = new ContragSDK('./contrag.config.json');

// Middleware to ensure SDK is ready
app.use(async (req, res, next) => {
  if (!sdk.isReady) {
    await sdk.configure();
  }
  next();
});

// API endpoint for user insights
app.get('/api/users/:userId/insights', async (req, res) => {
  try {
    const { userId } = req.params;
    const { question } = req.query;
    
    // Build or get cached user context
    const buildResult = await sdk.buildFor('users', userId);
    
    // Query with user's question
    const result = await sdk.query(buildResult.namespace, question, 5);
    
    res.json({
      question,
      insights: result.chunks.map(chunk => ({
        content: chunk.content,
        relevance: chunk.score,
        source: chunk.metadata.entity
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js Integration

```javascript
// pages/api/ai/insights.js
import { ContragSDK } from 'contrag';

const sdk = new ContragSDK(process.env.CONTRAG_CONFIG_PATH);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { userId, question } = req.body;
  
  try {
    // Ensure SDK is configured
    if (!sdk.isReady) {
      await sdk.configure();
    }
    
    // Get user context
    const context = await sdk.query(`users:${userId}`, question, 3);
    
    // Generate AI response (using your preferred AI service)
    const response = await generateAIResponse(context.chunks, question);
    
    res.json({ 
      response, 
      sources: context.chunks.length,
      confidence: calculateConfidence(context.chunks)
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
}
```

### React Hook

```javascript
// hooks/useContragInsights.js
import { useState, useEffect } from 'react';

export function useContragInsights(userId, question) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!userId || !question) return;
    
    setLoading(true);
    setError(null);
    
    fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, question })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      setInsights(data.insights || []);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, [userId, question]);
  
  return { insights, loading, error };
}

// Component usage
function UserInsights({ userId }) {
  const { insights, loading, error } = useContragInsights(
    userId, 
    "What are this user's preferences and behavior patterns?"
  );
  
  if (loading) return <div>Loading insights...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {insights.map((insight, i) => (
        <div key={i} className="insight">
          <div className="content">{insight.content}</div>
          <div className="meta">
            Relevance: {insight.relevance}% | Source: {insight.source}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### ContragSDK Class

#### Constructor
```javascript
new ContragSDK(config?, options?)
```

#### Methods

##### `configure(config)`
```javascript
await sdk.configure({
  database: { plugin: 'mongodb', config: {...} },
  vectorStore: { plugin: 'pgvector', config: {...} },
  embedder: { plugin: 'openai', config: {...} }
});
```

##### `introspectSchema()`
```javascript
const schema = await sdk.introspectSchema();
// Returns: Array of entity objects with fields and relationships
```

##### `buildFor(entity, uid, options?)`
```javascript
const result = await sdk.buildFor('users', 'user123', {
  depth: 2,        // Relationship depth
  limit: 1000,     // Record limit
  includeFields: ['name', 'email'] // Specific fields only
});
// Returns: { namespace: string, chunks: number, processingTime: number }
```

##### `query(namespace, question, limit?)`
```javascript
const result = await sdk.query('users:user123', 'What are user preferences?', 5);
// Returns: { chunks: Array, processingTime: number }
```

##### `getEntityGraph(entity, uid)`
```javascript
const graph = await sdk.getEntityGraph('users', 'user123');
// Returns: { entity, uid, relatedEntities: Array }
```

##### `generateContextChunks(entity, uid)`
```javascript
const chunks = await sdk.generateContextChunks('users', 'user123');
// Returns: Array of chunk objects
```

##### `rebuildNamespace(namespace)`
```javascript
await sdk.rebuildNamespace('users:user123');
// Rebuilds and updates existing namespace
```

##### `deleteNamespace(namespace)`
```javascript
await sdk.deleteNamespace('users:user123');
// Removes namespace and all associated vectors
```

### Chunk Object Structure

```javascript
{
  content: "The actual text content...",
  metadata: {
    entity: "users",
    uid: "user123",
    timestamp: "2024-01-01T00:00:00Z",
    source: "document",
    depth: 0
  },
  embedding: [0.1, 0.2, 0.3, ...], // Vector representation
  score: 0.85 // Relevance score (0-1)
}
```

## Best Practices

### 1. Namespace Management

```javascript
// Good: Use descriptive namespaces
'users:john_smith_12345'
'orders:order_2024_001'
'sessions:session_abc123'

// Avoid: Generic or unclear namespaces
'data:123'
'temp:stuff'
```

### 2. Query Optimization

```javascript
// Good: Specific, targeted queries
await sdk.query(namespace, 'user purchase history from last 3 months', 3);

// Avoid: Vague, broad queries
await sdk.query(namespace, 'everything about user', 10);
```

### 3. Error Handling

```javascript
try {
  const result = await sdk.buildFor('users', userId);
  
  if (result.chunks === 0) {
    console.warn('No data found for user:', userId);
    return fallbackResponse();
  }
  
  return result;
} catch (error) {
  if (error.message.includes('not found')) {
    return handleMissingUser(userId);
  }
  
  console.error('Unexpected error:', error);
  throw error;
}
```

### 4. Resource Management

```javascript
// Initialize once, reuse
const globalSDK = new ContragSDK('./config.json');

// Clean up when done
process.on('SIGTERM', async () => {
  await globalSDK.disconnect();
  process.exit(0);
});
```

### 5. Security Considerations

```javascript
// Validate user access
async function secureQuery(userId, question, requestingUser) {
  // Check permissions
  if (!canAccessUser(requestingUser, userId)) {
    throw new Error('Access denied');
  }
  
  // Sanitize input
  const sanitizedQuestion = sanitize(question);
  
  // Execute query
  return await sdk.query(`users:${userId}`, sanitizedQuestion);
}
```

## Troubleshooting

### Common Issues

#### 1. "No embeddings found"
```javascript
// Problem: Namespace wasn't built or was corrupted
// Solution: Rebuild the namespace
await sdk.buildFor('users', userId);
```

#### 2. "Dimension mismatch"
```javascript
// Problem: Vector dimensions don't match between embedder and vector store
// Solution: Check your embedder configuration
{
  "embedder": {
    "plugin": "openai",
    "config": {
      "model": "text-embedding-ada-002" // 1536 dimensions
    }
  }
}
```

#### 3. "Relationship not found"
```javascript
// Problem: Contrag can't detect relationships automatically
// Solution: Define relationships manually
const relationships = {
  users: {
    hasMany: [{ collection: 'orders', foreignKey: 'user_id' }]
  }
};
```

#### 4. "Performance issues"
```javascript
// Problem: Slow query responses
// Solutions:
// 1. Limit chunk count
const result = await sdk.query(namespace, question, 3); // Instead of 10+

// 2. Use caching
const cache = new Map();
const cachedResult = cache.get(key) || await sdk.query(...);

// 3. Index your database properly
// MongoDB: db.collection.createIndex({ field: 1 })
// PostgreSQL: CREATE INDEX ON table (column);
```

### Debug Mode

```javascript
// Enable debug logging
const sdk = new ContragSDK(config, { debug: true });

// Or set environment variable
process.env.CONTRAG_DEBUG = 'true';
```

### Health Checks

```javascript
async function healthCheck() {
  try {
    // Test database connection
    const schema = await sdk.introspectSchema();
    console.log('✅ Database connected, found', schema.length, 'entities');
    
    // Test vector store
    const testResult = await sdk.query('test', 'health check', 1);
    console.log('✅ Vector store operational');
    
    // Test embeddings
    const testBuild = await sdk.buildFor('users', 'test_user');
    console.log('✅ Embeddings working');
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}
```

## Examples

See the `/examples` directory for complete working examples:

- **Basic RAG Setup** - Simple document Q&A system
- **E-commerce Recommendations** - Product recommendations based on user behavior
- **Financial Game AI** - Personalized financial advice system
- **Customer Support** - Context-aware support responses
- **Content Management** - Smart content discovery and recommendations

### Complete Example: Customer Insights Dashboard

```javascript
const { ContragSDK } = require('contrag');
const express = require('express');

class CustomerInsightsDashboard {
  constructor() {
    this.sdk = new ContragSDK('./config.json');
    this.app = express();
    this.setupRoutes();
  }
  
  async initialize() {
    await this.sdk.configure();
    console.log('Customer Insights Dashboard ready!');
  }
  
  setupRoutes() {
    // Get customer overview
    this.app.get('/customers/:id', async (req, res) => {
      const { id } = req.params;
      
      try {
        const buildResult = await this.sdk.buildFor('customers', id);
        const insights = await Promise.all([
          this.sdk.query(buildResult.namespace, 'purchase history and preferences', 3),
          this.sdk.query(buildResult.namespace, 'support tickets and issues', 2),
          this.sdk.query(buildResult.namespace, 'engagement and activity patterns', 2)
        ]);
        
        res.json({
          customerId: id,
          namespace: buildResult.namespace,
          insights: {
            purchases: insights[0].chunks,
            support: insights[1].chunks,
            engagement: insights[2].chunks
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Ask specific questions about customer
    this.app.post('/customers/:id/ask', async (req, res) => {
      const { id } = req.params;
      const { question } = req.body;
      
      try {
        const result = await this.sdk.query(`customers:${id}`, question, 5);
        
        res.json({
          question,
          answer: result.chunks,
          confidence: this.calculateConfidence(result.chunks)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  calculateConfidence(chunks) {
    if (chunks.length === 0) return 0;
    
    const avgScore = chunks.reduce((sum, chunk) => sum + chunk.score, 0) / chunks.length;
    return Math.round(avgScore * 100);
  }
  
  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`Customer Insights Dashboard running on port ${port}`);
    });
  }
}

// Usage
const dashboard = new CustomerInsightsDashboard();
await dashboard.initialize();
dashboard.start();
```

This comprehensive user guide provides everything needed to effectively use Contrag from basic setup to advanced integration patterns. For more specific examples and use cases, refer to the examples directory and additional documentation files.
