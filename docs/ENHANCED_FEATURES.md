# ContRAG Enhanced Features Guide

This document covers the enhanced debugging, configuration, and management features added to ContRAG.

## Table of Contents

- [Configuration Management](#configuration-management)
- [Master Entity Configuration](#master-entity-configuration)
- [System Prompts](#system-prompts)
- [Connection Testing](#connection-testing)
- [Sample Data Retrieval](#sample-data-retrieval)
- [Vector Store Debugging](#vector-store-debugging)
- [CLI Commands Reference](#cli-commands-reference)
- [Environment Variables](#environment-variables)

## Configuration Management

### Initialize Configuration

Create a new configuration file with different templates:

```bash
# Basic configuration (PostgreSQL + Weaviate + OpenAI)
contrag config init --template basic

# PostgreSQL with pgvector and Gemini
contrag config init --template postgres

# MongoDB with Weaviate and OpenAI
contrag config init --template mongodb

# Advanced configuration with all features
contrag config init --template advanced

# Force overwrite existing config
contrag config init --template advanced --force
```

### Validate Configuration

Test your configuration and all connections:

```bash
contrag config validate
```

This command will:
- Validate the configuration file format
- Test database connection
- Test vector store connection  
- Test embedder connection
- Show connection statistics and latency

## Master Entity Configuration

Master entities define the primary entities around which context is built. They specify relationships and how data should be traversed.

### Configuration Format

```json
{
  "masterEntities": [
    {
      "name": "User",
      "primaryKey": "id", 
      "relationships": {
        "orders": {
          "entity": "Order",
          "type": "one-to-many",
          "localKey": "id",
          "foreignKey": "user_id"
        },
        "profile": {
          "entity": "UserProfile", 
          "type": "one-to-one",
          "localKey": "id",
          "foreignKey": "user_id"
        }
      },
      "sampleFilters": {
        "active": true,
        "created_at": {"$gte": "2024-01-01"}
      }
    }
  ]
}
```

### Relationship Types

- `one-to-one`: Single related record
- `one-to-many`: Multiple related records from this entity
- `many-to-one`: Single related record that this entity references
- `many-to-many`: Multiple related records through junction table

### Using Master Entity Configuration

```bash
# Get sample data using master entity configuration
contrag sample --entity User --uid 123

# The SDK will automatically use the master entity config if available
const entityConfig = sdk.getMasterEntityConfig('User');
const sampleData = await sdk.getRelatedSampleData('User', '123', entityConfig);
```

## System Prompts

System prompts customize how the LLM processes context and queries.

### Configuration

```json
{
  "systemPrompts": {
    "default": "You are a helpful assistant...",
    "contextBuilder": "Create comprehensive context that captures...",
    "queryProcessor": "Analyze user queries in the context of...",
    "custom": {
      "analytics": "Focus on data patterns and insights...",
      "support": "Provide helpful customer support responses..."
    }
  }
}
```

### Programmatic Usage

```javascript
// Get system prompt
const prompt = sdk.getSystemPrompt('analytics');

// Set custom system prompt
sdk.setSystemPrompt('myCustomPrompt', 'Custom instructions...');

// Use system prompt in context building (automatically handled)
const result = await sdk.buildFor('User', '123');
```

## Connection Testing

Test individual or all connections to debug configuration issues.

### Test Individual Connections

```bash
# Test database connection only
contrag test db

# Test vector store connection only  
contrag test vector

# Test embedder connection only
contrag test embedder
```

### Test All Connections

```bash
contrag test all
```

### Sample Output

```
✓ Database connection successful (45ms)
  serverTime: 2025-09-15T10:30:00.000Z
  poolSize: 10
  idleCount: 8
  waitingCount: 0

✓ Vector store connection successful (120ms)
  method: stats-fallback
  
✓ Embedder connection successful (890ms)  
  method: embedding-test
```

## Sample Data Retrieval

Retrieve sample data for debugging and testing purposes.

### Basic Sample Data

```bash
# Get 10 sample user records
contrag sample --entity User --limit 10

# Get sample data with filters  
contrag sample --entity Order --filter '{"status": "active"}'

# Output as JSON
contrag sample --entity User --format json
```

### Related Sample Data

```bash
# Get all related data for a specific user
contrag sample --entity User --uid 123

# This will return:
# - The user record
# - All related orders  
# - User profile
# - Any other configured relationships
```

### Sample Output

```
✓ Retrieved data for User:123

Master Entity Data:
┌─────┬──────┬─────────────────────┬────────┬────────┐
│ id  │ name │ email              │ active │ created│
├─────┼──────┼─────────────────────┼────────┼────────┤
│ 123 │ John │ john@example.com   │ true   │ 2024-01│
└─────┴──────┴─────────────────────┴────────┴────────┘

orders (3 records):
┌────────┬─────────┬────────────┬──────────┐
│ id     │ user_id │ total      │ status   │
├────────┼─────────┼────────────┼──────────┤
│ 1001   │ 123     │ 99.99      │ shipped  │
│ 1002   │ 123     │ 149.99     │ pending  │
│ 1003   │ 123     │ 79.99      │ completed│
└────────┴─────────┴────────────┴──────────┘

Total records: 4
```

## Vector Store Debugging

Debug and inspect your vector store contents.

### Vector Store Statistics

```bash
contrag vector stats
```

Sample output:
```
✓ Vector store statistics

Total Vectors: 15,423
Dimensions: 1536
Namespaces: 8
Storage Size: 234.5MB

Namespaces:
  - User:123
  - User:456
  - Order:1001
  - Order:1002
```

### List Namespaces

```bash
# List all namespaces
contrag vector namespaces

# Output as JSON
contrag vector namespaces --format json
```

### Search Similar Vectors

```bash
# Search within a specific namespace
contrag vector search --text "user orders" --namespace User:123

# Search across all namespaces
contrag vector search --text "shipping information" --limit 10
```

Sample output:
```
✓ Found 3 similar vectors

Result 1:
  ID: chunk_123_1
  Score: 0.8934
  Metadata:
    entity: User
    uid: 123
    chunkIndex: 1
  Content:
    John Smith placed 3 orders totaling $329.97. His most recent order...

Result 2:
  ID: chunk_123_2  
  Score: 0.8756
  ...
```

## CLI Commands Reference

### Configuration Commands
- `contrag config init [--template] [--force]` - Initialize configuration
- `contrag config validate` - Validate configuration and test connections

### Testing Commands  
- `contrag test all` - Test all connections
- `contrag test db` - Test database connection
- `contrag test vector` - Test vector store connection
- `contrag test embedder` - Test embedder connection

### Data Commands
- `contrag introspect [--format]` - Show database schema
- `contrag sample --entity <name> [options]` - Get sample data
- `contrag build --entity <name> --uid <id>` - Build context
- `contrag query --namespace <ns> --query <text>` - Query context

### Vector Store Commands
- `contrag vector stats` - Show vector store statistics
- `contrag vector namespaces [--format]` - List namespaces
- `contrag vector search --text <text> [options]` - Search similar vectors

## Environment Variables

### Database Configuration

#### PostgreSQL
```bash
export CONTRAG_DB_PLUGIN=postgres
export CONTRAG_DB_HOST=localhost
export CONTRAG_DB_PORT=5432
export CONTRAG_DB_NAME=your_database
export CONTRAG_DB_USER=username
export CONTRAG_DB_PASSWORD=password
```

#### MongoDB
```bash
export CONTRAG_DB_PLUGIN=mongodb
export CONTRAG_DB_URL=mongodb://localhost:27017
export CONTRAG_DB_NAME=your_database
```

### Vector Store Configuration

#### Weaviate
```bash
export CONTRAG_VECTOR_PLUGIN=weaviate
export CONTRAG_VECTOR_URL=http://localhost:8080
export CONTRAG_VECTOR_API_KEY=your_api_key
```

#### pgvector
```bash
export CONTRAG_VECTOR_PLUGIN=pgvector
export CONTRAG_VECTOR_HOST=localhost
export CONTRAG_VECTOR_PORT=5432
export CONTRAG_VECTOR_DATABASE=your_database
export CONTRAG_VECTOR_USER=username
export CONTRAG_VECTOR_PASSWORD=password
```

### Embedder Configuration

#### OpenAI
```bash
export CONTRAG_EMBEDDER_PLUGIN=openai
export CONTRAG_OPENAI_API_KEY=your_api_key
export CONTRAG_OPENAI_MODEL=text-embedding-3-large
```

#### Gemini
```bash
export CONTRAG_EMBEDDER_PLUGIN=gemini
export CONTRAG_GEMINI_API_KEY=your_api_key
export CONTRAG_GEMINI_MODEL=embedding-001
```

## Error Handling and Debugging

### Common Issues

1. **Connection Failures**
   - Use `contrag test all` to diagnose connection issues
   - Check environment variables and configuration files
   - Verify service availability and credentials

2. **Schema Issues**
   - Use `contrag introspect` to verify database schema
   - Check master entity configuration matches actual schema
   - Ensure foreign key relationships are properly defined

3. **No Sample Data**
   - Verify entity names match database tables/collections
   - Check filters in master entity configuration
   - Use `contrag sample --entity EntityName --limit 1` to test

4. **Vector Store Issues**
   - Use `contrag vector stats` to check vector store status
   - Verify namespace existence with `contrag vector namespaces`
   - Test embedder connectivity with `contrag test embedder`

### Debug Mode

Set the `DEBUG` environment variable for verbose logging:

```bash
export DEBUG=contrag:*
contrag build --entity User --uid 123
```

This will provide detailed logging for debugging issues.
