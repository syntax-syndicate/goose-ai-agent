// src/lib.rs or tests/truncate_agent_tests.rs

use anyhow::Result;
use futures::StreamExt;
use goose::agents::AgentFactory;
use goose::message::Message;
use goose::model::ModelConfig;
use goose::providers::anthropic::AnthropicProvider;
use goose::providers::base::Provider;
use goose::providers::databricks::DatabricksProvider;
use goose::providers::openai::OpenAiProvider;

// Define the ProviderType enum
enum ProviderType {
    OpenAi,
    Anthropic,
    Databricks,
}

// Helper function to run the test
async fn run_truncate_test(
    provider_type: ProviderType,
    model: &str,
    context_window: usize,
) -> Result<()> {
    // Initialize the appropriate provider
    let model_config = ModelConfig::new(model.to_string());
    let provider: Box<dyn Provider> = match provider_type {
        ProviderType::OpenAi => Box::new(OpenAiProvider::from_env(model_config)?),
        ProviderType::Anthropic => Box::new(AnthropicProvider::from_env(model_config)?),
        ProviderType::Databricks => Box::new(DatabricksProvider::from_env(model_config)?),
    };

    // Initialize the TruncateAgent with the provider
    let agent = AgentFactory::create("truncate", provider).unwrap();

    // Create a message history that exceeds the context window
    let repeat_count = context_window + 10_000;
    let large_message_content = "hello ".repeat(repeat_count);
    let messages = vec![
        Message::user().with_text("hi there. what is 2 + 2?"),
        Message::assistant().with_text("hey! I think it's 4."),
        Message::user().with_text(&large_message_content),
        // Messages before this mark should be truncated
        Message::user().with_text("what's the meaning of life?"),
        Message::assistant().with_text("the meaning of life is 42"),
        Message::user().with_text(
            "did I ask you what's 2+2 in this message history? just respond with 'yes' or 'no'",
        ),
    ];

    // Invoke the reply method
    let reply_stream = agent.reply(&messages).await?;

    // Collect responses from the stream
    tokio::pin!(reply_stream);

    let mut responses = Vec::new();

    while let Some(response_result) = reply_stream.next().await {
        match response_result {
            Ok(response) => {
                responses.push(response);
            }
            Err(e) => {
                println!("Error: {:?}", e);
                return Err(e);
            }
        }
    }

    println!("Responses: {responses:?}\n");
    assert_eq!(responses.len(), 1);
    assert_eq!(responses[0].content.len(), 1);

    let response_text = responses[0].content[0].as_text().unwrap();
    assert!(response_text.to_lowercase().contains("no"));
    assert!(!response_text.to_lowercase().contains("yes"));

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_truncate_agent_with_openai() -> Result<()> {
        std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY is not set");

        println!("Starting truncate test with OpenAI...");
        run_truncate_test(ProviderType::OpenAi, "gpt-4o-mini", 128_000).await
    }

    #[tokio::test]
    #[ignore]
    async fn test_truncate_agent_with_anthropic() -> Result<()> {
        std::env::var("ANTHROPIC_API_KEY").expect("ANTHROPIC_API_KEY is not set");

        println!("Starting truncate test with Anthropic...");
        run_truncate_test(ProviderType::Anthropic, "claude-3-5-haiku-latest", 200_000).await
    }

    #[tokio::test]
    #[ignore]
    async fn test_truncate_agent_with_databricks() -> Result<()> {
        std::env::var("DATABRICKS_HOST").expect("DATABRICKS_HOST is not set");

        println!("Starting truncate test with Databricks...");
        run_truncate_test(ProviderType::Databricks, "gpt-4o-mini", 128_000).await
    }
}
