use serde::{Deserialize, Serialize};
use crate::error::{ContragError, Result};

/// HTTP client for making outcalls from ICP canisters
/// 
/// This wraps the ICP HTTP outcall functionality for easier use.
pub struct HttpClient {
    max_response_bytes: u64,
}

impl HttpClient {
    pub fn new() -> Self {
        Self {
            max_response_bytes: 2_000_000, // 2MB default
        }
    }

    /// Make an HTTP POST request
    /// 
    /// In WASM/canister environment, this uses ic_cdk::api::management_canister::http_request
    /// In non-WASM (tests), this returns an error
    pub async fn post(
        &self,
        url: String,
        headers: Vec<(String, String)>,
        body: Vec<u8>,
    ) -> Result<HttpOutcallResponse> {
        #[cfg(target_family = "wasm")]
        {
            use ic_cdk::api::management_canister::http_request::{
                http_request, CanisterHttpRequestArgument, HttpMethod, HttpHeader, HttpResponse,
                TransformContext,
            };

            let request_headers: Vec<HttpHeader> = headers
                .into_iter()
                .map(|(name, value)| HttpHeader { name, value })
                .collect();

            let request = CanisterHttpRequestArgument {
                url,
                method: HttpMethod::POST,
                body: Some(body),
                max_response_bytes: Some(self.max_response_bytes),
                transform: None,
                headers: request_headers,
            };

            let cycles = 1_000_000_000u128; // 1B cycles

            match http_request(request, cycles).await {
                Ok((response,)) => Ok(HttpOutcallResponse {
                    status: response.status.0.into(),
                    headers: response
                        .headers
                        .into_iter()
                        .map(|h| (h.name, h.value))
                        .collect(),
                    body: response.body,
                }),
                Err((code, msg)) => Err(ContragError::HttpOutcallError(format!(
                    "HTTP outcall failed: {:?} - {}",
                    code, msg
                ))),
            }
        }

        #[cfg(not(target_family = "wasm"))]
        {
            Err(ContragError::HttpOutcallError(
                "HTTP outcalls only work in WASM environment".to_string(),
            ))
        }
    }

    /// Make an HTTP GET request
    pub async fn get(
        &self,
        url: String,
        headers: Vec<(String, String)>,
    ) -> Result<HttpOutcallResponse> {
        #[cfg(target_family = "wasm")]
        {
            use ic_cdk::api::management_canister::http_request::{
                http_request, CanisterHttpRequestArgument, HttpMethod, HttpHeader,
                TransformContext,
            };

            let request_headers: Vec<HttpHeader> = headers
                .into_iter()
                .map(|(name, value)| HttpHeader { name, value })
                .collect();

            let request = CanisterHttpRequestArgument {
                url,
                method: HttpMethod::GET,
                body: None,
                max_response_bytes: Some(self.max_response_bytes),
                transform: None,
                headers: request_headers,
            };

            let cycles = 500_000_000u128; // 500M cycles

            match http_request(request, cycles).await {
                Ok((response,)) => Ok(HttpOutcallResponse {
                    status: response.status.0.into(),
                    headers: response
                        .headers
                        .into_iter()
                        .map(|h| (h.name, h.value))
                        .collect(),
                    body: response.body,
                }),
                Err((code, msg)) => Err(ContragError::HttpOutcallError(format!(
                    "HTTP outcall failed: {:?} - {}",
                    code, msg
                ))),
            }
        }

        #[cfg(not(target_family = "wasm"))]
        {
            Err(ContragError::HttpOutcallError(
                "HTTP outcalls only work in WASM environment".to_string(),
            ))
        }
    }
}

impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpOutcallResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl HttpOutcallResponse {
    /// Parse body as JSON
    pub fn json<T: for<'de> Deserialize<'de>>(&self) -> Result<T> {
        serde_json::from_slice(&self.body).map_err(|e| {
            ContragError::SerializationError(format!("Failed to parse JSON response: {}", e))
        })
    }

    /// Get body as string
    pub fn text(&self) -> Result<String> {
        String::from_utf8(self.body.clone()).map_err(|e| {
            ContragError::SerializationError(format!("Failed to parse response as UTF-8: {}", e))
        })
    }
}
