import { 
  ContragConfig, 
  DBPlugin, 
  VectorStorePlugin, 
  EmbedderPlugin, 
  EntityGraph, 
  QueryResult, 
  BuildResult,
  ContextChunk,
  EmbeddedChunk
} from './types';
import { ContextBuilder } from './context-builder';
import { PostgresPlugin } from './plugins/postgres';
import { MongoPlugin } from './plugins/mongodb';
import { OpenAIEmbedderPlugin } from './plugins/openai-embedder';
import { GeminiEmbedderPlugin } from './plugins/gemini-embedder';
import { WeaviatePlugin } from './plugins/weaviate-vector-store';
import { PgVectorPlugin } from './plugins/pgvector-store';

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
      case 'postgres':
        this.dbPlugin = new PostgresPlugin();
        break;
      case 'mongodb':
        this.dbPlugin = new MongoPlugin();
        break;
      default:
        throw new Error(`Unknown database plugin: ${config.database.plugin}`);
    }

    // Initialize vector store plugin
    switch (config.vectorStore.plugin.toLowerCase()) {
      case 'weaviate':
        this.vectorStorePlugin = new WeaviatePlugin();
        break;
      case 'pgvector':
        this.vectorStorePlugin = new PgVectorPlugin();
        break;
      default:
        throw new Error(`Unknown vector store plugin: ${config.vectorStore.plugin}`);
    }

    // Initialize embedder plugin
    switch (config.embedder.plugin.toLowerCase()) {
      case 'openai':
        this.embedderPlugin = new OpenAIEmbedderPlugin();
        break;
      case 'gemini':
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
      throw new Error('Database plugin not configured');
    }

    return await this.dbPlugin.introspectSchema();
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

      // Generate embeddings
      const texts = contextChunks.map(chunk => chunk.content);
      const embeddings = await this.embedderPlugin.embed(texts);
      
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
