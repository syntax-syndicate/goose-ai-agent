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
        Message::user().with_text("hi there. what is 2 + 2?"),
        Message::assistant().with_text("hey! i think its 4."),
        Message::user().with_text(&large_message_content),
        // messages before this mark should be truncated
        Message::user().with_text("what's the meaning of life?"),
        Message::assistant().with_text("the meaning of life is 42"),
        Message::user()
            .with_text("did i ask you what's 2+2 in this msg history? you can answer yes or no"),
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

    println!("Responses: {:?}", responses);

    assert_eq!(responses.len(), 1);
    assert_eq!(responses[0].content.len(), 1);

    let response_text = responses[0].content[0].as_text().unwrap();
    assert!(response_text.to_lowercase().contains("no"));

    Ok(())
}
