// MongoDB initialization script
db = db.getSiblingDB('contrag_test');

// Create users collection
db.users.insertMany([
    {
        _id: ObjectId("507f1f77bcf86cd799439011"),
        name: "John Doe",
        email: "john@example.com",
        profile: {
            age: 30,
            city: "New York",
            preferences: ["electronics", "sports"]
        },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439012"),
        name: "Jane Smith",
        email: "jane@example.com",
        profile: {
            age: 28,
            city: "Los Angeles",
            preferences: ["kitchen", "home"]
        },
        createdAt: new Date("2024-01-02T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439013"),
        name: "Bob Wilson",
        email: "bob@example.com",
        profile: {
            age: 35,
            city: "Chicago",
            preferences: ["office", "tech"]
        },
        createdAt: new Date("2024-01-03T00:00:00Z"),
        updatedAt: new Date("2024-01-03T00:00:00Z")
    }
]);

// Create products collection
db.products.insertMany([
    {
        _id: ObjectId("507f1f77bcf86cd799439021"),
        name: "Wireless Headphones",
        price: 99.99,
        category: "electronics",
        description: "High-quality wireless headphones with noise cancellation",
        tags: ["audio", "wireless", "premium"],
        createdAt: new Date("2024-01-01T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439022"),
        name: "Running Shoes",
        price: 129.99,
        category: "sports",
        description: "Comfortable running shoes for daily training",
        tags: ["running", "sports", "comfort"],
        createdAt: new Date("2024-01-01T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439023"),
        name: "Coffee Maker",
        price: 79.99,
        category: "kitchen",
        description: "Automatic drip coffee maker with programmable timer",
        tags: ["kitchen", "coffee", "automatic"],
        createdAt: new Date("2024-01-01T00:00:00Z")
    }
]);

// Create orders collection with embedded and referenced data
db.orders.insertMany([
    {
        _id: ObjectId("507f1f77bcf86cd799439031"),
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        total: 99.99,
        status: "completed",
        items: [
            {
                product_id: ObjectId("507f1f77bcf86cd799439021"),
                product_name: "Wireless Headphones",
                quantity: 1,
                price: 99.99
            }
        ],
        shipping_address: {
            street: "123 Main St",
            city: "New York",
            state: "NY",
            zip: "10001"
        },
        createdAt: new Date("2024-01-15T00:00:00Z"),
        updatedAt: new Date("2024-01-16T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439032"),
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        total: 209.98,
        status: "shipped",
        items: [
            {
                product_id: ObjectId("507f1f77bcf86cd799439022"),
                product_name: "Running Shoes",
                quantity: 1,
                price: 129.99
            },
            {
                product_id: ObjectId("507f1f77bcf86cd799439023"),
                product_name: "Coffee Maker",
                quantity: 1,
                price: 79.99
            }
        ],
        shipping_address: {
            street: "123 Main St",
            city: "New York",
            state: "NY",
            zip: "10001"
        },
        createdAt: new Date("2024-01-20T00:00:00Z"),
        updatedAt: new Date("2024-01-21T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439033"),
        user_id: ObjectId("507f1f77bcf86cd799439012"),
        total: 79.99,
        status: "completed",
        items: [
            {
                product_id: ObjectId("507f1f77bcf86cd799439023"),
                product_name: "Coffee Maker",
                quantity: 1,
                price: 79.99
            }
        ],
        shipping_address: {
            street: "456 Oak Ave",
            city: "Los Angeles",
            state: "CA",
            zip: "90210"
        },
        createdAt: new Date("2024-01-18T00:00:00Z"),
        updatedAt: new Date("2024-01-19T00:00:00Z")
    }
]);

// Create reviews collection
db.reviews.insertMany([
    {
        _id: ObjectId("507f1f77bcf86cd799439041"),
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        product_id: ObjectId("507f1f77bcf86cd799439021"),
        order_id: ObjectId("507f1f77bcf86cd799439031"),
        rating: 5,
        title: "Excellent headphones!",
        comment: "Amazing sound quality and very comfortable. The noise cancellation works perfectly.",
        helpful_votes: 12,
        createdAt: new Date("2024-01-17T00:00:00Z")
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439042"),
        user_id: ObjectId("507f1f77bcf86cd799439012"),
        product_id: ObjectId("507f1f77bcf86cd799439023"),
        order_id: ObjectId("507f1f77bcf86cd799439033"),
        rating: 4,
        title: "Good coffee maker",
        comment: "Makes good coffee and the timer feature is convenient. Could be a bit faster.",
        helpful_votes: 3,
        createdAt: new Date("2024-01-20T00:00:00Z")
    }
]);

// Create activity log collection (time series example)
db.user_activities.insertMany([
    {
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        action: "login",
        details: { ip: "192.168.1.1", device: "desktop" },
        timestamp: new Date("2024-01-15T08:30:00Z")
    },
    {
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        action: "view_product",
        details: { product_id: ObjectId("507f1f77bcf86cd799439021") },
        timestamp: new Date("2024-01-15T08:35:00Z")
    },
    {
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        action: "add_to_cart",
        details: { product_id: ObjectId("507f1f77bcf86cd799439021") },
        timestamp: new Date("2024-01-15T08:40:00Z")
    },
    {
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        action: "checkout",
        details: { order_id: ObjectId("507f1f77bcf86cd799439031"), total: 99.99 },
        timestamp: new Date("2024-01-15T08:45:00Z")
    }
]);

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.orders.createIndex({ user_id: 1 });
db.orders.createIndex({ createdAt: -1 });
db.reviews.createIndex({ user_id: 1 });
db.reviews.createIndex({ product_id: 1 });
db.user_activities.createIndex({ user_id: 1, timestamp: -1 });

print("MongoDB test data initialized successfully!");
