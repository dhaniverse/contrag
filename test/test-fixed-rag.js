const { ContragSDK } = require('./dist/index.js');
const fs = require('fs');

async function testFixedRAGWithAllData() {
    console.log('🔧 TESTING RAG WITH COMPREHENSIVE USER DATA');
    console.log('════════════════════════════════════════════════');
    
    const config = JSON.parse(fs.readFileSync('contrag.config.json', 'utf8'));
    const sdk = new ContragSDK();
    
    try {
        await sdk.configure(config);
        console.log('✅ Connected to all services');
        
        const userId = '64a1b2c3d4e5f6789abcdef1';
        const userIdObj = userId; // Keep as string for lookups
        
        console.log(`\n🏗️  BUILDING COMPREHENSIVE NAMESPACE FOR: ${userId}`);
        
        // Method 1: Try building from different entities that should have relationships
        console.log('\n📊 Method 1: Building from different starting entities');
        
        const entityTypes = ['users', 'bankAccounts', 'stockPortfolios', 'achievements', 'stockTransactions'];
        
        for (const entityType of entityTypes) {
            console.log(`\n   🔍 Building from ${entityType}...`);
            try {
                let buildResult;
                if (entityType === 'users') {
                    buildResult = await sdk.buildFor('users', userId);
                } else {
                    // For other entities, we need to find documents that match this user
                    // This might work if the relationship detection finds them
                    buildResult = await sdk.buildFor(entityType, userId);
                }
                
                console.log(`   ✅ Built namespace: ${buildResult.namespace}`);
                
                // Query this namespace
                const testResult = await sdk.query(buildResult.namespace, "What financial data is available?", 2);
                console.log(`   📄 Found ${testResult.chunks.length} chunks`);
                
                if (testResult.chunks.length > 0) {
                    console.log(`   📊 Sample content (first 200 chars): ${testResult.chunks[0].content.substring(0, 200)}...`);
                }
                
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }
        
        // Method 2: Let's try building multiple namespaces and combining results
        console.log('\n📊 Method 2: Building dedicated namespaces per entity type');
        
        const userBuild = await sdk.buildFor('users', userId);
        console.log(`   ✅ User namespace: ${userBuild.namespace}`);
        
        // Test comprehensive query combining multiple aspects
        const comprehensiveQuery = "Tell me about this player's complete financial profile including bank accounts, stock portfolio, achievements, and trading history";
        
        console.log(`\n❓ COMPREHENSIVE QUERY TEST:`);
        console.log(`Query: "${comprehensiveQuery}"`);
        
        const comprehensiveResult = await sdk.query(userBuild.namespace, comprehensiveQuery, 5);
        console.log(`✅ Retrieved ${comprehensiveResult.chunks.length} chunks`);
        
        comprehensiveResult.chunks.forEach((chunk, i) => {
            console.log(`\n📄 Chunk ${i + 1}:`);
            console.log(`   Entity: ${chunk.metadata.entity}`);
            console.log(`   UID: ${chunk.metadata.uid}`);
            console.log(`   Length: ${chunk.content.length} chars`);
            
            // Check what specific data is present
            const content = chunk.content.toLowerCase();
            const dataTypes = [];
            if (content.includes('bank') || content.includes('75000') || content.includes('balance')) dataTypes.push('🏦 Bank Account');
            if (content.includes('stock') || content.includes('portfolio') || content.includes('146931')) dataTypes.push('📈 Stock Portfolio');  
            if (content.includes('achievement') || content.includes('millionaire')) dataTypes.push('🏆 Achievement');
            if (content.includes('transaction') || content.includes('buy') || content.includes('sell')) dataTypes.push('💹 Transaction');
            if (content.includes('level') || content.includes('experience') || content.includes('4200')) dataTypes.push('👤 User Profile');
            
            console.log(`   Contains: ${dataTypes.join(', ') || '⚠️ Unknown data type'}`);
            
            // Show a meaningful snippet
            if (chunk.content.length > 100) {
                console.log(`   Preview: ${chunk.content.substring(0, 300)}...`);
            }
        });
        
        // Method 3: Let's manually inspect what's in the chunks
        console.log('\n📊 Method 3: Deep content analysis');
        
        if (comprehensiveResult.chunks.length > 0) {
            const mainChunk = comprehensiveResult.chunks[0];
            console.log('\n🔍 DETAILED CHUNK ANALYSIS:');
            console.log('═'.repeat(60));
            console.log('Full chunk content:');
            console.log(mainChunk.content);
            console.log('═'.repeat(60));
        }
        
        console.log('\n📋 FINAL DIAGNOSIS:');
        console.log('═'.repeat(60));
        
        if (comprehensiveResult.chunks.length === 1 && comprehensiveResult.chunks[0].content.includes('buffer')) {
            console.log('❌ CONFIRMED ISSUE: Only basic user document with binary ObjectId data');
            console.log('✅ SOLUTION NEEDED: Custom build process to include related entities');
            console.log('');
            console.log('The build process needs to:');
            console.log('1. Query bankAccounts where userId = "64a1b2c3d4e5f6789abcdef1"');
            console.log('2. Query stockPortfolios where userId = "64a1b2c3d4e5f6789abcdef1"');
            console.log('3. Query achievements where userId = "64a1b2c3d4e5f6789abcdef1"');
            console.log('4. Query stockTransactions where userId = "64a1b2c3d4e5f6789abcdef1"');
            console.log('5. Combine all this data into comprehensive chunks for the user namespace');
        } else {
            console.log('✅ Related data is being included in chunks');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testFixedRAGWithAllData();
