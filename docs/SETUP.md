# Contrag Setup Guide

This guide will walk you through setting up Contrag from scratch and getting it running with your database.

## Prerequisites

- Node.js 16+ 
- A supported database (PostgreSQL or MongoDB)
- A supported vector store (Weaviate or PostgreSQL with pgvector)
- OpenAI API key for embeddings

## Quick Setup

### 1. Install Contrag

```bash
npm install contrag
```

### 2. Initialize Configuration

```bash
npx contrag init
```

This creates a `contrag.config.json` file in your current directory.

### 3. Configure Your Database

Edit the generated configuration file:

#### For PostgreSQL:
```json
{
  "database": {
    "plugin": "postgres",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "your_database",
      "user": "postgres",
      "password": "password"
    }
  }
}
```

#### For MongoDB:
```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "mongodb://localhost:27017",
      "database": "your_database"
    }
  }
}
```

### 4. Configure Vector Store

#### For Weaviate (Recommended for getting started):
```json
{
  "vectorStore": {
    "plugin": "weaviate",
    "config": {
      "url": "http://localhost:8080"
    }
  }
}
```

#### For pgvector (PostgreSQL with vector extension):
```json
{
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "your_vectors_db",
      "user": "postgres",
      "password": "password"
    }
  }
}
```

### 5. Configure Embeddings

```json
{
  "embedder": {
    "plugin": "openai",
    "config": {
      "apiKey": "your-openai-api-key",
      "model": "text-embedding-ada-002"
    }
  }
}
```

## Database Setup

### PostgreSQL Setup

1. **Create your application database** (if not already exists):
```sql
CREATE DATABASE your_app_db;
```

2. **If using pgvector for vector storage**:
```sql
-- Create vector database
CREATE DATABASE your_vectors_db;

-- Connect to the vector database
\c your_vectors_db;

-- Install pgvector extension
CREATE EXTENSION vector;
```

### MongoDB Setup

1. **Start MongoDB** (if running locally):
```bash
mongod
```

2. **Create your database** (MongoDB creates databases automatically when first used).

## Vector Store Setup

### Weaviate Setup (Docker)

1. **Create docker-compose.yml**:
```yaml
version: '3.8'
services:
  weaviate:
    image: semitechnologies/weaviate:latest
    ports:
      - "8080:8080"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'none'
      CLUSTER_HOSTNAME: 'node1'
    volumes:
      - weaviate_data:/var/lib/weaviate

volumes:
  weaviate_data:
```

2. **Start Weaviate**:
```bash
docker-compose up -d
```

### pgvector Setup

If you chose pgvector, ensure the vector extension is installed:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Environment Variables (Alternative to config file)

Instead of a config file, you can use environment variables:

```bash
# Database
export CONTRAG_DB_PLUGIN=postgres
export CONTRAG_DB_HOST=localhost
export CONTRAG_DB_PORT=5432
export CONTRAG_DB_NAME=your_database
export CONTRAG_DB_USER=postgres
export CONTRAG_DB_PASSWORD=your_password

# Vector Store
export CONTRAG_VECTOR_PLUGIN=weaviate
export CONTRAG_VECTOR_URL=http://localhost:8080

# Embedder
export CONTRAG_EMBEDDER_PLUGIN=openai
export CONTRAG_OPENAI_API_KEY=your_openai_api_key
```

## Testing Your Setup

### 1. Test Database Connection

```bash
npx contrag introspect
```

This should show your database schema.

### 2. Build Context for a Test Entity

```bash
npx contrag build --entity User --uid 123
```

Replace "User" and "123" with actual entity and ID from your database.

### 3. Query the Built Context

```bash
npx contrag query --namespace User:123 --query "What information do we have?"
```

## Example Database Schema

Here's an example of a database schema that works well with Contrag:

### PostgreSQL Example:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_name VARCHAR(255),
    quantity INTEGER,
    price DECIMAL(10,2)
);

-- Insert sample data
INSERT INTO users (name, email) VALUES 
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com');

INSERT INTO orders (user_id, total, status) VALUES 
    (1, 99.99, 'completed'),
    (1, 149.50, 'shipped'),
    (2, 75.00, 'pending');

INSERT INTO order_items (order_id, product_name, quantity, price) VALUES 
    (1, 'Widget A', 2, 49.99),
    (2, 'Widget B', 1, 149.50),
    (3, 'Widget C', 3, 25.00);
```

### MongoDB Example:

```javascript
// Users collection
db.users.insertMany([
    {
        _id: ObjectId("507f1f77bcf86cd799439011"),
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date()
    },
    {
        _id: ObjectId("507f1f77bcf86cd799439012"),
        name: "Jane Smith", 
        email: "jane@example.com",
        createdAt: new Date()
    }
]);

// Orders collection
db.orders.insertMany([
    {
        _id: ObjectId("507f1f77bcf86cd799439021"),
        user_id: ObjectId("507f1f77bcf86cd799439011"),
        total: 99.99,
        status: "completed",
        items: [
            { product: "Widget A", quantity: 2, price: 49.99 }
        ],
        createdAt: new Date()
    }
]);
```

## Troubleshooting

### Common Issues:

1. **"Database plugin not configured"**: Make sure your config file exists and has valid database connection details.

2. **Connection errors**: Verify your database is running and accessible with the provided credentials.

3. **OpenAI API errors**: Ensure your API key is valid and has sufficient credits.

4. **Weaviate connection errors**: Make sure Weaviate is running on the specified port.

5. **pgvector errors**: Ensure the vector extension is installed in your PostgreSQL database.

### Debug Mode:

Set environment variable for more verbose logging:
```bash
export DEBUG=contrag:*
```

## Next Steps

1. **Integrate with your application**: Use the SDK in your Node.js applications
2. **Connect to your LLM**: Use retrieved context to enhance AI responses  
3. **Scale up**: Build contexts for multiple entities and users
4. **Monitor performance**: Track embedding costs and query performance
5. **Customize**: Develop custom plugins for your specific needs

## Support

- Check the [examples](./examples/) directory for code samples
- Review the [API documentation](../README.md)
- Create GitHub issues for bugs or feature requests
