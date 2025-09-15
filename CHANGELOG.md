# Changelog

All notable changes to ContRAG will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-09-15

### 🚀 Major Features Added

#### Master Entity Configuration
- **NEW**: Master entity definitions via `masterEntities` in config.json
- **NEW**: Support for complex relationship types (one-to-one, one-to-many, many-to-one, many-to-many)
- **NEW**: Custom sample filters per entity
- **NEW**: Flexible primary key and foreign key mapping

#### System Prompt Support
- **NEW**: System prompts configuration via `systemPrompts` in config.json
- **NEW**: Built-in prompt types: `default`, `contextBuilder`, `queryProcessor`
- **NEW**: Custom prompt support for specialized use cases
- **NEW**: SDK methods: `getSystemPrompt()`, `setSystemPrompt()`

#### Enhanced CLI Commands

##### Configuration Management
- **NEW**: `contrag config init` - Initialize with templates (basic, mongodb, postgres, advanced)
- **NEW**: `contrag config validate` - Comprehensive configuration validation

##### Connection Testing
- **NEW**: `contrag test db` - Test database connection with detailed metrics
- **NEW**: `contrag test vector` - Test vector store connection
- **NEW**: `contrag test embedder` - Test embedder connection with latency
- **NEW**: `contrag test all` - Test all connections simultaneously

##### Sample Data Retrieval
- **NEW**: `contrag sample --entity <name>` - Get sample entity records
- **NEW**: `contrag sample --entity <name> --uid <id>` - Get related data for specific entity
- **NEW**: Support for custom filters: `--filter '{"active": true}'`
- **NEW**: JSON and table output formats

##### Vector Store Debugging
- **NEW**: `contrag vector stats` - Show vector store statistics and dimensions
- **NEW**: `contrag vector namespaces` - List all namespaces
- **NEW**: `contrag vector search` - Search similar vectors with similarity scores

#### SDK Enhancements
- **NEW**: `testDatabaseConnection()` - Connection testing with metrics
- **NEW**: `testVectorStoreConnection()` - Vector store health checks
- **NEW**: `testEmbedderConnection()` - Embedder connectivity testing
- **NEW**: `getSampleData()` - Retrieve sample data with filters
- **NEW**: `getRelatedSampleData()` - Get comprehensive related entity data
- **NEW**: `getVectorStoreStats()` - Vector store statistics
- **NEW**: `listVectorStoreNamespaces()` - List available namespaces
- **NEW**: `searchSimilarVectors()` - Similarity search across vectors
- **NEW**: `getMasterEntityConfig()` - Retrieve master entity configuration

#### Plugin Interface Enhancements
- **NEW**: Optional `testConnection()` method for all plugin types
- **NEW**: Optional `getSampleData()` and `getRelatedSampleData()` for DB plugins
- **NEW**: Optional `getStats()`, `listNamespaces()`, `searchSimilar()` for vector store plugins
- **NEW**: System prompt support in embedder plugins

### 🛠 Technical Improvements

#### Code Organization
- **NEW**: `constants.ts` - Centralized configuration constants
- **IMPROVED**: Eliminated hardcoded values throughout codebase
- **IMPROVED**: Enhanced error messages with consistent formatting
- **IMPROVED**: Better type definitions for all new features

#### Configuration Templates
- **NEW**: Multiple configuration templates for different tech stacks
- **NEW**: MongoDB + Weaviate + OpenAI template
- **NEW**: PostgreSQL + pgvector + Gemini template
- **NEW**: Advanced template with full feature showcase

#### Enhanced Plugin Implementations
- **IMPROVED**: PostgreSQL plugin with comprehensive debugging methods
- **IMPROVED**: MongoDB plugin with better relationship inference
- **IMPROVED**: Vector store plugins with statistics and search capabilities
- **IMPROVED**: Embedder plugins with connection testing

### 📚 Documentation

#### Comprehensive Guides
- **NEW**: `docs/ENHANCED_FEATURES.md` - Complete feature documentation
- **NEW**: `docs/MONGODB_GEMINI_PGVECTOR_SETUP.md` - Step-by-step integration guide
- **IMPROVED**: CLI help with detailed examples and use cases
- **NEW**: Environment variable documentation
- **NEW**: Troubleshooting guides

#### Integration Examples
- **NEW**: Production batch processing scripts
- **NEW**: Health monitoring examples  
- **NEW**: Express.js integration patterns
- **NEW**: Cron job setup for maintenance

### 🔧 Configuration Schema Changes

#### New Configuration Options
```json
{
  "contextBuilder": {
    "maxDepth": 3,              // NEW: Maximum relationship traversal depth
    "relationshipLimit": 10     // NEW: Limit relationships per entity
  },
  "masterEntities": [           // NEW: Master entity definitions
    {
      "name": "User",
      "primaryKey": "id",
      "relationships": {...},
      "sampleFilters": {...}
    }
  ],
  "systemPrompts": {            // NEW: System prompt configuration
    "default": "...",
    "contextBuilder": "...",
    "queryProcessor": "...",
    "custom": {...}
  }
}
```

### 🎯 CLI Usage Examples

#### Configuration Management
```bash
# Initialize with templates
contrag config init --template mongodb
contrag config init --template postgres --force
contrag config validate

# Connection testing
contrag test all
contrag test db
```

#### Data Analysis
```bash
# Schema analysis
contrag introspect --format json

# Sample data retrieval
contrag sample --entity User --limit 10
contrag sample --entity User --uid 123
contrag sample --entity Order --filter '{"status": "active"}'
```

#### Vector Store Management
```bash
# Vector store operations
contrag vector stats
contrag vector namespaces
contrag vector search --text "user orders" --namespace User:123
```

### ⚡ Performance Improvements
- **IMPROVED**: Configurable batch processing for large datasets
- **IMPROVED**: Connection pooling optimization
- **IMPROVED**: Memory usage optimization for large entity graphs
- **IMPROVED**: Retry logic for failed operations

### 🔒 Breaking Changes
- **BREAKING**: CLI command structure reorganized with subcommands
- **BREAKING**: Configuration schema extended (backwards compatible for basic usage)
- **BREAKING**: Some plugin interfaces extended (optional methods)

### 🐛 Bug Fixes
- **FIXED**: Hardcoded chunk sizes and overlap values
- **FIXED**: Inconsistent error messages
- **FIXED**: Connection timeout issues
- **FIXED**: Memory leaks in batch processing

---

## [1.0.0] - 2024-XX-XX

### Initial Release
- Basic schema introspection
- Entity graph building
- PostgreSQL and MongoDB support
- Vector store integration (Weaviate, pgvector)
- OpenAI and Gemini embedders
- Basic CLI commands
- Time series support
