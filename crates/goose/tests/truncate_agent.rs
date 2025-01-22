use anyhow::Result;
use futures::StreamExt;

use goose::agents::AgentFactory;
use goose::message::Message;

use goose::providers::openai::OpenAiProvider;

#[tokio::test]
#[ignore]
async fn test_truncate_agent_truncates_messages_when_context_exceeded() -> Result<()> {
    let provider = OpenAiProvider::new("gpt-4o-mini".to_string(), Some(30))?;

    // Initialize the TruncateAgent with the mock provider
    let agent = AgentFactory::create("truncate", Box::new(provider)).unwrap();

    // Create a message history that exceeds the context window
    // For example, 130,000 "hello " messages
    // 130,000 tokens cause we know context window is 128,000
    let large_message_content = "hello ".repeat(130_000);
    let messages = vec![
        Message::user().with_text("hi there"),
        Message::assistant().with_text("hey! how are you? did you have a question for me?"),
        Message::user().with_text(&large_message_content),
    ];

    // Invoke the reply method
    let reply_stream = agent.reply(&messages).await?;

    // Collect responses from the stream
    tokio::pin!(reply_stream);

    let mut responses = Vec::new();

    while let Some(response_result) = reply_stream.next().await {
        match response_result {
            Ok(response) => {
                // println!("Response: {:?}", response);
                responses.push(response);
            }
            Err(e) => {
                println!("Error: {:?}", e);
                return Err(e);
            }
        }
    }

    println!("Responses: {:?}", responses);

    // Assert that truncation occurred by checking the number of messages
    // The agent should have truncated the messages and provided a response
    // Depending on your truncation logic, adjust the expected number of messages

    // For example, after truncation, the total tokens should be <= context_window
    // Since each message contributes 1 token, expect at most 128,000 messages

    // Here, we simulate that after truncation, the agent successfully processed the messages
    // and returned the mock response

    // Since our mock provider immediately returns an error if tokens exceed the limit,
    // and the agent truncates and retries, we expect one truncation and one response

    assert_eq!(responses.len(), 1);
    assert_eq!(responses[0].content.len(), 1);

    Ok(())
}
