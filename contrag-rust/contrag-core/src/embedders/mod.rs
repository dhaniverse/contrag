pub mod openai;
pub mod gemini;
pub mod http_client;

use crate::error::Result;
use crate::types::ConnectionTestResult;

/// Trait for embedding providers
/// 
/// Implement this trait to add support for additional embedding APIs.
#[async_trait::async_trait]
pub trait Embedder: Send + Sync {
    /// Get the name of this embedder
    fn name(&self) -> &str;

    /// Generate embeddings for a batch of texts
    async fn embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>>;

    /// Get the dimensions of the embeddings
    fn dimensions(&self) -> usize;

    /// Test the connection to the embedding service
    async fn test_connection(&self) -> Result<ConnectionTestResult>;

    /// Optional: Generate text with prompt (for LLM features)
    async fn generate_with_prompt(
        &self,
        _text: String,
        _system_prompt: String,
    ) -> Result<String> {
        Ok(String::new())
    }
}

/// Cache for embeddings to reduce API calls
pub struct EmbeddingCache {
    cache: std::collections::HashMap<String, Vec<f32>>,
    max_size: usize,
}

impl EmbeddingCache {
    pub fn new(max_size: usize) -> Self {
        Self {
            cache: std::collections::HashMap::new(),
            max_size,
        }
    }

    pub fn get(&self, text: &str) -> Option<Vec<f32>> {
        self.cache.get(text).cloned()
    }

    pub fn insert(&mut self, text: String, embedding: Vec<f32>) {
        if self.cache.len() >= self.max_size {
            // Simple LRU: remove first entry
            if let Some(first_key) = self.cache.keys().next().cloned() {
                self.cache.remove(&first_key);
            }
        }
        self.cache.insert(text, embedding);
    }

    pub fn clear(&mut self) {
        self.cache.clear();
    }
}

/// Embedder wrapper with caching support
pub struct CachedEmbedder<E: Embedder> {
    embedder: E,
    cache: EmbeddingCache,
}

impl<E: Embedder> CachedEmbedder<E> {
    pub fn new(embedder: E, cache_size: usize) -> Self {
        Self {
            embedder,
            cache: EmbeddingCache::new(cache_size),
        }
    }

    pub async fn embed_with_cache(&mut self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        let mut results = vec![];
        let mut to_embed = vec![];
        let mut indices = vec![];

        // Check cache
        for (idx, text) in texts.iter().enumerate() {
            if let Some(cached) = self.cache.get(text) {
                results.push((idx, cached));
            } else {
                to_embed.push(text.clone());
                indices.push(idx);
            }
        }

        // Embed uncached texts
        if !to_embed.is_empty() {
            let embeddings = self.embedder.embed(to_embed.clone()).await?;
            
            // Cache results
            for (text, embedding) in to_embed.iter().zip(embeddings.iter()) {
                self.cache.insert(text.clone(), embedding.clone());
            }

            // Add to results
            for (idx, embedding) in indices.iter().zip(embeddings) {
                results.push((*idx, embedding));
            }
        }

        // Sort by original index and return
        results.sort_by_key(|(idx, _)| *idx);
        Ok(results.into_iter().map(|(_, emb)| emb).collect())
    }
}
