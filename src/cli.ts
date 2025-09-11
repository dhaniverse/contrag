#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ContragSDK } from './index';
import { ContragConfig } from './types';

const program = new Command();

// Helper function to load configuration
function loadConfig(): ContragConfig {
  const configPaths = [
    'contrag.config.json',
    'contrag.config.js',
    '.contragrc',
    '.contragrc.json'
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        if (configPath.endsWith('.js')) {
          delete require.cache[path.resolve(configPath)];
          return require(path.resolve(configPath));
        } else {
          return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (error) {
        console.error(chalk.red(`Failed to load config from ${configPath}: ${error}`));
        process.exit(1);
      }
    }
  }

  // Try to load from environment variables
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    return envConfig;
  }

  console.error(chalk.red('No configuration file found. Please create a contrag.config.json file.'));
  console.log(chalk.yellow('Example configuration:'));
  console.log(JSON.stringify({
    database: {
      plugin: 'postgres',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        user: 'user',
        password: 'password'
      }
    },
    vectorStore: {
      plugin: 'weaviate',
      config: {
        url: 'http://localhost:8080'
      }
    },
    embedder: {
      plugin: 'openai',
      config: {
        apiKey: 'your-openai-api-key'
      }
    }
  }, null, 2));
  
  process.exit(1);
}

// Load configuration from environment variables
function loadConfigFromEnv(): ContragConfig | null {
  const dbPlugin = process.env.CONTRAG_DB_PLUGIN;
  const vectorPlugin = process.env.CONTRAG_VECTOR_PLUGIN;
  const embedderPlugin = process.env.CONTRAG_EMBEDDER_PLUGIN;

  if (!dbPlugin || !vectorPlugin || !embedderPlugin) {
    return null;
  }

  const config: ContragConfig = {
    database: {
      plugin: dbPlugin,
      config: {}
    },
    vectorStore: {
      plugin: vectorPlugin,
      config: {}
    },
    embedder: {
      plugin: embedderPlugin,
      config: {}
    }
  };

  // Database configuration
  if (dbPlugin === 'postgres') {
    config.database.config = {
      host: process.env.CONTRAG_DB_HOST || 'localhost',
      port: parseInt(process.env.CONTRAG_DB_PORT || '5432'),
      database: process.env.CONTRAG_DB_NAME || 'contrag',
      user: process.env.CONTRAG_DB_USER || 'postgres',
      password: process.env.CONTRAG_DB_PASSWORD || ''
    };
  } else if (dbPlugin === 'mongodb') {
    config.database.config = {
      url: process.env.CONTRAG_DB_URL || 'mongodb://localhost:27017',
      database: process.env.CONTRAG_DB_NAME || 'contrag'
    };
  }

  // Vector store configuration
  if (vectorPlugin === 'weaviate') {
    config.vectorStore.config = {
      url: process.env.CONTRAG_VECTOR_URL || 'http://localhost:8080',
      apiKey: process.env.CONTRAG_VECTOR_API_KEY
    };
  }

  // Embedder configuration
  if (embedderPlugin === 'openai') {
    config.embedder.config = {
      apiKey: process.env.CONTRAG_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      model: process.env.CONTRAG_OPENAI_MODEL
    };
  }

  return config;
}

// Introspect command
program
  .command('introspect')
  .description('Introspect database schema and print entity relationships')
  .option('-f, --format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to database...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = 'Introspecting schema...';
      const schema = await sdk.introspectSchema();
      
      spinner.stop();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(schema, null, 2));
      } else {
        console.log(chalk.green('✓ Schema introspection complete\n'));
        
        for (const entity of schema) {
          console.log(chalk.bold.blue(`Entity: ${entity.name}`));
          
          if (entity.isTimeSeriesEnabled) {
            console.log(chalk.cyan(`  ⏱️  Time Series: ${entity.timestampField}`));
          }
          
          console.log(chalk.gray('  Fields:'));
          for (const field of entity.fields) {
            let fieldInfo = `    ${field.name} (${field.type})`;
            if (field.isPrimaryKey) fieldInfo += chalk.yellow(' [PK]');
            if (field.isForeignKey) fieldInfo += chalk.magenta(` [FK → ${field.referencedTable}.${field.referencedColumn}]`);
            if (!field.nullable) fieldInfo += chalk.red(' [NOT NULL]');
            console.log(fieldInfo);
          }
          
          if (entity.relationships.length > 0) {
            console.log(chalk.gray('  Relationships:'));
            for (const rel of entity.relationships) {
              console.log(`    ${chalk.green(rel.type)} → ${chalk.blue(rel.targetEntity)} (${rel.foreignKey} → ${rel.referencedKey})`);
            }
          }
          
          console.log('');
        }
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('Build personalized vector store for an entity')
  .requiredOption('--entity <entity>', 'Master entity name (e.g., User)')
  .requiredOption('--uid <uid>', 'Entity UID to build context for')
  .option('--max-depth <depth>', 'Maximum relationship traversal depth', '3')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to plugins...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = `Building context for ${options.entity}:${options.uid}...`;
      
      const result = await sdk.buildFor(options.entity, options.uid);
      
      spinner.stop();
      
      if (result.success) {
        console.log(chalk.green('✓ Context building complete'));
        console.log(chalk.blue(`  Entity: ${result.entity}`));
        console.log(chalk.blue(`  UID: ${result.uid}`));
        console.log(chalk.blue(`  Namespace: ${result.namespace}`));
        console.log(chalk.blue(`  Chunks Created: ${result.chunksCreated}`));
      } else {
        console.log(chalk.red('✗ Context building failed'));
        console.log(chalk.red(`  Error: ${result.error}`));
        process.exit(1);
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

// Query command
program
  .command('query')
  .description('Query the vector store for context')
  .requiredOption('--namespace <namespace>', 'Namespace to query (entity:uid)')
  .requiredOption('--query <query>', 'Query text')
  .option('--limit <limit>', 'Maximum number of results', '5')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to vector store...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = 'Querying vector store...';
      
      const result = await sdk.query(options.namespace, options.query, parseInt(options.limit));
      
      spinner.stop();
      
      console.log(chalk.green(`✓ Found ${result.totalResults} results for "${result.query}"\n`));
      
      for (const [index, chunk] of result.chunks.entries()) {
        console.log(chalk.bold.blue(`Result ${index + 1}:`));
        console.log(chalk.gray(`  Chunk: ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks}`));
        console.log(chalk.gray(`  Entity: ${chunk.metadata.entity}`));
        console.log(chalk.gray(`  Relations: ${chunk.metadata.relations.join(', ')}`));
        if (chunk.metadata.timestamp) {
          console.log(chalk.gray(`  Timestamp: ${chunk.metadata.timestamp.toISOString()}`));
        }
        console.log('');
        console.log(chunk.content);
        console.log(chalk.gray('─'.repeat(80)));
        console.log('');
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new Contrag configuration file')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    const configPath = 'contrag.config.json';
    
    if (fs.existsSync(configPath) && !options.force) {
      console.log(chalk.red(`Configuration file ${configPath} already exists. Use --force to overwrite.`));
      return;
    }
    
    const sampleConfig: ContragConfig = {
      database: {
        plugin: 'postgres',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'your_database',
          user: 'your_username',
          password: 'your_password'
        }
      },
      vectorStore: {
        plugin: 'weaviate',
        config: {
          url: 'http://localhost:8080'
        }
      },
      embedder: {
        plugin: 'openai',
        config: {
          apiKey: 'your_openai_api_key'
        }
      },
      contextBuilder: {
        chunkSize: 1000,
        overlap: 200
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    console.log(chalk.green(`✓ Created ${configPath}`));
    console.log(chalk.yellow('Please update the configuration with your actual connection details.'));
  });

// Version
program
  .version('1.0.0', '-v, --version', 'Display version number');

// Help
program
  .name('contrag')
  .description('Context Graph Builder - Build personalized vector stores from entity relationships')
  .addHelpText('after', `
Examples:
  $ contrag init                                    # Initialize configuration
  $ contrag introspect                              # Print schema graph
  $ contrag build --entity User --uid 123          # Build context for User 123
  $ contrag query --namespace User:123 --query "What orders did I place?"
  
Environment Variables:
  CONTRAG_DB_PLUGIN          Database plugin (postgres, mongodb)
  CONTRAG_DB_HOST           Database host
  CONTRAG_DB_PORT           Database port
  CONTRAG_DB_NAME           Database name
  CONTRAG_DB_USER           Database user
  CONTRAG_DB_PASSWORD       Database password
  CONTRAG_DB_URL            Database URL (for MongoDB)
  
  CONTRAG_VECTOR_PLUGIN      Vector store plugin (weaviate)
  CONTRAG_VECTOR_URL         Vector store URL
  CONTRAG_VECTOR_API_KEY     Vector store API key
  
  CONTRAG_EMBEDDER_PLUGIN    Embedder plugin (openai)
  CONTRAG_OPENAI_API_KEY     OpenAI API key
  CONTRAG_OPENAI_MODEL       OpenAI model (optional)
`);

program.parse(process.argv);
