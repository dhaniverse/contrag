# Local Testing Guide for Contrag

This guide walks you through testing Contrag locally using Docker containers and free Gemini embeddings.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 16+ installed
- Google AI Studio account for Gemini API key (free tier available)

## Quick Start

### 1. Get Gemini API Key (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" → "Create API Key"
4. Copy your API key

### 2. Set Up Environment

Create a `.env.local` file:

```bash
# Copy the example
cp .env.example .env.local

# Edit with your Gemini API key
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Start Docker Services

```bash
# Start all services (PostgreSQL, MongoDB, Weaviate)
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
docker-compose logs -f
```

Verify services are running:
- PostgreSQL: `docker-compose exec postgres pg_isready`
- MongoDB: `docker-compose exec mongodb mongosh --eval "db.runCommand('ping')"`
- Weaviate: `curl http://localhost:8080/v1/meta`

### 4. Install Dependencies and Build

```bash
# Install new dependencies (including node-fetch for Gemini)
npm install

# Build the project
npm run build
```

## Testing Scenarios

### Scenario 1: PostgreSQL + Weaviate + Gemini

**Use Case**: E-commerce with relational data and semantic search

```bash
# Copy test configuration
cp test-configs/postgres-weaviate-gemini.json contrag.config.json

# Edit the API key in contrag.config.json
# Replace "your-gemini-api-key" with your actual key

# Test schema introspection
npx contrag introspect

# Build context for user 1
npx contrag build --entity users --uid 1

# Query the built context
npx contrag query --namespace users:1 --query "What products has this user ordered?"

npx contrag query --namespace users:1 --query "What is the user's order history?"

npx contrag query --namespace users:1 --query "Show me user reviews and ratings"
```

**Expected Output:**
- Schema showing 6 tables (users, orders, products, order_items, reviews, addresses)
- Entity graph with user data, orders, reviews, and addresses
- Context chunks containing user information and relationships
- Query results with relevant information about the user's activity

### Scenario 2: MongoDB + Weaviate + Gemini

**Use Case**: Document-based data with flexible schema

```bash
# Use MongoDB configuration
cp test-configs/mongodb-weaviate-gemini.json contrag.config.json

# Update API key in the config file

# Test MongoDB schema inference
npx contrag introspect

# Build context for MongoDB user
npx contrag build --entity users --uid 507f1f77bcf86cd799439011

# Query MongoDB context
npx contrag query --namespace users:507f1f77bcf86cd799439011 --query "What are the user's preferences and profile?"

npx contrag query --namespace users:507f1f77bcf86cd799439011 --query "What orders has this user placed?"
```

**Expected Output:**
- Schema showing MongoDB collections (users, orders, products, reviews, user_activities)
- Entity graph with embedded documents and ObjectId references
- Context including user profile, embedded shipping addresses, and order items

### Scenario 3: PostgreSQL + pgvector + Gemini

**Use Case**: Unified PostgreSQL stack for data and vectors

```bash
# Use pgvector configuration
cp test-configs/postgres-pgvector-gemini.json contrag.config.json

# Update API key in the config file

# Test pgvector integration
npx contrag introspect
npx contrag build --entity users --uid 2

# Query using SQL-based vector search
npx contrag query --namespace users:2 --query "What is this user's shopping behavior?"
```

## Programmatic Testing

Create a test script to try different scenarios:

```bash
# Create test script
cat > test-local.js << 'EOF'
const { ContragSDK } = require('./dist/index.js');
const fs = require('fs');

async function testContrag() {
  console.log('🧪 Testing Contrag locally...\n');

  // Load configuration
  const config = JSON.parse(fs.readFileSync('contrag.config.json', 'utf8'));
  
  const sdk = new ContragSDK();
  
  try {
    console.log('🔌 Connecting...');
    await sdk.configure(config);
    
    console.log('🔍 Introspecting schema...');
    const schema = await sdk.introspectSchema();
    console.log(`Found ${schema.length} entities:`, schema.map(s => s.name));
    
    console.log('\n🌐 Building entity graph...');
    const entity = config.database.plugin === 'mongodb' ? 'users' : 'users';
    const uid = config.database.plugin === 'mongodb' ? '507f1f77bcf86cd799439011' : '1';
    
    const result = await sdk.buildFor(entity, uid);
    console.log(`Built context: ${result.chunksCreated} chunks created`);
    
    console.log('\n🔍 Querying context...');
    const queryResult = await sdk.query(`${entity}:${uid}`, 'What information do we have about this user?', 3);
    console.log(`Found ${queryResult.chunks.length} relevant chunks:`);
    queryResult.chunks.forEach((chunk, i) => {
      console.log(`${i+1}. ${chunk.content.substring(0, 100)}...`);
    });
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sdk.disconnect();
  }
}

testContrag();
EOF

# Run the test
node test-local.js
```

## Sample Queries to Test

Try these queries after building context:

### PostgreSQL Queries
```bash
# User information and relationships
npx contrag query --namespace users:1 --query "What is the user's email and profile information?"

# Order history
npx contrag query --namespace users:1 --query "What orders has this user placed and what were the totals?"

# Product reviews
npx contrag query --namespace users:1 --query "What reviews has this user written?"

# Address information
npx contrag query --namespace users:1 --query "What are the user's shipping and billing addresses?"

# Purchase patterns
npx contrag query --namespace users:1 --query "What types of products does this user buy?"
```

### MongoDB Queries
```bash
# User profile and preferences
npx contrag query --namespace users:507f1f77bcf86cd799439011 --query "What are the user's preferences and demographics?"

# Embedded order data
npx contrag query --namespace users:507f1f77bcf86cd799439011 --query "What items are in the user's orders and shipping addresses?"

# Activity timeline
npx contrag query --namespace users:507f1f77bcf86cd799439011 --query "What activities has this user performed recently?"

# Product interactions
npx contrag query --namespace users:507f1f77bcf86cd799439011 --query "What products has the user viewed, purchased, or reviewed?"
```

## Verifying Data

### Check PostgreSQL Data
```bash
docker-compose exec postgres psql -U postgres -d contrag_test -c "
SELECT u.name, u.email, COUNT(o.id) as order_count, SUM(o.total) as total_spent 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
GROUP BY u.id, u.name, u.email;
"
```

### Check MongoDB Data
```bash
docker-compose exec mongodb mongosh --eval "
use contrag_test;
db.users.aggregate([
  {
    \$lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'user_id',
      as: 'orders'
    }
  },
  {
    \$project: {
      name: 1,
      email: 1,
      orderCount: { \$size: '\$orders' }
    }
  }
]);
"
```

### Check Weaviate Data
```bash
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ Get { ContragChunk { namespace content } } }"
  }'
```

## Performance Testing

Test with larger datasets:

```bash
# Add more test data to PostgreSQL
docker-compose exec postgres psql -U postgres -d contrag_test -c "
INSERT INTO users (name, email) 
SELECT 
  'User ' || generate_series(5, 100),
  'user' || generate_series(5, 100) || '@example.com';
"

# Test with multiple users
for i in {1..5}; do
  npx contrag build --entity users --uid $i &
done
wait

echo "Built context for 5 users simultaneously"
```

## Monitoring and Debugging

### Check Docker Container Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs weaviate
docker-compose logs mongodb
docker-compose logs postgres
```

### Monitor Resource Usage
```bash
# Container resource usage
docker stats

# Database connections
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

### Debug Contrag Issues
```bash
# Enable debug logging
export DEBUG=contrag:*

# Run with verbose output
npx contrag build --entity users --uid 1 --verbose
```

## Cost Monitoring

### Gemini API Usage
- Free tier: 1,000 requests per day
- Each embedding request processes up to 2,048 tokens
- Monitor usage at [Google AI Studio](https://aistudio.google.com/)

### Estimate Costs
```bash
# Count tokens in your content
echo "Sample text" | wc -w  # Rough word count
# Multiply by ~1.3 for token estimate
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v

# Remove test files
rm -f contrag.config.json test-local.js .env.local
```

## Troubleshooting

### Common Issues

1. **"Connection refused"**: Wait for Docker services to fully start
2. **"Invalid API key"**: Check your Gemini API key is correct
3. **"No data found"**: Verify Docker initialization scripts ran successfully
4. **Memory issues**: Reduce chunk size or batch sizes in config

### Getting Help

- Check container logs: `docker-compose logs [service]`
- Verify services: `docker-compose ps`
- Test connections manually using the verification commands above
- Check the GitHub issues for known problems

This local testing setup gives you a complete Contrag environment with real data to experiment with all plugin combinations! 🚀
