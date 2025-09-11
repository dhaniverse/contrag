# 🧪 Testing Contrag Locally Before Publishing

This guide shows you how to thoroughly test the Contrag package locally using Docker and free Gemini embeddings, without needing to publish to npm.

## 🎯 What You'll Test

✅ **All Plugin Combinations**: PostgreSQL/MongoDB + Weaviate/pgvector + Gemini embeddings  
✅ **Schema Introspection**: Automatic discovery of database structures  
✅ **Entity Graph Building**: Recursive relationship traversal  
✅ **Context Generation**: Smart text chunking from entity graphs  
✅ **Vector Embeddings**: Free Gemini API integration  
✅ **Vector Storage & Search**: Both Weaviate and pgvector  
✅ **CLI Commands**: All contrag commands  
✅ **SDK Integration**: Programmatic usage  

## 🚀 Quick Setup (5 minutes)

### 1. Get Free Gemini API Key
- Go to [Google AI Studio](https://aistudio.google.com/)
- Sign in → "Get API Key" → "Create API Key"
- Copy your key (free tier: 1,000 requests/day)

### 2. One-Command Setup
```bash
# Clone/navigate to contrag directory
cd /Users/dave/Work/products/contrag

# Run the setup script
./scripts/test-local.sh
```

**The script will:**
- Build the package locally
- Create an npm link for testing
- Start Docker services (PostgreSQL, MongoDB, Weaviate)
- Verify all services are healthy
- Show you next steps

### 3. Test with Sample Configuration
```bash
# Copy a test configuration
cp test-configs/postgres-weaviate-gemini.json contrag.config.json

# Edit to add your API key
sed -i '' 's/your-gemini-api-key/YOUR_ACTUAL_API_KEY_HERE/' contrag.config.json

# Test the full pipeline
node test-package.js
```

## 📋 Available Test Configurations

We've created 3 optimized test configurations:

### 1. **PostgreSQL + Weaviate + Gemini** (Recommended for production)
```bash
cp test-configs/postgres-weaviate-gemini.json contrag.config.json
```
- **Database**: Relational with complex relationships
- **Vector Store**: Advanced semantic search
- **Embeddings**: Free Gemini API
- **Use Case**: E-commerce, CRM systems

### 2. **MongoDB + Weaviate + Gemini** (Best for document stores)
```bash
cp test-configs/mongodb-weaviate-gemini.json contrag.config.json
```
- **Database**: Document-based with flexible schema
- **Vector Store**: Advanced semantic search
- **Embeddings**: Free Gemini API  
- **Use Case**: Content management, IoT data

### 3. **PostgreSQL + pgvector + Gemini** (Most cost-effective)
```bash
cp test-configs/postgres-pgvector-gemini.json contrag.config.json
```
- **Database**: Relational data
- **Vector Store**: SQL-based vectors
- **Embeddings**: Free Gemini API
- **Use Case**: Unified PostgreSQL stack

## 🧪 Testing Scenarios

### Automated Full Test
```bash
# Comprehensive test of all functionality
node test-package.js
```

**Tests performed:**
1. Plugin connectivity
2. Schema introspection  
3. Entity graph building
4. Context chunk generation
5. Vector embedding creation
6. Vector storage
7. Semantic search queries

### Manual CLI Testing

**Schema Introspection:**
```bash
npx contrag introspect
# Should show database tables/collections with relationships
```

**Build User Context:**
```bash
# PostgreSQL
npx contrag build --entity users --uid 1

# MongoDB  
npx contrag build --entity users --uid 507f1f77bcf86cd799439011
```

**Query Context:**
```bash
npx contrag query --namespace users:1 --query "What orders has this user placed?"
npx contrag query --namespace users:1 --query "What are the user's contact details?"
npx contrag query --namespace users:1 --query "Show me user reviews and ratings"
```

### SDK Integration Testing

**Test in Another Project:**
```bash
# Create test project
mkdir ../contrag-test && cd ../contrag-test
npm init -y

# Link to local Contrag package
npm link contrag

# Create test script
cat > test.js << 'EOF'
const { ContragSDK } = require('contrag');

async function test() {
  const sdk = new ContragSDK();
  console.log('✅ Contrag SDK loaded successfully!');
  
  // Add your test configuration and usage here
}

test();
EOF

node test.js
```

## 📊 Sample Data Included

The Docker setup includes realistic test data:

### PostgreSQL Schema
- **users** (4 users with profiles)  
- **orders** (5 orders with different statuses)
- **products** (5 products across categories)
- **order_items** (line items with quantities)
- **reviews** (product reviews with ratings)
- **addresses** (shipping/billing addresses)

### MongoDB Schema  
- **users** (3 users with embedded profiles)
- **orders** (3 orders with embedded items and addresses)
- **products** (3 products with tags)
- **reviews** (2 detailed reviews)
- **user_activities** (time series activity log)

## 💰 Cost-Free Testing

**Gemini API Free Tier:**
- 1,000 API calls per day
- 2,048 tokens per request
- Perfect for testing and development

**Estimated Usage:**
- Schema introspection: 0 API calls
- Building context for 1 user: 2-5 API calls
- Each query: 0 API calls (uses stored vectors)

**One full test cycle = ~5 API calls**

## 🔍 Verification Commands

**Check Docker Services:**
```bash
# Service status
docker-compose ps

# Service logs  
docker-compose logs

# Test connections
docker-compose exec postgres pg_isready
docker-compose exec mongodb mongosh --eval "db.runCommand('ping')"
curl http://localhost:8080/v1/meta
```

**Verify Data:**
```bash
# PostgreSQL sample query
docker-compose exec postgres psql -U postgres -d contrag_test -c "
  SELECT u.name, COUNT(o.id) as orders 
  FROM users u LEFT JOIN orders o ON u.id = o.user_id 
  GROUP BY u.name;
"

# MongoDB sample query  
docker-compose exec mongodb mongosh contrag_test --eval "
  db.users.aggregate([
    {\$lookup: {from:'orders', localField:'_id', foreignField:'user_id', as:'orders'}},
    {\$project: {name:1, orderCount: {\$size:'\$orders'}}}
  ]).pretty()
"
```

## 🚨 Troubleshooting

### Common Issues

**"Connection refused"**
```bash
# Wait for services to start
docker-compose logs -f
# Look for "database system is ready" (PostgreSQL)
# Look for "waiting for connections" (MongoDB)
```

**"Invalid API key"**
```bash
# Check your Gemini API key
echo $GEMINI_API_KEY
# Or check in contrag.config.json
```

**"No data found"**
```bash
# Reinitialize with fresh data
docker-compose down -v
docker-compose up -d
```

**Memory/Performance Issues**
```bash
# Reduce batch sizes in config
{
  "contextBuilder": {
    "chunkSize": 500,
    "overlap": 100
  }
}
```

## 📈 Performance Testing

**Test with Multiple Users:**
```bash
# Build contexts for multiple users simultaneously
for i in {1..5}; do
  npx contrag build --entity users --uid $i &
done
wait
echo "Built 5 user contexts in parallel"
```

**Monitor Resource Usage:**
```bash
# Docker container resources
docker stats

# API usage tracking
echo "Check https://aistudio.google.com/ for Gemini usage"
```

## 🧹 Cleanup

**Stop Services:**
```bash
docker-compose down
```

**Remove All Data:**
```bash
docker-compose down -v
```

**Unlink Package:**
```bash
npm unlink
```

**Full Cleanup:**
```bash
# Stop services and remove data
docker-compose down -v

# Remove test files
rm -f contrag.config.json test-package.js

# Unlink npm package
npm unlink

# Back to original state
git checkout -- .
```

## 🎯 Success Criteria

Your local testing is successful when you can:

✅ **Introspect** both PostgreSQL and MongoDB schemas  
✅ **Build** entity graphs for sample users  
✅ **Generate** context chunks from relationships  
✅ **Create** embeddings using free Gemini API  
✅ **Store** vectors in both Weaviate and pgvector  
✅ **Query** for relevant context using natural language  
✅ **Use** the SDK programmatically in test projects  
✅ **Run** all CLI commands successfully  

## 🚀 Ready for Production

Once local testing passes, you're ready to:

1. **Publish to npm**: `npm publish`
2. **Deploy with real databases**: Update connection strings
3. **Scale embeddings**: Consider OpenAI for production
4. **Monitor performance**: Add logging and metrics
5. **Integrate with LLMs**: Use retrieved context for AI responses

**Your Contrag package is production-ready!** 🎉

The local testing environment gives you complete confidence that all plugins work correctly before publishing or deploying to production.
