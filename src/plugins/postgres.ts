import { Pool, PoolConfig } from 'pg';
import { 
  DBPlugin, 
  EntitySchema, 
  Field, 
  Relationship, 
  EntityGraph, 
  ConnectionTestResult, 
  SampleDataResult, 
  MasterEntityConfig,
  PreferenceCapableDBPlugin,
  UserPreference,
  UserProfile,
  PreferenceAnalyticsQuery,
  PreferenceAnalyticsResult
} from '../types';
import { DEFAULT_CONFIG, DB_CONSTANTS } from '../constants';

export class PostgresPlugin implements DBPlugin, PreferenceCapableDBPlugin {
  public readonly name = 'postgres';
  private pool: Pool | null = null;

  async connect(config: PoolConfig): Promise<void> {
    this.pool = new Pool(config);
    
    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async introspectSchema(): Promise<EntitySchema[]> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      // Get all tables
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
      `;
      
      const tablesResult = await client.query(tablesQuery, [DB_CONSTANTS.DEFAULT_SCHEMA]);
      const schemas: EntitySchema[] = [];

      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        
        // Get columns
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `;
        
        const columnsResult = await client.query(columnsQuery, [tableName]);
        
        // Get primary keys
        const primaryKeysQuery = `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
        `;
        
        const primaryKeysResult = await client.query(primaryKeysQuery, [tableName]);
        const primaryKeys = new Set(primaryKeysResult.rows.map((row: any) => row.column_name));

        // Get foreign keys
        const foreignKeysQuery = `
          SELECT 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
        `;
        
        const foreignKeysResult = await client.query(foreignKeysQuery, [tableName]);
        const foreignKeys = new Map();
        foreignKeysResult.rows.forEach((row: any) => {
          foreignKeys.set(row.column_name, {
            referencedTable: row.foreign_table_name,
            referencedColumn: row.foreign_column_name
          });
        });

        // Build fields
        const fields: Field[] = columnsResult.rows.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          isPrimaryKey: primaryKeys.has(col.column_name),
          isForeignKey: foreignKeys.has(col.column_name),
          referencedTable: foreignKeys.get(col.column_name)?.referencedTable,
          referencedColumn: foreignKeys.get(col.column_name)?.referencedColumn
        }));

        // Build relationships
        const relationships: Relationship[] = [];
        for (const [columnName, fkInfo] of foreignKeys) {
          relationships.push({
            type: 'many-to-one',
            targetEntity: fkInfo.referencedTable,
            foreignKey: columnName,
            referencedKey: fkInfo.referencedColumn
          });
        }

        // Check for timestamp fields for time series support
        const timestampFields = fields.filter(f => 
          f.type.includes('timestamp') || 
          DB_CONSTANTS.TIME_SERIES_FIELDS.some(tsField => 
            f.name.toLowerCase().includes(tsField.toLowerCase())
          )
        );

        schemas.push({
          name: tableName,
          fields,
          relationships,
          isTimeSeriesEnabled: timestampFields.length > 0,
          timestampField: timestampFields[0]?.name
        });
      }

      return schemas;
    } finally {
      client.release();
    }
  }

  async buildEntityGraph(masterEntity: string, uid: string, maxDepth = 3): Promise<EntityGraph> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    return this.buildEntityGraphRecursive(masterEntity, uid, 0, maxDepth, new Set());
  }

  private async buildEntityGraphRecursive(
    entity: string, 
    uid: string, 
    currentDepth: number, 
    maxDepth: number,
    visited: Set<string>
  ): Promise<EntityGraph> {
    const nodeKey = `${entity}:${uid}`;
    if (visited.has(nodeKey) || currentDepth >= maxDepth) {
      return {
        entity,
        uid,
        data: {},
        relationships: {},
        metadata: { depth: currentDepth, source: 'relational' }
      };
    }

    visited.add(nodeKey);
    const client = await this.pool!.connect();

    try {
      // Get the primary record
      const primaryQuery = `SELECT * FROM ${entity} WHERE id = $1`;
      const primaryResult = await client.query(primaryQuery, [uid]);
      
      if (primaryResult.rows.length === 0) {
        throw new Error(`No record found for ${entity} with id ${uid}`);
      }

      const data = primaryResult.rows[0];
      const relationships: { [key: string]: EntityGraph[] } = {};

      // Get schema to understand relationships
      const schemas = await this.introspectSchema();
      const entitySchema = schemas.find(s => s.name === entity);
      
      if (entitySchema) {
        // Process relationships
        for (const rel of entitySchema.relationships) {
          try {
            if (rel.type === 'many-to-one') {
              // Follow the foreign key
              const foreignKeyValue = data[rel.foreignKey];
              if (foreignKeyValue) {
                const relatedEntity = await this.buildEntityGraphRecursive(
                  rel.targetEntity,
                  foreignKeyValue.toString(),
                  currentDepth + 1,
                  maxDepth,
                  visited
                );
                relationships[rel.targetEntity] = [relatedEntity];
              }
            }
            // Handle one-to-many: find records that reference this entity
            else {
              const reverseQuery = `SELECT id FROM ${rel.targetEntity} WHERE ${rel.foreignKey} = $1`;
              const reverseResult = await client.query(reverseQuery, [uid]);
              
              const relatedEntities: EntityGraph[] = [];
              for (const row of reverseResult.rows.slice(0, DEFAULT_CONFIG.RELATIONSHIP_LIMIT)) { // Limit to prevent explosion
                const relatedEntity = await this.buildEntityGraphRecursive(
                  rel.targetEntity,
                  row.id.toString(),
                  currentDepth + 1,
                  maxDepth,
                  visited
                );
                relatedEntities.push(relatedEntity);
              }
              
              if (relatedEntities.length > 0) {
                relationships[rel.targetEntity] = relatedEntities;
              }
            }
          } catch (error) {
            // Skip failed relationships but continue
            process.stdout.write(`Failed to load relationship ${rel.targetEntity}: ${error}\n`);
          }
        }
      }

      return {
        entity,
        uid,
        data,
        relationships,
        metadata: { 
          depth: currentDepth, 
          source: 'relational',
          timestamp: data.created_at || data.updated_at
        }
      };
    } finally {
      client.release();
      visited.delete(nodeKey);
    }
  }

  supportsTimeSeries(): boolean {
    return true; // Postgres can handle time series data
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.pool) {
        throw new Error('Database not connected');
      }

      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.name,
        connected: true,
        latency,
        details: {
          serverTime: result.rows[0].now,
          poolSize: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        plugin: this.name,
        connected: false,
        error: String(error)
      };
    }
  }

  async getSampleData(entity: string, limit: number = DEFAULT_CONFIG.SAMPLE_LIMIT, filters?: Record<string, any>): Promise<Record<string, any>[]> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      let whereClause = '';
      const params: any[] = [limit];
      
      if (filters && Object.keys(filters).length > 0) {
        const conditions: string[] = [];
        let paramIndex = 2;
        
        for (const [key, value] of Object.entries(filters)) {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
        
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
      
      const query = `SELECT * FROM ${entity} ${whereClause} LIMIT $1`;
      const result = await client.query(query, params);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getRelatedSampleData(masterEntity: string, uid: string, config?: MasterEntityConfig): Promise<SampleDataResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      // Get the master entity data
      const masterQuery = `SELECT * FROM ${masterEntity} WHERE id = $1`;
      const masterResult = await client.query(masterQuery, [uid]);
      
      if (masterResult.rows.length === 0) {
        throw new Error(`No record found for ${masterEntity} with id ${uid}`);
      }

      const masterData = masterResult.rows[0];
      const relatedData: { [entityName: string]: Record<string, any>[] } = {};
      let totalRecords = 1;

      // Use provided config or introspect schema
      if (config?.relationships) {
        for (const [relationName, relationConfig] of Object.entries(config.relationships)) {
          try {
            let query: string;
            let params: any[];
            
            if (relationConfig.type === 'one-to-many' || relationConfig.type === 'many-to-many') {
              // Find records that reference the master entity
              query = `SELECT * FROM ${relationConfig.entity} WHERE ${relationConfig.foreignKey} = $1 LIMIT $2`;
              params = [masterData[relationConfig.localKey], DEFAULT_CONFIG.RELATIONSHIP_LIMIT];
            } else {
              // Follow foreign key reference
              const foreignKeyValue = masterData[relationConfig.localKey];
              if (foreignKeyValue) {
                query = `SELECT * FROM ${relationConfig.entity} WHERE ${relationConfig.foreignKey} = $1`;
                params = [foreignKeyValue];
              } else {
                continue;
              }
            }
            
            const result = await client.query(query, params);
            relatedData[relationName] = result.rows;
            totalRecords += result.rows.length;
          } catch (error) {
            // Skip failed relationships
            console.warn(`Failed to load relationship ${relationName}: ${error}`);
          }
        }
      } else {
        // Fallback to schema introspection
        const schemas = await this.introspectSchema();
        const entitySchema = schemas.find(s => s.name === masterEntity);
        
        if (entitySchema) {
          for (const rel of entitySchema.relationships.slice(0, 5)) { // Limit relationships
            try {
              let query: string;
              let params: any[];
              
              if (rel.type === 'many-to-one') {
                const foreignKeyValue = masterData[rel.foreignKey];
                if (foreignKeyValue) {
                  query = `SELECT * FROM ${rel.targetEntity} WHERE ${rel.referencedKey} = $1`;
                  params = [foreignKeyValue];
                } else {
                  continue;
                }
              } else {
                // Reverse relationship
                query = `SELECT * FROM ${rel.targetEntity} WHERE ${rel.foreignKey} = $1 LIMIT $2`;
                params = [uid, DEFAULT_CONFIG.RELATIONSHIP_LIMIT];
              }
              
              const result = await client.query(query, params);
              if (result.rows.length > 0) {
                relatedData[rel.targetEntity] = result.rows;
                totalRecords += result.rows.length;
              }
            } catch (error) {
              // Skip failed relationships
              console.warn(`Failed to load relationship ${rel.targetEntity}: ${error}`);
            }
          }
        }
      }

      return {
        masterEntity,
        uid,
        data: masterData,
        relatedData,
        totalRecords
      };
    } finally {
      client.release();
    }
  }

  // V1.3.0 Preference Storage Methods
  async storeUserPreferences(preferences: UserPreference[]): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create preferences table if it doesn't exist
      await this.createPreferenceTablesIfNotExists(client);

      for (const pref of preferences) {
        const insertQuery = `
          INSERT INTO user_preferences (
            id, user_id, category, type, value, confidence, source,
            extracted_at, last_updated, context, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            confidence = EXCLUDED.confidence,
            last_updated = EXCLUDED.last_updated,
            context = EXCLUDED.context,
            metadata = EXCLUDED.metadata
        `;

        await client.query(insertQuery, [
          pref.id,
          pref.userId,
          pref.category,
          pref.type,
          JSON.stringify(pref.value),
          pref.confidence,
          pref.source,
          pref.extractedAt,
          pref.lastUpdated,
          JSON.stringify(pref.context || {}),
          JSON.stringify(pref.metadata || {})
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserPreferences(userId: string, filters?: Partial<UserPreference>): Promise<UserPreference[]> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (filters) {
        if (filters.category) {
          whereClause += ` AND category = $${paramIndex}`;
          params.push(filters.category);
          paramIndex++;
        }
        if (filters.type) {
          whereClause += ` AND type = $${paramIndex}`;
          params.push(filters.type);
          paramIndex++;
        }
        if (filters.source) {
          whereClause += ` AND source = $${paramIndex}`;
          params.push(filters.source);
          paramIndex++;
        }
      }

      const query = `
        SELECT * FROM user_preferences 
        ${whereClause}
        ORDER BY confidence DESC, last_updated DESC
      `;

      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        category: row.category,
        type: row.type,
        value: JSON.parse(row.value),
        confidence: row.confidence,
        source: row.source,
        extractedAt: row.extracted_at,
        lastUpdated: row.last_updated,
        context: JSON.parse(row.context || '{}'),
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } finally {
      client.release();
    }
  }

  async updateUserProfile(profile: UserProfile): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create profiles table if it doesn't exist
      await this.createProfileTablesIfNotExists(client);

      const upsertQuery = `
        INSERT INTO user_profiles (
          user_id, created_at, last_updated, segments, behavior_patterns,
          privacy_settings, analytics, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          last_updated = EXCLUDED.last_updated,
          segments = EXCLUDED.segments,
          behavior_patterns = EXCLUDED.behavior_patterns,
          privacy_settings = EXCLUDED.privacy_settings,
          analytics = EXCLUDED.analytics,
          metadata = EXCLUDED.metadata
      `;

      await client.query(upsertQuery, [
        profile.userId,
        profile.createdAt,
        profile.lastUpdated,
        JSON.stringify(profile.segments),
        JSON.stringify(profile.behaviorPatterns),
        JSON.stringify(profile.privacySettings),
        JSON.stringify(profile.analytics),
        JSON.stringify(profile.metadata || {})
      ]);

      // Store preferences if they exist
      if (profile.preferences.length > 0) {
        await this.storeUserPreferences(profile.preferences);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      const profileQuery = `SELECT * FROM user_profiles WHERE user_id = $1`;
      const profileResult = await client.query(profileQuery, [userId]);

      if (profileResult.rows.length === 0) {
        return null;
      }

      const row = profileResult.rows[0];

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);

      return {
        userId: row.user_id,
        createdAt: row.created_at,
        lastUpdated: row.last_updated,
        preferences,
        segments: JSON.parse(row.segments),
        behaviorPatterns: JSON.parse(row.behavior_patterns),
        privacySettings: JSON.parse(row.privacy_settings),
        analytics: JSON.parse(row.analytics),
        metadata: JSON.parse(row.metadata || '{}')
      };
    } finally {
      client.release();
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete preferences
      await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
      
      // Delete profile
      await client.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPreferenceAnalytics(query: PreferenceAnalyticsQuery): Promise<PreferenceAnalyticsResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (query.userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(query.userId);
        paramIndex++;
      }

      if (query.category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(query.category);
        paramIndex++;
      }

      if (query.type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(query.type);
        paramIndex++;
      }

      if (query.source) {
        whereClause += ` AND source = $${paramIndex}`;
        params.push(query.source);
        paramIndex++;
      }

      if (query.timeRange) {
        whereClause += ` AND extracted_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(query.timeRange.start, query.timeRange.end);
        paramIndex += 2;
      }

      // Get total count
      const totalQuery = `SELECT COUNT(*) as total FROM user_preferences WHERE ${whereClause}`;
      const totalResult = await client.query(totalQuery, params);
      const totalPreferences = parseInt(totalResult.rows[0].total);

      // Get category breakdown
      const categoryQuery = `
        SELECT category, COUNT(*) as count 
        FROM user_preferences 
        WHERE ${whereClause}
        GROUP BY category 
        ORDER BY count DESC
      `;
      const categoryResult = await client.query(categoryQuery, params);
      const byCategory: Record<string, number> = {};
      categoryResult.rows.forEach(row => {
        byCategory[row.category] = parseInt(row.count);
      });

      // Get type breakdown
      const typeQuery = `
        SELECT type, COUNT(*) as count 
        FROM user_preferences 
        WHERE ${whereClause}
        GROUP BY type
      `;
      const typeResult = await client.query(typeQuery, params);
      const byType: Record<string, number> = {};
      typeResult.rows.forEach(row => {
        byType[row.type] = parseInt(row.count);
      });

      // Get source breakdown
      const sourceQuery = `
        SELECT source, COUNT(*) as count 
        FROM user_preferences 
        WHERE ${whereClause}
        GROUP BY source
      `;
      const sourceResult = await client.query(sourceQuery, params);
      const bySource: Record<string, number> = {};
      sourceResult.rows.forEach(row => {
        bySource[row.source] = parseInt(row.count);
      });

      // Get confidence distribution
      const confidenceQuery = `
        SELECT 
          SUM(CASE WHEN confidence > 0.8 THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN confidence BETWEEN 0.5 AND 0.8 THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN confidence < 0.5 THEN 1 ELSE 0 END) as low
        FROM user_preferences 
        WHERE ${whereClause}
      `;
      const confidenceResult = await client.query(confidenceQuery, params);
      const confidenceRow = confidenceResult.rows[0];

      return {
        query,
        results: {
          totalPreferences,
          byCategory,
          byType,
          bySource,
          confidenceDistribution: {
            high: parseInt(confidenceRow.high) || 0,
            medium: parseInt(confidenceRow.medium) || 0,
            low: parseInt(confidenceRow.low) || 0
          },
          trendingCategories: Object.entries(byCategory)
            .slice(0, 5)
            .map(([category, count]) => ({
              category,
              count,
              trend: 'stable' as const // Would need historical data for real trend analysis
            }))
        },
        generatedAt: new Date()
      };
    } finally {
      client.release();
    }
  }

  async getUserSegments(userId: string): Promise<string[]> {
    const profile = await this.getUserProfile(userId);
    return profile?.segments || [];
  }

  async updateBehaviorPatterns(userId: string, patterns: any[]): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (profile) {
      profile.behaviorPatterns = patterns;
      await this.updateUserProfile(profile);
    }
  }

  private async createPreferenceTablesIfNotExists(client: any): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('explicit', 'implicit', 'inferred')),
        value JSONB NOT NULL,
        confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        source VARCHAR(50) NOT NULL CHECK (source IN ('conversation', 'behavior', 'profile', 'manual')),
        extracted_at TIMESTAMP NOT NULL,
        last_updated TIMESTAMP NOT NULL,
        context JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_preferences_user_id (user_id),
        INDEX idx_user_preferences_category (category),
        INDEX idx_user_preferences_type (type),
        INDEX idx_user_preferences_confidence (confidence),
        INDEX idx_user_preferences_extracted_at (extracted_at)
      )
    `;

    await client.query(createTableQuery);
  }

  private async createProfileTablesIfNotExists(client: any): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP NOT NULL,
        last_updated TIMESTAMP NOT NULL,
        segments JSONB,
        behavior_patterns JSONB,
        privacy_settings JSONB NOT NULL,
        analytics JSONB NOT NULL,
        metadata JSONB,
        INDEX idx_user_profiles_last_updated (last_updated)
      )
    `;

    await client.query(createTableQuery);
  }
}
