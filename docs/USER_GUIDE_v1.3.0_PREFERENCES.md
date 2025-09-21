# ContRAG User Guide v1.3.0 - Preference Tracking Update

## 🎯 Intelligent Preference Tracking

ContRAG v1.3.0 introduces **Intelligent Preference Tracking** - a powerful system that automatically learns user preferences from natural conversation and uses them to enhance RAG responses.

### What is Preference Tracking?

Preference tracking analyzes user queries to extract structured preference data, enabling ContRAG to:
- Build dynamic user profiles that evolve over time
- Enhance RAG responses with personalized context
- Provide increasingly relevant recommendations
- Understand user needs without explicit configuration

### Getting Started with Preferences

#### 1. Enable Preference Tracking

Add to your `contrag.config.json`:
```json
{
  "preferences": {
    "enabled": true,
    "extractionModel": "gpt-4",
    "confidenceThreshold": 0.7
  }
}
```

#### 2. Use in Your Application

```javascript
const { ContragSDK } = require('contrag');

const contrag = new ContragSDK();
await contrag.configure(config);

// Query with preference tracking enabled
const response = await contrag.query({
  userId: 'user123',
  query: 'I like large cap tech stocks and sustainable investments',
  masterEntity: 'User'
}, { 
  preferenceTracking: true,  // Enable extraction
  storePreferences: true     // Auto-store extracted preferences
});

// Access results
console.log('Context:', response.chunks);
console.log('New preferences:', response.preferences);
console.log('User profile:', response.userProfile);
```

#### 3. View Results

The system will automatically extract and structure preferences:
```json
{
  "preferences": [
    {
      "category": "stocks",
      "type": "market_cap",
      "values": ["large cap"],
      "confidence": 0.89
    },
    {
      "category": "stocks", 
      "type": "sector",
      "values": ["technology"],
      "confidence": 0.85
    },
    {
      "category": "investment_style",
      "type": "values", 
      "values": ["sustainable", "ESG"],
      "confidence": 0.92
    }
  ]
}
```

## 📋 Preference Management

### View User Preferences

#### Using CLI
```bash
# View all preferences for a user
contrag preferences show --user-id user123

# Filter by category
contrag preferences show --user-id user123 --category stocks

# Export to JSON
contrag preferences export --user-id user123 --format json
```

#### Using SDK
```javascript
// Get all preferences
const preferences = await contrag.getUserPreferences('user123');

// Filter preferences
const stockPrefs = await contrag.getUserPreferences('user123', {
  categories: ['stocks', 'investment_style'],
  minConfidence: 0.8
});

// Get preference analytics
const analytics = await contrag.analyzePreferences('user123');
console.log(analytics.categoryDistribution);
```

### Update Preferences

#### Manually Add Preferences
```javascript
await contrag.updateUserPreferences('user123', [
  {
    category: 'risk_tolerance',
    type: 'level',
    values: ['moderate'],
    confidence: 1.0,  // Manual entries have full confidence
    source: 'manual'
  }
]);
```

#### Handle Preference Conflicts
```javascript
// Preferences are automatically versioned and conflict-resolved
// Newer preferences with higher confidence typically win
const conflictResolution = await contrag.resolvePreferenceConflicts('user123');
```

### Clean Up Preferences

#### Remove Old Preferences
```bash
# Clear preferences older than 30 days
contrag preferences clear --user-id user123 --older-than 30d

# Clear specific categories
contrag preferences clear --user-id user123 --categories "temp,test"
```

#### Automated Cleanup
```json
{
  "preferences": {
    "storage": {
      "retentionDays": 365,  // Auto-delete after 1 year
      "maxPreferencesPerUser": 1000  // Limit per user
    }
  }
}
```

## 🎯 Use Cases & Examples

### Financial Services

#### Investment Advisor Bot
```javascript
// User expresses investment preferences over multiple interactions
const queries = [
  "I'm interested in technology stocks",
  "I prefer companies with strong dividends", 
  "I want to avoid high-risk investments",
  "I care about environmental impact"
];

for (const query of queries) {
  const response = await contrag.query({
    userId: 'investor123',
    query,
    masterEntity: 'User'
  }, { preferenceTracking: true });
  
  console.log('Building user profile...');
}

// Later query uses accumulated preferences
const advice = await contrag.query({
  userId: 'investor123', 
  query: 'What should I invest in?',
  masterEntity: 'User'
}, { preferenceTracking: true });

// Response incorporates all previous preferences:
// "Based on your preference for sustainable tech companies with dividends..."
```

#### Portfolio Analysis
```javascript
const analysis = await contrag.query({
  userId: 'investor123',
  query: 'Analyze my portfolio',
  masterEntity: 'User'
}, { preferenceTracking: true });

// Analysis will consider user's stated preferences for personalized insights
```

### E-commerce Platform

#### Personal Shopping Assistant
```javascript
// Customer shopping behavior
await contrag.query({
  userId: 'shopper456',
  query: 'I love sustainable fashion and organic materials',
  masterEntity: 'User'
}, { preferenceTracking: true });

// Later product searches automatically consider preferences
const products = await contrag.query({
  userId: 'shopper456',
  query: 'Show me new arrivals',
  masterEntity: 'User'  
}, { preferenceTracking: true });

// Results prioritize sustainable fashion with organic materials
```

#### Size and Style Learning
```javascript
// System learns from user feedback
await contrag.query({
  userId: 'shopper456',
  query: 'I prefer loose-fitting clothes in size medium',
  masterEntity: 'User'
}, { preferenceTracking: true });

// Future recommendations consider fit and size preferences
```

### Content Platform

#### Personalized Recommendations
```javascript
// User expresses content preferences
await contrag.query({
  userId: 'viewer789',
  query: 'I enjoy sci-fi movies and nature documentaries',
  masterEntity: 'User'
}, { preferenceTracking: true });

// Content recommendations incorporate preferences
const suggestions = await contrag.query({
  userId: 'viewer789',
  query: 'What should I watch tonight?',
  masterEntity: 'User'
}, { preferenceTracking: true });

// Suggestions prioritize sci-fi and nature content
```

## ⚙️ Advanced Configuration

### Custom Preference Categories

#### Domain-Specific Categories
```json
{
  "preferences": {
    "extraction": {
      "categories": [
        // Financial domain
        "risk_tolerance",
        "investment_timeline", 
        "preferred_sectors",
        "company_size",
        "dividend_preference",
        
        // E-commerce domain  
        "product_categories",
        "brands",
        "price_range",
        "values",
        "materials",
        "styles",
        
        // Content domain
        "genres",
        "content_types", 
        "themes",
        "languages",
        "ratings"
      ]
    }
  }
}
```

#### Custom Extraction Models
```json
{
  "preferences": {
    "extractionModel": "gpt-4",  // or "gpt-3.5-turbo", "gemini-pro"
    "modelSettings": {
      "temperature": 0.1,  // Low temperature for consistent extraction
      "maxTokens": 500,
      "topP": 0.95
    }
  }
}
```

### Performance Optimization

#### Batch Processing
```json
{
  "preferences": {
    "extraction": {
      "batchSize": 10,           // Process multiple queries together
      "asyncProcessing": true,   // Process in background
      "cacheTimeout": "24h"      // Cache extraction results
    }
  }
}
```

#### Caching Strategy
```javascript
// Configure caching for better performance
const config = {
  preferences: {
    caching: {
      extractionCache: "24h",    // Cache LLM extraction results
      preferenceCache: "1h",     // Cache user preference lookups  
      profileCache: "15m"        // Cache user profile builds
    }
  }
};
```

## 🔒 Privacy & Security

### Data Protection

#### Anonymization
```json
{
  "preferences": {
    "privacy": {
      "anonymize": true,           // Hash user IDs
      "encryptionKey": "your-key", // Encrypt preference data
      "saltRounds": 12             // Bcrypt salt rounds
    }
  }
}
```

#### Data Retention
```json
{
  "preferences": {
    "privacy": {
      "retentionDays": 90,        // Auto-delete after 90 days
      "requireConsent": true,      // Explicit user consent required
      "dataPortability": true,     // Enable data export
      "rightToDelete": true        // Enable preference deletion
    }
  }
}
```

### GDPR Compliance

#### User Rights
```javascript
// Data portability (GDPR Article 20)
const userData = await contrag.exportUserData('user123');

// Right to deletion (GDPR Article 17)
await contrag.deleteUserData('user123');

// Right to rectification (GDPR Article 16)
await contrag.updateUserPreferences('user123', correctedPreferences);

// Data processing transparency
const auditLog = await contrag.getPreferenceAuditLog('user123');
```

#### Consent Management
```javascript
// Check user consent before tracking
const hasConsent = await contrag.checkUserConsent('user123');
if (hasConsent) {
  const response = await contrag.query(request, { preferenceTracking: true });
}

// Record consent
await contrag.recordUserConsent('user123', {
  preferenceTracking: true,
  dataRetention: true,
  analytics: false
});
```

## 📊 Analytics & Insights

### User Analytics

#### Individual User Analysis
```javascript
// Get user preference analytics
const userAnalytics = await contrag.analyzePreferences('user123');

console.log({
  totalPreferences: userAnalytics.count,
  categories: userAnalytics.categoryDistribution,
  confidenceScores: userAnalytics.averageConfidence,
  timelineTrends: userAnalytics.evolutionOverTime
});
```

#### Preference Evolution Tracking
```javascript
// Track how user preferences change over time
const evolution = await contrag.getPreferenceEvolution('user123', {
  timeframe: '90d',
  granularity: 'weekly'
});

// Visualize preference changes
evolution.forEach(week => {
  console.log(`Week ${week.week}: ${week.newPreferences.length} new preferences`);
});
```

### Global Analytics

#### Business Intelligence
```bash
# Global preference insights (anonymized)
contrag analytics global --timeframe 30d

# Category popularity
contrag analytics categories --sort-by frequency

# Extraction performance metrics
contrag analytics performance --metric success-rate
```

#### A/B Testing Support
```javascript
// Test different preference extraction strategies
const abTest = await contrag.runPreferenceExperiment({
  name: 'extraction_model_comparison',
  variants: [
    { model: 'gpt-4', threshold: 0.7 },
    { model: 'gpt-3.5-turbo', threshold: 0.8 }
  ],
  userSegment: 'new_users',
  duration: '7d'
});
```

## 🧪 Testing & Validation

### Preference Extraction Testing

#### Unit Testing
```javascript
describe('Preference Extraction', () => {
  it('should extract investment preferences correctly', async () => {
    const query = 'I like large cap stocks and dividend payments';
    const extracted = await contrag.testPreferenceExtraction(query);
    
    expect(extracted).toContainEqual({
      category: 'stocks',
      type: 'market_cap', 
      values: ['large cap']
    });
    
    expect(extracted).toContainEqual({
      category: 'investment_income',
      type: 'preference',
      values: ['dividends']
    });
  });
});
```

#### Integration Testing
```bash
# Test end-to-end preference flow
contrag test preferences --scenario financial-advisor

# Test extraction accuracy
contrag test extraction --input-file test-queries.json --expected-output expected.json

# Performance testing
contrag test performance --concurrent-users 50 --duration 5m
```

### Quality Assurance

#### Confidence Threshold Tuning
```bash
# Analyze extraction confidence distribution  
contrag analyze confidence --threshold 0.7 --sample-size 1000

# Optimize threshold based on accuracy
contrag optimize threshold --target-accuracy 0.85
```

#### Category Coverage Analysis
```bash
# Check which categories are being extracted
contrag analyze categories --timeframe 30d

# Identify missing categories
contrag analyze gaps --domain financial
```

## 🔧 Troubleshooting

### Common Issues

#### Low Extraction Confidence
```javascript
// If preferences aren't being extracted, lower the threshold temporarily
const config = {
  preferences: {
    confidenceThreshold: 0.5  // Lower threshold for testing
  }
};

// Or check extraction without storing
const testExtraction = await contrag.testPreferenceExtraction(
  'I like tech stocks',
  { threshold: 0.1 }  // Very low threshold to see all extractions
);
```

#### Storage Issues
```bash
# Check preference storage health
contrag diagnostics preferences

# Verify database connections
contrag test db --component preferences

# Check storage performance
contrag monitor preference-storage --duration 1m
```

#### Privacy Compliance
```bash
# Verify data anonymization
contrag verify privacy --user-id user123

# Check retention policy compliance
contrag verify retention --older-than 90d

# Audit data handling
contrag audit data-processing --timeframe 7d
```

### Performance Optimization

#### Slow Extraction
```json
{
  "preferences": {
    "extraction": {
      "batchSize": 5,           // Smaller batches
      "asyncProcessing": true,   // Background processing
      "cacheTimeout": "48h"      // Longer cache
    }
  }
}
```

#### High Storage Load
```json
{
  "preferences": {
    "storage": {
      "maxPreferencesPerUser": 500,  // Limit per user
      "batchWrites": true,           // Batch database writes
      "retentionDays": 30            // Shorter retention
    }
  }
}
```

## 🚀 Best Practices

### Preference Design Patterns

#### Progressive Profiling
```javascript
// Build user profiles gradually over multiple interactions
const conversations = [
  'Tell me about investment options',      // General query
  'I prefer low-risk investments',         // Risk preference
  'I care about environmental impact',     // Values preference
  'I want quarterly dividends'             // Income preference
];

// Each interaction adds to the user profile
for (const query of conversations) {
  await contrag.query({ userId, query, masterEntity: 'User' }, 
    { preferenceTracking: true });
}
```

#### Preference Validation
```javascript
// Validate preferences before making recommendations
const preferences = await contrag.getUserPreferences('user123');
const validated = preferences.filter(pref => 
  pref.confidence > 0.8 && 
  pref.created_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
);

// Use only high-confidence, recent preferences
```

#### Context-Aware Extraction
```javascript
// Provide domain context for better extraction
const response = await contrag.query({
  userId: 'user123',
  query: 'I like Apple',  // Could be fruit or stock
  masterEntity: 'User',
  context: 'financial_investing'  // Disambiguate context
}, { preferenceTracking: true });
```

### Performance Best Practices

#### Batch Operations
```javascript
// Process multiple users efficiently
await contrag.batchProcessPreferences([
  { userId: 'user1', query: 'I like tech stocks' },
  { userId: 'user2', query: 'I prefer bonds' },
  { userId: 'user3', query: 'I want growth stocks' }
], { batchSize: 10 });
```

#### Caching Strategy
```javascript
// Implement intelligent caching
const cachedProfile = await contrag.getCachedUserProfile('user123');
if (!cachedProfile || cachedProfile.isStale) {
  const freshProfile = await contrag.buildUserProfile('user123');
  await contrag.cacheUserProfile('user123', freshProfile, '1h');
}
```

---

ContRAG v1.3.0's preference tracking enables truly personalized RAG experiences. Start building smarter, more intuitive applications that learn from user interactions and provide increasingly relevant responses over time.
