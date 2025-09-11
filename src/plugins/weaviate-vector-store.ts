import { VectorStorePlugin, EmbeddedChunk, ContextChunk } from '../types';

export class WeaviatePlugin implements VectorStorePlugin {
  public readonly name = 'weaviate';
  private client: any = null;
  private className = 'ContragChunk';

  async connect(config: { url: string; apiKey?: string }): Promise<void> {
    const weaviate = await import('weaviate-ts-client');
    
    const client = weaviate.default || weaviate;
    this.client = client.client({
      scheme: config.url.startsWith('https://') ? 'https' : 'http',
      host: config.url.replace(/^https?:\/\//, ''),
      apiKey: config.apiKey ? new client.ApiKey(config.apiKey) : undefined,
    });

    // Test connection
    try {
      await this.client.meta.getter().do();
    } catch (error) {
      throw new Error(`Failed to connect to Weaviate: ${error}`);
    }

    // Create schema if it doesn't exist
    await this.ensureSchema();
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async store(chunks: EmbeddedChunk[]): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate not connected');
    }

    const objects = chunks.map(chunk => ({
      class: this.className,
      properties: {
        content: chunk.content,
        namespace: chunk.namespace,
        entity: chunk.metadata.entity,
        uid: chunk.metadata.uid,
        relations: chunk.metadata.relations,
        timestamp: chunk.metadata.timestamp?.toISOString(),
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
      },
      vector: chunk.embedding,
    }));

    // Batch insert
    const batcher = this.client.batch.objectsBatcher();
    objects.forEach((obj: any) => batcher.withObject(obj));
    
    await batcher.do();
  }

  async query(namespace: string, queryText: string, limit = 5): Promise<ContextChunk[]> {
    if (!this.client) {
      throw new Error('Weaviate not connected');
    }

    try {
      const response = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('content namespace entity uid relations timestamp chunkIndex totalChunks')
        .withWhere({
          path: ['namespace'],
          operator: 'Equal',
          valueText: namespace,
        })
        .withNearText({ concepts: [queryText] })
        .withLimit(limit)
        .do();

      const results = response.data?.Get?.[this.className] || [];
      
      return results.map((result: any) => ({
        id: `${result.namespace}:${result.chunkIndex}`,
        namespace: result.namespace,
        content: result.content,
        metadata: {
          entity: result.entity,
          uid: result.uid,
          relations: result.relations || [],
          timestamp: result.timestamp ? new Date(result.timestamp) : undefined,
          chunkIndex: result.chunkIndex,
          totalChunks: result.totalChunks,
        },
      }));
    } catch (error) {
      throw new Error(`Failed to query Weaviate: ${error}`);
    }
  }

  async delete(namespace: string): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate not connected');
    }

    try {
      await this.client.batch
        .deleteObjects()
        .withClassName(this.className)
        .withWhere({
          path: ['namespace'],
          operator: 'Equal',
          valueText: namespace,
        })
        .do();
    } catch (error) {
      throw new Error(`Failed to delete from Weaviate: ${error}`);
    }
  }

  private async ensureSchema(): Promise<void> {
    try {
      // Check if class exists
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some((cls: any) => cls.class === this.className);
      
      if (!classExists) {
        const classSchema = {
          class: this.className,
          description: 'Contrag entity context chunks',
          properties: [
            {
              name: 'content',
              dataType: ['text'],
              description: 'The chunk content',
            },
            {
              name: 'namespace',
              dataType: ['string'],
              description: 'The namespace (entity:uid)',
            },
            {
              name: 'entity',
              dataType: ['string'],
              description: 'The entity type',
            },
            {
              name: 'uid',
              dataType: ['string'],
              description: 'The entity UID',
            },
            {
              name: 'relations',
              dataType: ['string[]'],
              description: 'Related entities',
            },
            {
              name: 'timestamp',
              dataType: ['date'],
              description: 'Timestamp of the data',
            },
            {
              name: 'chunkIndex',
              dataType: ['int'],
              description: 'Index of this chunk',
            },
            {
              name: 'totalChunks',
              dataType: ['int'],
              description: 'Total number of chunks',
            },
          ],
        };

        await this.client.schema.classCreator().withClass(classSchema).do();
      }
    } catch (error) {
      throw new Error(`Failed to ensure Weaviate schema: ${error}`);
    }
  }
}
