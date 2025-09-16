import { 
  ContragConfig,
  CompatibilityTestResult,
  DimensionCompatibilityResult,
  ComprehensiveCompatibilityResult,
  CompatibilityIssue,
  DBPlugin,
  VectorStorePlugin,
  EmbedderPlugin
} from './types';
import { DEFAULT_CONFIG, ERROR_MESSAGES, PLUGIN_NAMES } from './constants';

export class CompatibilityTester {
  private dbPlugin: DBPlugin | null = null;
  private vectorStorePlugin: VectorStorePlugin | null = null;
  private embedderPlugin: EmbedderPlugin | null = null;
  private config: ContragConfig | null = null;

  constructor(
    dbPlugin?: DBPlugin,
    vectorStorePlugin?: VectorStorePlugin,
    embedderPlugin?: EmbedderPlugin,
    config?: ContragConfig
  ) {
    this.dbPlugin = dbPlugin || null;
    this.vectorStorePlugin = vectorStorePlugin || null;
    this.embedderPlugin = embedderPlugin || null;
    this.config = config || null;
  }

  async testDatabaseCompatibility(): Promise<CompatibilityTestResult> {
    const issues: CompatibilityIssue[] = [];
    let compatible = true;

    try {
      if (!this.dbPlugin) {
        issues.push({
          type: 'resource_unavailable',
          severity: 'error',
          message: 'Database plugin not configured',
          fixSuggestion: 'Configure database plugin in contrag.config.json'
        });
        compatible = false;
      } else {
        // Test connection
        if (this.dbPlugin.testConnection) {
          const connectionResult = await this.dbPlugin.testConnection();
          if (!connectionResult.connected) {
            issues.push({
              type: 'resource_unavailable',
              severity: 'error',
              message: `Database connection failed: ${connectionResult.error}`,
              fixSuggestion: 'Check database connection parameters and ensure database is running'
            });
            compatible = false;
          }
        }

        // Test schema introspection
        try {
          const schema = await this.dbPlugin.introspectSchema();
          if (!schema || schema.length === 0) {
            issues.push({
              type: 'resource_unavailable',
              severity: 'warning',
              message: 'No database schema found or database is empty',
              fixSuggestion: 'Ensure database contains tables/collections with data'
            });
          }
        } catch (error) {
          issues.push({
            type: 'config_invalid',
            severity: 'error',
            message: `Schema introspection failed: ${error}`,
            fixSuggestion: 'Check database permissions and connection parameters'
          });
          compatible = false;
        }
      }
    } catch (error) {
      issues.push({
        type: 'resource_unavailable',
        severity: 'error',
        message: `Database compatibility test failed: ${error}`,
        fixSuggestion: 'Review database configuration and connection'
      });
      compatible = false;
    }

    return {
      component: 'database',
      compatible,
      issues,
      recommendations: this.generateRecommendations(issues),
      fixable: issues.some(issue => issue.fixSuggestion)
    };
  }

  async testVectorStoreCompatibility(): Promise<CompatibilityTestResult> {
    const issues: CompatibilityIssue[] = [];
    let compatible = true;

    try {
      if (!this.vectorStorePlugin) {
        issues.push({
          type: 'resource_unavailable',
          severity: 'error',
          message: 'Vector store plugin not configured',
          fixSuggestion: 'Configure vector store plugin in contrag.config.json'
        });
        compatible = false;
      } else {
        // Test connection
        if (this.vectorStorePlugin.testConnection) {
          const connectionResult = await this.vectorStorePlugin.testConnection();
          if (!connectionResult.connected) {
            issues.push({
              type: 'resource_unavailable',
              severity: 'error',
              message: `Vector store connection failed: ${connectionResult.error}`,
              fixSuggestion: 'Check vector store connection parameters and ensure service is running'
            });
            compatible = false;
          }
        }

        // Check current dimensions if available
        if (this.vectorStorePlugin.getCurrentDimensions) {
          try {
            const currentDims = await this.vectorStorePlugin.getCurrentDimensions();
            const configDims = this.config?.vectorStore.config.dimensions;
            
            if (configDims && currentDims && currentDims !== configDims) {
              issues.push({
                type: 'dimension_mismatch',
                severity: 'warning',
                message: `Vector store dimensions mismatch`,
                expected: configDims,
                actual: currentDims,
                fixSuggestion: 'Use contrag compatibility fix-dimensions command'
              });
            }
          } catch (error) {
            issues.push({
              type: 'config_invalid',
              severity: 'warning',
              message: `Could not determine vector store dimensions: ${error}`,
              fixSuggestion: 'Manually specify dimensions in configuration'
            });
          }
        }

        // Test basic functionality
        if (this.vectorStorePlugin.getStats) {
          try {
            await this.vectorStorePlugin.getStats();
          } catch (error) {
            issues.push({
              type: 'resource_unavailable',
              severity: 'error',
              message: `Vector store stats retrieval failed: ${error}`,
              fixSuggestion: 'Check vector store permissions and setup'
            });
            compatible = false;
          }
        }
      }
    } catch (error) {
      issues.push({
        type: 'resource_unavailable',
        severity: 'error',
        message: `Vector store compatibility test failed: ${error}`,
        fixSuggestion: 'Review vector store configuration and connection'
      });
      compatible = false;
    }

    return {
      component: 'vectorStore',
      compatible,
      issues,
      recommendations: this.generateRecommendations(issues),
      fixable: issues.some(issue => issue.fixSuggestion)
    };
  }

  async testEmbedderCompatibility(): Promise<CompatibilityTestResult> {
    const issues: CompatibilityIssue[] = [];
    let compatible = true;

    try {
      if (!this.embedderPlugin) {
        issues.push({
          type: 'resource_unavailable',
          severity: 'error',
          message: 'Embedder plugin not configured',
          fixSuggestion: 'Configure embedder plugin in contrag.config.json'
        });
        compatible = false;
      } else {
        // Test connection
        if (this.embedderPlugin.testConnection) {
          const connectionResult = await this.embedderPlugin.testConnection();
          if (!connectionResult.connected) {
            issues.push({
              type: 'resource_unavailable',
              severity: 'error',
              message: `Embedder connection failed: ${connectionResult.error}`,
              fixSuggestion: 'Check API keys and embedder service availability'
            });
            compatible = false;
          }
        }

        // Validate model if specified
        const configuredModel = this.config?.embedder.config.model;
        if (configuredModel && this.embedderPlugin.validateModel) {
          try {
            const modelValid = await this.embedderPlugin.validateModel(configuredModel);
            if (!modelValid) {
              issues.push({
                type: 'config_invalid',
                severity: 'error',
                message: `Invalid embedder model: ${configuredModel}`,
                fixSuggestion: 'Use a supported model name for the selected embedder'
              });
              compatible = false;
            }
          } catch (error) {
            issues.push({
              type: 'config_invalid',
              severity: 'warning',
              message: `Could not validate model: ${error}`,
              fixSuggestion: 'Manually verify model name is correct'
            });
          }
        }

        // Test embedding generation
        try {
          await this.embedderPlugin.embed(['test embedding compatibility']);
        } catch (error) {
          issues.push({
            type: 'resource_unavailable',
            severity: 'error',
            message: `Embedding generation failed: ${error}`,
            fixSuggestion: 'Check API quotas, keys, and model availability'
          });
          compatible = false;
        }
      }
    } catch (error) {
      issues.push({
        type: 'resource_unavailable',
        severity: 'error',
        message: `Embedder compatibility test failed: ${error}`,
        fixSuggestion: 'Review embedder configuration and credentials'
      });
      compatible = false;
    }

    return {
      component: 'embedder',
      compatible,
      issues,
      recommendations: this.generateRecommendations(issues),
      fixable: issues.some(issue => issue.fixSuggestion)
    };
  }

  async testDimensionCompatibility(): Promise<DimensionCompatibilityResult> {
    let embedderDimensions = 0;
    let vectorStoreDimensions = 0;
    let compatible = false;
    let autoFixAvailable = false;
    const recommendations: string[] = [];

    try {
      // Get embedder dimensions
      if (this.embedderPlugin) {
        if (this.embedderPlugin.getModelDimensions) {
          embedderDimensions = await this.embedderPlugin.getModelDimensions();
        } else {
          embedderDimensions = this.embedderPlugin.getDimensions();
        }
      } else {
        embedderDimensions = this.config?.embedder.config.dimensions || 0;
      }

      // Get vector store dimensions
      if (this.vectorStorePlugin?.getCurrentDimensions) {
        const currentDims = await this.vectorStorePlugin.getCurrentDimensions();
        vectorStoreDimensions = currentDims || 0;
      } else {
        vectorStoreDimensions = this.config?.vectorStore.config.dimensions || 0;
      }

      // Check compatibility
      compatible = embedderDimensions > 0 && 
                   vectorStoreDimensions > 0 && 
                   embedderDimensions === vectorStoreDimensions;

      // Check if auto-fix is available
      if (!compatible) {
        autoFixAvailable = !!(
          this.vectorStorePlugin?.setDimensions || 
          this.vectorStorePlugin?.supportsDimensionMigration?.() ||
          this.config?.compatibility?.autoFixDimensions
        );

        if (embedderDimensions === 0) {
          recommendations.push('Configure explicit dimensions in embedder config');
        }
        if (vectorStoreDimensions === 0) {
          recommendations.push('Configure explicit dimensions in vector store config');
        }
        if (embedderDimensions > 0 && vectorStoreDimensions > 0) {
          recommendations.push(`Align dimensions: embedder=${embedderDimensions}, vector store=${vectorStoreDimensions}`);
          if (autoFixAvailable) {
            recommendations.push('Use "contrag compatibility fix-dimensions" command');
          }
        }
      }

    } catch (error) {
      recommendations.push(`Dimension compatibility check failed: ${error}`);
      recommendations.push('Manually specify dimensions in configuration');
    }

    return {
      embedderDimensions,
      vectorStoreDimensions,
      compatible,
      autoFixAvailable,
      recommendations
    };
  }

  async runComprehensiveTest(): Promise<ComprehensiveCompatibilityResult> {
    const [database, vectorStore, embedder, dimensions] = await Promise.all([
      this.testDatabaseCompatibility(),
      this.testVectorStoreCompatibility(),
      this.testEmbedderCompatibility(),
      this.testDimensionCompatibility()
    ]);

    const totalIssues = database.issues.length + vectorStore.issues.length + embedder.issues.length;
    const fixableIssues = [database, vectorStore, embedder].filter(r => r.fixable).length;
    const criticalIssues = [database, vectorStore, embedder]
      .flatMap(r => r.issues)
      .filter(issue => issue.severity === 'error').length;

    const overall = database.compatible && 
                   vectorStore.compatible && 
                   embedder.compatible && 
                   dimensions.compatible;

    return {
      overall,
      components: {
        database,
        vectorStore,
        embedder,
        dimensions
      },
      summary: {
        totalIssues: totalIssues + (dimensions.compatible ? 0 : 1),
        fixableIssues: fixableIssues + (dimensions.autoFixAvailable ? 1 : 0),
        criticalIssues: criticalIssues + (dimensions.compatible ? 0 : 1)
      }
    };
  }

  async fixDimensions(): Promise<{ success: boolean; message: string }> {
    try {
      const dimensionTest = await this.testDimensionCompatibility();
      
      if (dimensionTest.compatible) {
        return { success: true, message: 'Dimensions already compatible' };
      }

      if (!dimensionTest.autoFixAvailable) {
        return { 
          success: false, 
          message: 'Auto-fix not available. Please manually configure dimensions.' 
        };
      }

      const targetDimensions = dimensionTest.embedderDimensions;
      
      if (this.vectorStorePlugin?.setDimensions) {
        await this.vectorStorePlugin.setDimensions(targetDimensions);
        return { 
          success: true, 
          message: `Vector store dimensions updated to ${targetDimensions}` 
        };
      }

      if (this.vectorStorePlugin?.migrateDimensions) {
        await this.vectorStorePlugin.migrateDimensions(
          dimensionTest.vectorStoreDimensions,
          targetDimensions
        );
        return { 
          success: true, 
          message: `Vector store migrated from ${dimensionTest.vectorStoreDimensions} to ${targetDimensions} dimensions` 
        };
      }

      return { 
        success: false, 
        message: 'No suitable fix method available' 
      };

    } catch (error) {
      return { 
        success: false, 
        message: `Fix failed: ${error}` 
      };
    }
  }

  private generateRecommendations(issues: CompatibilityIssue[]): string[] {
    const recommendations: string[] = [];
    
    for (const issue of issues) {
      if (issue.fixSuggestion) {
        recommendations.push(issue.fixSuggestion);
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }
}
