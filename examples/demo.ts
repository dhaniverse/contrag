import { ContragSDK, ContragConfig } from '../src/index';
import * as dotenv from 'dotenv';

dotenv.config();

async function demonstrateContrag() {
  console.log('🚀 Contrag Demo: E-commerce Customer Context Builder');
  console.log('='.repeat(60));
  
  // Configuration - can be loaded from file or environment
  const config: ContragConfig = {
    database: {
      plugin: 'postgres',
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'ecommerce',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
      }
    },
    vectorStore: {
      plugin: 'pgvector', // Using pgvector for this demo
      config: {
        host: process.env.VECTOR_DB_HOST || 'localhost',
        port: parseInt(process.env.VECTOR_DB_PORT || '5432'),
        database: process.env.VECTOR_DB_NAME || 'ecommerce_vectors',
        user: process.env.VECTOR_DB_USER || 'postgres',
        password: process.env.VECTOR_DB_PASSWORD || 'password'
      }
    },
    embedder: {
      plugin: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'text-embedding-ada-002'
      }
    },
    contextBuilder: {
      chunkSize: 1500,
      overlap: 300
    }
  };

  console.log('📋 Configuration loaded');
  console.log(`   Database: ${config.database.plugin}`);
  console.log(`   Vector Store: ${config.vectorStore.plugin}`);
  console.log(`   Embedder: ${config.embedder.plugin}`);
  console.log('');

  const sdk = new ContragSDK();
  
  try {
    // Initialize the SDK
    console.log('🔌 Connecting to plugins...');
    await sdk.configure(config);
    console.log('✅ All plugins connected successfully');
    console.log('');

    // Step 1: Introspect the schema
    console.log('🔍 Step 1: Database Schema Introspection');
    console.log('-'.repeat(40));
    const schema = await sdk.introspectSchema();
    
    console.log(`Found ${schema.length} entities:`);
    for (const entity of schema) {
      console.log(`  📊 ${entity.name}`);
      console.log(`     Fields: ${entity.fields.length}`);
      console.log(`     Relationships: ${entity.relationships.length}`);
      if (entity.isTimeSeriesEnabled) {
        console.log(`     ⏱️  Time Series: ${entity.timestampField}`);
      }
    }
    console.log('');

    // Step 2: Build entity graph for a specific customer
    const customerId = '12345';
    console.log(`🌐 Step 2: Building Entity Graph for Customer ${customerId}`);
    console.log('-'.repeat(40));
    
    const entityGraph = await sdk.getEntityGraph('customers', customerId);
    console.log('Entity Graph Structure:');
    console.log(`  Root: ${entityGraph.entity} (${entityGraph.uid})`);
    console.log(`  Relationships: ${Object.keys(entityGraph.relationships).join(', ')}`);
    console.log(`  Depth: ${entityGraph.metadata.depth}`);
    console.log('');

    // Step 3: Generate context chunks
    console.log('📝 Step 3: Generating Context Chunks');
    console.log('-'.repeat(40));
    
    const chunks = await sdk.generateContextChunks('customers', customerId);
    console.log(`Generated ${chunks.length} context chunks:`);
    
    for (let i = 0; i < Math.min(3, chunks.length); i++) {
      const chunk = chunks[i];
      console.log(`  📄 Chunk ${i + 1}:`);
      console.log(`     Content preview: ${chunk.content.substring(0, 100)}...`);
      console.log(`     Relations: ${chunk.metadata.relations.join(', ')}`);
    }
    console.log('');

    // Step 4: Build and store embeddings
    console.log('🧠 Step 4: Building Vector Store');
    console.log('-'.repeat(40));
    
    const buildResult = await sdk.buildFor('customers', customerId);
    
    if (buildResult.success) {
      console.log('✅ Vector store built successfully!');
      console.log(`   Namespace: ${buildResult.namespace}`);
      console.log(`   Chunks stored: ${buildResult.chunksCreated}`);
    } else {
      console.log('❌ Failed to build vector store');
      console.log(`   Error: ${buildResult.error}`);
      return;
    }
    console.log('');

    // Step 5: Query the vector store
    console.log('🔍 Step 5: Querying Vector Store');
    console.log('-'.repeat(40));
    
    const queries = [
      "What products has this customer ordered?",
      "What is the customer's contact information?",
      "What are the customer's recent transactions?",
      "What is the customer's order history?"
    ];

    for (const query of queries.slice(0, 2)) { // Just show first 2 queries
      console.log(`❓ Query: "${query}"`);
      
      try {
        const queryResult = await sdk.query(buildResult.namespace, query, 3);
        
        console.log(`   Found ${queryResult.totalResults} relevant chunks:`);
        for (const [index, chunk] of queryResult.chunks.entries()) {
          console.log(`   ${index + 1}. ${chunk.content.substring(0, 80)}...`);
        }
      } catch (error) {
        console.log(`   ⚠️  Query failed (likely due to mock data): ${error}`);
      }
      console.log('');
    }

    // Step 6: Demonstrate time series support
    if (sdk.supportsTimeSeries()) {
      console.log('⏱️  Step 6: Time Series Support');
      console.log('-'.repeat(40));
      console.log('✅ Time series data is supported');
      console.log('   The system can handle temporal queries and time-based relationships');
      console.log('');
    }

    console.log('🎉 Demo completed successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Integrate with your LLM of choice');
    console.log('   2. Use retrieved context for personalized responses');
    console.log('   3. Scale to multiple entities and UIDs');
    console.log('   4. Implement real-time context updates');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Clean up
    console.log('');
    console.log('🧹 Cleaning up connections...');
    await sdk.disconnect();
    console.log('✅ All connections closed');
  }
}

// Example of how to use Contrag in a real application
async function realWorldExample() {
  console.log('');
  console.log('🌟 Real-World Integration Example');
  console.log('='.repeat(60));
  
  const ctx = new ContragSDK();
  // ... configure ctx ...
  
  // Simulate a chatbot interaction
  const userId = 'user_12345';
  const userQuery = "What orders did I place last month?";
  
  try {
    // Build context if not already built
    const buildResult = await ctx.buildFor('users', userId);
    
    if (buildResult.success) {
      // Query for relevant context
      const contextResult = await ctx.query(`users:${userId}`, userQuery, 5);
      
      // Format context for LLM
      const contextText = contextResult.chunks
        .map(chunk => chunk.content)
        .join('\n---\n');
      
      console.log('📝 Context for LLM:');
      console.log(contextText.substring(0, 500) + '...');
      
      // Here you would send to your LLM:
      // const llmResponse = await openai.chat.completions.create({
      //   model: "gpt-4",
      //   messages: [
      //     {
      //       role: "system", 
      //       content: `You are a helpful assistant. Use this context about the user: ${contextText}`
      //     },
      //     { role: "user", content: userQuery }
      //   ]
      // });
      
      console.log('🤖 LLM would receive this context and generate a personalized response');
    }
    
  } catch (error) {
    console.error('Integration example failed:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateContrag()
    .then(() => realWorldExample())
    .catch(console.error);
}

export { demonstrateContrag, realWorldExample };
