#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ContragSDK } from './index';
import { ContragConfig, MasterEntityConfig } from './types';
import { 
  DEFAULT_CONFIG, 
  CONFIG_FILENAMES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES, 
  DEFAULT_SYSTEM_PROMPTS 
} from './constants';

const program = new Command();

// Helper function to load configuration
function loadConfig(): ContragConfig {
  for (const configPath of CONFIG_FILENAMES) {
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

  console.error(chalk.red(ERROR_MESSAGES.NO_CONFIG_FOUND));
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

// Sample data command
program
  .command('sample')
  .description('Get sample data for debugging and testing')
  .requiredOption('--entity <entity>', 'Entity name to get sample data for')
  .option('--uid <uid>', 'Specific entity UID to get related data for')
  .option('--limit <limit>', 'Maximum number of records to return', '10')
  .option('--format <format>', 'Output format (json|table)', 'table')
  .option('--filter <filter>', 'JSON filter conditions (e.g., \'{"active": true}\')')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to database...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      const limit = parseInt(options.limit);
      const filters = options.filter ? JSON.parse(options.filter) : undefined;
      
      if (options.uid) {
        // Get related sample data for specific entity
        spinner.text = `Getting related data for ${options.entity}:${options.uid}...`;
        const entityConfig = sdk.getMasterEntityConfig(options.entity);
        const result = await sdk.getRelatedSampleData(options.entity, options.uid, entityConfig);
        
        spinner.stop();
        
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green(`✓ Retrieved data for ${result.masterEntity}:${result.uid}\n`));
          console.log(chalk.bold.blue('Master Entity Data:'));
          console.table([result.data]);
          
          for (const [entityName, records] of Object.entries(result.relatedData)) {
            if (records.length > 0) {
              console.log(chalk.bold.blue(`\n${entityName} (${records.length} records):`));
              console.table(records.slice(0, 5)); // Show first 5 records
              if (records.length > 5) {
                console.log(chalk.gray(`... and ${records.length - 5} more records`));
              }
            }
          }
          
          console.log(chalk.blue(`\nTotal records: ${result.totalRecords}`));
        }
      } else {
        // Get sample data for entity
        spinner.text = `Getting sample data for ${options.entity}...`;
        const result = await sdk.getSampleData(options.entity, limit, filters);
        
        spinner.stop();
        
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green(`✓ Retrieved ${result.length} sample records for ${options.entity}\n`));
          if (result.length > 0) {
            console.table(result);
          } else {
            console.log(chalk.yellow('No records found matching the criteria.'));
          }
        }
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

// Vector store debugging commands
program
  .command('vector')
  .description('Vector store debugging and management commands')
  .addCommand(
    new Command('stats')
      .description('Show vector store statistics')
      .action(async () => {
        const spinner = ora('Loading configuration...').start();
        
        try {
          const config = loadConfig();
          spinner.text = 'Connecting to vector store...';
          
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          spinner.text = 'Getting vector store statistics...';
          const stats = await sdk.getVectorStoreStats();
          
          spinner.stop();
          
          console.log(chalk.green('✓ Vector store statistics\n'));
          console.log(chalk.blue(`Total Vectors: ${stats.totalVectors.toLocaleString()}`));
          console.log(chalk.blue(`Dimensions: ${stats.dimensions}`));
          console.log(chalk.blue(`Namespaces: ${stats.namespaces.length}`));
          
          if (stats.storageSize) {
            console.log(chalk.blue(`Storage Size: ${stats.storageSize}`));
          }
          
          if (stats.namespaces.length > 0) {
            console.log(chalk.gray('\nNamespaces:'));
            for (const namespace of stats.namespaces.slice(0, 20)) {
              console.log(chalk.gray(`  - ${namespace}`));
            }
            if (stats.namespaces.length > 20) {
              console.log(chalk.gray(`  ... and ${stats.namespaces.length - 20} more`));
            }
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Failed: ${error}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('namespaces')
      .description('List all vector store namespaces')
      .option('--format <format>', 'Output format (json|list)', 'list')
      .action(async (options) => {
        const spinner = ora('Loading configuration...').start();
        
        try {
          const config = loadConfig();
          spinner.text = 'Connecting to vector store...';
          
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          spinner.text = 'Listing namespaces...';
          const namespaces = await sdk.listVectorStoreNamespaces();
          
          spinner.stop();
          
          if (options.format === 'json') {
            console.log(JSON.stringify(namespaces, null, 2));
          } else {
            console.log(chalk.green(`✓ Found ${namespaces.length} namespaces\n`));
            for (const namespace of namespaces) {
              console.log(chalk.blue(`  ${namespace}`));
            }
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Failed: ${error}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('search')
      .description('Search similar vectors')
      .requiredOption('--text <text>', 'Text to search for')
      .option('--namespace <namespace>', 'Namespace to search in')
      .option('--limit <limit>', 'Maximum number of results', '5')
      .action(async (options) => {
        const spinner = ora('Loading configuration...').start();
        
        try {
          const config = loadConfig();
          spinner.text = 'Connecting to plugins...';
          
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          spinner.text = 'Searching similar vectors...';
          const results = await sdk.searchSimilarVectors(
            options.text, 
            options.namespace, 
            parseInt(options.limit)
          );
          
          spinner.stop();
          
          console.log(chalk.green(`✓ Found ${results.length} similar vectors\n`));
          
          for (const [index, result] of results.entries()) {
            console.log(chalk.bold.blue(`Result ${index + 1}:`));
            console.log(chalk.gray(`  ID: ${result.id}`));
            console.log(chalk.gray(`  Score: ${result.score.toFixed(4)}`));
            
            if (result.metadata) {
              console.log(chalk.gray('  Metadata:'));
              for (const [key, value] of Object.entries(result.metadata)) {
                console.log(chalk.gray(`    ${key}: ${value}`));
              }
            }
            
            if (result.content) {
              console.log(chalk.gray('  Content:'));
              console.log(`    ${result.content.substring(0, 200)}...`);
            }
            
            console.log('');
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Failed: ${error}`);
          process.exit(1);
        }
      })
  );

// Connection testing commands
program
  .command('test')
  .description('Test connections to various services')
  .addCommand(
    new Command('db')
      .description('Test database connection')
      .action(async () => {
        const spinner = ora('Testing database connection...').start();
        
        try {
          const config = loadConfig();
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          const result = await sdk.testDatabaseConnection();
          spinner.stop();
          
          if (result.connected) {
            console.log(chalk.green(`✓ Database connection successful`));
            if (result.latency) {
              console.log(chalk.blue(`  Latency: ${result.latency}ms`));
            }
            if (result.details) {
              for (const [key, value] of Object.entries(result.details)) {
                console.log(chalk.gray(`  ${key}: ${value}`));
              }
            }
          } else {
            console.log(chalk.red(`✗ Database connection failed`));
            console.log(chalk.red(`  Error: ${result.error}`));
            process.exit(1);
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Database connection failed: ${error}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('vector')
      .description('Test vector store connection')
      .action(async () => {
        const spinner = ora('Testing vector store connection...').start();
        
        try {
          const config = loadConfig();
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          const result = await sdk.testVectorStoreConnection();
          spinner.stop();
          
          if (result.connected) {
            console.log(chalk.green(`✓ Vector store connection successful`));
            if (result.latency) {
              console.log(chalk.blue(`  Latency: ${result.latency}ms`));
            }
            if (result.details) {
              for (const [key, value] of Object.entries(result.details)) {
                console.log(chalk.gray(`  ${key}: ${value}`));
              }
            }
          } else {
            console.log(chalk.red(`✗ Vector store connection failed`));
            console.log(chalk.red(`  Error: ${result.error}`));
            process.exit(1);
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Vector store connection failed: ${error}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('embedder')
      .description('Test embedder connection')
      .action(async () => {
        const spinner = ora('Testing embedder connection...').start();
        
        try {
          const config = loadConfig();
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          const result = await sdk.testEmbedderConnection();
          spinner.stop();
          
          if (result.connected) {
            console.log(chalk.green(`✓ Embedder connection successful`));
            if (result.latency) {
              console.log(chalk.blue(`  Latency: ${result.latency}ms`));
            }
            if (result.details) {
              for (const [key, value] of Object.entries(result.details)) {
                console.log(chalk.gray(`  ${key}: ${value}`));
              }
            }
          } else {
            console.log(chalk.red(`✗ Embedder connection failed`));
            console.log(chalk.red(`  Error: ${result.error}`));
            process.exit(1);
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Embedder connection failed: ${error}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('all')
      .description('Test all connections')
      .action(async () => {
        const spinner = ora('Testing all connections...').start();
        
        try {
          const config = loadConfig();
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          spinner.text = 'Testing database connection...';
          const dbResult = await sdk.testDatabaseConnection();
          
          spinner.text = 'Testing vector store connection...';
          const vectorResult = await sdk.testVectorStoreConnection();
          
          spinner.text = 'Testing embedder connection...';
          const embedderResult = await sdk.testEmbedderConnection();
          
          spinner.stop();
          
          console.log(chalk.green('✓ Connection test complete\n'));
          
          // Display results
          const results = [
            { name: 'Database', result: dbResult },
            { name: 'Vector Store', result: vectorResult },
            { name: 'Embedder', result: embedderResult }
          ];
          
          let allConnected = true;
          
          for (const { name, result } of results) {
            const status = result.connected ? chalk.green('✓') : chalk.red('✗');
            const latency = result.latency ? chalk.gray(`(${result.latency}ms)`) : '';
            console.log(`${status} ${name} ${latency}`);
            
            if (!result.connected) {
              allConnected = false;
              console.log(chalk.red(`  Error: ${result.error}`));
            }
          }
          
          if (!allConnected) {
            process.exit(1);
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Connection test failed: ${error}`);
          process.exit(1);
        }
      })
  );

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
        console.log(chalk.green(`✓ ${SUCCESS_MESSAGES.SCHEMA_INTROSPECTED}\n`));
        
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

// Test connections command
program
  .command('test-connections')
  .description('Test all configured connections (database, vector store, embedder)')
  .option('--db-only', 'Test database connection only')
  .option('--vector-only', 'Test vector store connection only') 
  .option('--embedder-only', 'Test embedder connection only')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.stop();
      console.log(chalk.blue('🔍 Testing connections...\n'));
      
      const tests = [];
      if (!options.vectorOnly && !options.embedderOnly) tests.push('db');
      if (!options.dbOnly && !options.embedderOnly) tests.push('vector');
      if (!options.dbOnly && !options.vectorOnly) tests.push('embedder');
      
      if (options.dbOnly) tests.push('db');
      if (options.vectorOnly) tests.push('vector');
      if (options.embedderOnly) tests.push('embedder');
      
      for (const test of tests) {
        let testSpinner;
        let result;
        
        switch (test) {
          case 'db':
            testSpinner = ora('Testing database connection...').start();
            result = await sdk.testDatabaseConnection();
            break;
          case 'vector':
            testSpinner = ora('Testing vector store connection...').start();
            result = await sdk.testVectorStoreConnection();
            break;
          case 'embedder':
            testSpinner = ora('Testing embedder connection...').start();
            result = await sdk.testEmbedderConnection();
            break;
        }
        
        if (result!.connected) {
          testSpinner!.succeed(chalk.green(`${result!.plugin} connection successful (${result!.latency}ms)`));
          if (result!.details) {
            for (const [key, value] of Object.entries(result!.details)) {
              console.log(chalk.gray(`  ${key}: ${value}`));
            }
          }
        } else {
          testSpinner!.fail(chalk.red(`${result!.plugin} connection failed`));
          console.log(chalk.red(`  Error: ${result!.error}`));
        }
        console.log('');
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

// Sample data command
program
  .command('sample-data')
  .description('Get sample data for a master entity with related data')
  .requiredOption('--entity <entity>', 'Master entity name (e.g., User, Order)')
  .requiredOption('--uid <uid>', 'Entity UID to retrieve sample data for')
  .option('--limit <limit>', 'Limit for sample records', DEFAULT_CONFIG.SAMPLE_LIMIT.toString())
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to database...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = `Retrieving sample data for ${options.entity}:${options.uid}...`;
      
      const masterEntityConfig = sdk.getMasterEntityConfig(options.entity);
      const result = await sdk.getRelatedSampleData(options.entity, options.uid, masterEntityConfig);
      
      spinner.stop();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green(`✓ ${SUCCESS_MESSAGES.DATA_RETRIEVED}\n`));
        console.log(chalk.bold.blue(`Master Entity: ${result.masterEntity} (${result.uid})`));
        console.log(chalk.gray('Master Data:'));
        console.log(JSON.stringify(result.data, null, 2));
        console.log('');
        
        for (const [entityName, records] of Object.entries(result.relatedData)) {
          console.log(chalk.bold.cyan(`Related Entity: ${entityName} (${records.length} records)`));
          for (const [index, record] of records.entries()) {
            console.log(chalk.gray(`  Record ${index + 1}:`));
            console.log('  ', JSON.stringify(record, null, 2));
          }
          console.log('');
        }
        
        console.log(chalk.blue(`Total Records: ${result.totalRecords}`));
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

// Get sample data (simple version)
program
  .command('get-sample')
  .description('Get sample data from a specific entity')
  .requiredOption('--entity <entity>', 'Entity name to sample from')
  .option('--limit <limit>', 'Number of records to retrieve', DEFAULT_CONFIG.SAMPLE_LIMIT.toString())
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to database...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = `Retrieving sample data from ${options.entity}...`;
      
      const records = await sdk.getSampleData(options.entity, parseInt(options.limit));
      
      spinner.stop();
      
      if (options.format === 'json') {
        console.log(JSON.stringify(records, null, 2));
      } else {
        console.log(chalk.green(`✓ Found ${records.length} sample records from ${options.entity}\n`));
        
        for (const [index, record] of records.entries()) {
          console.log(chalk.bold.blue(`Record ${index + 1}:`));
          for (const [key, value] of Object.entries(record)) {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            console.log(`  ${chalk.cyan(key)}: ${displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue}`);
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

// Vector store commands
program
  .command('vector-stats')
  .description('Get vector store statistics and information')
  .action(async () => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to vector store...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = 'Retrieving vector store statistics...';
      
      const stats = await sdk.getVectorStoreStats();
      
      spinner.stop();
      
      console.log(chalk.green('✓ Vector store statistics retrieved\n'));
      console.log(chalk.bold.blue('Vector Store Information:'));
      console.log(chalk.cyan(`  Total Vectors: ${stats.totalVectors}`));
      console.log(chalk.cyan(`  Dimensions: ${stats.dimensions}`));
      console.log(chalk.cyan(`  Namespaces: ${stats.namespaces.length}`));
      if (stats.storageSize) {
        console.log(chalk.cyan(`  Storage Size: ${stats.storageSize}`));
      }
      console.log('');
      
      if (stats.namespaces.length > 0) {
        console.log(chalk.bold.blue('Namespaces:'));
        for (const namespace of stats.namespaces) {
          console.log(chalk.gray(`  • ${namespace}`));
        }
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

program
  .command('vector-namespaces')
  .description('List all vector store namespaces')
  .action(async () => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to vector store...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = 'Retrieving namespaces...';
      
      const namespaces = await sdk.listVectorStoreNamespaces();
      
      spinner.stop();
      
      console.log(chalk.green(`✓ Found ${namespaces.length} namespaces\n`));
      
      for (const namespace of namespaces) {
        console.log(chalk.blue(`• ${namespace}`));
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

program
  .command('vector-search')
  .description('Search for similar vectors using text input')
  .requiredOption('--query <query>', 'Text query to search for')
  .option('--namespace <namespace>', 'Namespace to search within')
  .option('--limit <limit>', 'Maximum number of results', DEFAULT_CONFIG.QUERY_LIMIT.toString())
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();
    
    try {
      const config = loadConfig();
      spinner.text = 'Connecting to plugins...';
      
      const sdk = new ContragSDK();
      await sdk.configure(config);
      
      spinner.text = 'Searching similar vectors...';
      
      const results = await sdk.searchSimilarVectors(
        options.query,
        options.namespace,
        parseInt(options.limit)
      );
      
      spinner.stop();
      
      console.log(chalk.green(`✓ Found ${results.length} similar vectors\n`));
      
      for (const [index, result] of results.entries()) {
        console.log(chalk.bold.blue(`Result ${index + 1} (Score: ${result.score.toFixed(4)}):`));
        console.log(chalk.gray(`  ID: ${result.id}`));
        if (result.metadata) {
          for (const [key, value] of Object.entries(result.metadata)) {
            if (key !== 'content') {
              const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
              console.log(chalk.gray(`  ${key}: ${displayValue}`));
            }
          }
        }
        if (result.content) {
          console.log(chalk.white('\n  Content:'));
          console.log('  ' + result.content.replace(/\n/g, '\n  '));
        }
        console.log(chalk.gray('─'.repeat(60)));
        console.log('');
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Failed: ${error}`);
      process.exit(1);
    }
  });

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

// Configuration management commands
program
  .command('config')
  .description('Configuration management commands')
  .addCommand(
    new Command('init')
      .description('Initialize a new Contrag configuration file')
      .option('--force', 'Overwrite existing configuration')
      .option('--template <template>', 'Use a specific template (basic|advanced|mongodb|postgres)', 'basic')
      .action(async (options) => {
        const configPath = 'contrag.config.json';
        
        if (fs.existsSync(configPath) && !options.force) {
          console.log(chalk.red(`Configuration file ${configPath} already exists. Use --force to overwrite.`));
          return;
        }
        
        let sampleConfig: ContragConfig;
        
        switch (options.template) {
          case 'mongodb':
            sampleConfig = {
              database: {
                plugin: 'mongodb',
                config: {
                  url: 'mongodb://localhost:27017',
                  database: 'your_database'
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
                overlap: 200,
                maxDepth: 3
              },
              masterEntities: [
                {
                  name: 'users',
                  primaryKey: '_id',
                  relationships: {
                    orders: {
                      entity: 'orders',
                      type: 'one-to-many',
                      localKey: '_id',
                      foreignKey: 'user_id'
                    }
                  }
                }
              ],
              systemPrompts: {
                default: 'You are a helpful assistant working with user data.',
                contextBuilder: 'Build comprehensive context from user relationships.',
                queryProcessor: 'Process queries accurately using the provided context.'
              }
            };
            break;
            
          case 'postgres':
            sampleConfig = {
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
                plugin: 'pgvector',
                config: {
                  host: 'localhost',
                  port: 5432,
                  database: 'your_database',
                  user: 'your_username',
                  password: 'your_password'
                }
              },
              embedder: {
                plugin: 'gemini',
                config: {
                  apiKey: 'your_gemini_api_key',
                  model: 'embedding-001'
                }
              },
              contextBuilder: {
                chunkSize: 1000,
                overlap: 200,
                maxDepth: 3
              }
            };
            break;
            
          case 'advanced':
            sampleConfig = {
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
                  url: 'http://localhost:8080',
                  apiKey: 'your_weaviate_api_key'
                }
              },
              embedder: {
                plugin: 'openai',
                config: {
                  apiKey: 'your_openai_api_key',
                  model: 'text-embedding-3-large'
                }
              },
              contextBuilder: {
                chunkSize: 1500,
                overlap: 300,
                maxDepth: 4,
                relationshipLimit: 15
              },
              masterEntities: [
                {
                  name: 'User',
                  primaryKey: 'id',
                  relationships: {
                    orders: {
                      entity: 'Order',
                      type: 'one-to-many',
                      localKey: 'id',
                      foreignKey: 'user_id'
                    },
                    profile: {
                      entity: 'UserProfile',
                      type: 'one-to-one',
                      localKey: 'id',
                      foreignKey: 'user_id'
                    }
                  },
                  sampleFilters: {
                    active: true
                  }
                }
              ],
              systemPrompts: {
                default: 'You are a helpful assistant specialized in analyzing user behavior and relationships.',
                contextBuilder: 'Create comprehensive context that captures user relationships, preferences, and interaction history.',
                queryProcessor: 'Analyze queries in the context of user data and provide relevant, personalized responses.',
                custom: {
                  analytics: 'Focus on data patterns and insights when analyzing user information.',
                  support: 'Provide helpful customer support responses based on user history.'
                }
              }
            };
            break;
            
          default: // basic
            sampleConfig = {
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
        }
        
        fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
        console.log(chalk.green(`✓ Created ${configPath} with ${options.template} template`));
        console.log(chalk.yellow('Please update the configuration with your actual connection details.'));
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate the current configuration')
      .action(async () => {
        const spinner = ora('Validating configuration...').start();
        
        try {
          const config = loadConfig();
          spinner.text = 'Testing connections...';
          
          const sdk = new ContragSDK();
          await sdk.configure(config);
          
          // Test all connections
          const [dbResult, vectorResult, embedderResult] = await Promise.all([
            sdk.testDatabaseConnection(),
            sdk.testVectorStoreConnection(), 
            sdk.testEmbedderConnection()
          ]);
          
          spinner.stop();
          
          console.log(chalk.green('✓ Configuration validation complete\n'));
          
          // Display results
          const results = [
            { name: 'Database', result: dbResult },
            { name: 'Vector Store', result: vectorResult },
            { name: 'Embedder', result: embedderResult }
          ];
          
          for (const { name, result } of results) {
            const status = result.connected ? chalk.green('✓') : chalk.red('✗');
            const latency = result.latency ? chalk.gray(`(${result.latency}ms)`) : '';
            console.log(`${status} ${name} ${latency}`);
            
            if (!result.connected && result.error) {
              console.log(chalk.red(`  Error: ${result.error}`));
            }
            
            if (result.details) {
              for (const [key, value] of Object.entries(result.details)) {
                console.log(chalk.gray(`  ${key}: ${value}`));
              }
            }
          }
          
          await sdk.disconnect();
        } catch (error) {
          spinner.fail(`Validation failed: ${error}`);
          process.exit(1);
        }
      })
  );

// Version
program
  .version('1.0.0', '-v, --version', 'Display version number');

// Help
program
  .name('contrag')
  .description('Context Graph Builder - Build personalized vector stores from entity relationships')
  .addHelpText('after', `
Examples:
  Configuration:
  $ contrag config init --template postgres     # Initialize with PostgreSQL template
  $ contrag config init --template mongodb     # Initialize with MongoDB template
  $ contrag config validate                    # Validate current configuration
  
  Connection Testing:
  $ contrag test all                           # Test all connections
  $ contrag test db                           # Test database connection only
  $ contrag test vector                       # Test vector store connection only
  $ contrag test embedder                     # Test embedder connection only
  
  Schema and Data Exploration:
  $ contrag introspect                         # Print schema relationships
  $ contrag sample --entity User --limit 5    # Get 5 sample user records
  $ contrag sample --entity User --uid 123    # Get all related data for user 123
  $ contrag sample --entity Order --filter '{"status": "active"}'
  
  Vector Store Management:
  $ contrag vector stats                       # Show vector store statistics
  $ contrag vector namespaces                  # List all namespaces
  $ contrag vector search --text "user orders" --namespace User:123
  
  Context Building and Querying:
  $ contrag build --entity User --uid 123     # Build context for User 123
  $ contrag query --namespace User:123 --query "What orders did I place?"
  
Configuration Templates:
  basic    - Simple PostgreSQL + Weaviate + OpenAI setup
  postgres - PostgreSQL + pgvector + Gemini setup  
  mongodb  - MongoDB + Weaviate + OpenAI setup
  advanced - Full configuration with master entities and system prompts
  
Environment Variables:
  Database (PostgreSQL):
    CONTRAG_DB_PLUGIN=postgres
    CONTRAG_DB_HOST=localhost
    CONTRAG_DB_PORT=5432
    CONTRAG_DB_NAME=your_database
    CONTRAG_DB_USER=username
    CONTRAG_DB_PASSWORD=password
  
  Database (MongoDB):
    CONTRAG_DB_PLUGIN=mongodb
    CONTRAG_DB_URL=mongodb://localhost:27017
    CONTRAG_DB_NAME=your_database
  
  Vector Store (Weaviate):
    CONTRAG_VECTOR_PLUGIN=weaviate
    CONTRAG_VECTOR_URL=http://localhost:8080
    CONTRAG_VECTOR_API_KEY=your_api_key
  
  Vector Store (pgvector):
    CONTRAG_VECTOR_PLUGIN=pgvector
    CONTRAG_VECTOR_HOST=localhost
    CONTRAG_VECTOR_PORT=5432
    CONTRAG_VECTOR_DATABASE=your_database
    CONTRAG_VECTOR_USER=username
    CONTRAG_VECTOR_PASSWORD=password
  
  Embedders:
    CONTRAG_EMBEDDER_PLUGIN=openai|gemini
    CONTRAG_OPENAI_API_KEY=your_openai_key
    CONTRAG_GEMINI_API_KEY=your_gemini_key
  
Master Entity Configuration:
  Master entities define the primary entities around which context is built.
  They specify relationships and how data should be traversed and organized.
  
  Example configuration:
  {
    "masterEntities": [
      {
        "name": "User",
        "primaryKey": "id",
        "relationships": {
          "orders": {
            "entity": "Order",
            "type": "one-to-many",
            "localKey": "id",
            "foreignKey": "user_id"
          }
        },
        "sampleFilters": {
          "active": true
        }
      }
    ]
  }
  
System Prompts:
  System prompts customize how the LLM processes context and queries.
  
  Available prompt types:
  - default: General assistant behavior
  - contextBuilder: How to organize entity relationships
  - queryProcessor: How to interpret and answer queries
  - custom: User-defined prompts for specific use cases
`);

// Add compatibility command group
const compatCmd = program
  .command('compatibility')
  .alias('compat')
  .description('Test and fix system compatibility');

compatCmd
  .command('test')
  .description('Run comprehensive compatibility tests')
  .option('-c, --config <config>', 'Configuration file path', 'contrag.config.json')
  .option('--database-only', 'Test database compatibility only')
  .option('--vector-store-only', 'Test vector store compatibility only')  
  .option('--embedder-only', 'Test embedder compatibility only')
  .option('--dimensions-only', 'Test dimension compatibility only')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      console.log(chalk.blue('Running compatibility tests...\n'));
      
      if (options.databaseOnly) {
        const result = await sdk.testDatabaseCompatibility();
        printCompatibilityResult('Database', result);
      } else if (options.vectorStoreOnly) {
        const result = await sdk.testVectorStoreCompatibility();
        printCompatibilityResult('Vector Store', result);
      } else if (options.embedderOnly) {
        const result = await sdk.testEmbedderCompatibility();
        printCompatibilityResult('Embedder', result);
      } else if (options.dimensionsOnly) {
        const result = await sdk.testDimensionCompatibility();
        printDimensionCompatibility(result);
      } else {
        const result = await sdk.testCompatibility();
        printComprehensiveCompatibility(result);
      }
      
    } catch (error) {
      console.error(chalk.red('Compatibility test failed:'), error);
      process.exit(1);
    }
  });

compatCmd
  .command('fix-dimensions')
  .description('Automatically fix dimension mismatches')
  .option('-c, --config <config>', 'Configuration file path', 'contrag.config.json')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      console.log(chalk.blue('Checking dimension compatibility...\n'));
      
      const dimensionTest = await sdk.testDimensionCompatibility();
      printDimensionCompatibility(dimensionTest);
      
      if (dimensionTest.compatible) {
        console.log(chalk.green('✓ Dimensions already compatible!'));
        return;
      }
      
      if (!dimensionTest.autoFixAvailable) {
        console.log(chalk.yellow('⚠ Auto-fix not available. Please manually configure dimensions.'));
        console.log('Recommendations:');
        dimensionTest.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
        return;
      }
      
      console.log(chalk.blue('Attempting to fix dimensions...'));
      const fixResult = await sdk.fixDimensions();
      
      if (fixResult.success) {
        console.log(chalk.green(`✓ ${fixResult.message}`));
        
        // Verify fix
        const verifyTest = await sdk.testDimensionCompatibility();
        if (verifyTest.compatible) {
          console.log(chalk.green('✓ Dimension fix verified successfully!'));
        } else {
          console.log(chalk.yellow('⚠ Fix applied but verification failed. Please check manually.'));
        }
      } else {
        console.log(chalk.red(`✗ ${fixResult.message}`));
      }
      
    } catch (error) {
      console.error(chalk.red('Dimension fix failed:'), error);
      process.exit(1);
    }
  });

compatCmd
  .command('validate-config')
  .description('Validate configuration for common issues')
  .option('-c, --config <config>', 'Configuration file path', 'contrag.config.json')
  .action(async (options) => {
    try {
      const config = loadConfig();
      
      console.log(chalk.blue('Validating configuration...\n'));
      
      const issues = validateConfigurationSchema(config);
      
      if (issues.length === 0) {
        console.log(chalk.green('✓ Configuration is valid!'));
      } else {
        console.log(chalk.yellow(`Found ${issues.length} configuration issue(s):\n`));
        issues.forEach((issue, index) => {
          console.log(`${index + 1}. ${chalk.yellow(issue)}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('Configuration validation failed:'), error);
      process.exit(1);
    }
  });

// Helper functions for printing compatibility results
function printCompatibilityResult(component: string, result: any) {
  const status = result.compatible ? 
    chalk.green('✓ COMPATIBLE') : 
    chalk.red('✗ INCOMPATIBLE');
    
  console.log(`${component}: ${status}\n`);
  
  if (result.issues && result.issues.length > 0) {
    console.log('Issues:');
    result.issues.forEach((issue: any, index: number) => {
      const severity = issue.severity === 'error' ? 
        chalk.red('ERROR') : 
        chalk.yellow('WARNING');
      console.log(`  ${index + 1}. [${severity}] ${issue.message}`);
      if (issue.expected !== undefined && issue.actual !== undefined) {
        console.log(`     Expected: ${issue.expected}, Actual: ${issue.actual}`);
      }
      if (issue.fixSuggestion) {
        console.log(`     Fix: ${issue.fixSuggestion}`);
      }
    });
    console.log();
  }
  
  if (result.recommendations && result.recommendations.length > 0) {
    console.log('Recommendations:');
    result.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
    console.log();
  }
}

function printDimensionCompatibility(result: any) {
  const status = result.compatible ? 
    chalk.green('✓ COMPATIBLE') : 
    chalk.red('✗ INCOMPATIBLE');
    
  console.log(`Dimension Compatibility: ${status}\n`);
  console.log(`Embedder dimensions: ${result.embedderDimensions}`);
  console.log(`Vector store dimensions: ${result.vectorStoreDimensions}`);
  
  if (result.autoFixAvailable) {
    console.log(chalk.blue('Auto-fix available: Yes'));
  } else {
    console.log(chalk.gray('Auto-fix available: No'));
  }
  
  if (result.recommendations && result.recommendations.length > 0) {
    console.log('\nRecommendations:');
    result.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
  }
  console.log();
}

function printComprehensiveCompatibility(result: any) {
  const status = result.overall ? 
    chalk.green('✓ SYSTEM COMPATIBLE') : 
    chalk.red('✗ SYSTEM INCOMPATIBLE');
    
  console.log(`${status}\n`);
  
  // Component status
  console.log('Components:');
  Object.entries(result.components).forEach(([name, comp]: [string, any]) => {
    const componentStatus = comp.compatible ? 
      chalk.green('✓') : 
      chalk.red('✗');
    console.log(`  ${componentStatus} ${name.charAt(0).toUpperCase() + name.slice(1)}`);
  });
  
  console.log(`\nSummary:`);
  console.log(`  Total issues: ${result.summary.totalIssues}`);
  console.log(`  Critical issues: ${result.summary.criticalIssues}`);
  console.log(`  Fixable issues: ${result.summary.fixableIssues}`);
  
  // Detailed results
  console.log('\n' + '='.repeat(60));
  
  if (!result.components.database.compatible) {
    printCompatibilityResult('Database', result.components.database);
  }
  
  if (!result.components.vectorStore.compatible) {
    printCompatibilityResult('Vector Store', result.components.vectorStore);
  }
  
  if (!result.components.embedder.compatible) {
    printCompatibilityResult('Embedder', result.components.embedder);
  }
  
  if (!result.components.dimensions.compatible) {
    printDimensionCompatibility(result.components.dimensions);
  }
}

function validateConfigurationSchema(config: any): string[] {
  const issues: string[] = [];
  
  // Check required sections
  if (!config.database) {
    issues.push('Missing database configuration');
  }
  if (!config.vectorStore) {
    issues.push('Missing vector store configuration');
  }
  if (!config.embedder) {
    issues.push('Missing embedder configuration');
  }
  
  // Check dimension consistency
  const embedderDims = config.embedder?.config?.dimensions;
  const vectorStoreDims = config.vectorStore?.config?.dimensions;
  
  if (embedderDims && vectorStoreDims && embedderDims !== vectorStoreDims) {
    issues.push(`Dimension mismatch: embedder (${embedderDims}) vs vector store (${vectorStoreDims})`);
  }
  
  // Check connection parameters
  if (config.database?.config) {
    const dbConfig = config.database.config;
    if (!dbConfig.host && !dbConfig.uri && !dbConfig.connectionString) {
      issues.push('Database missing connection parameters (host/uri/connectionString)');
    }
  }
  
  if (config.vectorStore?.config) {
    const vsConfig = config.vectorStore.config;
    if (!vsConfig.url && !vsConfig.host) {
      issues.push('Vector store missing connection parameters (url/host)');
    }
  }
  
  // Check API keys for cloud services
  if (config.embedder?.plugin === 'openai' && !config.embedder?.config?.apiKey) {
    issues.push('OpenAI embedder missing API key');
  }
  
  if (config.embedder?.plugin === 'gemini' && !config.embedder?.config?.apiKey) {
    issues.push('Gemini embedder missing API key');
  }
  
  if (config.vectorStore?.plugin === 'weaviate' && config.vectorStore?.config?.url?.includes('weaviate.io') && !config.vectorStore?.config?.apiKey) {
    issues.push('Weaviate cloud instance missing API key');
  }
  
  return issues;
}

// V1.3.0 Preference Tracking Commands
const prefsCmd = program
  .command('preferences')
  .alias('prefs')
  .description('Manage user preferences and personalization (v1.3.0)');

prefsCmd
  .command('extract')
  .description('Extract preferences from conversation text')
  .requiredOption('-u, --user-id <userId>', 'User ID')
  .requiredOption('-t, --text <text>', 'Conversation text to analyze')
  .option('--session-id <sessionId>', 'Session ID for tracking')
  .option('--conversation-id <conversationId>', 'Conversation ID for tracking')
  .option('--categories <categories>', 'Comma-separated list of categories to focus on')
  .option('--confidence-threshold <threshold>', 'Minimum confidence threshold (0-1)', '0.7')
  .option('--max-preferences <max>', 'Maximum number of preferences to extract', '10')
  .action(async (options) => {
    const spinner = ora('Extracting preferences from conversation...').start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      const categories = options.categories ? options.categories.split(',').map((s: string) => s.trim()) : undefined;
      
      const extractionOptions = {
        categories,
        confidenceThreshold: parseFloat(options.confidenceThreshold),
        maxPreferences: parseInt(options.maxPreferences),
        extractImplicit: true
      };

      const result = await (sdk as any).extractPreferences({
        userId: options.userId,
        conversationText: options.text,
        sessionId: options.sessionId,
        conversationId: options.conversationId,
        extractionOptions
      });

      spinner.succeed('Preferences extracted successfully!');
      
      console.log(`\nExtracted ${result.extractedPreferences.length} preferences:`);
      console.log(`Overall confidence: ${Math.round(result.confidence * 100)}%`);
      console.log(`Processing time: ${result.processingTime}ms`);
      console.log(`LLM Model: ${result.llmModel}`);
      
      if (result.extractedPreferences.length > 0) {
        console.log('\nPreferences:');
        result.extractedPreferences.forEach((pref: any, index: number) => {
          const confidenceBar = '█'.repeat(Math.round(pref.confidence * 10));
          console.log(`\n${index + 1}. ${chalk.cyan(pref.category)} - ${chalk.yellow(pref.type)}`);
          console.log(`   Value: ${chalk.green(JSON.stringify(pref.value))}`);
          console.log(`   Confidence: ${chalk.blue(confidenceBar)} ${Math.round(pref.confidence * 100)}%`);
          console.log(`   Source: ${pref.source}`);
          if (pref.context?.reasoning) {
            console.log(`   Reasoning: ${chalk.gray(pref.context.reasoning)}`);
          }
        });
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Preference extraction failed: ${error}`);
      process.exit(1);
    }
  });

prefsCmd
  .command('profile')
  .description('View or manage user profile')
  .requiredOption('-u, --user-id <userId>', 'User ID')
  .option('--create', 'Create new profile if it doesn\'t exist')
  .option('--analytics', 'Show detailed analytics')
  .action(async (options) => {
    const spinner = ora('Retrieving user profile...').start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      let profile = await (sdk as any).getUserProfile(options.userId);
      
      if (!profile && options.create) {
        spinner.text = 'Creating new user profile...';
        profile = await (sdk as any).createUserProfile(options.userId);
      }
      
      if (!profile) {
        spinner.fail('User profile not found. Use --create to create a new profile.');
        return;
      }
      
      spinner.succeed('Profile retrieved successfully!');
      
      console.log(`\n${chalk.bold('User Profile:')} ${options.userId}`);
      console.log(`Created: ${profile.createdAt.toLocaleString()}`);
      console.log(`Last Updated: ${profile.lastUpdated.toLocaleString()}`);
      console.log(`Preferences: ${profile.preferences.length}`);
      console.log(`Segments: ${profile.segments.join(', ') || 'None'}`);
      console.log(`Engagement Score: ${profile.analytics.engagementScore}/100`);
      
      if (profile.analytics.topCategories.length > 0) {
        console.log(`\nTop Categories: ${profile.analytics.topCategories.join(', ')}`);
      }
      
      if (profile.behaviorPatterns.length > 0) {
        console.log('\nBehavior Patterns:');
        profile.behaviorPatterns.slice(0, 3).forEach((pattern: any) => {
          const confidenceBar = '█'.repeat(Math.round(pattern.confidence * 10));
          console.log(`  • ${pattern.type}: ${confidenceBar} ${Math.round(pattern.confidence * 100)}%`);
        });
      }
      
      if (options.analytics) {
        console.log(`\n${chalk.bold('Detailed Analytics:')}`);
        console.log(`Total Interactions: ${profile.analytics.totalInteractions}`);
        console.log(`Preference Changes: ${profile.analytics.preferenceChanges}`);
        console.log(`Avg Session Duration: ${profile.analytics.avgSessionDuration}min`);
        console.log(`Last Active: ${profile.analytics.lastActive.toLocaleString()}`);
        
        if (profile.analytics.trendingPreferences.length > 0) {
          console.log(`Trending: ${profile.analytics.trendingPreferences.join(', ')}`);
        }
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Profile retrieval failed: ${error}`);
      process.exit(1);
    }
  });

prefsCmd
  .command('list')
  .description('List user preferences with filters')
  .requiredOption('-u, --user-id <userId>', 'User ID')
  .option('--category <category>', 'Filter by category')
  .option('--type <type>', 'Filter by type (explicit, implicit, inferred)')
  .option('--source <source>', 'Filter by source (conversation, behavior, profile, manual)')
  .option('--min-confidence <confidence>', 'Minimum confidence threshold', '0')
  .option('--limit <limit>', 'Limit number of results', '20')
  .action(async (options) => {
    const spinner = ora('Retrieving user preferences...').start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      const filters: any = {};
      if (options.category) filters.category = options.category;
      if (options.type) filters.type = options.type;
      if (options.source) filters.source = options.source;
      
      const preferences = await (sdk as any).getUserPreferences(options.userId, filters);
      
      // Filter by confidence if specified
      const minConfidence = parseFloat(options.minConfidence);
      const filteredPreferences = preferences
        .filter((p: any) => p.confidence >= minConfidence)
        .slice(0, parseInt(options.limit));
      
      spinner.succeed(`Retrieved ${filteredPreferences.length} preferences`);
      
      if (filteredPreferences.length === 0) {
        console.log('No preferences found matching the criteria.');
        return;
      }
      
      console.log(`\n${chalk.bold('User Preferences:')} ${options.userId}`);
      
      filteredPreferences.forEach((pref: any, index: number) => {
        const confidenceBar = '█'.repeat(Math.round(pref.confidence * 10));
        const age = Math.round((Date.now() - new Date(pref.extractedAt).getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`\n${index + 1}. ${chalk.cyan(pref.category)} - ${chalk.yellow(pref.type)}`);
        console.log(`   Value: ${chalk.green(JSON.stringify(pref.value))}`);
        console.log(`   Confidence: ${chalk.blue(confidenceBar)} ${Math.round(pref.confidence * 100)}%`);
        console.log(`   Source: ${pref.source} | Age: ${age} days`);
        console.log(`   Last Updated: ${new Date(pref.lastUpdated).toLocaleString()}`);
      });
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Preference retrieval failed: ${error}`);
      process.exit(1);
    }
  });

prefsCmd
  .command('analytics')
  .description('Generate preference analytics and insights')
  .option('-u, --user-id <userId>', 'Specific user ID (omit for system-wide analytics)')
  .option('--category <category>', 'Filter by category')
  .option('--type <type>', 'Filter by type (explicit, implicit, inferred)')
  .option('--source <source>', 'Filter by source (conversation, behavior, profile, manual)')
  .option('--days <days>', 'Number of days to analyze', '30')
  .option('--aggregation <agg>', 'Aggregation level (daily, weekly, monthly)', 'daily')
  .action(async (options) => {
    const spinner = ora('Generating preference analytics...').start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      const days = parseInt(options.days);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const query: any = {
        timeRange: { start: startDate, end: endDate },
        aggregation: options.aggregation
      };
      
      if (options.userId) query.userId = options.userId;
      if (options.category) query.category = options.category;
      if (options.type) query.type = options.type;
      if (options.source) query.source = options.source;
      
      const analytics = await (sdk as any).getPreferenceAnalytics(query);
      
      spinner.succeed('Analytics generated successfully!');
      
      console.log(`\n${chalk.bold('Preference Analytics')} ${options.userId ? `for ${options.userId}` : '(System-wide)'}`);
      console.log(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`);
      console.log(`Total Preferences: ${analytics.results.totalPreferences}`);
      
      // Category breakdown
      if (Object.keys(analytics.results.byCategory).length > 0) {
        console.log(`\n${chalk.bold('By Category:')}`);
        const sortedCategories = Object.entries(analytics.results.byCategory)
          .sort(([,a], [,b]) => (b as number) - (a as number));
        
        sortedCategories.forEach(([category, count]) => {
          const percentage = Math.round(((count as number) / analytics.results.totalPreferences) * 100);
          const bar = '█'.repeat(Math.round(percentage / 5));
          console.log(`  ${category.padEnd(15)} ${bar} ${count} (${percentage}%)`);
        });
      }
      
      // Type breakdown  
      if (Object.keys(analytics.results.byType).length > 0) {
        console.log(`\n${chalk.bold('By Type:')}`);
        Object.entries(analytics.results.byType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
      }
      
      // Confidence distribution
      const { high, medium, low } = analytics.results.confidenceDistribution;
      if (high + medium + low > 0) {
        console.log(`\n${chalk.bold('Confidence Distribution:')}`);
        console.log(`  High (>0.8):   ${chalk.green('█'.repeat(Math.round(high / 5)))} ${high}`);
        console.log(`  Medium (0.5-0.8): ${chalk.yellow('█'.repeat(Math.round(medium / 5)))} ${medium}`);
        console.log(`  Low (<0.5):    ${chalk.red('█'.repeat(Math.round(low / 5)))} ${low}`);
      }
      
      // Trending categories
      if (analytics.results.trendingCategories && analytics.results.trendingCategories.length > 0) {
        console.log(`\n${chalk.bold('Trending Categories:')}`);
        analytics.results.trendingCategories.forEach((trend: any) => {
          const trendIcon = trend.trend === 'up' ? '↗️' : trend.trend === 'down' ? '↘️' : '→';
          console.log(`  ${trendIcon} ${trend.category}: ${trend.count}`);
        });
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Analytics generation failed: ${error}`);
      process.exit(1);
    }
  });

prefsCmd
  .command('personalize')
  .description('Generate personalized query with user context')
  .requiredOption('-u, --user-id <userId>', 'User ID')
  .requiredOption('-q, --query <query>', 'Query to personalize')
  .option('--namespace <namespace>', 'Specific namespace to search')
  .option('--preference-weight <weight>', 'Weight of preferences in results (0-1)', '0.7')
  .option('--include-profile', 'Include user profile data in context')
  .action(async (options) => {
    const spinner = ora('Generating personalized response...').start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      const personalizedQuery = {
        userId: options.userId,
        query: options.query,
        namespace: options.namespace,
        includePreferences: true,
        preferenceWeight: parseFloat(options.preferenceWeight),
        contextOptions: {
          includeProfile: options.includeProfile,
          includeBehavior: true,
          includeAnalytics: false
        }
      };
      
      const result = await (sdk as any).personalizedQuery(personalizedQuery);
      
      spinner.succeed('Personalized response generated!');
      
      console.log(`\n${chalk.bold('Original Query:')} ${options.query}`);
      console.log(`${chalk.bold('User:')} ${options.userId}`);
      
      if (result.personalization.preferencesApplied.length > 0) {
        console.log(`\n${chalk.bold('Applied Preferences:')}`);
        result.personalization.preferencesApplied.forEach((pref: any) => {
          console.log(`  • ${pref.category}: ${JSON.stringify(pref.value)} (${Math.round(pref.confidence * 100)}%)`);
        });
      }
      
      console.log(`\n${chalk.bold('Personalization Score:')} ${Math.round(result.personalization.personalizationScore * 100)}%`);
      
      if (result.chunks && result.chunks.length > 0) {
        console.log(`\n${chalk.bold('Context Results:')} ${result.chunks.length} chunks found`);
        
        result.chunks.slice(0, 3).forEach((chunk: any, index: number) => {
          console.log(`\n${index + 1}. ${chalk.cyan(chunk.metadata.entity)}:${chunk.metadata.uid}`);
          console.log(`   ${chunk.content.substring(0, 150)}...`);
        });
      }
      
      if (result.personalization.reasoning) {
        console.log(`\n${chalk.bold('Reasoning:')}`);
        console.log(`${chalk.gray(result.personalization.reasoning)}`);
      }
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Personalization failed: ${error}`);
      process.exit(1);
    }
  });

prefsCmd
  .command('delete')
  .description('Delete all user data and preferences (GDPR compliance)')
  .requiredOption('-u, --user-id <userId>', 'User ID')
  .option('--confirm', 'Confirm deletion without prompt')
  .action(async (options) => {
    if (!options.confirm) {
      console.log(chalk.yellow(`⚠️  This will permanently delete ALL data for user: ${options.userId}`));
      console.log('This includes:');
      console.log('  • All preferences');
      console.log('  • User profile');
      console.log('  • Behavior patterns');
      console.log('  • Analytics data');
      console.log('\nThis action cannot be undone.');
      console.log(chalk.red('Add --confirm flag to proceed with deletion.'));
      return;
    }
    
    const spinner = ora(`Deleting all data for user ${options.userId}...`).start();
    
    try {
      const config = loadConfig();
      const sdk = new ContragSDK(config);
      
      await (sdk as any).deleteUserData(options.userId);
      
      spinner.succeed(`All data for user ${options.userId} has been permanently deleted`);
      
      await sdk.disconnect();
    } catch (error) {
      spinner.fail(`Data deletion failed: ${error}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
