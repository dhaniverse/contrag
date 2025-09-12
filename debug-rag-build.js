const { ContragSDK } = require('./dist/index.js');
const fs = require('fs');

async function testRAGBuildProcess() {
    console.log('🔧 DEBUGGING RAG BUILD PROCESS');
    console.log('════════════════════════════════════════');
    
    const config = JSON.parse(fs.readFileSync('contrag.config.json', 'utf8'));
    const sdk = new ContragSDK();
    
    try {
        await sdk.configure(config);
        console.log('✅ Connected to all services');
        
        const userId = '64a1b2c3d4e5f6789abcdef1';
        console.log(`\n🎯 Building namespace for AlexInvestor: ${userId}`);
        
        // First, let's see what the schema looks like
        const schema = await sdk.introspectSchema();
        console.log(`\n📊 Available entities in schema: ${schema.length}`);
        
        const gameCollections = ['users', 'playerStates', 'bankAccounts', 'stockPortfolios', 'achievements', 'stockTransactions', 'gameSessions'];
        console.log('\n🎮 Game-related entities:');
        schema.forEach(entity => {
            const isGame = gameCollections.includes(entity.name);
            console.log(`   ${isGame ? '🎯' : '⚪'} ${entity.name} (${entity.fields?.length || 0} fields)`);
        });
        
        // Check the entity graph for this user
        console.log(`\n🕸️  ENTITY GRAPH FOR USER: ${userId}`);
        const entityGraph = await sdk.getEntityGraph('users', userId);
        console.log(`   Graph depth: ${entityGraph.depth || 'unknown'}`);
        console.log(`   Related entities: ${entityGraph.relatedEntities?.length || 0}`);
        if (entityGraph.relatedEntities) {
            entityGraph.relatedEntities.forEach(entity => {
                console.log(`   📎 ${entity.entity}: ${entity.count} records`);
            });
        }
        
        // Check what chunks are generated
        console.log(`\n📝 GENERATING CONTEXT CHUNKS:`);
        const chunks = await sdk.generateContextChunks('users', userId);
        console.log(`   Generated chunks: ${chunks.length || 'unknown'}`);
        chunks?.slice(0, 3).forEach((chunk, i) => {
            console.log(`   📄 Chunk ${i + 1}: ${chunk.content?.length || 0} chars - ${chunk.metadata?.entity || 'unknown entity'}`);
        });
        
        // Now let's see what gets built when we build for this user
        console.log(`\n🏗️  BUILDING USER NAMESPACE: users:${userId}`);
        const buildResult = await sdk.buildFor('users', userId);
        
        console.log(`\n📈 BUILD RESULTS:`);
        console.log(`   Namespace: ${buildResult.namespace}`);
        console.log(`   Chunks built: ${buildResult.chunks || 'unknown'}`);
        console.log(`   Processing time: ${buildResult.processingTime || 'unknown'}`);
        
        // Let's query what was actually stored
        console.log(`\n🔍 QUERYING BUILT CONTENT:`);
        
        const queries = [
            "bank account balance transactions",
            "stock portfolio holdings investments",
            "achievements unlocked earned",
            "trading transactions buy sell history",
            "financial wealth money level"
        ];
        
        for (const query of queries) {
            console.log(`\n❓ Query: "${query}"`);
            const result = await sdk.query(buildResult.namespace, query, 3);
            
            if (result.chunks.length > 0) {
                console.log(`   ✅ Found ${result.chunks.length} chunks:`);
                result.chunks.forEach((chunk, i) => {
                    console.log(`   📄 Chunk ${i + 1}: ${chunk.metadata.entity} | ${chunk.content.length} chars`);
                    // Check if it contains specific financial data
                    const hasPortfolio = chunk.content.includes('portfolio') || chunk.content.includes('stock') || chunk.content.includes('holding');
                    const hasTransactions = chunk.content.includes('transaction') || chunk.content.includes('buy') || chunk.content.includes('sell');
                    const hasAchievements = chunk.content.includes('achievement') || chunk.content.includes('Millionaire');
                    const hasBankAccount = chunk.content.includes('bank') || chunk.content.includes('balance') || chunk.content.includes('75000');
                    
                    console.log(`      📊 Contains: ${hasPortfolio ? '📈Portfolio ' : ''}${hasTransactions ? '💹Transactions ' : ''}${hasAchievements ? '🏆Achievements ' : ''}${hasBankAccount ? '🏦BankAccount ' : ''}${!hasPortfolio && !hasTransactions && !hasAchievements && !hasBankAccount ? '⚠️ Only basic user data' : ''}`);
                });
            } else {
                console.log('   ❌ No chunks found');
            }
        }
        
        console.log('\n📋 DIAGNOSIS:');
        console.log('═'.repeat(50));
        console.log('If the chunks above only contain basic user data and not:');
        console.log('- Bank account details (₹75,000 balance, 5 transactions)');
        console.log('- Stock portfolio (₹146,931.25 value, 4 holdings)');
        console.log('- Achievements (Millionaire, Diversified Portfolio)');
        console.log('- Trading history (4 stock transactions)');
        console.log('');
        console.log('Then the issue is in the build process - related entities');
        console.log('are not being properly joined/included in the user namespace.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testRAGBuildProcess();
