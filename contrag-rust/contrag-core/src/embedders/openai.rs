use serde::{Deserialize, Serialize};
use crate::embedders::{Embedder, http_client::HttpClient};
use crate::error::{ContragError, Result};
use crate::types::ConnectionTestResult;

/// OpenAI embedder using HTTP outcalls
pub struct OpenAIEmbedder {
    api_key: String,
    model: String,
    dimensions: usize,
    api_endpoint: String,
    http_client: HttpClient,
}

impl OpenAIEmbedder {
    /// Create a new OpenAI embedder
    pub fn new(api_key: String, model: String) -> Self {
        let dimensions = match model.as_str() {
            "text-embedding-3-small" => 1536,
            "text-embedding-3-large" => 3072,
            "text-embedding-ada-002" => 1536,
            _ => 1536, // default
        };

        Self {
            api_key,
            model,
            dimensions,
            api_endpoint: "https://api.openai.com/v1/embeddings".to_string(),
            http_client: HttpClient::new(),
        }
    }

    /// Create with custom API endpoint
    pub fn with_endpoint(mut self, endpoint: String) -> Self {
        self.api_endpoint = endpoint;
        self
    }
}

#[async_trait::async_trait]
impl Embedder for OpenAIEmbedder {
    fn name(&self) -> &str {
        "openai"
    }

    async fn embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(vec![]);
        }

        let request = OpenAIEmbeddingRequest {
            model: self.model.clone(),
            input: texts,
        };

        let body = serde_json::to_vec(&request)
            .map_err(|e| ContragError::SerializationError(e.to_string()))?;

        let headers = vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Authorization".to_string(), format!("Bearer {}", self.api_key)),
        ];

        let response = self
            .http_client
            .post(self.api_endpoint.clone(), headers, body)
            .await?;

        if response.status != 200 {
            let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ContragError::EmbedderError(format!(
                "OpenAI API returned status {}: {}",
                response.status, error_text
            )));
        }

        let embedding_response: OpenAIEmbeddingResponse = response.json()?;

        Ok(embedding_response
            .data
            .into_iter()
            .map(|item| item.embedding)
            .collect())
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
        let request = OpenAIChatRequest {
            model: "gpt-3.5-turbo".to_string(),
            messages: vec![
                ChatMessage {
                    role: "system".to_string(),
                    content: system_prompt,
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: text,
                },
            ],
            max_tokens: 1000,
            temperature: 0.7,
        };

        let body = serde_json::to_vec(&request)
            .map_err(|e| ContragError::SerializationError(e.to_string()))?;

        let headers = vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("Authorization".to_string(), format!("Bearer {}", self.api_key)),
        ];

        let response = self
            .http_client
            .post(
                "https://api.openai.com/v1/chat/completions".to_string(),
                headers,
                body,
            )
            .await?;

        if response.status != 200 {
            let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ContragError::EmbedderError(format!(
                "OpenAI API returned status {}: {}",
                response.status, error_text
            )));
        }

        let chat_response: OpenAIChatResponse = response.json()?;

        Ok(chat_response
            .choices
            .get(0)
            .and_then(|c| Some(c.message.content.clone()))
            .unwrap_or_default())
    }
}

// Request/Response types for OpenAI API

#[derive(Serialize)]
struct OpenAIEmbeddingRequest {
    model: String,
    input: Vec<String>,
}

#[derive(Deserialize)]
struct OpenAIEmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

#[derive(Serialize)]
struct OpenAIChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}
