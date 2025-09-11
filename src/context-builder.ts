import { EntityGraph, ContextChunk } from './types';

export class ContextBuilder {
  private chunkSize: number;
  private overlap: number;

  constructor(options: { chunkSize?: number; overlap?: number } = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.overlap = options.overlap || 200;
  }

  /**
   * Builds context chunks from an entity graph
   */
  buildContextChunks(entityGraph: EntityGraph): ContextChunk[] {
    const namespace = `${entityGraph.entity}:${entityGraph.uid}`;
    const flattenedContent = this.flattenEntityGraph(entityGraph);
    const relations = this.extractRelationNames(entityGraph);
    
    const chunks = this.chunkText(flattenedContent, this.chunkSize, this.overlap);
    
    return chunks.map((content, index) => ({
      id: `${namespace}:chunk:${index}`,
      namespace,
      content,
      metadata: {
        entity: entityGraph.entity,
        uid: entityGraph.uid,
        relations,
        timestamp: entityGraph.metadata.timestamp,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));
  }

  /**
   * Flattens an entity graph into structured text
   */
  private flattenEntityGraph(entityGraph: EntityGraph, depth = 0): string {
    const indent = '  '.repeat(depth);
    let content = `${indent}Entity: ${entityGraph.entity} (ID: ${entityGraph.uid})\n`;
    
    // Add metadata
    if (entityGraph.metadata.timestamp) {
      content += `${indent}Timestamp: ${entityGraph.metadata.timestamp.toISOString()}\n`;
    }
    
    content += `${indent}Source: ${entityGraph.metadata.source}\n`;
    content += `${indent}Depth: ${entityGraph.metadata.depth}\n\n`;

    // Add entity data
    if (entityGraph.data && Object.keys(entityGraph.data).length > 0) {
      content += `${indent}Data:\n`;
      content += this.formatEntityData(entityGraph.data, depth + 1);
      content += '\n';
    }

    // Add relationships
    if (Object.keys(entityGraph.relationships).length > 0) {
      content += `${indent}Relationships:\n`;
      
      for (const [relationName, relatedEntities] of Object.entries(entityGraph.relationships)) {
        content += `${indent}  ${relationName}:\n`;
        
        for (const relatedEntity of relatedEntities) {
          if (depth < 2) { // Limit recursion to prevent infinite loops
            content += this.flattenEntityGraph(relatedEntity, depth + 2);
          } else {
            content += `${indent}    ${relatedEntity.entity} (ID: ${relatedEntity.uid}) - [Reference Only]\n`;
          }
        }
        content += '\n';
      }
    }

    return content;
  }

  /**
   * Formats entity data into readable text
   */
  private formatEntityData(data: Record<string, any>, depth = 0): string {
    const indent = '  '.repeat(depth);
    let content = '';

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        content += `${indent}${key}: null\n`;
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Handle nested objects
        content += `${indent}${key}:\n`;
        content += this.formatEntityData(value, depth + 1);
      } else if (Array.isArray(value)) {
        // Handle arrays
        content += `${indent}${key}: [${value.length} items]\n`;
        if (value.length > 0) {
          const preview = value.slice(0, 3).map(v => 
            typeof v === 'object' ? JSON.stringify(v) : String(v)
          ).join(', ');
          content += `${indent}  Preview: ${preview}${value.length > 3 ? '...' : ''}\n`;
        }
      } else if (value instanceof Date) {
        content += `${indent}${key}: ${value.toISOString()}\n`;
      } else {
        content += `${indent}${key}: ${String(value)}\n`;
      }
    }

    return content;
  }

  /**
   * Extracts relation names from the entity graph
   */
  private extractRelationNames(entityGraph: EntityGraph, visited = new Set<string>()): string[] {
    const nodeKey = `${entityGraph.entity}:${entityGraph.uid}`;
    if (visited.has(nodeKey)) {
      return [];
    }
    
    visited.add(nodeKey);
    const relations: string[] = [];
    
    for (const [relationName, relatedEntities] of Object.entries(entityGraph.relationships)) {
      relations.push(relationName);
      
      // Recursively collect relations from related entities (with depth limit)
      for (const relatedEntity of relatedEntities) {
        if (entityGraph.metadata.depth < 2) {
          const subRelations = this.extractRelationNames(relatedEntity, visited);
          relations.push(...subRelations);
        }
      }
    }
    
    return Array.from(new Set(relations)); // Remove duplicates
  }

  /**
   * Chunks text into smaller pieces with optional overlap
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // If we're not at the end, try to find a good breaking point
      if (end < text.length) {
        // Look for natural break points (newlines, sentences, words)
        const breakPoints = [
          text.lastIndexOf('\n\n', end), // Paragraph breaks
          text.lastIndexOf('\n', end),   // Line breaks
          text.lastIndexOf('. ', end),   // Sentence endings
          text.lastIndexOf(' ', end),    // Word boundaries
        ];

        for (const breakPoint of breakPoints) {
          if (breakPoint > start + chunkSize * 0.7) { // At least 70% of chunk size
            end = breakPoint + 1;
            break;
          }
        }
      }

      const chunk = text.substring(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move start position, accounting for overlap
      start = end - overlap;
      if (start <= 0) start = end;
    }

    return chunks;
  }
}
