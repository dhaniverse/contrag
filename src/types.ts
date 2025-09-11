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
}

// Vector store plugin interface
export interface VectorStorePlugin {
  name: string;
  connect(config: Record<string, any>): Promise<void>;
  disconnect(): Promise<void>;
  store(chunks: EmbeddedChunk[]): Promise<void>;
  query(namespace: string, query: string, limit?: number): Promise<ContextChunk[]>;
  delete(namespace: string): Promise<void>;
}

// Embedder plugin interface
export interface EmbedderPlugin {
  name: string;
  configure(config: Record<string, any>): Promise<void>;
  embed(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
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
  };
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
