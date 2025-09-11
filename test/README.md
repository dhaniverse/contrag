# Contrag Test Suite

This directory contains comprehensive tests and utilities for the Contrag RAG system.

## Test Categories

### Core Functionality Tests
- `test-package.js` - Basic SDK functionality and plugin system
- `test-mongodb-connection.js` - Database connection and schema introspection
- `test-game-rag.js` - RAG system with complex game schema

### RAG Pipeline Tests
- `test-full-rag.js` - Complete RAG pipeline demonstration
- `test-comprehensive-rag.js` - Multi-namespace RAG with all related data
- `test-fixed-rag.js` - RAG system fixes and optimizations

### AI Integration Tests
- `test-maya-ai.js` - AI tutor with personalized responses

### Debugging and Utilities
- `debug-query.js` - Query debugging and analysis
- `debug-rag-build.js` - RAG build process debugging
- `verify-user-data.js` - Database data verification
- `populate-vectors.js` - Vector store population utility

## Running Tests

### Prerequisites

Ensure services are running:
```bash
# From project root
docker-compose up -d
```

### Individual Tests

```bash
# Core functionality
node test/test-package.js
node test/test-mongodb-connection.js

# RAG pipeline tests
node test/test-full-rag.js
node test/test-comprehensive-rag.js

# AI integration
node test/test-maya-ai.js

# Debug utilities
node test/debug-rag-build.js
node test/verify-user-data.js
```

### Environment Setup

Tests expect these services to be available:
- **MongoDB**: `mongodb://admin:password@localhost:27017/contrag_test`
- **PostgreSQL**: `postgresql://postgres:password@localhost:5432/contrag_test`
- **Gemini API**: Valid API key in configuration

### Test Data

Most tests use the financial game schema with these test players:
- **AlexInvestor** (64a1b2c3d4e5f6789abcdef1) - Advanced Level 22 player
- **MayaStudent** (64a1b2c3d4e5f6789abcdef0) - Beginner Level 15 player
- **TradingPro** (64a1b2c3d4e5f6789abcdef2) - Expert Level 30 player
- **NewbieTrader** (64a1b2c3d4e5f6789abcdef3) - Level 8 learning player

Each player has comprehensive financial data including:
- Bank accounts with transaction history
- Stock portfolios with current holdings
- Achievement unlocks and progress
- Trading transaction history
- Game session data

## Test Descriptions

### test-full-rag.js
Complete RAG pipeline demonstration showing:
- Database → Entity Graph → Context Chunks → Embeddings → Vector Storage
- Natural language queries with context retrieval
- AI response generation with retrieved context

### test-comprehensive-rag.js  
Multi-namespace RAG system demonstrating:
- Building separate namespaces for each entity type
- Querying multiple namespaces simultaneously
- Combining contexts for comprehensive AI responses

### test-maya-ai.js
AI tutor implementation showing:
- Personalized financial advice based on player data
- Context-aware response generation
- Fallback handling for missing data

### debug-rag-build.js
RAG build process debugging:
- Schema introspection verification
- Entity relationship detection
- Context chunk generation analysis
- Vector storage validation

### verify-user-data.js
Database verification utility:
- Confirms test data is properly populated
- Validates relationships between collections
- Shows comprehensive player financial profiles

## Adding New Tests

When adding new tests:

1. **Follow naming convention**: `test-[feature].js` or `debug-[component].js`
2. **Include error handling**: Comprehensive try/catch blocks
3. **Clean up resources**: Properly disconnect from services
4. **Document purpose**: Clear comments explaining test objectives
5. **Use test data**: Leverage existing game data for consistency

### Test Template

```javascript
/**
 * Test: [Purpose of test]
 * Description: [What this test validates]
 */

const { ContragSDK } = require('../dist/index.js');
const fs = require('fs');

async function testFeature() {
    console.log('🧪 Testing [Feature Name]');
    console.log('═'.repeat(50));
    
    const config = JSON.parse(fs.readFileSync('../contrag.config.json', 'utf8'));
    const sdk = new ContragSDK();
    
    try {
        await sdk.configure(config);
        console.log('✅ Connected to services');
        
        // Test implementation
        const result = await sdk.someMethod();
        
        // Assertions
        if (result.success) {
            console.log('✅ Test passed');
        } else {
            console.log('❌ Test failed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFeature();
```

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/test.yml
name: Test Contrag
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
      postgres:
        image: pgvector/pgvector:pg16  
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: node test/test-package.js
      - run: node test/test-full-rag.js
```

## Troubleshooting

### Common Issues

**Services not running**:
```bash
docker-compose up -d
docker-compose ps  # Check status
```

**Database connection failures**:
- Verify connection strings in `contrag.config.json`
- Check Docker container logs: `docker-compose logs mongodb`

**Vector dimension mismatches**:
- Ensure embedding model dimensions match vector store configuration
- Gemini embedding-001: 768 dimensions
- OpenAI ada-002: 1536 dimensions

**Missing test data**:
```bash
# Repopulate test data
docker-compose down -v
docker-compose up -d
# Wait for initialization to complete
```

For additional troubleshooting, see the main [User Guide](../docs/USER_GUIDE.md#troubleshooting).
