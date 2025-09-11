# Financial Game RAG Example

This example demonstrates a comprehensive AI tutoring system for financial literacy games using Contrag. It shows how to build personalized AI responses based on complex game data including user profiles, bank accounts, stock portfolios, achievements, and trading history.

## Overview

**Maya** is an AI financial literacy tutor that provides personalized advice to game players based on their:
- Game progress (level, experience, achievements)
- Financial portfolio (bank accounts, stock investments)  
- Trading history (buy/sell transactions)
- Achievement unlocks (milestones reached)

## Architecture

```mermaid
graph TB
    Player[Game Player] --> Maya[Maya AI Tutor]
    Maya --> Contrag[Contrag SDK]
    Contrag --> MongoDB[(Game Database)]
    Contrag --> pgvector[(Vector Store)]
    Contrag --> Gemini[Gemini API]
    
    MongoDB --> Users[Users Collection]
    MongoDB --> Banks[Bank Accounts]
    MongoDB --> Portfolios[Stock Portfolios] 
    MongoDB --> Achievements[Achievements]
    MongoDB --> Transactions[Stock Transactions]
```

## Features

- **Multi-Entity Context Building** - Combines data from 5+ related collections
- **Personalized AI Responses** - Maya generates advice based on complete player profile
- **Real-time Portfolio Analysis** - Current holdings, performance, and diversification
- **Achievement-Based Guidance** - Tailored advice based on unlocked achievements
- **Trading History Analysis** - Patterns and recommendations from past trades

## Quick Start

### 1. Start the Environment

```bash
# Clone the main repository
git clone <contrag-repo>
cd contrag/examples/financial-game

# Start services
docker-compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Example

```bash
# Run the comprehensive RAG demo
npm run demo

# Or run individual components
npm run test:maya     # Test Maya AI responses
npm run test:rag      # Test RAG pipeline
npm run verify:data   # Verify database setup
```

## Database Schema

The example uses a complex MongoDB schema with 5 main collections:

### Users Collection
```javascript
{
  _id: ObjectId("..."),
  email: "player@game.com",
  gameUsername: "AlexInvestor", 
  gameData: {
    level: 22,
    experience: 4200,
    totalWealth: 250000,
    achievements: ["millionaire", "portfolio_diversified"]
  }
}
```

### Bank Accounts Collection
```javascript
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1", // String reference
  accountType: "savings",
  balance: 75000.50,
  transactions: [
    { type: "deposit", amount: 5000, timestamp: "..." }
  ]
}
```

### Stock Portfolios Collection
```javascript
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1",
  totalValue: 146931.25,
  holdings: [
    {
      stockId: "TECH",
      stockName: "TechCorp Industries",
      quantity: 100,
      currentPrice: 478.90,
      sector: "Technology"
    }
  ]
}
```

### Achievements Collection
```javascript
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1", 
  achievementId: "millionaire",
  title: "Millionaire",
  description: "Reached total wealth of 1 million rupees",
  points: 1000,
  unlockedAt: "2024-09-01T12:00:00Z"
}
```

### Stock Transactions Collection
```javascript
{
  _id: ObjectId("..."),
  userId: "64a1b2c3d4e5f6789abcdef1",
  stockId: "TECH", 
  type: "buy",
  quantity: 100,
  price: 478.90,
  total: 47890,
  timestamp: "2024-08-20T09:30:00Z"
}
```

## Implementation Details

### Multi-Namespace RAG Architecture

The system builds separate namespaces for each entity type:

```javascript
const entityTypes = [
  'users',           // Player profile and game data
  'bankAccounts',    // Banking information and transactions  
  'stockPortfolios', // Investment holdings and performance
  'achievements',    // Unlocked achievements and progress
  'stockTransactions' // Trading history and patterns
];

// Build individual namespaces
const namespaces = {};
for (const entityType of entityTypes) {
  namespaces[entityType] = await sdk.buildFor(entityType, playerId);
}

// Query multiple namespaces for comprehensive context
const contexts = await Promise.all([
  sdk.query(namespaces.users.namespace, question, 2),
  sdk.query(namespaces.bankAccounts.namespace, question, 1),
  sdk.query(namespaces.stockPortfolios.namespace, question, 1),
  sdk.query(namespaces.achievements.namespace, question, 1)
]);

const combinedChunks = contexts.flatMap(ctx => ctx.chunks);
```

### Maya AI Implementation

```javascript
class MayaAITutor {
  constructor(sdk, geminiApiKey) {
    this.sdk = sdk;
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
  }

  async generatePersonalizedAdvice(playerId, question) {
    // Build comprehensive player context
    const context = await this.buildPlayerContext(playerId);
    
    // Generate AI response with player-specific data
    const prompt = this.createPersonalizedPrompt(context, question);
    const result = await this.model.generateContent(prompt);
    
    return {
      response: result.response.text(),
      context: context.chunks.length,
      confidence: this.calculateConfidence(context.chunks)
    };
  }

  async buildPlayerContext(playerId) {
    const entityTypes = ['users', 'bankAccounts', 'stockPortfolios', 'achievements'];
    const allContext = [];
    
    for (const entityType of entityTypes) {
      try {
        const namespace = await this.sdk.buildFor(entityType, playerId);
        const context = await this.sdk.query(
          namespace.namespace, 
          'complete financial profile', 
          2
        );
        allContext.push(...context.chunks);
      } catch (error) {
        console.warn(`Could not load ${entityType} context:`, error.message);
      }
    }
    
    return { chunks: allContext };
  }

  createPersonalizedPrompt(context, question) {
    const contextText = context.chunks.map(chunk => chunk.content).join('\n\n');
    
    return `You are Maya, a friendly and knowledgeable financial literacy tutor for a gaming platform. 

Based on this player's complete financial profile:
${contextText}

Player Question: "${question}"

Provide personalized financial advice that:
1. References specific data from their profile (level, wealth, holdings, achievements)
2. Gives actionable investment recommendations
3. Encourages continued learning and smart financial decisions
4. Uses a friendly, encouraging tone appropriate for gaming
5. Includes specific numbers and achievements when relevant

Keep the response engaging and educational, like a helpful gaming companion!`;
  }
}
```

### RAG Pipeline Flow

1. **Data Population** - Initialize MongoDB with realistic game data
2. **Schema Introspection** - Contrag discovers all collections and relationships  
3. **Namespace Building** - Create separate namespaces for each entity type
4. **Context Retrieval** - Query multiple namespaces simultaneously
5. **AI Generation** - Maya generates personalized responses using combined context

## Example Interactions

### Player Question: "Should I diversify my portfolio?"

**Maya's Response (based on actual data):**
```
Hi AlexInvestor! 🎯

Looking at your impressive Level 22 progress and ₹146,931 portfolio, I can see you're already doing great with diversification! 

📈 **Your Current Portfolio:**
- TechCorp Industries: 100 shares @ ₹478.90
- Global Finance Group: 75 shares @ ₹425.60  
- MediTech Healthcare: 60 shares @ ₹678.90
- Smart Retail Chain: 125 shares @ ₹156.40

🏆 **Achievement Unlocked:** You've already earned "Diversified Portfolio" for holding stocks from 4+ different sectors - excellent work!

💡 **My Recommendations:**
1. **Sector Balance**: Your 4-sector diversification is solid, but consider the weightings
2. **International Exposure**: At your advanced level, explore international markets
3. **Defensive Positions**: Add some utilities or consumer staples for stability

With your "Millionaire" achievement and advanced trading experience, you're ready for more sophisticated strategies! 🚀
```

### Player Question: "How's my trading performance?"

**Maya's Response:**
```
AlexInvestor, your trading history shows excellent strategic thinking! 📊

💹 **Recent Trading Analysis:**
- 4 strategic purchases across different sectors
- Smart timing: Bought before recent market upturn
- Total invested: ₹139,094 → Current value: ₹146,931 (+5.6% gain!)

📈 **Standout Moves:**
- MediTech Healthcare: Great timing at ₹678.90 (healthcare sector strength)
- Tech diversification: TechCorp showing solid growth
- Retail positioning: Smart entry into consumer sector

🎯 **Next Level Strategies:**
At Level 22 with 4200+ XP, consider:
- Options trading (if available in advanced gameplay)
- Quarterly rebalancing based on performance
- Setting up stop-losses for risk management

Your consistent ₹7,926.75 portfolio ranking shows you're not just playing - you're mastering financial concepts! 🏆
```

## Configuration

### Environment Variables
```bash
# .env
MONGODB_URL=mongodb://admin:password@localhost:27017/contrag_test
POSTGRES_URL=postgresql://postgres:password@localhost:5432/contrag_test  
GEMINI_API_KEY=your_gemini_api_key_here
```

### Contrag Configuration
```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "${MONGODB_URL}",
      "database": "contrag_test"
    }
  },
  "vectorStore": {
    "plugin": "pgvector", 
    "config": {
      "connectionString": "${POSTGRES_URL}"
    }
  },
  "embedder": {
    "plugin": "gemini",
    "config": {
      "apiKey": "${GEMINI_API_KEY}",
      "model": "embedding-001"
    }
  }
}
```

## Testing

The example includes comprehensive tests:

```bash
# Run all tests
npm test

# Individual test suites  
npm run test:data     # Verify database population
npm run test:schema   # Test schema introspection
npm run test:rag      # Test RAG pipeline
npm run test:maya     # Test Maya AI responses
npm run test:e2e      # End-to-end integration tests
```

## Production Considerations

### Performance Optimization
- **Namespace Caching** - Cache frequently accessed player contexts
- **Batch Processing** - Build multiple player contexts simultaneously  
- **Selective Updates** - Only rebuild namespaces when relevant data changes

### Real-time Updates
```javascript
// Listen for game events and update contexts
gameEventBus.on('portfolio.updated', async ({ playerId }) => {
  await sdk.rebuildNamespace(`stockPortfolios:${playerId}`);
});

gameEventBus.on('achievement.unlocked', async ({ playerId }) => {
  await sdk.rebuildNamespace(`achievements:${playerId}`);
});
```

### Scaling Considerations
- **Database Indexing** - Ensure proper indexes on userId fields
- **Connection Pooling** - Use connection pools for high-traffic scenarios
- **Horizontal Scaling** - Deploy multiple Contrag instances behind load balancer

## Integration Examples

### Game Client Integration
```javascript
// In your game client
class GameAITutor {
  async askMaya(question) {
    const response = await fetch('/api/maya/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: this.playerId,
        question: question
      })
    });
    
    const advice = await response.json();
    this.displayMayaResponse(advice.response);
  }
}
```

### Game Server Integration  
```javascript
// Express.js API endpoint
app.post('/api/maya/ask', async (req, res) => {
  const { playerId, question } = req.body;
  
  try {
    const maya = new MayaAITutor(sdk, process.env.GEMINI_API_KEY);
    const advice = await maya.generatePersonalizedAdvice(playerId, question);
    
    res.json(advice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

This financial game example demonstrates the full power of Contrag for building sophisticated, context-aware AI applications with complex data relationships.
