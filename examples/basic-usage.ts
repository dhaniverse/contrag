import { ContragSDK, ContragConfig } from 'contrag';

async function main() {
  // Configuration
  const config: ContragConfig = {
    database: {
      plugin: 'postgres',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        user: 'postgres',
        password: 'password'
      }
    },
    vectorStore: {
      plugin: 'weaviate',
      config: {
        url: 'http://localhost:8080'
      }
    },
    embedder: {
      plugin: 'openai',
      config: {
        apiKey: process.env.OPENAI_API_KEY!
      }
    }
  };

  // Initialize SDK
  const ctx = new ContragSDK();
  await ctx.configure(config);

  try {
    // Introspect schema
    console.log('Introspecting schema...');
    const schema = await ctx.introspectSchema();
    console.log('Found entities:', schema.map((s: any) => s.name));

    // Build context for a specific user
    console.log('Building context for User 123...');
    const buildResult = await ctx.buildFor('User', '123');
    
    if (buildResult.success) {
      console.log(`✓ Created ${buildResult.chunksCreated} chunks for ${buildResult.namespace}`);
      
      // Query the context
      console.log('Querying context...');
      const queryResult = await ctx.query('User:123', 'What orders did I place?');
      
      console.log(`Found ${queryResult.totalResults} relevant chunks:`);
      for (const chunk of queryResult.chunks) {
        console.log(`- ${chunk.content.substring(0, 100)}...`);
      }
    } else {
      console.error('Failed to build context:', buildResult.error);
    }

  } finally {
    await ctx.disconnect();
  }
}

main().catch(console.error);
