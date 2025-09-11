#!/bin/bash

# Local Package Testing Script for Contrag
# This script helps you test the Contrag package locally before publishing

set -e

echo "🚀 Contrag Local Testing Setup"
echo "================================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if we have a Gemini API key
if [ -z "$GEMINI_API_KEY" ] && [ ! -f ".env.local" ]; then
    echo "⚠️  No Gemini API key found."
    echo "Please either:"
    echo "1. Set GEMINI_API_KEY environment variable"
    echo "2. Create .env.local file with GEMINI_API_KEY=your-key"
    echo ""
    echo "Get a free API key at: https://aistudio.google.com/"
    exit 1
fi

# Create global npm link
echo "📦 Creating local package link..."
npm run build
npm link

echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check MongoDB
if docker-compose exec -T mongodb mongosh --quiet --eval "db.runCommand('ping').ok" >/dev/null 2>&1; then
    echo "✅ MongoDB is ready"
else
    echo "❌ MongoDB is not ready"
fi

# Check Weaviate
if curl -s http://localhost:8080/v1/meta >/dev/null 2>&1; then
    echo "✅ Weaviate is ready"
else
    echo "❌ Weaviate is not ready"
fi

echo ""
echo "🎯 Services started! You can now test Contrag:"
echo ""
echo "1. Test PostgreSQL + Weaviate + Gemini:"
echo "   cp test-configs/postgres-weaviate-gemini.json contrag.config.json"
echo "   # Edit contrag.config.json to add your Gemini API key"
echo "   npx contrag introspect"
echo "   npx contrag build --entity users --uid 1"
echo ""
echo "2. Test MongoDB + Weaviate + Gemini:"
echo "   cp test-configs/mongodb-weaviate-gemini.json contrag.config.json"
echo "   # Edit contrag.config.json to add your Gemini API key"
echo "   npx contrag introspect"
echo "   npx contrag build --entity users --uid 507f1f77bcf86cd799439011"
echo ""
echo "3. Test in another project:"
echo "   mkdir test-project && cd test-project"
echo "   npm init -y"
echo "   npm link contrag"
echo "   echo 'const { ContragSDK } = require(\"contrag\"); console.log(\"Contrag loaded!\");' > test.js"
echo "   node test.js"
echo ""
echo "📖 See LOCAL_TESTING.md for detailed testing scenarios"
echo ""
echo "🧹 When done, cleanup with:"
echo "   docker-compose down -v"
echo "   npm unlink"
