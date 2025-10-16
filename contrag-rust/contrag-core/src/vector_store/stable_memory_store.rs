use std::sync::{Arc, RwLock};
use std::collections::HashMap;
use crate::vector_store::{VectorStore, cosine_similarity};
use crate::error::{ContragError, Result};
use crate::types::{Vector, SearchResult};

/// Vector store implementation using ICP stable memory
/// 
/// This stores vectors persistently across canister upgrades.
/// 
/// Note: In a production implementation, this would use ic-stable-structures
/// for true persistent storage. This version uses Arc<RwLock> for thread-safety.
pub struct StableMemoryVectorStore {
    // In-memory index for fast lookup (rebuilt on init)
    vectors: Arc<RwLock<HashMap<String, Vec<StoredVector>>>>,
    // Metadata about namespaces
    namespaces: Arc<RwLock<Vec<String>>>,
}

#[derive(Clone, Debug)]
struct StoredVector {
    id: String,
    embedding: Vec<f32>,
    text: String,
    entity_type: String,
    entity_id: String,
    chunk_index: usize,
    total_chunks: usize,
    timestamp: u64,
}

impl StableMemoryVectorStore {
    /// Create a new stable memory vector store
    pub fn new() -> Self {
        Self {
            vectors: Arc::new(RwLock::new(HashMap::new())),
            namespaces: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Initialize or load from stable storage
    /// 
    /// Call this during canister init or post_upgrade
    pub fn init(&self) {
        // In a real implementation, this would load from stable structures
        // For now, we use in-memory storage
    }

    /// Persist to stable storage
    /// 
    /// Call this during pre_upgrade
    pub fn persist(&self) {
        // In a real implementation, this would save to stable structures
    }

    fn get_namespace_key(namespace: &str, vector_id: &str) -> String {
        format!("{}::{}", namespace, vector_id)
    }
}

impl Default for StableMemoryVectorStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl VectorStore for StableMemoryVectorStore {
    async fn store(&mut self, namespace: &str, vector: Vector) -> Result<()> {
        let stored = StoredVector {
            id: vector.id.clone(),
            embedding: vector.embedding,
            text: vector.text,
            entity_type: vector.metadata.entity_type,
            entity_id: vector.metadata.entity_id,
            chunk_index: vector.metadata.chunk_index,
            total_chunks: vector.metadata.total_chunks,
            timestamp: vector.metadata.timestamp,
        };

        let mut vectors = self.vectors.write().unwrap();
        vectors
            .entry(namespace.to_string())
            .or_insert_with(Vec::new)
            .push(stored);

        // Update namespaces list
        let mut namespaces = self.namespaces.write().unwrap();
        if !namespaces.contains(&namespace.to_string()) {
            namespaces.push(namespace.to_string());
        }

        Ok(())
    }

    async fn store_batch(&mut self, namespace: &str, vectors: Vec<Vector>) -> Result<()> {
        for vector in vectors {
            self.store(namespace, vector).await?;
        }
        Ok(())
    }

    async fn search(
        &self,
        namespace: &str,
        query_embedding: Vec<f32>,
        k: usize,
    ) -> Result<Vec<SearchResult>> {
        let vectors = self.vectors.read().unwrap();
        
        let namespace_vectors = vectors
            .get(namespace)
            .ok_or_else(|| ContragError::VectorStoreError(format!("Namespace not found: {}", namespace)))?;

        if namespace_vectors.is_empty() {
            return Ok(vec![]);
        }

        // Calculate similarities
        let mut results: Vec<(f32, StoredVector)> = namespace_vectors
            .iter()
            .map(|v| {
                let similarity = cosine_similarity(&query_embedding, &v.embedding);
                (similarity, v.clone())
            })
            .collect();

        // Sort by similarity (descending)
        results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        // Take top k results
        Ok(results
            .into_iter()
            .take(k)
            .map(|(score, v)| SearchResult {
                vector_id: v.id.clone(),
                text: v.text.clone(),
                score,
                metadata: crate::types::VectorMetadata {
                    entity_type: v.entity_type.clone(),
                    entity_id: v.entity_id.clone(),
                    chunk_index: v.chunk_index,
                    total_chunks: v.total_chunks,
                    timestamp: v.timestamp,
                    custom: None,
                },
            })
            .collect())
    }

    async fn delete(&mut self, namespace: &str, vector_id: &str) -> Result<()> {
        let mut vectors = self.vectors.write().unwrap();
        
        if let Some(namespace_vectors) = vectors.get_mut(namespace) {
            namespace_vectors.retain(|v| v.id != vector_id);
        }

        Ok(())
    }

    async fn delete_namespace(&mut self, namespace: &str) -> Result<()> {
        let mut vectors = self.vectors.write().unwrap();
        vectors.remove(namespace);

        let mut namespaces = self.namespaces.write().unwrap();
        namespaces.retain(|ns| ns != namespace);

        Ok(())
    }

    async fn count(&self, namespace: &str) -> Result<usize> {
        let vectors = self.vectors.read().unwrap();
        Ok(vectors.get(namespace).map(|v| v.len()).unwrap_or(0))
    }

    async fn list_namespaces(&self) -> Result<Vec<String>> {
        Ok(self.namespaces.read().unwrap().clone())
    }
}

/// Helper to create a vector store instance
pub fn create_vector_store() -> StableMemoryVectorStore {
    StableMemoryVectorStore::new()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::VectorMetadata;

    #[tokio::test]
    async fn test_store_and_search() {
        let mut store = StableMemoryVectorStore::new();
        
        let vector = Vector {
            id: "test1".to_string(),
            embedding: vec![1.0, 0.0, 0.0],
            text: "Test text".to_string(),
            metadata: VectorMetadata {
                entity_type: "Test".to_string(),
                entity_id: "1".to_string(),
                chunk_index: 0,
                total_chunks: 1,
                timestamp: 0,
                custom: None,
            },
        };

        store.store("test_namespace", vector).await.unwrap();

        let results = store
            .search("test_namespace", vec![1.0, 0.0, 0.0], 5)
            .await
            .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].vector_id, "test1");
        assert!(results[0].score > 0.99); // Should be very similar
    }
}
