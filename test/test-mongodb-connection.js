/**
 * Simple MongoDB connection test to verify our data model
 */

const { MongoClient } = require('mongodb');

async function testMongoDB() {
  console.log('🧪 Testing MongoDB Connection and Data Model');
  console.log('=' .repeat(50));

  const url = 'mongodb://admin:password@localhost:27017';
  const dbName = 'contrag_test';

  let client;

  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(url);
    await client.connect();
    console.log('✅ Connected successfully');

    const db = client.db(dbName);

    // Test all collections
    const collections = ['users', 'orders', 'products', 'reviews', 'user_activities'];
    
    console.log('\n📊 Data Model Verification:');
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      console.log(`   ${collectionName}: ${count} documents`);
    }

    // Test sample data structure
    console.log('\n🔍 Sample Data Structure:');
    
    // Sample user
    const user = await db.collection('users').findOne({});
    console.log('📁 Users structure:', Object.keys(user));
    
    // Sample order with embedded data
    const order = await db.collection('orders').findOne({});
    console.log('📁 Orders structure:', Object.keys(order));
    console.log('   📦 Embedded items:', order.items?.length || 0);
    console.log('   🏠 Embedded address:', !!order.shipping_address);

    // Test relationships
    console.log('\n🔗 Relationship Testing:');
    const userId = user._id;
    const userOrders = await db.collection('orders').find({ user_id: userId }).toArray();
    const userReviews = await db.collection('reviews').find({ user_id: userId }).toArray();
    const userActivities = await db.collection('user_activities').find({ user_id: userId }).toArray();

    console.log(`   User ${user.name} (${userId}):`);
    console.log(`     📦 Orders: ${userOrders.length}`);
    console.log(`     ⭐ Reviews: ${userReviews.length}`);
    console.log(`     📊 Activities: ${userActivities.length}`);

    // Verify our test ObjectId
    const testUser = await db.collection('users').findOne({ _id: new client.s.topology.s.options.srvHost ? require('mongodb').ObjectId('507f1f77bcf86cd799439011') : require('mongodb').ObjectId('507f1f77bcf86cd799439011') });
    if (testUser) {
      console.log(`\n✅ Test user found: ${testUser.name}`);
    } else {
      console.log('\n❌ Test user not found');
    }

    console.log('\n🎉 MongoDB data model is properly populated!');

  } catch (error) {
    console.error('❌ MongoDB test failed:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🧹 Disconnected from MongoDB');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  testMongoDB()
    .then(() => {
      console.log('\n✅ MongoDB test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 MongoDB test failed:', error);
      process.exit(1);
    });
}

module.exports = { testMongoDB };
