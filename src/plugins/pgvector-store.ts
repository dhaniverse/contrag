import { Pool } from 'pg';
import { VectorStorePlugin, EmbeddedChunk, ContextChunk, ConnectionTestResult, VectorStoreStats, VectorSearchResult } from '../types';
import { DEFAULT_CONFIG, VECTOR_CONSTANTS } from '../constants';

export class PgVectorPlugin implements VectorStorePlugin {
  public readonly name = 'pgvector';
  private pool: Pool | null = null;
  private tableName = 'contrag_embeddings';
  private embeddingDimensions: number | null = null;

  async connect(config: any): Promise<void> {
    this.pool = new Pool(config);
    
    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }

    // Ensure pgvector extension and table exist
    await this.ensureSchema();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async store(chunks: EmbeddedChunk[]): Promise<void> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    // Auto-detect embedding dimensions from first chunk
    if (!this.embeddingDimensions && chunks.length > 0) {
      this.embeddingDimensions = chunks[0].embedding.length;
      console.log(`Auto-detected embedding dimensions: ${this.embeddingDimensions}`);
      
      // Ensure schema is created with correct dimensions
      await this.ensureSchema();
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO ${this.tableName} (
          namespace, content, entity, uid, relations, timestamp, 
          chunk_index, total_chunks, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      for (const chunk of chunks) {
        await client.query(insertQuery, [
          chunk.namespace,
          chunk.content,
          chunk.metadata.entity,
          chunk.metadata.uid,
          JSON.stringify(chunk.metadata.relations),
          chunk.metadata.timestamp,
          chunk.metadata.chunkIndex,
          chunk.metadata.totalChunks,
          `[${chunk.embedding.join(',')}]` // pgvector format
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to store embeddings: ${error}`);
    } finally {
      client.release();
    }
  }

  async query(namespace: string, queryText: string, limit = 5): Promise<ContextChunk[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    // First, we need to embed the query text using the same embedder
    // For now, let's use a simpler approach that works with the stored vectors
    const client = await this.pool.connect();
    
    try {
      // Simple approach: return all chunks from the namespace (for testing)
      // In production, you'd want to embed the queryText and use vector similarity
      const searchQuery = `
        SELECT 
          namespace, content, entity, uid, relations, timestamp, 
          chunk_index, total_chunks
        FROM ${this.tableName}
        WHERE namespace = $1
        ORDER BY chunk_index
        LIMIT $2
      `;

      const result = await client.query(searchQuery, [namespace, limit]);

      return result.rows.map((row: any) => ({
        id: `${row.namespace}:${row.chunk_index}`,
        namespace: row.namespace,
        content: row.content,
        metadata: {
          entity: row.entity,
          uid: row.uid,
          relations: Array.isArray(row.relations) ? row.relations : (row.relations ? JSON.parse(row.relations) : []),
          timestamp: row.timestamp ? new Date(row.timestamp) : undefined,
          chunkIndex: row.chunk_index,
          totalChunks: row.total_chunks,
        },
      }));
    } finally {
      client.release();
    }
  }

  async delete(namespace: string): Promise<void> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query(`DELETE FROM ${this.tableName} WHERE namespace = $1`, [namespace]);
    } finally {
      client.release();
    }
  }

  private async ensureSchema(): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();
    
    try {
      // Create pgvector extension if it doesn't exist
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');

      // Check if table exists and get current dimensions
      const tableInfo = await client.query(`
        SELECT column_name, udt_name, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'embedding'
      `, [this.tableName]);

      const embeddingSize = this.embeddingDimensions || 1536; // Default to OpenAI size

      // If table exists but with wrong dimensions, drop and recreate
      if (tableInfo.rows.length > 0) {
        const existingInfo = tableInfo.rows[0];
        // For vector columns, we need to check differently
        const dimensionCheck = await client.query(`
          SELECT atttypmod 
          FROM pg_attribute 
          WHERE attrelid = $1::regclass AND attname = 'embedding'
        `, [this.tableName]).catch(() => ({ rows: [] }));

        if (dimensionCheck.rows.length > 0) {
          const existingDimensions = dimensionCheck.rows[0].atttypmod;
          if (existingDimensions !== embeddingSize) {
            console.log(`Dropping table ${this.tableName} to recreate with ${embeddingSize} dimensions`);
            await client.query(`DROP TABLE IF EXISTS ${this.tableName}`);
          }
        }
      }

      // Create table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id SERIAL PRIMARY KEY,
          namespace TEXT NOT NULL,
          content TEXT NOT NULL,
          entity TEXT NOT NULL,
          uid TEXT NOT NULL,
          relations JSONB,
          timestamp TIMESTAMPTZ,
          chunk_index INTEGER NOT NULL,
          total_chunks INTEGER NOT NULL,
          embedding VECTOR(${embeddingSize}),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      await client.query(createTableQuery);

      // Create indexes for better performance
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_namespace ON ${this.tableName} (namespace)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_entity_uid ON ${this.tableName} (entity, uid)`);
      
      // Vector similarity index
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding ON ${this.tableName} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`);
      
    } catch (error) {
      throw new Error(`Failed to ensure pgvector schema: ${error}`);
    } finally {
      client.release();
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.pool) {
        throw new Error('PostgreSQL not connected');
      }

      const client = await this.pool.connect();
      
      // Test pgvector extension
      const extensionCheck = await client.query(`
        SELECT * FROM pg_extension WHERE extname = 'vector'
      `);
      
      client.release();
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.name,
        connected: true,
        latency,
        details: {
          pgvectorInstalled: extensionCheck.rows.length > 0,
          tableName: this.tableName,
          dimensions: this.embeddingDimensions
        }
      };
    } catch (error) {
      return {
        plugin: this.name,
        connected: false,
        error: String(error)
      };
    }
  }

  async getStats(): Promise<VectorStoreStats> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const client = await this.pool.connect();
    
    try {
      // Get namespaces
      const namespacesResult = await client.query(`
        SELECT DISTINCT namespace FROM ${this.tableName}
      `);
      
      // Get total vectors
      const countResult = await client.query(`
        SELECT COUNT(*) as total FROM ${this.tableName}
      `);
      
      // Get table size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_total_relation_size('${this.tableName}')) as size
      `);
      
      const namespaces = namespacesResult.rows.map(row => row.namespace);
      const totalVectors = parseInt(countResult.rows[0].total);
      const dimensions = this.embeddingDimensions || VECTOR_CONSTANTS.DEFAULT_DIMENSIONS;
      const storageSize = sizeResult.rows[0].size;
      
      return {
        namespaces,
        totalVectors,
        dimensions,
        storageSize
      };
    } finally {
      client.release();
    }
  }

  async listNamespaces(): Promise<string[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT DISTINCT namespace, COUNT(*) as count 
        FROM ${this.tableName} 
        GROUP BY namespace 
        ORDER BY namespace
      `);
      
      return result.rows.map(row => `${row.namespace} (${row.count} vectors)`);
    } finally {
      client.release();
    }
  }

  async searchSimilar(embedding: number[], namespace?: string, limit: number = DEFAULT_CONFIG.QUERY_LIMIT): Promise<VectorSearchResult[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL not connected');
    }

    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT id, content, entity, uid, relations, timestamp, chunk_index, total_chunks,
               1 - (embedding <=> $1) as similarity_score
        FROM ${this.tableName}
      `;
      
      const params: any[] = [`[${embedding.join(',')}]`];
      
      if (namespace) {
        query += ` WHERE namespace = $2`;
        params.push(namespace);
      }
      
      query += ` ORDER BY embedding <=> $1 LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id.toString(),
        score: parseFloat(row.similarity_score),
        content: row.content,
        metadata: {
          entity: row.entity,
          uid: row.uid,
          relations: row.relations,
          timestamp: row.timestamp,
          chunkIndex: row.chunk_index,
          totalChunks: row.total_chunks
        }
      }));
    } finally {
      client.release();
    }
  }
}
