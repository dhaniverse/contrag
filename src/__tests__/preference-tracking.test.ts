import { ContragSDK } from '../index';
import { ContragConfigV13 } from '../types';

// Mock the plugins
jest.mock('../plugins/postgres');
jest.mock('../plugins/mongodb');
jest.mock('../plugins/openai-embedder');
jest.mock('../plugins/weaviate-vector-store');
jest.mock('../plugins/preference-extractor');

describe('ContragSDK v1.3.0 Preference Tracking', () => {
  let sdk: ContragSDK;
  let configV13: ContragConfigV13;

  beforeEach(() => {
    configV13 = {
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
      },
      // V1.3.0 configuration
      preferenceTracking: {
        enabled: true,
        extractionModel: 'openai',
        extractionConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          confidenceThreshold: 0.7
        },
        storage: {
          retentionDays: 365
        },
        privacy: {
          requireConsent: true,
          allowOptOut: true,
          encryptPreferences: false,
          auditTrail: false
        },
        analytics: {
          enabled: true,
          aggregationLevel: 'user',
          includePersonalData: false
        }
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

  test('should support v1.3.0 configuration', async () => {
    await expect(sdk.configure(configV13)).resolves.not.toThrow();
  });

  test('should detect preference tracking enabled', async () => {
    await sdk.configure(configV13);
    expect(sdk.isPreferenceTrackingEnabled()).toBe(true);
  });

  test('should detect preference tracking disabled for v1.2.0 config', async () => {
    const v12Config = {
      database: configV13.database,
      vectorStore: configV13.vectorStore,
      embedder: configV13.embedder
    };
    
    await sdk.configure(v12Config);
    expect(sdk.isPreferenceTrackingEnabled()).toBe(false);
  });

  test('should maintain backward compatibility with v1.2.0 methods', async () => {
    // Test with v1.2.0 style config (no preference tracking)
    const v12Config = {
      database: configV13.database,
      vectorStore: configV13.vectorStore,
      embedder: configV13.embedder
    };
    
    await sdk.configure(v12Config);
    
    // All v1.2.0 methods should still work
    expect(typeof sdk.introspectSchema).toBe('function');
    expect(typeof sdk.buildFor).toBe('function');
    expect(typeof sdk.query).toBe('function');
    expect(typeof sdk.getEntityGraph).toBe('function');
    expect(typeof sdk.testDatabaseConnection).toBe('function');
    expect(typeof sdk.testVectorStoreConnection).toBe('function');
    expect(typeof sdk.testEmbedderConnection).toBe('function');
    expect(typeof sdk.getSampleData).toBe('function');
    expect(typeof sdk.getRelatedSampleData).toBe('function');
    expect(typeof sdk.getVectorStoreStats).toBe('function');
    expect(typeof sdk.listVectorStoreNamespaces).toBe('function');
    expect(typeof sdk.searchSimilarVectors).toBe('function');
    expect(typeof sdk.getMasterEntityConfig).toBe('function');
    expect(typeof sdk.getSystemPrompt).toBe('function');
    expect(typeof sdk.setSystemPrompt).toBe('function');
    expect(typeof sdk.testCompatibility).toBe('function');
    expect(typeof sdk.fixDimensions).toBe('function');
  });

  test('should have new v1.3.0 methods available', async () => {
    await sdk.configure(configV13);
    
    // New v1.3.0 methods should be available
    expect(typeof sdk.extractPreferences).toBe('function');
    expect(typeof sdk.getUserProfile).toBe('function');
    expect(typeof sdk.createUserProfile).toBe('function');
    expect(typeof sdk.updateUserProfile).toBe('function');
    expect(typeof sdk.getUserPreferences).toBe('function');
    expect(typeof sdk.storeUserPreferences).toBe('function');
    expect(typeof sdk.deleteUserData).toBe('function');
    expect(typeof sdk.personalizedQuery).toBe('function');
    expect(typeof sdk.getPreferenceAnalytics).toBe('function');
    expect(typeof sdk.analyzeUserEngagement).toBe('function');
    expect(typeof sdk.generatePersonalizationInsights).toBe('function');
    expect(typeof sdk.analyzePreferenceQuality).toBe('function');
    expect(typeof sdk.generateRealTimeInsights).toBe('function');
    expect(typeof sdk.testPreferenceExtractorConnection).toBe('function');
  });

  test('should throw appropriate errors when preference tracking is disabled', async () => {
    const v12Config = {
      database: configV13.database,
      vectorStore: configV13.vectorStore,
      embedder: configV13.embedder
    };
    
    await sdk.configure(v12Config);
    
    await expect(sdk.extractPreferences({
      userId: 'test-user',
      conversationText: 'I love pizza'
    })).rejects.toThrow('Preference tracking is not enabled');
    
    await expect(sdk.getUserProfile('test-user')).rejects.toThrow('Preference tracking is not enabled');
    
    await expect(sdk.getPreferenceAnalytics({})).rejects.toThrow('Preference analytics is not enabled');
  });
});
