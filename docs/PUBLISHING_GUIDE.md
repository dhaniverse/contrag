````markdown
# NPM Publishing Guide for Contrag

## ✅ Pre-Publishing Checklist (Completed)

- [x] Package builds successfully (`npm run build`)
- [x] Package.json metadata complete (author, repository, homepage)
- [x] .npmignore file created to exclude dev files
- [x] Package preview looks good (`npm pack --dry-run`)
- [x] README.md is comprehensive and professional
- [x] Version number is appropriate (1.0.0)

## 🚀 Publishing Steps

### Step 1: Create NPM Account (If Needed)

If you don't have an NPM account:
```bash
# Option 1: Create account via website
# Go to https://www.npmjs.com/signup

# Option 2: Create account via CLI
npm adduser
```

### Step 2: Login to NPM

```bash
npm login
```

This will prompt for:
- Username
- Password
- Email
- 2FA code (if enabled)

### Step 3: Verify Login

```bash
npm whoami
```
Should display your username.

### Step 4: Publish the Package

```bash
# For first-time publishing
npm publish

# Or if you want to be extra careful
npm publish --dry-run  # Preview without publishing
npm publish            # Actual publish
```

### Step 5: Verify Publication

```bash
npm view contrag
```

## 📦 Using the Published Package

Once published, users can install and use your package:

### Installation
```bash
npm install contrag
```

### CLI Usage
```bash
# Initialize configuration
npx contrag init

# Introspect database
npx contrag introspect

# Build context
npx contrag build --entity User --uid 123

# Query context
npx contrag query --namespace User:123 --query "What are my recent orders?"
```

### SDK Usage
```typescript
import { ContragSDK, ContragConfig } from 'contrag';

const config: ContragConfig = {
  database: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL
  },
  vectorStore: {
    type: 'weaviate',
    url: process.env.WEAVIATE_URL
  },
  embedding: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  }
};

const contrag = new ContragSDK(config);

// Build context for a user
await contrag.buildContext('User', '123');

// Query the context
const result = await contrag.query('User:123', 'What orders did I place?');
console.log(result);
```

## 🔄 Future Updates

When you want to publish updates:

1. Update the version in package.json:
   ```bash
   npm version patch  # For bug fixes (1.0.0 → 1.0.1)
   npm version minor  # For new features (1.0.0 → 1.1.0)
   npm version major  # For breaking changes (1.0.0 → 2.0.0)
   ```

2. Build and publish:
   ```bash
   npm run build
   npm publish
   ```

## 🏷️ Package Tags

You can publish with different tags:

```bash
# Default (latest)
npm publish

# Beta version
npm publish --tag beta

# Alpha version
npm publish --tag alpha
```

## 📊 Package Statistics

After publishing, you can:
- View download stats: https://www.npmjs.com/package/contrag
- Monitor usage with `npm view contrag`
- See version history with `npm view contrag versions --json`

## 🔒 Security

- Enable 2FA on your NPM account
- Use `npm audit` to check for vulnerabilities
- Keep dependencies updated

## 📝 Package Information

- **Name**: contrag
- **Current Version**: 1.0.0
- **Package Size**: ~31.3 kB
- **Files**: 42 files (all TypeScript compiled + types)
- **Entry Points**: 
  - Main: `dist/index.js`
  - Types: `dist/index.d.ts`
  - CLI: `dist/cli.js`

---

Ready to publish! Just run `npm login` then `npm publish` 🚀

````
