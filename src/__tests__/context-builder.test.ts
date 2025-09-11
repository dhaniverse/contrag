import { ContextBuilder } from '../context-builder';
import { EntityGraph } from '../types';

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder({ chunkSize: 2000, overlap: 20 });
  });

  test('should build context chunks from entity graph', () => {
    const entityGraph: EntityGraph = {
      entity: 'User',
      uid: '123',
      data: {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        created_at: new Date('2024-01-01')
      },
      relationships: {
        orders: [{
          entity: 'Order',
          uid: '456',
          data: {
            id: 456,
            total: 99.99,
            status: 'completed'
          },
          relationships: {},
          metadata: { depth: 1, source: 'relational' as const }
        }]
      },
      metadata: { depth: 0, source: 'relational' as const }
    };

    const chunks = contextBuilder.buildContextChunks(entityGraph);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].namespace).toBe('User:123');
    expect(chunks[0].content).toContain('John Doe');
    expect(chunks[0].content).toContain('Order');
    expect(chunks[0].metadata.entity).toBe('User');
    expect(chunks[0].metadata.uid).toBe('123');
  });

  test('should chunk large content', () => {
    const longContent = 'A'.repeat(5000); // Much larger content
    const entityGraph: EntityGraph = {
      entity: 'TestEntity',
      uid: '1',
      data: { content: longContent },
      relationships: {},
      metadata: { depth: 0, source: 'relational' as const }
    };

    const chunks = contextBuilder.buildContextChunks(entityGraph);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.totalChunks).toBe(chunks.length);
  });
});
