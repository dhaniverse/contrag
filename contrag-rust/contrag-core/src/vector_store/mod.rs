pub mod stable_memory_store;

use crate::error::Result;
use crate::types::{Vector, SearchResult};

/// Trait for vector storage backends
#[async_trait::async_trait]
pub trait VectorStore: Send + Sync {
    /// Store a single vector
    async fn store(&mut self, namespace: &str, vector: Vector) -> Result<()>;

    /// Store multiple vectors
    async fn store_batch(&mut self, namespace: &str, vectors: Vec<Vector>) -> Result<()> {
        for vector in vectors {
            self.store(namespace, vector).await?;
        }
        Ok(())
    }

    /// Search for similar vectors
    async fn search(
        &self,
        namespace: &str,
        query_embedding: Vec<f32>,
        k: usize,
    ) -> Result<Vec<SearchResult>>;

    /// Delete a vector by ID
    async fn delete(&mut self, namespace: &str, vector_id: &str) -> Result<()>;

    /// Delete all vectors in a namespace
    async fn delete_namespace(&mut self, namespace: &str) -> Result<()>;

    /// Get vector count in namespace
    async fn count(&self, namespace: &str) -> Result<usize>;

    /// List all namespaces
    async fn list_namespaces(&self) -> Result<Vec<String>>;
}

/// Cosine similarity calculation
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }

    dot_product / (magnitude_a * magnitude_b)
}

/// Euclidean distance calculation
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return f32::MAX;
    }

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f32>()
        .sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 0.001);

        let c = vec![1.0, 0.0, 0.0];
        let d = vec![0.0, 1.0, 0.0];
        assert!((cosine_similarity(&c, &d) - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_euclidean_distance() {
        let a = vec![0.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((euclidean_distance(&a, &b) - 1.0).abs() < 0.001);

        let c = vec![0.0, 0.0, 0.0];
        let d = vec![1.0, 1.0, 0.0];
        assert!((euclidean_distance(&c, &d) - 1.414).abs() < 0.01);
    }
}
