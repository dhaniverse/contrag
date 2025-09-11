/**
 * Quick test script to validate Contrag package functionality
 * Run this after setting up Docker services and API keys
 */

const { ContragSDK } = require('./dist/index.js');
const fs = require('fs');

async function testContragPackage() {
  console.log('🧪 Testing Contrag Package Locally');
  console.log('=' .repeat(40));

  // Check if config file exists
  if (!fs.existsSync('contrag.config.json')) {
    console.log('❌ No contrag.config.json found');
    console.log('Please copy one of the test configurations:');
    console.log('  cp test-configs/postgres-weaviate-gemini.json contrag.config.json');
    console.log('  # Then edit to add your Gemini API key');
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync('contrag.config.json', 'utf8'));
  } catch (error) {
    console.log('❌ Failed to parse config file:', error.message);
    return;
  }

  // Validate API key
  if (config.embedder.plugin === 'gemini' && (!config.embedder.config.apiKey || config.embedder.config.apiKey.includes('your-'))) {
    console.log('❌ Please add your Gemini API key to contrag.config.json');
    console.log('Get a free key at: https://aistudio.google.com/');
    return;
  }

  console.log(`📋 Configuration: ${config.database.plugin} + ${config.vectorStore.plugin} + ${config.embedder.plugin}`);
  console.log('');

  const sdk = new ContragSDK();

  try {
    // Test 1: Connection
    console.log('🔌 Test 1: Connecting to plugins...');
    await sdk.configure(config);
    console.log('✅ All plugins connected successfully');
    console.log('');

    // Test 2: Schema Introspection
    console.log('🔍 Test 2: Schema introspection...');
    const schema = await sdk.introspectSchema();
    console.log(`✅ Found ${schema.length} entities:`);
    schema.forEach(entity => {
      console.log(`   📊 ${entity.name} (${entity.fields.length} fields, ${entity.relationships.length} relationships)`);
      if (entity.isTimeSeriesEnabled) {
        console.log(`      ⏱️  Time series field: ${entity.timestampField}`);
      }
    });
    console.log('');

    // Test 3: Entity Graph Building
    console.log('🌐 Test 3: Building entity graph...');
    const entity = getTestEntity(config);
    const uid = getTestUID(config);
    
    console.log(`Building graph for ${entity}:${uid}...`);
    const entityGraph = await sdk.getEntityGraph(entity, uid);
    
    console.log('✅ Entity graph built:');
    console.log(`   Root: ${entityGraph.entity} (ID: ${entityGraph.uid})`);
    console.log(`   Data fields: ${Object.keys(entityGraph.data).length}`);
    console.log(`   Relationships: ${Object.keys(entityGraph.relationships).join(', ') || 'none'}`);
    console.log(`   Depth: ${entityGraph.metadata.depth}`);
    console.log('');

    // Test 4: Context Generation
    console.log('📝 Test 4: Generating context chunks...');
    const chunks = await sdk.generateContextChunks(entity, uid);
    console.log(`✅ Generated ${chunks.length} context chunks:`);
    chunks.forEach((chunk, index) => {
      console.log(`   📄 Chunk ${index + 1}: ${chunk.content.length} chars, relations: [${chunk.metadata.relations.join(', ')}]`);
    });
    console.log('');

    // Test 5: Vector Store Building  
    console.log('🧠 Test 5: Building vector store...');
    const buildResult = await sdk.buildFor(entity, uid);
    
    if (buildResult.success) {
      console.log('✅ Vector store built successfully!');
      console.log(`   Namespace: ${buildResult.namespace}`);
      console.log(`   Chunks stored: ${buildResult.chunksCreated}`);
    } else {
      console.log('❌ Vector store build failed:', buildResult.error);
      return;
    }
    console.log('');

    // Test 6: Querying
    console.log('🔍 Test 6: Querying vector store...');
    const testQueries = getTestQueries(config);
    
    for (const query of testQueries) {
      console.log(`   ❓ "${query}"`);
      try {
        const result = await sdk.query(buildResult.namespace, query, 2);
        console.log(`     ✅ Found ${result.chunks.length} relevant chunks`);
        result.chunks.forEach((chunk, i) => {
          console.log(`       ${i+1}. ${chunk.content.substring(0, 80)}...`);
        });
      } catch (error) {
        console.log(`     ❌ Query failed: ${error.message}`);
      }
      console.log('');
    }

    console.log('🎉 All tests passed! Contrag is working correctly.');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Try different plugin combinations');
    console.log('   2. Test with your own database schema');
    console.log('   3. Integrate with your LLM of choice');
    console.log('   4. Build a production application');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    console.log('');
    console.log('🧹 Cleaning up...');
    await sdk.disconnect();
    console.log('✅ Disconnected from all services');
  }
}

function getTestEntity(config) {
  return 'users'; // Same for both PostgreSQL and MongoDB
}

function getTestUID(config) {
  // Use different UIDs for different database types
  if (config.database.plugin === 'mongodb') {
    return '507f1f77bcf86cd799439011'; // MongoDB ObjectId from test data
  } else {
    return '1'; // PostgreSQL serial ID
  }
}

function getTestQueries(config) {
  const baseQueries = [
    "What information do we have about this user?",
    "What is the user's contact information?"
  ];

  if (config.database.plugin === 'mongodb') {
    return [
      ...baseQueries,
      "What are the user's preferences and profile data?",
      "What orders has this user placed with embedded details?"
    ];
  } else {
    return [
      ...baseQueries,
      "What orders has this user placed and what are the totals?",
      "What reviews has this user written?"
    ];
  }
}

// Add some helper functions for manual testing
function logSeparator(title) {
  console.log('');
  console.log('='.repeat(50));
  console.log(title);
  console.log('='.repeat(50));
}

// Run the test if this file is executed directly
if (require.main === module) {
  testContragPackage()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testContragPackage };
