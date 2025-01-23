use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;
use reqwest::StatusCode;
use serde_json::Value;
use std::time::Duration;

use super::base::{Provider, ProviderUsage, Usage};
use super::configs::ModelConfig;
use super::errors::ProviderError;
use super::formats::anthropic::{create_request, get_usage, response_to_message};
use super::utils::{emit_debug_trace, get_model};
use crate::message::Message;
use mcp_core::tool::Tool;
use tracing::debug;

pub const ANTHROPIC_DEFAULT_MODEL: &str = "claude-3-5-sonnet-latest";

#[derive(serde::Serialize)]
pub struct AnthropicProvider {
    #[serde(skip)]
    client: Client,
    host: String,
    api_key: String,
    model: ModelConfig,
}

impl AnthropicProvider {
    pub fn from_env() -> Result<Self> {
        let api_key =
            crate::key_manager::get_keyring_secret("ANTHROPIC_API_KEY", Default::default())?;
        let host = std::env::var("ANTHROPIC_HOST")
            .unwrap_or_else(|_| "https://api.anthropic.com".to_string());
        let model_name = std::env::var("ANTHROPIC_MODEL")
            .unwrap_or_else(|_| ANTHROPIC_DEFAULT_MODEL.to_string());

        let client = Client::builder()
            .timeout(Duration::from_secs(600))
            .build()?;

        Ok(Self {
            client,
            host,
            api_key,
            model: ModelConfig::new(model_name),
        })
    }

    async fn post(&self, payload: Value) -> Result<Value, ProviderError> {
        let url = format!("{}/v1/messages", self.host.trim_end_matches('/'));

        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&payload)
            .send()
            .await
            .unwrap();

        // https://docs.anthropic.com/en/api/errors
        match response.status() {
            StatusCode::OK => Ok(response.json().await.unwrap()),
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                Err(ProviderError::Authentication(format!("Authentication failed. Please ensure your API keys are valid and have the required permissions. \
                    Status: {}. Response: {:?}", response.status(), response.text().await.unwrap_or_default())))
            }
            StatusCode::BAD_REQUEST => {
                let status = response.status();
                let payload: Value = response.json().await.unwrap();
                if let Some(error) = payload.get("error") {
                    debug!("Bad Request Error: {error:?}");
                    let error_msg = error.get("message").unwrap().as_str().unwrap();
                    if error_msg.to_lowercase().contains("too long") {
                        return Err(ProviderError::ContextLengthExceeded(error_msg.to_string()));
                    }
                }
                Err(ProviderError::RequestFailed(format!("Request failed with status: {}", status)))
            }
            StatusCode::INTERNAL_SERVER_ERROR | StatusCode::SERVICE_UNAVAILABLE => {
                Err(ProviderError::ServerError(format!("Server error occurred. Status: {}", response.status())))
            }
            _ => Err(ProviderError::RequestFailed(format!("Request failed with status: {}", response.status())))
        }
    }
}

#[async_trait]
impl Provider for AnthropicProvider {
    fn get_model_config(&self) -> &ModelConfig {
        &self.model
    }

    #[tracing::instrument(
        skip(self, system, messages, tools),
        fields(model_config, input, output, input_tokens, output_tokens, total_tokens)
    )]
    async fn complete(
        &self,
        system: &str,
        messages: &[Message],
        tools: &[Tool],
    ) -> Result<(Message, ProviderUsage), ProviderError> {
        let payload = create_request(&self.model, system, messages, tools).unwrap();

        // Make request
        let response = self.post(payload.clone()).await?;

        // Parse response
        let message = response_to_message(response.clone()).unwrap();
        let usage = self.get_usage(&response).unwrap();
        let model = get_model(&response);
        emit_debug_trace(self, &payload, &response, &usage);
        Ok((message, ProviderUsage::new(model, usage)))
    }

    fn get_usage(&self, data: &Value) -> Result<Usage> {
        get_usage(data)
    }
}
