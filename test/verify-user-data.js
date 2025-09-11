const { MongoClient, ObjectId } = require('mongodb');

async function verifyUserData() {
    console.log('🔍 VERIFYING ALEXINVESTOR DATA IN MONGODB');
    console.log('══════════════════════════════════════════');
    
    const url = 'mongodb://admin:password@localhost:27017';
    const dbName = 'contrag_test';
    let client;
    
    try {
        client = new MongoClient(url);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(dbName);
        const userId = '64a1b2c3d4e5f6789abcdef1';
        
        // Check user profile
        const user = await db.collection('users').findOne({_id: new ObjectId(userId)});
        console.log('\n👤 USER PROFILE:');
        console.log(`Username: ${user.gameUsername}`);
        console.log(`Level: ${user.gameData.level}`);
        console.log(`XP: ${user.gameData.experience}`);
        console.log(`Total Wealth: ₹${user.gameData.totalWealth}`);
        
        // Check bank accounts
        const accounts = await db.collection('bankAccounts').find({userId: userId}).toArray();
        console.log(`\n🏦 BANK ACCOUNTS (${accounts.length}):`);
        accounts.forEach(acc => {
            console.log(`- ${acc.accountType}: ₹${acc.balance} (${acc.transactions.length} transactions)`);
        });
        
        // Check stock portfolios
        const portfolios = await db.collection('stockPortfolios').find({userId: userId}).toArray();
        console.log(`\n📈 STOCK PORTFOLIOS (${portfolios.length}):`);
        portfolios.forEach(port => {
            console.log(`- Portfolio Value: ₹${port.totalValue}`);
            console.log(`- Holdings: ${port.holdings.length} different stocks`);
            port.holdings.forEach(stock => {
                console.log(`  * ${stock.stockName}: ${stock.quantity} shares @ ₹${stock.currentPrice} each`);
            });
        });
        
        // Check achievements
        const achievements = await db.collection('achievements').find({userId: userId}).toArray();
        console.log(`\n🏆 ACHIEVEMENTS (${achievements.length}):`);
        achievements.forEach(ach => {
            console.log(`- ${ach.title} (${ach.points}pts): ${ach.description}`);
        });
        
        // Check stock transactions
        const transactions = await db.collection('stockTransactions').find({userId: userId}).toArray();
        console.log(`\n💹 STOCK TRANSACTION HISTORY: ${transactions.length} trades`);
        if (transactions.length > 0) {
            transactions.forEach(tx => {
                console.log(`- ${tx.type.toUpperCase()} ${tx.quantity} ${tx.stockName} @ ₹${tx.price} (${tx.timestamp.toISOString().split('T')[0]})`);
            });
        }
        
        console.log('\n📊 SUMMARY FOR ALEXINVESTOR:');
        console.log('════════════════════════════════════');
        console.log(`Total Collections with Data: ${[accounts, portfolios, achievements, transactions].filter(arr => arr.length > 0).length + 1}`);
        console.log(`- User Profile: ✅ (Level ${user.gameData.level}, ₹${user.gameData.totalWealth})`);
        console.log(`- Bank Accounts: ✅ (${accounts.length} accounts)`);
        console.log(`- Stock Portfolios: ✅ (${portfolios.length} portfolios)`);
        console.log(`- Achievements: ✅ (${achievements.length} achievements)`);
        console.log(`- Stock Transactions: ✅ (${transactions.length} trades)`);
        
        console.log('\n❗ POTENTIAL RAG ISSUE:');
        console.log('If RAG only shows basic user data, it means:');
        console.log('1. Only the users collection is being embedded');
        console.log('2. Related collections (bankAccounts, stockPortfolios, achievements) are not being included in the user namespace');
        console.log('3. The entity relationships are not being properly joined during build process');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

verifyUserData();
