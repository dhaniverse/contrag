/**
 * Quick script to populate vector store with game player data
 */

const { ContragSDK } = require('./dist/index.js');
const fs = require('fs');

async function populateGameVectors() {
  console.log('🔧 Populating vector store with game player data...');
  
  const config = JSON.parse(fs.readFileSync('contrag.config.json', 'utf8'));
  const sdk = new ContragSDK();
  
  try {
    await sdk.configure(config);
    
    // Players from our game data
    const players = [
      '64a1b2c3d4e5f6789abcdef0', // MayaStudent
      '64a1b2c3d4e5f6789abcdef1', // AlexInvestor  
      '64a1b2c3d4e5f6789abcdef2', // SaraTheSaver
      '64a1b2c3d4e5f6789abcdef3'  // BeginnerBen
    ];
    
    for (const playerId of players) {
      console.log(`Building context for player ${playerId}...`);
      
      try {
        const buildResult = await sdk.buildFor('users', playerId);
        if (buildResult.success) {
          console.log(`✅ Built ${buildResult.chunksCreated} chunks for ${buildResult.namespace}`);
        } else {
          console.log(`❌ Failed to build context for ${playerId}: ${buildResult.error}`);
        }
      } catch (error) {
        console.log(`❌ Error building context for ${playerId}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Vector store population complete!');
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
  } finally {
    await sdk.disconnect();
  }
}

populateGameVectors().catch(console.error);
