import { 
  ContragConfig, 
  DBPlugin, 
  VectorStorePlugin, 
  EmbedderPlugin, 
  EntityGraph, 
  QueryResult, 
  BuildResult,
  ContextChunk,
  EmbeddedChunk,
  MasterEntityConfig,
  ConnectionTestResult,
  SampleDataResult,
  VectorStoreStats,
  VectorSearchResult,
  CompatibilityTestResult,
  DimensionCompatibilityResult,
  ComprehensiveCompatibilityResult,
  // V1.3.0 Preference Types
  ContragConfigV13,
  UserPreference,
  UserProfile,
  PreferenceExtractionRequest,
  PreferenceExtractionResult,
  PersonalizedQueryRequest,
  PersonalizedQueryResult,
  PreferenceAnalyticsQuery,
  PreferenceAnalyticsResult,
  PreferenceCapableDBPlugin,
  PreferenceCapableEmbedderPlugin,
  PreferenceExtractor
} from './types';
import { ContextBuilder } from './context-builder';
import { CompatibilityTester } from './compatibility';
import { UserProfileBuilder } from './user-profile-builder';
import { PreferenceAnalyticsEngine } from './analytics-engine';
import { LLMPreferenceExtractor } from './plugins/preference-extractor';
import { PostgresPlugin } from './plugins/postgres';
import { MongoPlugin } from './plugins/mongodb';
import { OpenAIEmbedderPlugin } from './plugins/openai-embedder';
import { GeminiEmbedderPlugin } from './plugins/gemini-embedder';
import { WeaviatePlugin } from './plugins/weaviate-vector-store';
import { PgVectorPlugin } from './plugins/pgvector-store';
import { DEFAULT_CONFIG, ERROR_MESSAGES, PLUGIN_NAMES } from './constants';

export class ContragSDK {
  private dbPlugin: DBPlugin | null = null;
  private vectorStorePlugin: VectorStorePlugin | null = null;
  private embedderPlugin: EmbedderPlugin | null = null;
  private contextBuilder: ContextBuilder;
  private config: ContragConfig | ContragConfigV13 | null = null;
  
  // V1.3.0 Preference Tracking Components (optional)
  private preferenceExtractor: PreferenceExtractor | null = null;
  private profileBuilder: UserProfileBuilder | null = null;
  private analyticsEngine: PreferenceAnalyticsEngine | null = null;

  constructor(config?: ContragConfig | ContragConfigV13) {
    this.contextBuilder = new ContextBuilder(config?.contextBuilder);
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the SDK with plugins
   */
  async configure(config: ContragConfig | ContragConfigV13): Promise<void> {
    this.config = config;

    // Initialize database plugin
    switch (config.database.plugin.toLowerCase()) {
      case PLUGIN_NAMES.POSTGRES:
        this.dbPlugin = new PostgresPlugin();
        break;
      case PLUGIN_NAMES.MONGODB:
        this.dbPlugin = new MongoPlugin();
        break;
      default:
        throw new Error(`Unknown database plugin: ${config.database.plugin}`);
    }

    // Initialize vector store plugin
    switch (config.vectorStore.plugin.toLowerCase()) {
      case PLUGIN_NAMES.WEAVIATE:
        this.vectorStorePlugin = new WeaviatePlugin();
        break;
      case PLUGIN_NAMES.PGVECTOR:
        this.vectorStorePlugin = new PgVectorPlugin();
        break;
      default:
        throw new Error(`Unknown vector store plugin: ${config.vectorStore.plugin}`);
    }

    // Initialize embedder plugin
    switch (config.embedder.plugin.toLowerCase()) {
      case PLUGIN_NAMES.OPENAI:
        this.embedderPlugin = new OpenAIEmbedderPlugin();
        break;
      case PLUGIN_NAMES.GEMINI:
        this.embedderPlugin = new GeminiEmbedderPlugin();
        break;
      default:
        throw new Error(`Unknown embedder plugin: ${config.embedder.plugin}`);
    }

    // Connect all plugins
    await this.dbPlugin.connect(config.database.config);
    await this.vectorStorePlugin.connect(config.vectorStore.config);
    await this.embedderPlugin.configure(config.embedder.config);

    // V1.3.0: Initialize preference tracking components if enabled
    const v13Config = config as ContragConfigV13;
    if (v13Config.preferenceTracking?.enabled) {
      await this.initializePreferenceTracking(v13Config);
    }
  }

  /**
   * V1.3.0: Initialize preference tracking components
   */
  private async initializePreferenceTracking(config: ContragConfigV13): Promise<void> {
    // Initialize preference extractor
    this.preferenceExtractor = new LLMPreferenceExtractor();
    await this.preferenceExtractor.configure({
      embedderPlugin: this.embedderPlugin,
      ...config.preferenceTracking?.extractionConfig
    });

    // Initialize profile builder
    if (this.dbPlugin && 'storeUserPreferences' in this.dbPlugin) {
      this.profileBuilder = new UserProfileBuilder(
        this.dbPlugin as PreferenceCapableDBPlugin,
        config.preferenceTracking
      );
    }

    // Initialize analytics engine
    if (this.dbPlugin && 'getPreferenceAnalytics' in this.dbPlugin) {
      this.analyticsEngine = new PreferenceAnalyticsEngine(
        this.dbPlugin as PreferenceCapableDBPlugin,
        config.preferenceTracking?.analytics
      );
    }
  }

  /**
   * Introspect database schema
   */
  async introspectSchema(): Promise<any> {
    if (!this.dbPlugin) {
      throw new Error(ERROR_MESSAGES.DB_NOT_CONNECTED);
    }

    return await this.dbPlugin.introspectSchema();
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection(): Promise<ConnectionTestResult> {
    if (!this.dbPlugin) {
      throw new Error(ERROR_MESSAGES.DB_NOT_CONNECTED);
    }

    if (this.dbPlugin.testConnection) {
      return await this.dbPlugin.testConnection();
    }

    // Fallback test using introspectSchema
    try {
      const startTime = Date.now();
      await this.dbPlugin.introspectSchema();
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.dbPlugin.name,
        connected: true,
        latency,
        details: { method: 'introspection-fallback' }
      };
    } catch (error) {
      return {
        plugin: this.dbPlugin.name,
        connected: false,
        error: String(error)
      };
    }
  }

  /**
   * Test vector store connection
   */
  async testVectorStoreConnection(): Promise<ConnectionTestResult> {
    if (!this.vectorStorePlugin) {
      throw new Error(ERROR_MESSAGES.VECTOR_NOT_CONNECTED);
    }

    if (this.vectorStorePlugin.testConnection) {
      return await this.vectorStorePlugin.testConnection();
    }

    // Fallback test
    try {
      const startTime = Date.now();
      if (this.vectorStorePlugin.getStats) {
        await this.vectorStorePlugin.getStats();
      }
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.vectorStorePlugin.name,
        connected: true,
        latency,
        details: { method: 'stats-fallback' }
      };
    } catch (error) {
      return {
        plugin: this.vectorStorePlugin.name,
        connected: false,
        error: String(error)
      };
    }
  }

  /**
   * Test embedder connection
   */
  async testEmbedderConnection(): Promise<ConnectionTestResult> {
    if (!this.embedderPlugin) {
      throw new Error(ERROR_MESSAGES.EMBEDDER_NOT_CONFIGURED);
    }

    if (this.embedderPlugin.testConnection) {
      return await this.embedderPlugin.testConnection();
    }

    // Fallback test with a simple embedding
    try {
      const startTime = Date.now();
      await this.embedderPlugin.embed(['test']);
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.embedderPlugin.name,
        connected: true,
        latency,
        details: { method: 'embedding-test' }
      };
    } catch (error) {
      return {
        plugin: this.embedderPlugin.name,
        connected: false,
        error: String(error)
      };
    }
  }

  /**
   * Get sample data for a master entity
   */
  async getSampleData(entity: string, limit?: number, filters?: Record<string, any>): Promise<Record<string, any>[]> {
    if (!this.dbPlugin) {
      throw new Error(ERROR_MESSAGES.DB_NOT_CONNECTED);
    }

    if (this.dbPlugin.getSampleData) {
      return await this.dbPlugin.getSampleData(entity, limit || DEFAULT_CONFIG.SAMPLE_LIMIT, filters);
    }

    throw new Error('Sample data retrieval not supported by this database plugin');
  }

  /**
   * Get related sample data for a master entity
   */
  async getRelatedSampleData(masterEntity: string, uid: string, entityConfig?: MasterEntityConfig): Promise<SampleDataResult> {
    if (!this.dbPlugin) {
      throw new Error(ERROR_MESSAGES.DB_NOT_CONNECTED);
    }

    if (this.dbPlugin.getRelatedSampleData) {
      return await this.dbPlugin.getRelatedSampleData(masterEntity, uid, entityConfig);
    }

    // Fallback using buildEntityGraph
    try {
      const entityGraph = await this.dbPlugin.buildEntityGraph(masterEntity, uid, 2);
      
      const relatedData: { [entityName: string]: Record<string, any>[] } = {};
      let totalRecords = 1; // Count the master entity
      
      const processGraph = (graph: EntityGraph) => {
        for (const [relationName, relatedEntities] of Object.entries(graph.relationships)) {
          if (!relatedData[relationName]) {
            relatedData[relationName] = [];
          }
          
          for (const relatedEntity of relatedEntities) {
            relatedData[relationName].push(relatedEntity.data);
            totalRecords++;
            
            // Process nested relationships (but limit depth)
            if (relatedEntity.metadata.depth < 2) {
              processGraph(relatedEntity);
            }
          }
        }
      };
      
      processGraph(entityGraph);
      
      return {
        masterEntity,
        uid,
        data: entityGraph.data,
        relatedData,
        totalRecords
      };
    } catch (error) {
      throw new Error(`Failed to retrieve related sample data: ${error}`);
    }
  }

  /**
   * Get vector store statistics
   */
  async getVectorStoreStats(): Promise<VectorStoreStats> {
    if (!this.vectorStorePlugin) {
      throw new Error(ERROR_MESSAGES.VECTOR_NOT_CONNECTED);
    }

    if (this.vectorStorePlugin.getStats) {
      return await this.vectorStorePlugin.getStats();
    }

    throw new Error('Vector store statistics not supported by this plugin');
  }

  /**
   * List vector store namespaces
   */
  async listVectorStoreNamespaces(): Promise<string[]> {
    if (!this.vectorStorePlugin) {
      throw new Error(ERROR_MESSAGES.VECTOR_NOT_CONNECTED);
    }

    if (this.vectorStorePlugin.listNamespaces) {
      return await this.vectorStorePlugin.listNamespaces();
    }

    throw new Error('Namespace listing not supported by this vector store plugin');
  }

  /**
   * Search similar vectors
   */
  async searchSimilarVectors(text: string, namespace?: string, limit?: number): Promise<VectorSearchResult[]> {
    if (!this.vectorStorePlugin || !this.embedderPlugin) {
      throw new Error(ERROR_MESSAGES.PLUGINS_NOT_CONFIGURED);
    }

    if (this.vectorStorePlugin.searchSimilar) {
      const embeddings = await this.embedderPlugin.embed([text]);
      return await this.vectorStorePlugin.searchSimilar(embeddings[0], namespace, limit || DEFAULT_CONFIG.QUERY_LIMIT);
    }

    throw new Error('Similar vector search not supported by this vector store plugin');
  }

  /**
   * Get master entity configuration
   */
  getMasterEntityConfig(entityName: string): MasterEntityConfig | undefined {
    return this.config?.masterEntities?.find(e => e.name === entityName);
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(type: string = 'default'): string | undefined {
    if (!this.config?.systemPrompts) {
      return undefined;
    }

    const prompts = this.config.systemPrompts;
    
    switch (type) {
      case 'default':
        return prompts.default;
      case 'contextBuilder':
        return prompts.contextBuilder;
      case 'queryProcessor':
        return prompts.queryProcessor;
      default:
        return prompts.custom?.[type];
    }
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(type: string, prompt: string): void {
    if (!this.config) {
      throw new Error('SDK not configured');
    }

    if (!this.config.systemPrompts) {
      this.config.systemPrompts = {};
    }

    if (!this.config.systemPrompts.custom) {
      this.config.systemPrompts.custom = {};
    }

    this.config.systemPrompts.custom[type] = prompt;
  }

  /**
   * Build context for a specific entity and UID
   */
  async buildFor(entity: string, uid: string): Promise<BuildResult> {
    if (!this.dbPlugin || !this.vectorStorePlugin || !this.embedderPlugin) {
      throw new Error('Plugins not configured');
    }

    try {
      // Build entity graph
      const entityGraph = await this.dbPlugin.buildEntityGraph(entity, uid);
      
      // Generate context chunks
      const contextChunks = this.contextBuilder.buildContextChunks(entityGraph);
      
      if (contextChunks.length === 0) {
        return {
          entity,
          uid,
          chunksCreated: 0,
          namespace: `${entity}:${uid}`,
          success: false,
          error: 'No context chunks generated'
        };
      }

      // Generate embeddings with system prompt
      const texts = contextChunks.map(chunk => chunk.content);
      const systemPrompt = this.getSystemPrompt('contextBuilder');
      const embeddings = await this.embedderPlugin.embed(texts, systemPrompt);
      
      // Create embedded chunks
      const embeddedChunks: EmbeddedChunk[] = contextChunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index]
      }));

      // Store in vector database
      const namespace = `${entity}:${uid}`;
      
      // Delete existing data for this namespace first
      try {
        await this.vectorStorePlugin.delete(namespace);
      } catch {
        // Ignore errors when deleting (might not exist)
      }

      // Store new embedded chunks
      await this.vectorStorePlugin.store(embeddedChunks);

      return {
        entity,
        uid,
        chunksCreated: embeddedChunks.length,
        namespace,
        success: true
      };

    } catch (error) {
      return {
        entity,
        uid,
        chunksCreated: 0,
        namespace: `${entity}:${uid}`,
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Query the vector store for context
   */
  async query(namespace: string, query: string, limit = 5): Promise<QueryResult> {
    if (!this.vectorStorePlugin) {
      throw new Error('Vector store plugin not configured');
    }

    try {
      const chunks = await this.vectorStorePlugin.query(namespace, query, limit);
      
      return {
        chunks,
        totalResults: chunks.length,
        query,
        namespace
      };
    } catch (error) {
      throw new Error(`Failed to query: ${error}`);
    }
  }

  /**
   * Get entity graph without storing it
   */
  async getEntityGraph(entity: string, uid: string): Promise<EntityGraph> {
    if (!this.dbPlugin) {
      throw new Error('Database plugin not configured');
    }

    return await this.dbPlugin.buildEntityGraph(entity, uid);
  }

  /**
   * Generate context chunks without storing them
   */
  async generateContextChunks(entity: string, uid: string): Promise<ContextChunk[]> {
    const entityGraph = await this.getEntityGraph(entity, uid);
    return this.contextBuilder.buildContextChunks(entityGraph);
  }

  /**
   * Check if plugins support time series
   */
  supportsTimeSeries(): boolean {
    return this.dbPlugin?.supportsTimeSeries() ?? false;
  }

  /**
   * Disconnect all plugins
   */
  async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    if (this.dbPlugin) {
      disconnectPromises.push(this.dbPlugin.disconnect());
    }

    if (this.vectorStorePlugin) {
      disconnectPromises.push(this.vectorStorePlugin.disconnect());
    }

    await Promise.all(disconnectPromises);
  }

  /**
   * Test comprehensive system compatibility
   */
  async testCompatibility(): Promise<ComprehensiveCompatibilityResult> {
    const tester = new CompatibilityTester(
      this.dbPlugin || undefined,
      this.vectorStorePlugin || undefined,
      this.embedderPlugin || undefined,
      this.config || undefined
    );
    return await tester.runComprehensiveTest();
  }

  /**
   * Test database compatibility
   */
  async testDatabaseCompatibility(): Promise<CompatibilityTestResult> {
    const tester = new CompatibilityTester(
      this.dbPlugin || undefined,
      undefined,
      undefined,
      this.config || undefined
    );
    return await tester.testDatabaseCompatibility();
  }

  /**
   * Test vector store compatibility
   */
  async testVectorStoreCompatibility(): Promise<CompatibilityTestResult> {
    const tester = new CompatibilityTester(
      undefined,
      this.vectorStorePlugin || undefined,
      undefined,
      this.config || undefined
    );
    return await tester.testVectorStoreCompatibility();
  }

  /**
   * Test embedder compatibility
   */
  async testEmbedderCompatibility(): Promise<CompatibilityTestResult> {
    const tester = new CompatibilityTester(
      undefined,
      undefined,
      this.embedderPlugin || undefined,
      this.config || undefined
    );
    return await tester.testEmbedderCompatibility();
  }

  /**
   * Test dimension compatibility between embedder and vector store
   */
  async testDimensionCompatibility(): Promise<DimensionCompatibilityResult> {
    const tester = new CompatibilityTester(
      undefined,
      this.vectorStorePlugin || undefined,
      this.embedderPlugin || undefined,
      this.config || undefined
    );
    return await tester.testDimensionCompatibility();
  }

  /**
   * Automatically fix dimension mismatches
   */
  async fixDimensions(): Promise<{ success: boolean; message: string }> {
    const tester = new CompatibilityTester(
      undefined,
      this.vectorStorePlugin || undefined,
      this.embedderPlugin || undefined,
      this.config || undefined
    );
    return await tester.fixDimensions();
  }

  /**
   * Get current configuration
   */
  getConfig(): ContragConfig | ContragConfigV13 | null {
    return this.config;
  }

  // ========================================
  // V1.3.0 PREFERENCE TRACKING METHODS
  // ========================================

  /**
   * Extract preferences from conversation text
   */
  async extractPreferences(request: PreferenceExtractionRequest): Promise<PreferenceExtractionResult> {
    if (!this.preferenceExtractor) {
      throw new Error('Preference tracking is not enabled. Enable it in configuration.');
    }

    const result = await this.preferenceExtractor.extractFromConversation(request);

    // Store extracted preferences if profile builder is available
    if (this.profileBuilder && result.extractedPreferences.length > 0) {
      await this.profileBuilder.updateProfileWithPreferences(
        request.userId,
        result.extractedPreferences
      );
    }

    return result;
  }

  /**
   * Get or create user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.profileBuilder) {
      throw new Error('Preference tracking is not enabled. Enable it in configuration.');
    }

    return this.profileBuilder.getOrCreateProfile(userId);
  }

  /**
   * Create new user profile
   */
  async createUserProfile(userId: string, initialPreferences?: UserPreference[]): Promise<UserProfile> {
    if (!this.profileBuilder) {
      throw new Error('Preference tracking is not enabled. Enable it in configuration.');
    }

    return this.profileBuilder.createUserProfile(userId, initialPreferences);
  }

  /**
   * Update user profile with new preferences
   */
  async updateUserProfile(userId: string, newPreferences: UserPreference[]): Promise<UserProfile> {
    if (!this.profileBuilder) {
      throw new Error('Preference tracking is not enabled. Enable it in configuration.');
    }

    return this.profileBuilder.updateProfileWithPreferences(userId, newPreferences);
  }

  /**
   * Get user preferences with optional filters
   */
  async getUserPreferences(userId: string, filters?: Partial<UserPreference>): Promise<UserPreference[]> {
    if (!this.dbPlugin || !('getUserPreferences' in this.dbPlugin)) {
      throw new Error('Database plugin does not support preference storage.');
    }

    return (this.dbPlugin as PreferenceCapableDBPlugin).getUserPreferences!(userId, filters);
  }

  /**
   * Store user preferences directly
   */
  async storeUserPreferences(preferences: UserPreference[]): Promise<void> {
    if (!this.dbPlugin || !('storeUserPreferences' in this.dbPlugin)) {
      throw new Error('Database plugin does not support preference storage.');
    }

    await (this.dbPlugin as PreferenceCapableDBPlugin).storeUserPreferences!(preferences);
  }

  /**
   * Delete all user data for GDPR compliance
   */
  async deleteUserData(userId: string): Promise<void> {
    if (!this.dbPlugin || !('deleteUserData' in this.dbPlugin)) {
      throw new Error('Database plugin does not support user data deletion.');
    }

    await (this.dbPlugin as PreferenceCapableDBPlugin).deleteUserData!(userId);
  }

  /**
   * Generate personalized query using user preferences
   */
  async personalizedQuery(request: PersonalizedQueryRequest): Promise<PersonalizedQueryResult> {
    if (!this.profileBuilder) {
      throw new Error('Preference tracking is not enabled. Enable it in configuration.');
    }

    // Get personalized context
    const personalizedContext = await this.profileBuilder.getPersonalizedContext(
      request.userId,
      request.query
    );

    // Execute the query with enhanced context
    const queryResult = await this.query(
      request.namespace || `${request.userId}:context`,
      personalizedContext.enhancedQuery,
      5
    );

    // Build personalized response
    const personalizedResult: PersonalizedQueryResult = {
      ...queryResult,
      personalization: {
        preferencesApplied: personalizedContext.relevantPreferences,
        profileDataUsed: request.contextOptions?.includeProfile || false,
        personalizationScore: this.calculatePersonalizationScore(
          personalizedContext.relevantPreferences,
          queryResult.chunks
        ),
        reasoning: `Applied ${personalizedContext.relevantPreferences.length} user preferences to enhance query context.`
      }
    };

    return personalizedResult;
  }

  /**
   * Generate preference analytics
   */
  async getPreferenceAnalytics(query: PreferenceAnalyticsQuery): Promise<PreferenceAnalyticsResult> {
    if (!this.analyticsEngine) {
      throw new Error('Preference analytics is not enabled. Enable it in configuration.');
    }

    return this.analyticsEngine.generateAnalytics(query);
  }

  /**
   * Analyze user engagement patterns
   */
  async analyzeUserEngagement(userId?: string): Promise<{
    engagementScore: number;
    activityLevel: 'low' | 'medium' | 'high';
    preferenceEvolution: Array<{
      date: string;
      categories: string[];
      confidence: number;
    }>;
    recommendations: string[];
  }> {
    if (!this.analyticsEngine) {
      throw new Error('Preference analytics is not enabled. Enable it in configuration.');
    }

    return this.analyticsEngine.analyzeUserEngagement(userId);
  }

  /**
   * Generate personalization insights for a user
   */
  async generatePersonalizationInsights(userId: string): Promise<{
    personalizedCategories: Array<{
      category: string;
      strength: number;
      trending: boolean;
    }>;
    behaviorInsights: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
    contentRecommendations: Array<{
      type: string;
      reason: string;
      priority: number;
    }>;
  }> {
    if (!this.analyticsEngine) {
      throw new Error('Preference analytics is not enabled. Enable it in configuration.');
    }

    return this.analyticsEngine.generatePersonalizationInsights(userId);
  }

  /**
   * Analyze preference quality and reliability
   */
  async analyzePreferenceQuality(userId?: string): Promise<{
    overallQuality: number;
    qualityByCategory: Record<string, number>;
    reliabilityScore: number;
    consistencyScore: number;
    recommendations: string[];
  }> {
    if (!this.analyticsEngine) {
      throw new Error('Preference analytics is not enabled. Enable it in configuration.');
    }

    return this.analyticsEngine.analyzePreferenceQuality(userId);
  }

  /**
   * Generate real-time preference insights
   */
  async generateRealTimeInsights(userId: string, timeWindowMinutes: number = 60): Promise<{
    recentActivity: {
      newPreferences: number;
      updatedPreferences: number;
      categoriesActive: string[];
    };
    behaviorChanges: Array<{
      type: string;
      change: 'increased' | 'decreased' | 'new';
      significance: number;
    }>;
    alerts: Array<{
      type: 'trend_change' | 'new_interest' | 'behavior_shift';
      message: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  }> {
    if (!this.analyticsEngine) {
      throw new Error('Preference analytics is not enabled. Enable it in configuration.');
    }

    return this.analyticsEngine.generateRealTimeInsights(userId, timeWindowMinutes);
  }

  /**
   * Check if preference tracking is enabled
   */
  isPreferenceTrackingEnabled(): boolean {
    const v13Config = this.config as ContragConfigV13;
    return v13Config?.preferenceTracking?.enabled || false;
  }

  /**
   * Test preference extractor connection
   */
  async testPreferenceExtractorConnection(): Promise<ConnectionTestResult> {
    if (!this.preferenceExtractor) {
      return {
        plugin: 'Preference Extractor',
        connected: false,
        error: 'Preference tracking not enabled'
      };
    }

    if (this.preferenceExtractor.testConnection) {
      return await this.preferenceExtractor.testConnection();
    }

    return {
      plugin: 'Preference Extractor',
      connected: true,
      details: { method: 'no-test-available' }
    };
  }

  /**
   * Calculate personalization score based on preferences and results
   */
  private calculatePersonalizationScore(preferences: UserPreference[], chunks: ContextChunk[]): number {
    if (preferences.length === 0 || chunks.length === 0) {
      return 0;
    }

    let score = 0;
    const totalPreferences = preferences.length;

    preferences.forEach(pref => {
      const prefValue = String(pref.value).toLowerCase();
      const category = pref.category.toLowerCase();

      const relevantChunks = chunks.filter(chunk => {
        const content = chunk.content.toLowerCase();
        return content.includes(prefValue) || content.includes(category);
      });

      if (relevantChunks.length > 0) {
        score += pref.confidence * (relevantChunks.length / chunks.length);
      }
    });

    return Math.min(score / totalPreferences, 1.0);
  }
}

// Export the main class and types
export * from './types';
export { ContextBuilder } from './context-builder';
export { CompatibilityTester } from './compatibility';

// V1.3.0 exports
export { UserProfileBuilder } from './user-profile-builder';
export { PreferenceAnalyticsEngine } from './analytics-engine';
export { LLMPreferenceExtractor } from './plugins/preference-extractor';

// Export plugins
export { PostgresPlugin } from './plugins/postgres';
export { MongoPlugin } from './plugins/mongodb';
export { OpenAIEmbedderPlugin } from './plugins/openai-embedder';
export { GeminiEmbedderPlugin } from './plugins/gemini-embedder';
export { WeaviatePlugin } from './plugins/weaviate-vector-store';
export { PgVectorPlugin } from './plugins/pgvector-store';
