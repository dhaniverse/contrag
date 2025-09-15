import { MongoClient, Db, Collection } from 'mongodb';
import { DBPlugin, EntitySchema, Field, Relationship, EntityGraph, ConnectionTestResult, SampleDataResult, MasterEntityConfig } from '../types';
import { DEFAULT_CONFIG, DB_CONSTANTS } from '../constants';

export class MongoPlugin implements DBPlugin {
  public readonly name = 'mongodb';
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(config: { url: string; database: string }): Promise<void> {
    this.client = new MongoClient(config.url);
    await this.client.connect();
    this.db = this.client.db(config.database);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async introspectSchema(): Promise<EntitySchema[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const collections = await this.db.listCollections().toArray();
    const schemas: EntitySchema[] = [];

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = this.db.collection(collectionName);

      // Sample documents to infer schema
      const sampleDocs = await collection.find({}).limit(100).toArray();
      
      if (sampleDocs.length === 0) {
        continue;
      }

      const fieldMap = new Map<string, { type: string; nullable: boolean }>();
      const relationships: Relationship[] = [];
      let timestampField: string | undefined;
      let isTimeSeriesEnabled = false;

      // Analyze documents to infer schema
      for (const doc of sampleDocs) {
        this.analyzeDocument(doc, fieldMap);
        
        // Check for timestamp fields
        for (const [key, value] of Object.entries(doc)) {
          if (value instanceof Date || 
              key.toLowerCase().includes('timestamp') ||
              key.toLowerCase().includes('created') ||
              key.toLowerCase().includes('updated')) {
            timestampField = key;
            isTimeSeriesEnabled = true;
            break;
          }
        }
      }

      // Convert field map to fields array
      const fields: Field[] = Array.from(fieldMap.entries()).map(([name, info]) => ({
        name,
        type: info.type,
        nullable: info.nullable,
        isPrimaryKey: name === '_id'
      }));

      // Look for foreign key patterns (ObjectId references)
      for (const field of fields) {
        if (field.type === 'ObjectId' && field.name !== '_id') {
          // Try to infer referenced collection
          const possibleCollectionName = this.inferReferencedCollection(field.name);
          if (possibleCollectionName && collections.some(c => c.name === possibleCollectionName)) {
            field.isForeignKey = true;
            field.referencedTable = possibleCollectionName;
            field.referencedColumn = '_id';
            
            relationships.push({
              type: 'many-to-one',
              targetEntity: possibleCollectionName,
              foreignKey: field.name,
              referencedKey: '_id'
            });
          }
        }
      }

      // Check for array fields that might contain references
      for (const doc of sampleDocs.slice(0, 10)) {
        for (const [key, value] of Object.entries(doc)) {
          if (Array.isArray(value) && value.length > 0) {
            const firstElement = value[0];
            if (this.isObjectId(firstElement)) {
              const possibleCollectionName = this.inferReferencedCollection(key);
              if (possibleCollectionName && collections.some(c => c.name === possibleCollectionName)) {
                relationships.push({
                  type: 'one-to-many',
                  targetEntity: possibleCollectionName,
                  foreignKey: key,
                  referencedKey: '_id'
                });
              }
            }
          }
        }
      }

      schemas.push({
        name: collectionName,
        fields,
        relationships,
        isTimeSeriesEnabled,
        timestampField
      });
    }

    return schemas;
  }

  async buildEntityGraph(masterEntity: string, uid: string, maxDepth = 3): Promise<EntityGraph> {
    if (!this.db) {
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
        metadata: { depth: currentDepth, source: 'document' }
      };
    }

    visited.add(nodeKey);
    
    try {
      const collection = this.db!.collection(entity);
      
      // Try to find by _id first, then by string representation
      let query: any = { _id: uid };
      try {
        // If uid looks like ObjectId, try to convert it
        if (this.isObjectIdString(uid)) {
          const { ObjectId } = require('mongodb');
          query = { _id: new ObjectId(uid) };
        }
      } catch {
        // If conversion fails, search as string
        query = { _id: uid };
      }

      const document = await collection.findOne(query);
      
      if (!document) {
        // Try searching by common ID fields if _id doesn't work
        const altDocument = await collection.findOne({
          $or: [
            { id: uid },
            { user_id: uid },
            { userId: uid }
          ]
        });
        
        if (!altDocument) {
          throw new Error(`No document found for ${entity} with id ${uid}`);
        }
        
        // Use the found document
        Object.assign(document || {}, altDocument);
      }

      const relationships: { [key: string]: EntityGraph[] } = {};

      // Get schema to understand relationships
      const schemas = await this.introspectSchema();
      const entitySchema = schemas.find(s => s.name === entity);
      
      if (entitySchema && document) {
        // Process relationships
        for (const rel of entitySchema.relationships) {
          try {
            if (rel.type === 'many-to-one') {
              // Follow the foreign key reference
              const foreignKeyValue = document[rel.foreignKey];
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
            } else if (rel.type === 'one-to-many') {
              // Handle array references or reverse lookups
              const targetCollection = this.db!.collection(rel.targetEntity);
              
              if (Array.isArray(document[rel.foreignKey])) {
                // Array of references
                const relatedEntities: EntityGraph[] = [];
                const refs = document[rel.foreignKey].slice(0, DEFAULT_CONFIG.RELATIONSHIP_LIMIT); // Limit to prevent explosion
                
                for (const ref of refs) {
                  try {
                    const relatedEntity = await this.buildEntityGraphRecursive(
                      rel.targetEntity,
                      ref.toString(),
                      currentDepth + 1,
                      maxDepth,
                      visited
                    );
                    relatedEntities.push(relatedEntity);
                  } catch {
                    // Skip failed individual references
                  }
                }
                
                if (relatedEntities.length > 0) {
                  relationships[rel.targetEntity] = relatedEntities;
                }
              } else {
                // Reverse lookup - find documents that reference this one
                const reverseQuery: any = {};
                reverseQuery[rel.foreignKey] = document._id;
                
                const relatedDocs = await targetCollection.find(reverseQuery).limit(DEFAULT_CONFIG.RELATIONSHIP_LIMIT).toArray();
                const relatedEntities: EntityGraph[] = [];
                
                for (const doc of relatedDocs) {
                  try {
                    const relatedEntity = await this.buildEntityGraphRecursive(
                      rel.targetEntity,
                      doc._id.toString(),
                      currentDepth + 1,
                      maxDepth,
                      visited
                    );
                    relatedEntities.push(relatedEntity);
                  } catch {
                    // Skip failed individual references
                  }
                }
                
                if (relatedEntities.length > 0) {
                  relationships[rel.targetEntity] = relatedEntities;
                }
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
        data: document || {},
        relationships,
        metadata: {
          depth: currentDepth,
          source: 'document',
          timestamp: document?.[entitySchema?.timestampField || 'createdAt'] || 
                    document?.[entitySchema?.timestampField || 'created_at'] ||
                    document?.[entitySchema?.timestampField || 'timestamp']
        }
      };
    } finally {
      visited.delete(nodeKey);
    }
  }

  supportsTimeSeries(): boolean {
    return true; // MongoDB supports time series collections
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.client || !this.db) {
        throw new Error('Database not connected');
      }

      await this.db.admin().ping();
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.name,
        connected: true,
        latency,
        details: {
          database: this.db.databaseName,
          serverStatus: 'ping successful'
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
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const collection = this.db.collection(entity);
    const query = filters || {};
    
    const documents = await collection.find(query).limit(limit).toArray();
    return documents.map(doc => ({ ...doc, _id: doc._id.toString() }));
  }

  async getRelatedSampleData(masterEntity: string, uid: string, config?: MasterEntityConfig): Promise<SampleDataResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const collection = this.db.collection(masterEntity);
    
    // Try to find the master document
    let masterDoc;
    try {
      // Try ObjectId first if it looks like one
      if (this.isObjectIdString(uid)) {
        const { ObjectId } = require('mongodb');
        masterDoc = await collection.findOne({ _id: new ObjectId(uid) });
      }
    } catch {
      // Fall back to string search
      masterDoc = null;
    }
    
    // If not found, try other common ID fields
    if (!masterDoc) {
      const searchQueries = [
        { id: uid },
        { user_id: uid },
        { userId: uid }
      ];
      
      // Try string _id as fallback
      try {
        searchQueries.unshift({ _id: uid } as any);
      } catch {
        // Ignore if conversion fails
      }
      
      for (const query of searchQueries) {
        masterDoc = await collection.findOne(query);
        if (masterDoc) break;
      }
    }
    
    if (!masterDoc) {
      throw new Error(`No document found for ${masterEntity} with id ${uid}`);
    }

    const relatedData: { [entityName: string]: Record<string, any>[] } = {};
    let totalRecords = 1;

    // Use provided config or introspect relationships
    if (config?.relationships) {
      for (const [relationName, relationConfig] of Object.entries(config.relationships)) {
        try {
          const targetCollection = this.db.collection(relationConfig.entity);
          let docs: any[];
          
          if (relationConfig.type === 'one-to-many' || relationConfig.type === 'many-to-many') {
            // Find documents that reference the master
            const query: any = {};
            query[relationConfig.foreignKey] = masterDoc[relationConfig.localKey];
            docs = await targetCollection.find(query).limit(DEFAULT_CONFIG.RELATIONSHIP_LIMIT).toArray();
          } else {
            // Follow reference
            const refValue = masterDoc[relationConfig.localKey];
            if (refValue) {
              const query: any = {};
              query[relationConfig.foreignKey] = refValue;
              docs = await targetCollection.find(query).toArray();
            } else {
              docs = [];
            }
          }
          
          if (docs.length > 0) {
            relatedData[relationName] = docs.map(doc => ({ ...doc, _id: doc._id.toString() }));
            totalRecords += docs.length;
          }
        } catch (error) {
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
            const targetCollection = this.db.collection(rel.targetEntity);
            let docs: any[];
            
            if (rel.type === 'many-to-one') {
              const refValue = masterDoc[rel.foreignKey];
              if (refValue) {
                const query: any = {};
                query[rel.referencedKey] = refValue;
                docs = await targetCollection.find(query).toArray();
              } else {
                docs = [];
              }
            } else {
              // Reverse lookup
              const query: any = {};
              query[rel.foreignKey] = masterDoc._id;
              docs = await targetCollection.find(query).limit(DEFAULT_CONFIG.RELATIONSHIP_LIMIT).toArray();
            }
            
            if (docs.length > 0) {
              relatedData[rel.targetEntity] = docs.map(doc => ({ ...doc, _id: doc._id.toString() }));
              totalRecords += docs.length;
            }
          } catch (error) {
            console.warn(`Failed to load relationship ${rel.targetEntity}: ${error}`);
          }
        }
      }
    }

    return {
      masterEntity,
      uid,
      data: { ...masterDoc, _id: masterDoc._id.toString() },
      relatedData,
      totalRecords
    };
  }

  private analyzeDocument(doc: any, fieldMap: Map<string, { type: string; nullable: boolean }>): void {
    for (const [key, value] of Object.entries(doc)) {
      const currentType = this.inferType(value);
      const existing = fieldMap.get(key);
      
      if (!existing) {
        fieldMap.set(key, { type: currentType, nullable: value === null || value === undefined });
      } else {
        // Update nullability
        if (value === null || value === undefined) {
          existing.nullable = true;
        }
        
        // Handle type conflicts by using the most general type
        if (existing.type !== currentType) {
          existing.type = 'Mixed';
        }
      }
    }
  }

  private inferType(value: any): string {
    if (value === null || value === undefined) return 'Mixed';
    if (typeof value === 'string') return 'String';
    if (typeof value === 'number') return Number.isInteger(value) ? 'Number' : 'Number';
    if (typeof value === 'boolean') return 'Boolean';
    if (value instanceof Date) return 'Date';
    if (Array.isArray(value)) return 'Array';
    if (this.isObjectId(value)) return 'ObjectId';
    if (typeof value === 'object') return 'Object';
    return 'Mixed';
  }

  private isObjectId(value: any): boolean {
    // Check if value looks like a MongoDB ObjectId
    return value && 
           typeof value === 'object' && 
           value.constructor && 
           value.constructor.name === 'ObjectId';
  }

  private isObjectIdString(str: string): boolean {
    // Check if string looks like a valid ObjectId
    return /^[0-9a-fA-F]{24}$/.test(str);
  }

  private inferReferencedCollection(fieldName: string): string {
    // Remove common suffixes and pluralize
    const cleaned = fieldName
      .replace(/_id$/, '')
      .replace(/Id$/, '')
      .replace(/_ref$/, '')
      .replace(/Ref$/, '');
    
    // Simple pluralization
    if (cleaned.endsWith('y')) {
      return cleaned.slice(0, -1) + 'ies';
    } else if (cleaned.endsWith('s') || cleaned.endsWith('x') || cleaned.endsWith('ch') || cleaned.endsWith('sh')) {
      return cleaned + 'es';
    } else {
      return cleaned + 's';
    }
  }
}
