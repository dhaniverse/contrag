// Core entity and schema types
export interface EntitySchema {
  name: string;
  fields: Field[];
  relationships: Relationship[];
  isTimeSeriesEnabled?: boolean;
  timestampField?: string;
}

export interface Field {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface Relationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  targetEntity: string;
  foreignKey: string;
  referencedKey: string;
  through?: string; // For many-to-many relationships
}

export interface EntityGraph {
  entity: string;
  uid: string;
  data: Record<string, any>;
  relationships: {
    [relationName: string]: EntityGraph[];
  };
  metadata: {
    timestamp?: Date;
    depth: number;
    source: 'relational' | 'document' | 'timeseries';
  };
}

export interface ContextChunk {
  id: string;
  namespace: string;
  content: string;
  metadata: {
    entity: string;
    uid: string;
    relations: string[];
    timestamp?: Date;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface EmbeddedChunk extends ContextChunk {
  embedding: number[];
}

// Database plugin interface
export interface DBPlugin {
  name: string;
  connect(config: Record<string, any>): Promise<void>;
  disconnect(): Promise<void>;
  introspectSchema(): Promise<EntitySchema[]>;
  buildEntityGraph(masterEntity: string, uid: string, maxDepth?: number): Promise<EntityGraph>;
  supportsTimeSeries(): boolean;
  // Enhanced debugging methods
  testConnection?(): Promise<ConnectionTestResult>;
  getSampleData?(entity: string, limit?: number, filters?: Record<string, any>): Promise<Record<string, any>[]>;
  getRelatedSampleData?(masterEntity: string, uid: string, config?: MasterEntityConfig): Promise<SampleDataResult>;
}

// Vector store plugin interface
export interface VectorStorePlugin {
  name: string;
  connect(config: Record<string, any>): Promise<void>;
  disconnect(): Promise<void>;
  store(chunks: EmbeddedChunk[]): Promise<void>;
  query(namespace: string, query: string, limit?: number): Promise<ContextChunk[]>;
  delete(namespace: string): Promise<void>;
  // Enhanced debugging methods
  listNamespaces?(): Promise<string[]>;
  getStats?(): Promise<VectorStoreStats>;
  testConnection?(): Promise<ConnectionTestResult>;
  searchSimilar?(embedding: number[], namespace?: string, limit?: number): Promise<VectorSearchResult[]>;
  // Dimension compatibility methods
  getCurrentDimensions?(): Promise<number | null>;
  setDimensions?(dimensions: number): Promise<void>;
  supportsDimensionMigration?(): boolean;
  migrateDimensions?(fromDimensions: number, toDimensions: number): Promise<void>;
  validateDimensions?(dimensions: number): Promise<boolean>;
}

// Embedder plugin interface
export interface EmbedderPlugin {
  name: string;
  configure(config: Record<string, any>): Promise<void>;
  embed(texts: string[], systemPrompt?: string): Promise<number[][]>;
  getDimensions(): number;
  // Enhanced debugging methods
  testConnection?(): Promise<ConnectionTestResult>;
  generateWithPrompt?(text: string, systemPrompt: string): Promise<string>;
  // Dimension compatibility methods
  getModelDimensions?(): Promise<number>;
  supportsCustomDimensions?(): boolean;
  validateModel?(model: string): Promise<boolean>;
}

// Master entity configuration
export interface MasterEntityConfig {
  name: string;
  primaryKey: string;
  relationships?: {
    [relationName: string]: {
      entity: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
      localKey: string;
      foreignKey: string;
      through?: string; // For many-to-many
    };
  };
  sampleFilters?: Record<string, any>;
}

// System prompt configuration
export interface SystemPromptConfig {
  default?: string;
  contextBuilder?: string;
  queryProcessor?: string;
  custom?: Record<string, string>;
}

// Configuration types
export interface ContragConfig {
  database: {
    plugin: string;
    config: Record<string, any>;
  };
  vectorStore: {
    plugin: string;
    config: Record<string, any> & {
      dimensions?: number;
      autoDetectDimensions?: boolean;
      forceDimensionAlignment?: boolean;
    };
  };
  embedder: {
    plugin: string;
    config: Record<string, any> & {
      dimensions?: number;
      model?: string;
    };
  };
  contextBuilder?: {
    chunkSize?: number;
    overlap?: number;
    maxDepth?: number;
    relationshipLimit?: number;
  };
  masterEntities?: MasterEntityConfig[];
  systemPrompts?: SystemPromptConfig;
  compatibility?: {
    validateDimensions?: boolean;
    autoFixDimensions?: boolean;
    strictMode?: boolean;
  };
}

// SDK response types
export interface QueryResult {
  chunks: ContextChunk[];
  totalResults: number;
  query: string;
  namespace: string;
}

export interface BuildResult {
  entity: string;
  uid: string;
  chunksCreated: number;
  namespace: string;
  success: boolean;
  error?: string;
}

// New types for enhanced functionality
export interface ConnectionTestResult {
  plugin: string;
  connected: boolean;
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SampleDataResult {
  masterEntity: string;
  uid: string;
  data: Record<string, any>;
  relatedData: {
    [entityName: string]: Record<string, any>[];
  };
  totalRecords: number;
}

export interface VectorStoreStats {
  namespaces: string[];
  totalVectors: number;
  dimensions: number;
  storageSize?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content?: string;
}

// Compatibility testing types
export interface DimensionCompatibilityResult {
  embedderDimensions: number;
  vectorStoreDimensions: number;
  compatible: boolean;
  autoFixAvailable: boolean;
  recommendations: string[];
}

export interface CompatibilityTestResult {
  component: string;
  compatible: boolean;
  issues: CompatibilityIssue[];
  recommendations: string[];
  fixable: boolean;
}

export interface CompatibilityIssue {
  type: 'dimension_mismatch' | 'version_incompatible' | 'config_invalid' | 'resource_unavailable';
  severity: 'error' | 'warning' | 'info';
  message: string;
  expected?: any;
  actual?: any;
  fixSuggestion?: string;
}

export interface ComprehensiveCompatibilityResult {
  overall: boolean;
  components: {
    database: CompatibilityTestResult;
    vectorStore: CompatibilityTestResult;
    embedder: CompatibilityTestResult;
    dimensions: DimensionCompatibilityResult;
  };
  summary: {
    totalIssues: number;
    fixableIssues: number;
    criticalIssues: number;
  };
}

// V1.3.0 Preference Tracking Types
export interface UserPreference {
  id: string;
  userId: string;
  category: string;
  type: 'explicit' | 'implicit' | 'inferred';
  value: any;
  confidence: number; // 0-1 scale
  source: 'conversation' | 'behavior' | 'profile' | 'manual';
  extractedAt: Date;
  lastUpdated: Date;
  context?: Record<string, any>;
  metadata?: {
    sessionId?: string;
    conversationId?: string;
    extractionMethod?: string;
    llmModel?: string;
    relevanceScore?: number;
  };
}

export interface UserProfile {
  userId: string;
  createdAt: Date;
  lastUpdated: Date;
  preferences: UserPreference[];
  segments: string[];
  behaviorPatterns: BehaviorPattern[];
  privacySettings: PrivacySettings;
  analytics: UserAnalytics;
  metadata?: Record<string, any>;
}

export interface BehaviorPattern {
  id: string;
  type: string;
  pattern: Record<string, any>;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  trending: boolean;
}

export interface PrivacySettings {
  dataCollection: boolean;
  personalizedContent: boolean;
  analytics: boolean;
  retentionPeriod: number; // days
  shareWithThirdParty: boolean;
  deleteOnRequest: boolean;
}

export interface UserAnalytics {
  totalInteractions: number;
  preferenceChanges: number;
  engagementScore: number;
  lastActive: Date;
  avgSessionDuration: number;
  topCategories: string[];
  trendingPreferences: string[];
}

export interface PreferenceExtractionRequest {
  userId: string;
  conversationText: string;
  sessionId?: string;
  conversationId?: string;
  extractionOptions?: {
    categories?: string[];
    confidenceThreshold?: number;
    maxPreferences?: number;
    extractImplicit?: boolean;
  };
}

export interface PreferenceExtractionResult {
  userId: string;
  extractedPreferences: UserPreference[];
  confidence: number;
  processingTime: number;
  llmModel: string;
  metadata?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    reasoning?: string;
  };
}

export interface PersonalizedQueryRequest {
  userId: string;
  query: string;
  namespace?: string;
  includePreferences?: boolean;
  preferenceWeight?: number; // 0-1 scale for preference influence
  contextOptions?: {
    includeProfile?: boolean;
    includeBehavior?: boolean;
    includeAnalytics?: boolean;
  };
}

export interface PersonalizedQueryResult extends QueryResult {
  personalization: {
    preferencesApplied: UserPreference[];
    profileDataUsed: boolean;
    personalizationScore: number;
    reasoning?: string;
  };
}

export interface PreferenceAnalyticsQuery {
  userId?: string;
  category?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  type?: 'explicit' | 'implicit' | 'inferred';
  source?: 'conversation' | 'behavior' | 'profile' | 'manual';
  aggregation?: 'daily' | 'weekly' | 'monthly';
}

export interface PreferenceAnalyticsResult {
  query: PreferenceAnalyticsQuery;
  results: {
    totalPreferences: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    confidenceDistribution: {
      high: number; // >0.8
      medium: number; // 0.5-0.8
      low: number; // <0.5
    };
    trendingCategories: Array<{
      category: string;
      count: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    timeline?: Array<{
      date: string;
      count: number;
    }>;
  };
  generatedAt: Date;
}

// Enhanced Configuration Types for v1.3.0
export interface PreferenceTrackingConfig {
  enabled: boolean;
  extractionModel: 'openai' | 'gemini' | 'custom';
  extractionConfig: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    confidenceThreshold?: number;
    extractImplicit?: boolean;
    categories?: string[];
  };
  storage: {
    retentionDays: number;
    anonymizeAfterDays?: number;
    compressionEnabled?: boolean;
  };
  privacy: {
    requireConsent: boolean;
    allowOptOut: boolean;
    encryptPreferences: boolean;
    auditTrail: boolean;
  };
  analytics: {
    enabled: boolean;
    aggregationLevel: 'user' | 'segment' | 'global';
    includePersonalData: boolean;
  };
}

// Extended ContragConfig for v1.3.0 (backward compatible)
export interface ContragConfigV13 extends ContragConfig {
  // All existing v1.2.0 config options remain the same
  // New v1.3.0 optional preference tracking configuration
  preferenceTracking?: PreferenceTrackingConfig;
  
  // Enhanced context builder for personalized content
  contextBuilder?: {
    chunkSize?: number;
    overlap?: number;
    maxDepth?: number;
    relationshipLimit?: number;
    // New v1.3.0 personalization options
    enablePersonalization?: boolean;
    personalizedChunking?: boolean;
    preferenceWeight?: number;
    includeUserContext?: boolean;
  };
}

// Plugin interfaces extended for preference support (optional methods for backward compatibility)
export interface PreferenceCapableDBPlugin extends DBPlugin {
  // Optional preference storage methods
  storeUserPreferences?(preferences: UserPreference[]): Promise<void>;
  getUserPreferences?(userId: string, filters?: Partial<UserPreference>): Promise<UserPreference[]>;
  updateUserProfile?(profile: UserProfile): Promise<void>;
  getUserProfile?(userId: string): Promise<UserProfile | null>;
  deleteUserData?(userId: string): Promise<void>;
  
  // Optional analytics methods
  getPreferenceAnalytics?(query: PreferenceAnalyticsQuery): Promise<PreferenceAnalyticsResult>;
  getUserSegments?(userId: string): Promise<string[]>;
  updateBehaviorPatterns?(userId: string, patterns: BehaviorPattern[]): Promise<void>;
}

export interface PreferenceCapableEmbedderPlugin extends EmbedderPlugin {
  // Optional preference extraction methods
  extractPreferences?(request: PreferenceExtractionRequest): Promise<PreferenceExtractionResult>;
  generatePersonalizedPrompt?(query: string, preferences: UserPreference[]): Promise<string>;
  analyzeConversation?(text: string, options?: Record<string, any>): Promise<Record<string, any>>;
}

// Preference extraction engine interface
export interface PreferenceExtractor {
  name: string;
  configure(config: Record<string, any>): Promise<void>;
  extractFromConversation(request: PreferenceExtractionRequest): Promise<PreferenceExtractionResult>;
  analyzeUserBehavior(userId: string, interactions: any[]): Promise<BehaviorPattern[]>;
  generatePersonalizedContext(userId: string, query: string): Promise<string>;
  testConnection?(): Promise<ConnectionTestResult>;
}
