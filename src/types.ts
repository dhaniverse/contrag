// Core entity and schema types
export interface EntitySchema {
  name: string;
  fields: Field[];
  relationships: Relationship[];
  isTimeSeriesEnabled?: boolean;
  timestampField?: string;
}

export interface Field {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface Relationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  targetEntity: string;
  foreignKey: string;
  referencedKey: string;
  through?: string; // For many-to-many relationships
}

export interface EntityGraph {
  entity: string;
  uid: string;
  data: Record<string, any>;
  relationships: {
    [relationName: string]: EntityGraph[];
  };
  metadata: {
    timestamp?: Date;
    depth: number;
    source: 'relational' | 'document' | 'timeseries';
  };
}

export interface ContextChunk {
  id: string;
  namespace: string;
  content: string;
  metadata: {
    entity: string;
    uid: string;
    relations: string[];
    timestamp?: Date;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface EmbeddedChunk extends ContextChunk {
  embedding: number[];
}

// Database plugin interface
export interface DBPlugin {
  name: string;
  connect(config: Record<string, any>): Promise<void>;
  disconnect(): Promise<void>;
  introspectSchema(): Promise<EntitySchema[]>;
  buildEntityGraph(masterEntity: string, uid: string, maxDepth?: number): Promise<EntityGraph>;
  supportsTimeSeries(): boolean;
  // Enhanced debugging methods
  testConnection?(): Promise<ConnectionTestResult>;
  getSampleData?(entity: string, limit?: number, filters?: Record<string, any>): Promise<Record<string, any>[]>;
  getRelatedSampleData?(masterEntity: string, uid: string, config?: MasterEntityConfig): Promise<SampleDataResult>;
}

// Vector store plugin interface
export interface VectorStorePlugin {
  name: string;
  connect(config: Record<string, any>): Promise<void>;
  disconnect(): Promise<void>;
  store(chunks: EmbeddedChunk[]): Promise<void>;
  query(namespace: string, query: string, limit?: number): Promise<ContextChunk[]>;
  delete(namespace: string): Promise<void>;
  // Enhanced debugging methods
  listNamespaces?(): Promise<string[]>;
  getStats?(): Promise<VectorStoreStats>;
  testConnection?(): Promise<ConnectionTestResult>;
  searchSimilar?(embedding: number[], namespace?: string, limit?: number): Promise<VectorSearchResult[]>;
}

// Embedder plugin interface
export interface EmbedderPlugin {
  name: string;
  configure(config: Record<string, any>): Promise<void>;
  embed(texts: string[], systemPrompt?: string): Promise<number[][]>;
  getDimensions(): number;
  // Enhanced debugging methods
  testConnection?(): Promise<ConnectionTestResult>;
  generateWithPrompt?(text: string, systemPrompt: string): Promise<string>;
}

// Master entity configuration
export interface MasterEntityConfig {
  name: string;
  primaryKey: string;
  relationships?: {
    [relationName: string]: {
      entity: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
      localKey: string;
      foreignKey: string;
      through?: string; // For many-to-many
    };
  };
  sampleFilters?: Record<string, any>;
}

// System prompt configuration
export interface SystemPromptConfig {
  default?: string;
  contextBuilder?: string;
  queryProcessor?: string;
  custom?: Record<string, string>;
}

// Configuration types
export interface ContragConfig {
  database: {
    plugin: string;
    config: Record<string, any>;
  };
  vectorStore: {
    plugin: string;
    config: Record<string, any>;
  };
  embedder: {
    plugin: string;
    config: Record<string, any>;
  };
  contextBuilder?: {
    chunkSize?: number;
    overlap?: number;
    maxDepth?: number;
    relationshipLimit?: number;
  };
  masterEntities?: MasterEntityConfig[];
  systemPrompts?: SystemPromptConfig;
}

// SDK response types
export interface QueryResult {
  chunks: ContextChunk[];
  totalResults: number;
  query: string;
  namespace: string;
}

export interface BuildResult {
  entity: string;
  uid: string;
  chunksCreated: number;
  namespace: string;
  success: boolean;
  error?: string;
}

// New types for enhanced functionality
export interface ConnectionTestResult {
  plugin: string;
  connected: boolean;
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SampleDataResult {
  masterEntity: string;
  uid: string;
  data: Record<string, any>;
  relatedData: {
    [entityName: string]: Record<string, any>[];
  };
  totalRecords: number;
}

export interface VectorStoreStats {
  namespaces: string[];
  totalVectors: number;
  dimensions: number;
  storageSize?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content?: string;
}
