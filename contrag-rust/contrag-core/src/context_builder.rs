use crate::entity::RagEntity;
use crate::types::TextChunk;
use crate::config::ChunkingConfig;

/// Context builder for generating text chunks from entities
pub struct ContextBuilder {
    config: ChunkingConfig,
}

impl ContextBuilder {
    /// Create a new context builder with configuration
    pub fn new(config: ChunkingConfig) -> Self {
        Self { config }
    }

    /// Build context from a single entity
    pub fn build_entity_context<T: RagEntity>(&self, entity: &T) -> String {
        let context_map = entity.to_context_map();

        let mut parts = vec![
            format!("Entity: {}", T::entity_type()),
            format!("ID: {}", entity.entity_id()),
            String::from("---"),
        ];

        for (key, value) in context_map {
            if self.config.include_field_names {
                parts.push(format!("{}: {}", key, value));
            } else {
                parts.push(value);
            }
        }

        parts.join("\n")
    }

    /// Build context from entity with its relationships
    pub fn build_graph_context<T: RagEntity>(
        &self,
        root_entity: &T,
        related_contexts: Vec<String>,
    ) -> String {
        let mut contexts = vec![self.build_entity_context(root_entity)];

        let relationships = root_entity.relationships();
        
        for (idx, related_ctx) in related_contexts.iter().enumerate() {
            if let Some(rel) = relationships.get(idx) {
                let annotated = format!(
                    "\n=== Relationship: {} ===\n{}\n",
                    rel.field_name,
                    related_ctx
                );
                contexts.push(annotated);
            } else {
                contexts.push(format!("\n{}\n", related_ctx));
            }
        }

        contexts.join("\n")
    }

    /// Chunk a long text into overlapping segments
    pub fn chunk_text(&self, text: &str) -> Vec<TextChunk> {
        if text.len() <= self.config.chunk_size {
            return vec![TextChunk {
                text: text.to_string(),
                start_idx: 0,
                end_idx: text.len(),
                chunk_index: 0,
            }];
        }

        let mut chunks = vec![];
        let mut start = 0;
        let mut chunk_index = 0;

        while start < text.len() {
            let end = (start + self.config.chunk_size).min(text.len());
            
            // Try to break at word boundary
            let actual_end = if end < text.len() {
                self.find_word_boundary(text, end)
            } else {
                end
            };

            chunks.push(TextChunk {
                text: text[start..actual_end].to_string(),
                start_idx: start,
                end_idx: actual_end,
                chunk_index,
            });

            // Move start forward, considering overlap
            if actual_end >= text.len() {
                break;
            }
            
            start = actual_end.saturating_sub(self.config.overlap);
            chunk_index += 1;
        }

        chunks
    }

    /// Find the nearest word boundary before the given position
    fn find_word_boundary(&self, text: &str, pos: usize) -> usize {
        let chars: Vec<char> = text.chars().collect();
        
        // Look backwards for whitespace or punctuation
        for i in (pos.saturating_sub(50)..pos).rev() {
            if i >= chars.len() {
                continue;
            }
            let c = chars[i];
            if c.is_whitespace() || c == '.' || c == '!' || c == '?' || c == '\n' {
                return i + 1;
            }
        }
        
        // If no boundary found, use the original position
        pos
    }

    /// Build and chunk context from a single entity
    pub fn build_and_chunk<T: RagEntity>(&self, entity: &T) -> Vec<TextChunk> {
        let context = self.build_entity_context(entity);
        self.chunk_text(&context)
    }

    /// Build and chunk context from entity graph
    pub fn build_and_chunk_graph<T: RagEntity>(
        &self,
        root_entity: &T,
        related_contexts: Vec<String>,
    ) -> Vec<TextChunk> {
        let context = self.build_graph_context(root_entity, related_contexts);
        self.chunk_text(&context)
    }

    /// Build multiple entity contexts and merge them
    pub fn build_multi_entity_context<T: RagEntity>(&self, entities: &[T]) -> String {
        entities
            .iter()
            .map(|entity| self.build_entity_context(entity))
            .collect::<Vec<_>>()
            .join("\n\n=== Next Entity ===\n\n")
    }

    /// Get chunk statistics
    pub fn get_chunk_stats(&self, text: &str) -> ChunkStats {
        let chunks = self.chunk_text(text);
        let total_chunks = chunks.len();
        let avg_chunk_size = if total_chunks > 0 {
            chunks.iter().map(|c| c.text.len()).sum::<usize>() / total_chunks
        } else {
            0
        };

        ChunkStats {
            total_text_length: text.len(),
            total_chunks,
            avg_chunk_size,
            chunk_size_config: self.config.chunk_size,
            overlap_config: self.config.overlap,
        }
    }
}

/// Statistics about chunking
#[derive(Debug, Clone)]
pub struct ChunkStats {
    pub total_text_length: usize,
    pub total_chunks: usize,
    pub avg_chunk_size: usize,
    pub chunk_size_config: usize,
    pub overlap_config: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_text_small() {
        let config = ChunkingConfig {
            chunk_size: 100,
            overlap: 20,
            include_field_names: true,
        };
        let builder = ContextBuilder::new(config);
        
        let text = "Hello world";
        let chunks = builder.chunk_text(text);
        
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, "Hello world");
    }

    #[test]
    fn test_chunk_text_large() {
        let config = ChunkingConfig {
            chunk_size: 50,
            overlap: 10,
            include_field_names: true,
        };
        let builder = ContextBuilder::new(config);
        
        let text = "a".repeat(150);
        let chunks = builder.chunk_text(&text);
        
        assert!(chunks.len() > 1);
    }
}
