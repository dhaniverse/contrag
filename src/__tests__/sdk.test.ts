import { ContragSDK } from '../index';
import { ContragConfig } from '../types';

// Mock the plugins
jest.mock('../plugins/postgres');
jest.mock('../plugins/mongodb');
jest.mock('../plugins/openai-embedder');
jest.mock('../plugins/weaviate-vector-store');

describe('ContragSDK', () => {
  let sdk: ContragSDK;
  let config: ContragConfig;

  beforeEach(() => {
    config = {
      database: {
        plugin: 'postgres',
        config: { host: 'localhost', port: 5432, database: 'test' }
      },
      vectorStore: {
        plugin: 'weaviate',
        config: { url: 'http://localhost:8080' }
      },
      embedder: {
        plugin: 'openai',
        config: { apiKey: 'test-key' }
      }
    };

    sdk = new ContragSDK();
  });

  afterEach(async () => {
    try {
      await sdk.disconnect();
    } catch {
      // Ignore errors in cleanup
    }
  });

  test('should configure successfully', async () => {
    await expect(sdk.configure(config)).resolves.not.toThrow();
  });

  test('should throw error for unknown database plugin', async () => {
    const invalidConfig = {
      ...config,
      database: { ...config.database, plugin: 'unknown' }
    };

    await expect(sdk.configure(invalidConfig)).rejects.toThrow('Unknown database plugin');
  });

  test('should throw error for unknown vector store plugin', async () => {
    const invalidConfig = {
      ...config,
      vectorStore: { ...config.vectorStore, plugin: 'unknown' }
    };

    await expect(sdk.configure(invalidConfig)).rejects.toThrow('Unknown vector store plugin');
  });

  test('should throw error for unknown embedder plugin', async () => {
    const invalidConfig = {
      ...config,
      embedder: { ...config.embedder, plugin: 'unknown' }
    };

    await expect(sdk.configure(invalidConfig)).rejects.toThrow('Unknown embedder plugin');
  });

  test('should require configuration before use', async () => {
    await expect(sdk.introspectSchema()).rejects.toThrow('Database plugin not configured');
    await expect(sdk.buildFor('User', '123')).rejects.toThrow('Plugins not configured');
    await expect(sdk.query('User:123', 'test')).rejects.toThrow('Vector store plugin not configured');
  });
});
