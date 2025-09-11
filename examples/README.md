# Contrag Examples

This directory contains complete working examples demonstrating different use cases and integration patterns for Contrag.

## Available Examples

### 1. Financial Game RAG (`financial-game/`)
A comprehensive AI tutoring system for financial literacy games. Shows how to:
- Build multi-entity namespaces (users, portfolios, achievements, transactions)
- Create personalized AI responses based on player data
- Implement context-aware financial advice

**Key Features:**
- Complex MongoDB schema with 5+ related collections
- Multi-namespace RAG architecture
- Personalized Maya AI tutor character
- Real-time portfolio analysis

### 2. E-commerce RAG (`ecommerce/`)
Product recommendations and customer insights system. Demonstrates:
- Customer behavior analysis
- Product similarity matching
- Purchase history integration
- Personalized recommendations

**Key Features:**
- User preferences and behavior tracking
- Order history and product relationships
- Review sentiment analysis
- Dynamic recommendation engine

### 3. Customer Support RAG (`customer-support/`)
Context-aware customer support system. Shows:
- Multi-channel conversation history
- Ticket resolution patterns
- Knowledge base integration
- Automated response suggestions

**Key Features:**
- Support ticket categorization
- Customer interaction timeline
- Knowledge article relevance
- Response quality scoring

## Getting Started

Each example includes:
- `README.md` - Specific setup instructions
- `docker-compose.yml` - Complete environment setup
- `config.json` - Contrag configuration
- `data/` - Sample data and initialization scripts
- `src/` - Implementation code
- `test/` - Test scenarios

## Running an Example

```bash
# Navigate to an example directory
cd examples/financial-game

# Start the environment
docker-compose up -d

# Install dependencies
npm install

# Run the example
npm start
```

## Common Patterns

### Multi-Entity Context Building
```javascript
// Build comprehensive context from multiple entities
const entityTypes = ['users', 'orders', 'reviews', 'support_tickets'];
const namespaces = {};

for (const entityType of entityTypes) {
  namespaces[entityType] = await sdk.buildFor(entityType, customerId);
}

// Query across multiple namespaces
const contexts = await Promise.all(
  Object.values(namespaces).map(ns => 
    sdk.query(ns.namespace, question, 2)
  )
);

const combinedChunks = contexts.flatMap(ctx => ctx.chunks);
```

### Real-time Updates
```javascript
// Listen for data changes and update contexts
eventBus.on('user.updated', async (event) => {
  const { userId, changes } = event;
  
  if (changesAffectEmbeddings(changes)) {
    await sdk.rebuildNamespace(`users:${userId}`);
  }
});
```

### Caching Strategy
```javascript
// Implement namespace caching for performance
class NamespaceCache {
  async getOrBuild(entity, uid) {
    const key = `${entity}:${uid}`;
    
    if (!this.cache.has(key)) {
      const result = await sdk.buildFor(entity, uid);
      this.cache.set(key, result, { ttl: 3600000 }); // 1 hour
    }
    
    return this.cache.get(key);
  }
}
```

## Integration Examples

### Express.js API
```javascript
app.post('/api/insights/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const { question } = req.body;
  
  try {
    const buildResult = await sdk.buildFor('customers', customerId);
    const insights = await sdk.query(buildResult.namespace, question, 5);
    
    res.json({
      customer: customerId,
      question,
      insights: insights.chunks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### React Hook
```javascript
function useContragInsights(entityId, question) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!entityId || !question) return;
    
    setLoading(true);
    contragAPI.getInsights(entityId, question)
      .then(setInsights)
      .finally(() => setLoading(false));
  }, [entityId, question]);
  
  return { insights, loading };
}
```

### Next.js Server Action
```javascript
'use server';

export async function getCustomerInsights(customerId, question) {
  const sdk = new ContragSDK(process.env.CONTRAG_CONFIG);
  
  try {
    const result = await sdk.query(`customers:${customerId}`, question, 3);
    
    return {
      success: true,
      insights: result.chunks.map(chunk => ({
        content: chunk.content,
        relevance: chunk.score,
        source: chunk.metadata.entity
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Performance Tips

1. **Batch Operations** - Process multiple entities together when possible
2. **Selective Fields** - Use `includeFields` to limit data processed
3. **Depth Limiting** - Set appropriate `depth` limits for relationships
4. **Caching** - Cache frequently accessed namespaces
5. **Async Processing** - Use background jobs for large builds

## Contributing

To contribute a new example:

1. Create a new directory under `examples/`
2. Include all necessary files (README, docker-compose, etc.)
3. Add sample data and clear setup instructions
4. Test the example thoroughly
5. Update this main examples README

## Support

If you have questions about the examples or need help adapting them to your use case, please:

1. Check the main [User Guide](../docs/USER_GUIDE.md)
2. Review the [Database Guide](../docs/DATABASE_GUIDE.md) for setup issues
3. Open an issue on GitHub with the `examples` label
