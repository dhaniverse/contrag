/**
 * Simple example showing how to use Contrag SDK
 * This example uses mock data for demonstration
 */

import { ContragSDK, ContragConfig, EntitySchema, EntityGraph } from '../src/index';

// Mock database plugin for demo purposes
class MockDBPlugin {
  name = 'mock';

  async connect(): Promise<void> {
    console.log('✅ Connected to mock database');
  }

  async disconnect(): Promise<void> {
    console.log('✅ Disconnected from mock database');
  }

  async introspectSchema(): Promise<EntitySchema[]> {
    return [
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
          { name: 'name', type: 'varchar', nullable: false },
          { name: 'email', type: 'varchar', nullable: false },
          { name: 'created_at', type: 'timestamp', nullable: false }
        ],
        relationships: [
          {
            type: 'one-to-many',
            targetEntity: 'orders',
            foreignKey: 'user_id',
            referencedKey: 'id'
          }
        ],
        isTimeSeriesEnabled: true,
        timestampField: 'created_at'
      },
      {
        name: 'orders',
        fields: [
          { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
          { name: 'user_id', type: 'integer', nullable: false, isForeignKey: true, referencedTable: 'users', referencedColumn: 'id' },
          { name: 'total', type: 'decimal', nullable: false },
          { name: 'status', type: 'varchar', nullable: false },
          { name: 'created_at', type: 'timestamp', nullable: false }
        ],
        relationships: [
          {
            type: 'many-to-one',
            targetEntity: 'users',
            foreignKey: 'user_id',
            referencedKey: 'id'
          }
        ]
      }
    ];
  }

  async buildEntityGraph(entity: string, uid: string): Promise<EntityGraph> {
    if (entity === 'users' && uid === '1') {
      return {
        entity: 'users',
        uid: '1',
        data: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          created_at: new Date('2024-01-01')
        },
        relationships: {
          orders: [
            {
              entity: 'orders',
              uid: '101',
              data: {
                id: 101,
                user_id: 1,
                total: 99.99,
                status: 'completed',
                created_at: new Date('2024-01-15')
              },
              relationships: {},
              metadata: { depth: 1, source: 'relational' as const }
            },
            {
              entity: 'orders',
              uid: '102',
              data: {
                id: 102,
                user_id: 1,
                total: 149.50,
                status: 'shipped',
                created_at: new Date('2024-01-20')
              },
              relationships: {},
              metadata: { depth: 1, source: 'relational' as const }
            }
          ]
        },
        metadata: { depth: 0, source: 'relational' as const, timestamp: new Date('2024-01-01') }
      };
    }
    
    throw new Error(`Mock data not available for ${entity}:${uid}`);
  }

  supportsTimeSeries(): boolean {
    return true;
  }
}

// Mock embedder plugin
class MockEmbedderPlugin {
  name = 'mock';

  async configure(config: any): Promise<void> {
    console.log('✅ Configured mock embedder');
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Return mock embeddings (normally these would be from OpenAI)
    return texts.map(() => Array(1536).fill(0).map(() => Math.random()));
  }

  getDimensions(): number {
    return 1536;
  }
}

// Mock vector store plugin
class MockVectorStorePlugin {
  name = 'mock';
  private storage: Map<string, any[]> = new Map();

  async connect(config: any): Promise<void> {
    console.log('✅ Connected to mock vector store');
  }

  async disconnect(): Promise<void> {
    console.log('✅ Disconnected from mock vector store');
  }

  async store(chunks: any[]): Promise<void> {
    const namespace = chunks[0]?.namespace;
    if (namespace) {
      this.storage.set(namespace, chunks);
      console.log(`✅ Stored ${chunks.length} chunks in namespace: ${namespace}`);
    }
  }

  async query(namespace: string, query: string, limit = 5): Promise<any[]> {
    const chunks = this.storage.get(namespace) || [];
    // Simple mock search - return first few chunks
    return chunks.slice(0, limit).map(chunk => ({
      id: chunk.id,
      namespace: chunk.namespace,
      content: chunk.content,
      metadata: chunk.metadata
    }));
  }

  async delete(namespace: string): Promise<void> {
    this.storage.delete(namespace);
    console.log(`✅ Deleted namespace: ${namespace}`);
  }
}

async function runSimpleExample() {
  console.log('🚀 Contrag Simple Example');
  console.log('=' .repeat(40));
  console.log('This example uses mock data to demonstrate Contrag functionality');
  console.log('without requiring actual database connections.');
  console.log('');

  // Create SDK instance
  const sdk = new ContragSDK();

  try {
    // Note: In a real application, you would use actual plugins
    // For this demo, we'll directly access the SDK's private methods
    console.log('📋 Step 1: Schema Introspection');
    console.log('-'.repeat(30));
    
    // Simulate schema introspection
    const mockSchema = await new MockDBPlugin().introspectSchema();
    console.log('Found entities:');
    mockSchema.forEach(entity => {
      console.log(`  📊 ${entity.name} (${entity.fields.length} fields, ${entity.relationships.length} relationships)`);
      if (entity.isTimeSeriesEnabled) {
        console.log(`      ⏱️  Time series field: ${entity.timestampField}`);
      }
    });
    console.log('');

    console.log('🌐 Step 2: Entity Graph Building');
    console.log('-'.repeat(30));
    
    // Simulate building entity graph
    const mockDB = new MockDBPlugin();
    const entityGraph = await mockDB.buildEntityGraph('users', '1');
    
    console.log('Built entity graph:');
    console.log(`  Root: ${entityGraph.entity} (ID: ${entityGraph.uid})`);
    console.log(`  Data: ${entityGraph.data.name} (${entityGraph.data.email})`);
    console.log(`  Related orders: ${entityGraph.relationships.orders?.length || 0}`);
    console.log('');

    console.log('📝 Step 3: Context Generation');  
    console.log('-'.repeat(30));
    
    // Use the actual context builder
    const { ContextBuilder } = await import('../src/context-builder');
    const contextBuilder = new ContextBuilder({ chunkSize: 800, overlap: 100 });
    
    const chunks = contextBuilder.buildContextChunks(entityGraph);
    console.log(`Generated ${chunks.length} context chunks:`);
    
    chunks.forEach((chunk, index) => {
      console.log(`  📄 Chunk ${index + 1}:`);
      console.log(`     Length: ${chunk.content.length} characters`);
      console.log(`     Preview: ${chunk.content.substring(0, 100)}...`);
      console.log(`     Relations: ${chunk.metadata.relations.join(', ')}`);
    });
    console.log('');

    console.log('🧠 Step 4: Embedding Generation');
    console.log('-'.repeat(30));
    
    const embedder = new MockEmbedderPlugin();
    await embedder.configure({});
    
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await embedder.embed(texts);
    
    console.log(`Generated embeddings for ${embeddings.length} chunks`);
    console.log(`Embedding dimensions: ${embedder.getDimensions()}`);
    console.log('');

    console.log('💾 Step 5: Vector Storage');
    console.log('-'.repeat(30));
    
    const vectorStore = new MockVectorStorePlugin();
    await vectorStore.connect({});
    
    const embeddedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index]
    }));
    
    await vectorStore.store(embeddedChunks);
    console.log('');

    console.log('🔍 Step 6: Querying');
    console.log('-'.repeat(30));
    
    const queries = [
      "What orders has this user placed?",
      "What is the user's email address?",
      "What is the total amount of orders?"
    ];

    for (const query of queries) {
      console.log(`❓ Query: "${query}"`);
      const results = await vectorStore.query('users:1', query, 2);
      console.log(`   Found ${results.length} relevant chunks:`);
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.content.substring(0, 80)}...`);
      });
      console.log('');
    }

    console.log('🎉 Example completed successfully!');
    console.log('');
    console.log('💡 In a real application:');
    console.log('   1. Replace mock plugins with actual database connections');
    console.log('   2. Use real OpenAI embeddings');
    console.log('   3. Store vectors in Weaviate or pgvector');
    console.log('   4. Pass retrieved context to your LLM');

    await vectorStore.disconnect();

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runSimpleExample().catch(console.error);
}

export { runSimpleExample };
