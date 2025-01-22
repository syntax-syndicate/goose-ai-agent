use super::errors::ProviderError;
use crate::message::Message;
use crate::providers::base::{Provider, ProviderUsage, Usage};
use crate::providers::configs::ModelConfig;
use crate::providers::formats::openai::{create_request, get_usage, response_to_message};
use crate::providers::utils::{get_model, handle_response_openai_compat};
use anyhow::Result;
use async_trait::async_trait;
use mcp_core::Tool;
use reqwest::Client;
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

impl GroqProvider {
    pub fn from_env() -> Result<Self> {
        let api_key = crate::key_manager::get_keyring_secret("GROQ_API_KEY", Default::default())?;
        let host = std::env::var("GROQ_HOST").unwrap_or_else(|_| GROQ_API_HOST.to_string());
        let model_name =
            std::env::var("GROQ_MODEL").unwrap_or_else(|_| GROQ_DEFAULT_MODEL.to_string());

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
            .await
            .unwrap();

        // https://console.groq.com/docs/openai
        handle_response_openai_compat(payload, response).await
    }
}

#[async_trait]
impl Provider for GroqProvider {
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
    ) -> anyhow::Result<(Message, ProviderUsage), ProviderError> {
        let payload = create_request(
            &self.model,
            system,
            messages,
            tools,
            &super::utils::ImageFormat::OpenAi,
        )
        .unwrap();

        let response = self.post(payload.clone()).await?;

        let message = response_to_message(response.clone()).unwrap();
        let usage = self.get_usage(&response).unwrap();
        let model = get_model(&response);
        super::utils::emit_debug_trace(self, &payload, &response, &usage);
        Ok((message, ProviderUsage::new(model, usage)))
    }

    fn get_usage(&self, data: &Value) -> anyhow::Result<Usage> {
        get_usage(data)
    }
}
