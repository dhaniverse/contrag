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
  VectorSearchResult
} from './types';
import { ContextBuilder } from './context-builder';
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
  private config: ContragConfig | null = null;

  constructor(config?: ContragConfig) {
    this.contextBuilder = new ContextBuilder(config?.contextBuilder);
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the SDK with plugins
   */
  async configure(config: ContragConfig): Promise<void> {
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
   * Get current configuration
   */
  getConfig(): ContragConfig | null {
    return this.config;
  }
}

// Export the main class and types
export * from './types';
export { ContextBuilder } from './context-builder';

// Export plugins
export { PostgresPlugin } from './plugins/postgres';
export { MongoPlugin } from './plugins/mongodb';
export { OpenAIEmbedderPlugin } from './plugins/openai-embedder';
export { GeminiEmbedderPlugin } from './plugins/gemini-embedder';
export { WeaviatePlugin } from './plugins/weaviate-vector-store';
export { PgVectorPlugin } from './plugins/pgvector-store';
