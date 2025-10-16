use serde::{Deserialize, Serialize};
use crate::embedders::{Embedder, http_client::{HttpClient, HttpOutcallResponse}};
use crate::error::{ContragError, Result};
use crate::types::ConnectionTestResult;

/// Google Gemini embedder using HTTP outcalls
pub struct GeminiEmbedder {
    api_key: String,
    model: String,
    dimensions: usize,
    api_endpoint: String,
    http_client: HttpClient,
}

impl GeminiEmbedder {
    /// Create a new Gemini embedder
    pub fn new(api_key: String, model: String) -> Self {
        let dimensions = match model.as_str() {
            "embedding-001" => 768,
            "text-embedding-004" => 768,
            _ => 768, // default
        };

        Self {
            api_key,
            model,
            dimensions,
            api_endpoint: "https://generativelanguage.googleapis.com/v1beta/models".to_string(),
            http_client: HttpClient::new(),
        }
    }

    /// Create with custom API endpoint
    pub fn with_endpoint(mut self, endpoint: String) -> Self {
        self.api_endpoint = endpoint;
        self
    }

    fn get_embed_url(&self) -> String {
        format!(
            "{}/{}:embedContent?key={}",
            self.api_endpoint, self.model, self.api_key
        )
    }

    fn get_batch_embed_url(&self) -> String {
        format!(
            "{}/{}:batchEmbedContents?key={}",
            self.api_endpoint, self.model, self.api_key
        )
    }
}

#[async_trait::async_trait]
impl Embedder for GeminiEmbedder {
    fn name(&self) -> &str {
        "gemini"
    }

    async fn embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }

        // Use batch embed for multiple texts
        if texts.len() > 1 {
            return self.batch_embed(texts).await;
        }

        // Single text embedding
        let request = GeminiEmbedRequest {
            content: GeminiContent {
                parts: vec![GeminiPart {
                    text: texts[0].clone(),
                }],
            },
        };

        let body = serde_json::to_vec(&request)
            .map_err(|e| ContragError::SerializationError(e.to_string()))?;

        let headers = vec![("Content-Type".to_string(), "application/json".to_string())];

        let response = self
            .http_client
            .post(self.get_embed_url(), headers, body)
            .await?;

        if response.status != 200 {
            let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ContragError::EmbedderError(format!(
                "Gemini API returned status {}: {}",
                response.status, error_text
            )));
        }

        let embed_response: GeminiEmbedResponse = response.json()?;

        Ok(vec![embed_response.embedding.values])
    }

    fn dimensions(&self) -> usize {
        self.dimensions
    }

    async fn test_connection(&self) -> Result<ConnectionTestResult> {
        let start = ic_cdk::api::time();

        match self.embed(vec!["test connection".to_string()]).await {
            Ok(_) => {
                let latency = (ic_cdk::api::time() - start) / 1_000_000; // Convert to ms
                Ok(ConnectionTestResult {
                    plugin: self.name().to_string(),
                    connected: true,
                    latency: Some(latency),
                    error: None,
                    details: Some(format!(
                        "model: {}, dimensions: {}",
                        self.model, self.dimensions
                    )),
                })
            }
            Err(e) => Ok(ConnectionTestResult {
                plugin: self.name().to_string(),
                connected: false,
                latency: None,
                error: Some(e.to_string()),
                details: None,
            }),
        }
    }

    async fn generate_with_prompt(
        &self,
        text: String,
        system_prompt: String,
    ) -> Result<String> {
        let request = GeminiGenerateRequest {
            contents: vec![GeminiContent {
                parts: vec![GeminiPart {
                    text: format!("{}\n\n{}", system_prompt, text),
                }],
            }],
            generation_config: Some(GeminiGenerationConfig {
                temperature: 0.7,
                max_output_tokens: 1000,
            }),
        };

        let body = serde_json::to_vec(&request)
            .map_err(|e| ContragError::SerializationError(e.to_string()))?;

        let headers = vec![("Content-Type".to_string(), "application/json".to_string())];

        let url = format!(
            "{}/gemini-pro:generateContent?key={}",
            self.api_endpoint, self.api_key
        );

        let response = self.http_client.post(url, headers, body).await?;

        if response.status != 200 {
            let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ContragError::EmbedderError(format!(
                "Gemini API returned status {}: {}",
                response.status, error_text
            )));
        }

        let generate_response: GeminiGenerateResponse = response.json()?;

        Ok(generate_response
            .candidates
            .get(0)
            .and_then(|c| c.content.parts.get(0))
            .map(|p| p.text.clone())
            .unwrap_or_default())
    }
}

impl GeminiEmbedder {
    async fn batch_embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        let requests: Vec<GeminiEmbedRequest> = texts
            .into_iter()
            .map(|text| GeminiEmbedRequest {
                content: GeminiContent {
                    parts: vec![GeminiPart { text }],
                },
            })
            .collect();

        let batch_request = GeminiBatchEmbedRequest { requests };

        let body = serde_json::to_vec(&batch_request)
            .map_err(|e| ContragError::SerializationError(e.to_string()))?;

        let headers = vec![("Content-Type".to_string(), "application/json".to_string())];

        let response = self
            .http_client
            .post(self.get_batch_embed_url(), headers, body)
            .await?;

        if response.status != 200 {
            let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ContragError::EmbedderError(format!(
                "Gemini API returned status {}: {}",
                response.status, error_text
            )));
        }

        let batch_response: GeminiBatchEmbedResponse = response.json()?;

        Ok(batch_response
            .embeddings
            .into_iter()
            .map(|e| e.values)
            .collect())
    }
}

// Request/Response types for Gemini API

#[derive(Serialize)]
struct GeminiEmbedRequest {
    content: GeminiContent,
}

#[derive(Serialize)]
struct GeminiBatchEmbedRequest {
    requests: Vec<GeminiEmbedRequest>,
}

#[derive(Serialize, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Deserialize)]
struct GeminiEmbedResponse {
    embedding: GeminiEmbedding,
}

#[derive(Deserialize)]
struct GeminiBatchEmbedResponse {
    embeddings: Vec<GeminiEmbedding>,
}

#[derive(Deserialize)]
struct GeminiEmbedding {
    values: Vec<f32>,
}

#[derive(Serialize)]
struct GeminiGenerateRequest {
    contents: Vec<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    generation_config: Option<GeminiGenerationConfig>,
}

#[derive(Serialize)]
struct GeminiGenerationConfig {
    temperature: f32,
    max_output_tokens: u32,
}

#[derive(Deserialize)]
struct GeminiGenerateResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
}
