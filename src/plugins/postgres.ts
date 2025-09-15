import { Pool, PoolConfig } from 'pg';
import { DBPlugin, EntitySchema, Field, Relationship, EntityGraph, ConnectionTestResult, SampleDataResult, MasterEntityConfig } from '../types';
import { DEFAULT_CONFIG, DB_CONSTANTS } from '../constants';

export class PostgresPlugin implements DBPlugin {
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
}
