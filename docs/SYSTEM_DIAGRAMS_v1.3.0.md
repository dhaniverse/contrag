# ContRAG v1.3.0 System Architecture Diagrams

This document contains comprehensive High-Level Design (HLD) and Low-Level Design (LLD) diagrams for ContRAG v1.3.0 with the new Intelligent Preference Tracking system.

## 🏗️ High-Level Architecture (HLD)

### Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        🌐 User Interface Layer                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ User Queries │ │ CLI Commands │ │ SDK API Calls│ │ Web Interface│ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────┘
          │                 │                 │                 │
          └─────────────────┬─────────────────┬─────────────────┘
                            ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      🧠 ContRAG Core Engine                         │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│  │ Query Processor  │ │ Configuration Mgr  │ │ Plugin Registry  │   │
│  └────────┬─────────┘ └──────────┬─────────┘ └─────────┬────────┘   │
│           │                      │                     │            │
│           │  ┌──────────────────┐│                     │            │
│           └──│ Request Router   ├┘                     │            │
│              └────────┬─────────┘                      │            │
└─────────────────────────┼─────────────────────────────────┼──────────┘
                          │                               │
              ┌───────────▼───────────┐       ┌───────────▼──────────┐
              │                       │       │                      │
              ▼                       ▼       ▼                      │
┌─────────────────────────────────────────────────────────────────────┐
│              🔥 Preference Intelligence System (NEW)                │
│  ┌───────────────────┐ ┌─────────────────┐ ┌──────────────────────┐ │
│  │ Preference Extract│ │ LLM Preference  │ │ Preference Storage   │ │
│  │ Engine           │ │ Analyzer        │ │ Manager              │ │
│  └─────────┬─────────┘ └────────┬────────┘ └─────────┬────────────┘ │
│            │                    │                    │              │
│  ┌─────────▼─────────┐ ┌────────▼────────┐ ┌─────────▼────────────┐ │
│  │ User Profile      │ │ Preference      │ │ Analytics Engine     │ │
│  │ Builder           │ │ Conflict        │ │                      │ │
│  │                   │ │ Resolver        │ │                      │ │
│  └─────────┬─────────┘ └─────────────────┘ └──────────────────────┘ │
└─────────────┼─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    🔍 RAG Processing System                         │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│  │ Schema           │ │ Entity Graph       │ │ Context          │   │
│  │ Introspector     │ │ Builder            │ │ Generator        │   │
│  └────────┬─────────┘ └──────────┬─────────┘ └─────────┬────────┘   │
│           │                      │                     │            │
│  ┌────────▼─────────┐ ┌──────────▼─────────┐          │            │
│  │ Vector Engine    │ │ Query Enhancer     │          │            │
│  └──────────────────┘ └────────────────────┘          │            │
└─────────────────────────────────────────────────────────┼──────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      💾 Data Storage Layer                          │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│  │ Primary Database │ │ Vector Store       │ │ 🔥 Preference    │   │
│  │                  │ │                    │ │ Store (NEW)      │   │
│  └──────────────────┘ └────────────────────┘ └──────────────────┘   │
│                                                                     │
│  ┌──────────────────┐                                               │
│  │ Cache Layer      │                                               │
│  └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      🤖 AI/ML Services                              │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│  │ Embedding        │ │ LLM Services       │ │ Analytics ML     │   │
│  │ Services         │ │                    │ │                  │   │
│  └──────────────────┘ └────────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

Flow Connections:
• User Interface → Core Engine
• Core Engine → Preference System & RAG System  
• Preference System → Data Storage & AI/ML Services
• RAG System → Data Storage & AI/ML Services
• 🔥 NEW: Enhanced context flow from Preference System to RAG System
```

### Preference-Enhanced Data Flow

```
                     📱 USER QUERY WITH PREFERENCE TRACKING
                     "I like large cap tech stocks like Apple"
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                   🧠 Query Processor                           │
    │                                                                │
    │  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
    │  │ Preference Extraction   │  │ RAG Context Building        │  │
    │  │ Pipeline               │  │ Pipeline                    │  │
    │  │         │               │  │         │                   │  │
    │  │         ▼               │  │         ▼                   │  │
    │  │ ┌─────────────────────┐ │  │ ┌─────────────────────────┐ │  │
    │  │ │ Check Cache         │ │  │ │ Fetch Entities          │ │  │
    │  │ │ (24h TTL)          │ │  │ │ from Database           │ │  │
    │  │ └─────┬───────────────┘ │  │ └─────────────────────────┘ │  │
    │  │       │ Cache Miss      │  │                             │  │
    │  │       ▼                 │  │                             │  │
    │  │ ┌─────────────────────┐ │  │ ┌─────────────────────────┐ │  │
    │  │ │ 🤖 LLM Analyzer    │ │  │ │ Enhanced Vector Search  │ │  │
    │  │ │ Extract preferences │ │  │ │ (preference-weighted)   │ │  │
    │  │ └─────┬───────────────┘ │  │ └───────┬─────────────────┘ │  │
    │  │       │                 │  │         │                   │  │
    │  │       ▼                 │  │         ▼                   │  │
    │  │ ┌─────────────────────┐ │  │ ┌─────────────────────────┐ │  │
    │  │ │ Cache Result        │ │  │ │ Cache Context           │ │  │
    │  │ │ (24h TTL)          │ │  │ │ (15m TTL)               │ │  │
    │  │ └─────┬───────────────┘ │  │ └───────┬─────────────────┘ │  │
    │  │       │                 │  │         │                   │  │
    │  │       ▼                 │  │         │                   │  │
    │  │ ┌─────────────────────┐ │  │         │                   │  │
    │  │ │ Store Preferences   │ │  │         │                   │  │
    │  │ │ Link to User ID     │ │  │         │                   │  │
    │  │ └─────┬───────────────┘ │  │         │                   │  │
    │  │       │                 │  │         │                   │  │
    │  │       ▼                 │  │         │                   │  │
    │  │ ┌─────────────────────┐ │  │         │                   │  │
    │  │ │ Update User Profile │ │  │         │                   │  │
    │  │ │ (Async)            │ │  │         │                   │  │
    │  │ └─────────────────────┘ │  │         │                   │  │
    │  └─────────────────────────┘  └─────────────────────────────┘  │
    └─────────────┬─────────────────────────────┬───────────────────┘
                  │                             │
                  ▼                             ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                      📤 RESPONSE                                │
    │                                                                │
    │  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
    │  │ 🎯 Extracted           │  │ 📚 Enhanced Context         │  │
    │  │ Preferences:           │  │ Chunks:                     │  │
    │  │                       │  │                             │  │
    │  │ • Category: stocks     │  │ • User investment history   │  │
    │  │ • Type: market_cap     │  │ • Preference-matched        │  │
    │  │ • Values: [large cap]  │  │   recommendations          │  │
    │  │ • Examples: [Apple]    │  │ • Personalized insights    │  │
    │  │ • Confidence: 0.89     │  │                             │  │
    │  └─────────────────────────┘  └─────────────────────────────┘  │
    │                                                                │
    │  ┌─────────────────────────┐                                   │
    │  │ 👤 Updated User Profile │                                   │  
    │  │                       │                                   │
    │  │ • Total Preferences: 15 │                                   │
    │  │ • Primary Categories:   │                                   │
    │  │   - Financial (60%)     │                                   │
    │  │   - Technology (25%)    │                                   │
    │  │   - ESG Values (15%)    │                                   │
    │  └─────────────────────────┘                                   │
    └─────────────────────────────────────────────────────────────────┘

                              🔄 ASYNC PROCESSING
                    ┌─────────────────────────────────────┐
                    │ Analytics Update Queue              │
                    │ • Preference extraction metrics     │
                    │ • User behavior pattern analysis    │
                    │ • ML model training data           │
                    └─────────────────────────────────────┘
```

## 🔧 Low-Level Design (LLD)

### Preference Extraction Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                🎯 Preference Extraction Pipeline                    │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Query Input  │───▶│ Context      │───▶│ Category             │   │
│  │ Validator    │    │ Analyzer     │    │ Classifier           │   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                     │               │
│                                                     ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Preference   │◀───│ Confidence   │◀───│ LLM Prompt           │   │
│  │ Formatter    │    │ Scorer       │    │ Builder              │   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                     │               │
└─────────────────────────────────────────────────────┼───────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 🧠 LLM Processing Layer                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Prompt       │───▶│ Model        │───▶│ Response             │   │
│  │ Template     │    │ Router       │    │ Validator            │   │
│  │ Engine       │    │              │    │                      │   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                     │               │
│                                                     ▼               │
│  ┌──────────────┐                                                   │
│  │ Error        │                                                   │
│  │ Handler      │                                                   │
│  └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────┬───────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                💾 Storage Management                                │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Preference   │───▶│ Conflict     │───▶│ Storage              │   │
│  │ Validator    │    │ Detector     │    │ Optimizer            │   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                     │               │
│                                                     ▼               │
│  ┌──────────────┐                                                   │
│  │ Audit        │                                                   │
│  │ Logger       │                                                   │
│  └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────┬───────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              📊 Analytics & Monitoring                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ Performance  │    │ Quality      │    │ User Behavior        │   │
│  │ Metrics      │    │ Metrics      │    │ Tracker              │   │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘   │
│         │                   │                       │               │
│         └─────────────────────┼─────────────────────┘               │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Alert System                               │   │
│  │  • Extraction failure alerts                               │   │
│  │  • Performance degradation warnings                        │   │
│  │  • Privacy compliance violations                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Processing Flow:
1. Query Input Validator → Context Analyzer → Category Classifier
2. Category Classifier → LLM Prompt Builder → Model Router
3. Model Router → Response Validator → Confidence Scorer
4. Confidence Scorer → Preference Formatter → Storage Management
5. Storage Management → Analytics & Monitoring → Alert System
```

### Data Models & Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌─────────────────────────────────────┐
│      USERS          │       │        USER_PREFERENCES             │
│                     │       │                                     │
│ • user_id (PK)     │──────▶│ • id (PK)                          │
│ • name             │   │   │ • user_id (FK) ──────────────────┐ │
│ • email            │   │   │ • category                       │ │
│ • created_at       │   │   │ • type                          │ │
│ • last_active      │   │   │ • values (JSON)                 │ │
│ • metadata (JSON)  │   │   │ • examples (JSON)               │ │
└─────────────────────┘   │   │ • confidence                    │ │
                          │   │ • extraction_method             │ │
                          │   │ • created_at                    │ │
                          │   │ • updated_at                    │ │
                          │   │ • active                        │ │
                          │   │ • metadata (JSON)               │ │
                          │   └─────────────────────────────────────┘
                          │                       │
                          │                       │
                          │   ┌─────────────────────────────────────┐
                          │   │      PREFERENCE_HISTORY             │
                          │   │                                     │
                          └──▶│ • id (PK)                          │
                              │ • user_id (FK)                     │
                              │ • preference_id (FK) ──────────────┘
                              │ • action                            
                              │ • old_values (JSON)                 
                              │ • new_values (JSON)                 
                              │ • source                            
                              │ • timestamp                         
                              │ • context (JSON)                   
                              └─────────────────────────────────────

┌─────────────────────┐       ┌─────────────────────────────────────┐
│   USER_PROFILES     │       │    PREFERENCE_CATEGORIES            │
│                     │       │                                     │
│ • user_id (PK)     │       │ • category (PK)                    │
│ • preference_       │       │ • display_name                     │
│   summary (JSON)   │       │ • description                      │
│ • category_weights │       │ • schema (JSON)                    │
│   (JSON)           │       │ • extraction_rules (JSON)         │
│ • recent_patterns  │       │ • weight                           │
│   (JSON)           │       │ • active                           │
│ • last_updated     │       │ • created_at                       │
│ • interaction_count│       └─────────────────────────────────────┘
│ • preference_count │                       │
│ • analytics_       │                       │
│   metadata (JSON) │                       │
└─────────────────────┘                       │
         │                                    │
         ▼                                    ▼
┌─────────────────────┐       ┌─────────────────────────────────────┐
│ PREFERENCE_ANALYTICS│       │        EXTRACTION_LOGS              │
│                     │       │                                     │
│ • id (PK)          │       │ • id (PK)                          │
│ • user_id (FK)     │       │ • user_id (FK)                     │
│ • metric_type      │       │ • query_text                       │
│ • metric_data      │       │ • extracted_preferences (JSON)    │
│   (JSON)           │       │ • avg_confidence                   │
│ • metric_date      │       │ • model_used                       │
│ • created_at       │       │ • processing_time_ms               │
└─────────────────────┘       │ • created_at                       │
                              └─────────────────────────────────────┘

RELATIONSHIPS:
• USERS (1) ──── (Many) USER_PREFERENCES
• USERS (1) ──── (1) USER_PROFILES  
• USERS (1) ──── (Many) PREFERENCE_HISTORY
• USERS (1) ──── (Many) PREFERENCE_ANALYTICS
• USERS (1) ──── (Many) EXTRACTION_LOGS
• USER_PREFERENCES (1) ──── (Many) PREFERENCE_HISTORY
• USER_PREFERENCES (Many) ──── (1) PREFERENCE_CATEGORIES
• USER_PROFILES (1) ──── (Many) PREFERENCE_ANALYTICS
```

### SDK Function Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    📚 ContRAG SDK Classes                          │
└─────────────────────────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │              ContragSDK                         │
          │                 (Main)                          │
          └─────────────────┬───────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ PreferenceEngine│ │UserProfileBuilder│ │AnalyticsEngine │
│     🔥 NEW      │ │     🔥 NEW       │ │    🔥 NEW      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        │                  │                  │
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                ┌─────────────────┐
                │ ConfigManager   │
                │                 │
                └─────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                🎯 Core SDK Methods                                  │
│                                                                     │
│  ContragSDK:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • query(request, options)           - Enhanced query with   │   │
│  │                                       preference tracking   │   │
│  │ • buildFor(entity, uid)             - Build RAG context     │   │
│  │ • getUserPreferences(userId)        - Get user preferences  │   │
│  │ • updateUserPreferences(userId, p)  - Update preferences    │   │
│  │ • analyzePreferences(userId)        - Analyze patterns      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              🔧 Preference Engine Methods                           │
│                                                                     │
│  PreferenceEngine:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • extract(userId, query, categories) - Extract preferences  │   │
│  │ • validate(preferences)              - Validate structure   │   │
│  │ • resolveConflicts(userId, prefs)    - Handle conflicts     │   │
│  │ • getExtractionStats()               - Performance metrics  │   │
│  │ • testExtraction(query, options)     - Test without storing │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               👤 User Profile Methods                               │
│                                                                     │
│  UserProfileBuilder:                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • buildProfile(userId)               - Build complete profile│  │
│  │ • refreshProfile(userId)             - Refresh from prefs    │  │
│  │ • getProfileSummary(userId)          - Get profile overview  │  │
│  │ • exportUserData(userId)             - GDPR data export      │  │
│  │ • deleteUserData(userId)             - GDPR data deletion    │  │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                📊 Analytics Methods                                 │
│                                                                     │
│  AnalyticsEngine:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • analyzeUserPreferences(userId)     - Individual analysis   │  │
│  │ • getGlobalInsights(timeframe)       - Business intelligence │  │
│  │ • getPreferenceTrends(userId)        - Preference evolution  │  │
│  │ • getCategoryDistribution()          - Category popularity   │  │
│  │ • getExtractionMetrics()             - System performance    │  │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

METHOD RELATIONSHIPS:
• query() ──────────▶ extract() ──────────▶ buildProfile()
• getUserPreferences() ──────────▶ getProfileSummary()
• updateUserPreferences() ──────▶ resolveConflicts() ──────▶ refreshProfile()
• analyzePreferences() ──────────▶ analyzeUserPreferences() ──────▶ getPreferenceTrends()
```

### CLI Command Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🖥️ CLI Command Structure                         │
└─────────────────────────────────────────────────────────────────────┘

                            contrag
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │ config  │           │🔥 prefs │           │analytics│
   │         │           │ (NEW)   │           │         │
   └─────────┘           └─────────┘           └─────────┘
        │                      │                      │
        ├─ init                ├─ show                ├─ preferences
        ├─ validate            ├─ export              ├─ trends  
        ├─ view                ├─ clear               ├─ categories
        └─ update              ├─ analyze             └─ performance
                               └─ test
                               
        ┌─────────┐           ┌─────────┐           ┌─────────┐
        │  test   │           │ migrate │           │ vector  │
        │         │           │         │           │         │
        └─────────┘           └─────────┘           └─────────┘
        │                      │                      │
        ├─ all                 ├─ --version           ├─ stats
        ├─ preferences         ├─ --rollback          ├─ namespaces
        ├─ extraction          └─ --dry-run           ├─ search
        └─ performance                                └─ clear

┌─────────────────────────────────────────────────────────────────────┐
│                    🎯 Preference Commands (NEW)                     │
│                                                                     │
│  contrag preferences show --user-id user123                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Display user preferences in formatted table                 │   │
│  │ • Category breakdown                                        │   │
│  │ • Confidence scores                                         │   │
│  │ • Creation timestamps                                       │   │
│  │ • Value examples                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag preferences export --user-id user123 --format json        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Export preferences to JSON/CSV                              │   │
│  │ • GDPR compliance ready                                     │   │
│  │ • Include metadata and history                              │   │
│  │ • Filter by date range or category                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag preferences clear --user-id user123 --older-than 30d      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Clean up old preferences                                    │   │
│  │ • Configurable retention periods                            │   │
│  │ • Category-specific cleanup                                 │   │
│  │ • Dry-run mode for safety                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag preferences analyze --query "I love tech stocks"          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Test preference extraction without storing                  │   │
│  │ • Confidence threshold testing                              │   │
│  │ • Category mapping validation                               │   │
│  │ • Model performance comparison                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag preferences test --scenario financial-advisor             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Run comprehensive preference tests                          │   │
│  │ • End-to-end extraction pipeline                            │   │
│  │ • Performance benchmarks                                    │   │
│  │ • Accuracy measurements                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  📊 Enhanced Analytics Commands                     │
│                                                                     │
│  contrag analytics preferences                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Global preference analytics dashboard                       │   │
│  │ • Category distribution across users                        │   │
│  │ • Extraction success rates                                  │   │
│  │ • Popular preference patterns                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag analytics trends --user-id user123 --timeframe 30d        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ User preference evolution analysis                          │   │
│  │ • Preference changes over time                              │   │
│  │ • Confidence score trends                                   │   │
│  │ • Category shifts and patterns                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag analytics categories --global --timeframe 7d              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Category performance analysis                               │   │
│  │ • Most/least extracted categories                           │   │
│  │ • Category confidence distributions                         │   │
│  │ • Extraction accuracy by category                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  contrag analytics performance                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ System performance metrics                                  │   │
│  │ • Extraction latency distributions                          │   │
│  │ • Cache hit rates                                           │   │
│  │ • LLM API usage statistics                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

COMMAND HIERARCHY:
contrag
├── config
│   ├── init [--template] [--force]
│   ├── validate
│   ├── view
│   └── update [--key] [--value]
├── 🔥 preferences (NEW)
│   ├── show [--user-id] [--category] [--format]
│   ├── export [--user-id] [--format] [--filter]
│   ├── clear [--user-id] [--older-than] [--categories]
│   ├── analyze [--query] [--threshold]
│   └── test [--scenario] [--sample-size]
├── analytics
│   ├── preferences [--global] [--timeframe]
│   ├── trends [--user-id] [--timeframe] [--granularity]
│   ├── categories [--global] [--sort-by]
│   └── performance [--metric] [--timeframe]
├── test
│   ├── all
│   ├── preferences [--extraction] [--storage] [--performance]
│   ├── extraction [--input-file] [--expected-output]
│   └── performance [--concurrent-users] [--duration]
└── migrate
    ├── --version [1.3.0]
    ├── --rollback [--to-version]
    └── --dry-run
```

### Performance & Caching Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                🚀 Multi-Layer Caching System                       │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │      L1: Memory Cache    │
                    │   • In-process caching  │
                    │   • Sub-millisecond     │
                    │   • 256MB default limit │
                    └───────────┬─────────────┘
                                │ Cache Miss
                                ▼
                    ┌─────────────────────────┐
                    │     L2: Redis Cache     │
                    │   • Distributed cache   │
                    │   • 1-5ms response      │
                    │   • 2GB default limit   │
                    └───────────┬─────────────┘
                                │ Cache Miss
                                ▼
                    ┌─────────────────────────┐
                    │    L3: Database Cache   │
                    │   • Query result cache  │
                    │   • 10-50ms response    │
                    │   • Database optimized  │
                    └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               🎯 Preference-Specific Caching                       │
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐               │
│  │ Extraction Results  │    │ User Profile Cache  │               │
│  │ Cache              │    │                     │               │
│  │ • TTL: 24 hours    │    │ • TTL: 15 minutes   │               │
│  │ • Key: query_hash  │    │ • Key: user_id      │               │
│  │ • Size: ~1KB/item  │    │ • Size: ~5KB/user   │               │
│  └─────────────────────┘    └─────────────────────┘               │
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐               │
│  │ Analytics Cache     │    │ LLM Response Cache  │               │
│  │                     │    │                     │               │
│  │ • TTL: 1 hour       │    │ • TTL: 48 hours     │               │
│  │ • Key: metric_type  │    │ • Key: prompt_hash  │               │
│  │ • Size: ~2KB/item   │    │ • Size: ~500B/item  │               │
│  └─────────────────────┘    └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              📊 Cache Management System                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                Cache Invalidation Engine                    │   │
│  │                                                             │   │
│  │  Triggers:                        Actions:                  │   │
│  │  • User preference updates    →   • Clear user profile     │   │
│  │  • New preference extraction  →   • Update aggregations    │   │
│  │  • Configuration changes      →   • Flush all caches       │   │
│  │  • System maintenance         →   • Gradual invalidation   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐   │
│  │ TTL Manager         │    │ Memory Monitor                  │   │
│  │                     │    │                                 │   │
│  │ • Dynamic TTL       │    │ • Memory usage tracking        │   │
│  │ • Usage patterns    │    │ • Automatic eviction           │   │
│  │ • Smart expiration  │    │ • Performance optimization     │   │
│  └─────────────────────┘    └─────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Performance Optimizer                          │   │
│  │                                                             │   │
│  │  Strategies:                                                │   │
│  │  • Preload frequently accessed preferences                  │   │
│  │  • Background cache warming                                 │   │
│  │  • Intelligent cache sizing                                 │   │
│  │  • Load balancing across cache layers                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│             🔄 Background Processing System                         │
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐   │
│  │ Async Preference    │    │ Batch Processor                 │   │
│  │ Queue              │    │                                 │   │
│  │                     │    │ • Group similar operations      │   │
│  │ • Redis-backed      │    │ • Optimize database writes      │   │
│  │ • Priority levels   │    │ • Reduce LLM API calls         │   │
│  │ • Retry logic       │    │ • Batch size: 10-50 items      │   │
│  └─────────────────────┘    └─────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐   │
│  │ Analytics           │    │ Cleanup Scheduler               │   │
│  │ Aggregator         │    │                                 │   │
│  │                     │    │ • Daily preference cleanup      │   │
│  │ • Real-time stats   │    │ • Cache maintenance             │   │
│  │ • Trend calculation │    │ • Log rotation                  │   │
│  │ • ML data prep      │    │ • Health checks                 │   │
│  └─────────────────────┘    └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

PERFORMANCE METRICS:
┌─────────────────────────────────────────────────────────────────────┐
│                    📈 System Performance KPIs                      │
│                                                                     │
│  Cache Performance:              Preference Extraction:            │
│  • L1 Hit Rate: >95%            • Average Latency: <100ms          │
│  • L2 Hit Rate: >85%            • Success Rate: >95%               │
│  • L3 Hit Rate: >70%            • Confidence Score: >0.7           │
│                                                                     │
│  Memory Usage:                   Database Performance:             │
│  • L1 Cache: <256MB             • Connection Pool: 20-50 conns     │
│  • L2 Cache: <2GB               • Query Response: <50ms            │
│  • Total Memory: <1GB           • Write Batch Size: 100 ops        │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔒 Security & Privacy Architecture

### Data Protection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🔐 Security Layer                               │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Input           │  │ Authentication  │  │ Authorization   │     │
│  │ Validation      │  │                 │  │                 │     │
│  │                 │  │ • JWT tokens    │  │ • RBAC system   │     │
│  │ • SQL injection │  │ • API keys      │  │ • User scopes   │     │
│  │ • XSS protection│  │ • Session mgmt  │  │ • Data access   │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │              │
│           └────────────────────┼────────────────────┘              │
│                                │                                   │
│  ┌─────────────────────────────▼─────────────────────────────────┐ │
│  │                   Rate Limiting                               │ │
│  │                                                               │ │
│  │ • 1000 requests/hour per user                                 │ │
│  │ • 100 preference extractions/hour per user                    │ │
│  │ • 10 analytics requests/minute per user                       │ │
│  │ • Burst protection with token bucket algorithm                │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   🛡️ Privacy Controls                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 Consent Management                          │   │
│  │                                                             │   │
│  │  User Consent Types:           Status Tracking:            │   │
│  │  • Preference tracking    →    • Granular permissions      │   │
│  │  • Data retention         →    • Consent versioning        │   │
│  │  • Analytics processing   →    • Withdrawal handling       │   │
│  │  • Third-party sharing    →    • Audit logging             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Data            │  │ Encryption      │  │ Access          │     │
│  │ Anonymization   │  │ Engine          │  │ Control         │     │
│  │                 │  │                 │  │                 │     │
│  │ • Hash user IDs │  │ • AES-256       │  │ • Field-level   │     │
│  │ • Remove PII    │  │ • Key rotation  │  │ • Role-based    │     │
│  │ • Data masking  │  │ • HSM support   │  │ • Time-limited  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              📝 Compliance Framework                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GDPR Compliance                          │   │
│  │                                                             │   │
│  │  Rights Implementation:                                     │   │
│  │  • Right to Access (Art. 15)    → Data export API         │   │
│  │  • Right to Rectification (16)  → Update preferences API   │   │
│  │  • Right to Erasure (17)        → Delete user data API    │   │
│  │  • Right to Portability (20)    → Export in standard JSON │   │
│  │  • Right to Object (21)         → Opt-out mechanisms      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Audit           │  │ Data            │  │ Right to        │     │
│  │ Trail           │  │ Retention       │  │ Delete          │     │
│  │                 │  │                 │  │                 │     │
│  │ • All data      │  │ • 90-365 days   │  │ • Cascade       │     │
│  │   operations    │  │ • Auto-deletion │  │   deletion      │     │
│  │ • User actions  │  │ • Policy-based  │  │ • Soft delete   │     │
│  │ • System events │  │ • Grace periods │  │ • Recovery      │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│           🔍 Monitoring & Alerts                                   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Privacy         │  │ Security        │  │ Compliance      │     │
│  │ Monitoring      │  │ Alerts          │  │ Reporting       │     │
│  │                 │  │                 │  │                 │     │
│  │ • Data access   │  │ • Failed auth   │  │ • GDPR reports  │     │
│  │ • Consent       │  │ • Rate limits   │  │ • Data audits   │     │
│  │   violations    │  │ • Intrusions    │  │ • Compliance    │     │
│  │ • Retention     │  │ • Data leaks    │  │   metrics       │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                │                                   │
│                                ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Incident Response System                       │   │
│  │                                                             │   │
│  │  Response Levels:               Actions:                    │   │
│  │  • Level 1: Info/Warning   →   • Log and monitor           │   │
│  │  • Level 2: Minor breach   →   • Notify admin team         │   │
│  │  • Level 3: Major breach   →   • Execute response plan     │   │
│  │  • Level 4: Critical       →   • Emergency procedures      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

PRIVACY PROTECTION WORKFLOW:
1. User Request → Input Validation → Authentication/Authorization
2. Rate Limiting → Consent Check → Data Access Control  
3. Data Processing → Encryption → Anonymization (if required)
4. Audit Logging → Compliance Check → Response Generation
5. Monitoring → Alert Generation → Incident Response (if needed)
```

## 🌐 Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ☁️ Cloud Infrastructure                          │
└─────────────────────────────────────────────────────────────────────┘

                              Internet
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │   Load Balancer     │
                    │   • SSL termination │
                    │   • Health checks   │
                    │   • Auto-scaling    │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   API Gateway       │
                    │   • Rate limiting   │
                    │   • Auth/Auth      │
                    │   • Request routing │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Container           │
                    │ Orchestration       │
                    │ (Kubernetes/Docker) │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼

┌─────────────────────────────────────────────────────────────────────┐
│                    🚀 Application Tier                             │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ ContRAG API     │  │ 🔥 Preference   │  │ Analytics       │     │
│  │ Servers         │  │ Processing      │  │ Services        │     │
│  │                 │  │ Workers (NEW)   │  │                 │     │
│  │ • Query proc.   │  │                 │  │ • Real-time     │     │
│  │ • RAG engine    │  │ • LLM calls     │  │   dashboards    │     │
│  │ • Vector search │  │ • Extraction    │  │ • Reporting     │     │
│  │ • User mgmt     │  │ • Storage       │  │ • ML insights   │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                Background Jobs                              │   │
│  │                                                             │   │
│  │ • Preference extraction queue processing                    │   │
│  │ • User profile building and updates                         │   │
│  │ • Analytics aggregation and ML training                     │   │
│  │ • Data cleanup and retention policy enforcement             │   │
│  │ • Health checks and system monitoring                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      💾 Data Tier                                  │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Primary Database│  │ Vector Database │  │ 🔥 Preference   │     │
│  │ Cluster         │  │ Cluster         │  │ Database (NEW)  │     │
│  │                 │  │                 │  │                 │     │
│  │ • PostgreSQL    │  │ • Weaviate/     │  │ • Dedicated     │     │
│  │ • Master/Slave  │  │   pgvector      │  │   preference    │     │
│  │ • Auto-failover │  │ • Replication   │  │   storage       │     │
│  │ • Backup/Restore│  │ • Sharding      │  │ • GDPR ready    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Cache Cluster                             │   │
│  │                                                             │   │
│  │ • Redis Cluster with HA                                     │   │
│  │ • L1: Application cache (memory)                            │   │
│  │ • L2: Distributed cache (Redis)                             │   │
│  │ • L3: Database query cache                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   🤖 AI/ML Services                                 │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ LLM API         │  │ Embedding       │  │ 🔥 Analytics ML │     │
│  │ Gateway         │  │ Services        │  │ Pipeline (NEW)  │     │
│  │                 │  │                 │  │                 │     │
│  │ • OpenAI        │  │ • OpenAI        │  │ • User behavior │     │
│  │ • Gemini        │  │ • Gemini        │  │   modeling      │     │
│  │ • Model routing │  │ • Batch proc.   │  │ • Preference    │     │
│  │ • Rate limiting │  │ • Caching       │  │   analytics     │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   📊 Observability                                 │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Metrics         │  │ Log             │  │ Distributed     │     │
│  │ Collection      │  │ Aggregation     │  │ Tracing         │     │
│  │                 │  │                 │  │                 │     │
│  │ • Prometheus    │  │ • ELK Stack     │  │ • Jaeger        │     │
│  │ • Custom        │  │ • Structured    │  │ • Request       │     │
│  │   preference    │  │   logging       │  │   tracing       │     │
│  │   metrics       │  │ • Audit logs    │  │ • Performance   │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Alerting System                            │   │
│  │                                                             │   │
│  │ • Performance degradation alerts                            │   │
│  │ • Preference extraction failure notifications               │   │
│  │ • Privacy compliance violation alerts                       │   │
│  │ • Resource utilization warnings                             │   │
│  │ • Security incident notifications                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

DEPLOYMENT SPECIFICATIONS:
┌─────────────────────────────────────────────────────────────────────┐
│                    🏗️ Infrastructure Requirements                  │
│                                                                     │
│  Minimum Production Setup:        Recommended Production Setup:     │
│  • 3x API servers (2 CPU, 4GB)   • 5x API servers (4 CPU, 8GB)    │
│  • 2x Preference workers (1 CPU) • 3x Preference workers (2 CPU)   │
│  • 1x Analytics service (2 CPU)  • 2x Analytics services (4 CPU)   │
│  • 1x PostgreSQL (4 CPU, 16GB)   • 3x PostgreSQL cluster (8 CPU)   │
│  • 1x Redis (2 CPU, 8GB)         • 3x Redis cluster (4 CPU, 16GB)  │
│  • 1x Vector DB (4 CPU, 16GB)    • 3x Vector DB cluster (8 CPU)    │
│                                                                     │
│  High Availability Features:                                        │
│  • Multi-AZ deployment across 3 availability zones                 │
│  • Auto-scaling groups with min 2, max 10 instances                │
│  • Database replication with automatic failover                    │
│  • Load balancer health checks with 30s intervals                  │
│  • Backup strategy: Daily full, hourly incremental                 │
└─────────────────────────────────────────────────────────────────────┘

---

These diagrams provide a comprehensive architectural view of ContRAG v1.3.0 in pure markdown format, highlighting the new preference tracking system integration with existing RAG capabilities. The architecture is designed for scalability, privacy compliance, and production reliability while maintaining the system's ease of use and powerful personalization features.
