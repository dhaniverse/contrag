/**
 * Constants and configuration defaults for ContRAG
 */

// Default configuration values
export const DEFAULT_CONFIG = {
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  MAX_DEPTH: 3,
  RELATIONSHIP_LIMIT: 10,
  QUERY_LIMIT: 5,
  SAMPLE_LIMIT: 10,
  CONNECTION_TIMEOUT: 5000,
  MAX_RETRIES: 3,
} as const;

// Configuration file names
export const CONFIG_FILENAMES = [
  'contrag.config.json',
  'contrag.config.js',
  '.contragrc',
  '.contragrc.json'
] as const;

// Environment variable prefixes
export const ENV_PREFIX = 'CONTRAG_' as const;

// Database related constants
export const DB_CONSTANTS = {
  DEFAULT_SCHEMA: 'public',
  TIME_SERIES_FIELDS: [
    'created_at',
    'updated_at',
    'timestamp',
    'date_created',
    'date_modified'
  ],
  PRIMARY_KEY_FIELDS: ['id', '_id', 'uuid'],
  FOREIGN_KEY_SUFFIXES: ['_id', 'Id', '_ref', 'Ref'],
} as const;

// Vector store constants
export const VECTOR_CONSTANTS = {
  DEFAULT_DIMENSIONS: 1536, // OpenAI embedding dimensions
  MIN_SIMILARITY_SCORE: 0.0,
  MAX_SIMILARITY_SCORE: 1.0,
} as const;

// CLI constants
export const CLI_CONSTANTS = {
  MAX_OUTPUT_LENGTH: 60000, // 60KB
  SPINNER_INTERVAL: 100,
  PROGRESS_BAR_WIDTH: 40,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NO_CONFIG_FOUND: 'No configuration file found. Please create a contrag.config.json file.',
  DB_NOT_CONNECTED: 'Database plugin not configured',
  VECTOR_NOT_CONNECTED: 'Vector store plugin not configured',
  EMBEDDER_NOT_CONFIGURED: 'Embedder plugin not configured',
  PLUGINS_NOT_CONFIGURED: 'Plugins not configured',
  INVALID_ENTITY: 'Invalid entity specified',
  NO_SAMPLE_DATA: 'No sample data found for the specified entity',
  CONNECTION_FAILED: 'Failed to connect to service',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CONFIG_CREATED: 'Configuration file created successfully',
  CONNECTION_ESTABLISHED: 'Connection established successfully',
  SCHEMA_INTROSPECTED: 'Schema introspection complete',
  CONTEXT_BUILT: 'Context building complete',
  QUERY_EXECUTED: 'Query executed successfully',
  DATA_RETRIEVED: 'Sample data retrieved successfully',
} as const;

// Plugin names
export const PLUGIN_NAMES = {
  POSTGRES: 'postgres',
  MONGODB: 'mongodb',
  WEAVIATE: 'weaviate',
  PGVECTOR: 'pgvector',
  OPENAI: 'openai',
  GEMINI: 'gemini',
} as const;

// Default system prompts
export const DEFAULT_SYSTEM_PROMPTS = {
  CONTEXT_BUILDER: `You are a context builder assistant. Your job is to organize and structure entity relationship data to create meaningful context for RAG systems. Focus on creating coherent, comprehensive summaries that capture the relationships between entities.`,
  
  QUERY_PROCESSOR: `You are a query processing assistant. Help interpret user queries and extract relevant information from the provided context. Be accurate, concise, and focus on the most relevant information.`,
  
  DEFAULT: `You are a helpful assistant working with structured data and entity relationships. Provide accurate, relevant responses based on the provided context.`
} as const;
