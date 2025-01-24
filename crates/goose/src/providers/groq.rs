use super::errors::ProviderError;
use crate::message::Message;
use crate::model::ModelConfig;
use crate::providers::base::{ConfigKey, Provider, ProviderMetadata, ProviderUsage};
use crate::providers::formats::openai::{create_request, get_usage, response_to_message};
use crate::providers::utils::get_model;
use anyhow::Result;
use async_trait::async_trait;
use mcp_core::Tool;
use reqwest::{Client, StatusCode};
use serde_json::Value;
use std::time::Duration;

pub const GROQ_API_HOST: &str = "https://api.groq.com";
pub const GROQ_DEFAULT_MODEL: &str = "llama-3.3-70b-versatile";

#[derive(serde::Serialize)]
pub struct GroqProvider {
    #[serde(skip)]
    client: Client,
    host: String,
    api_key: String,
    model: ModelConfig,
}

impl Default for GroqProvider {
    fn default() -> Self {
        let model = ModelConfig::new(GroqProvider::metadata().default_model);
        GroqProvider::from_env(model).expect("Failed to initialize Groq provider")
    }
}

impl GroqProvider {
    pub fn from_env(model: ModelConfig) -> Result<Self> {
        let config = crate::config::Config::global();
        let api_key: String = config.get_secret("GROQ_API_KEY")?;
        let host: String = config
            .get("GROQ_HOST")
            .unwrap_or_else(|_| GROQ_API_HOST.to_string());

        let client = Client::builder()
            .timeout(Duration::from_secs(600))
            .build()?;

        Ok(Self {
            client,
            host,
            api_key,
            model,
        })
    }

    async fn post(&self, payload: Value) -> anyhow::Result<Value, ProviderError> {
        let url = format!(
            "{}/openai/v1/chat/completions",
            self.host.trim_end_matches('/')
        );

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&payload)
            .send()
            .await?;

        match response.status() {
            StatusCode::OK => Ok(response.json().await.unwrap()),
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                Err(ProviderError::Authentication(format!("Authentication failed. Please ensure your API keys are valid and have the required permissions. \
                    Status: {}. Response: {:?}", response.status(), response.text().await.unwrap_or_default())))
            }
            StatusCode::PAYLOAD_TOO_LARGE => {
                Err(ProviderError::ContextLengthExceeded(response.json().await.unwrap_or_default()))
            }
            StatusCode::INTERNAL_SERVER_ERROR | StatusCode::SERVICE_UNAVAILABLE => {
                Err(ProviderError::ServerError(format!("Server error occurred. Status: {}", response.status())))
            }
            _ => {
                tracing::debug!(
                    "{}", format!("Provider request failed with status: {}. Payload: {}", response.status(), payload)
                );
                Err(ProviderError::RequestFailed(format!("Request failed with status: {}", response.status())))
            }
        }
    }
}

#[async_trait]
impl Provider for GroqProvider {
    fn metadata() -> ProviderMetadata {
        ProviderMetadata::new(
            "groq",
            "Groq",
            "Fast inference with Groq hardware",
            GROQ_DEFAULT_MODEL,
            vec![
                ConfigKey::new("GROQ_API_KEY", true, true, None),
                ConfigKey::new("GROQ_HOST", false, false, Some(GROQ_API_HOST)),
            ],
        )
    }

    fn get_model_config(&self) -> ModelConfig {
        self.model.clone()
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
    ) -> anyhow::Result<(Message, ProviderUsage), ProviderError> {
        let payload = create_request(
            &self.model,
            system,
            messages,
            tools,
            &super::utils::ImageFormat::OpenAi,
        )?;

        let response = self.post(payload.clone()).await?;

        let message = response_to_message(response.clone())?;
        let usage = get_usage(&response)?;
        let model = get_model(&response);
        super::utils::emit_debug_trace(self, &payload, &response, &usage);
        Ok((message, ProviderUsage::new(model, usage)))
    }
}
