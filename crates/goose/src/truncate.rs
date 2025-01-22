use crate::message::Message;
use anyhow::{anyhow, Result};
use mcp_core::Role;
use std::collections::HashSet;

/// Trait representing a truncation strategy
pub trait TruncationStrategy {
    /// Determines the indices of messages to remove to fit within the context limit.
    ///
    /// - `messages`: The list of messages in the conversation.
    /// - `token_counts`: A parallel array containing the token count for each message.
    /// - `context_limit`: The maximum allowed context length in tokens.
    ///
    /// Returns a vector of indices to remove.
    fn determine_indices_to_remove(
        &self,
        messages: &Vec<Message>,
        token_counts: &Vec<usize>,
        context_limit: usize,
    ) -> Result<HashSet<usize>>;
}

/// Strategy to truncate messages by removing the oldest first
pub struct OldestFirstTruncation;

impl TruncationStrategy for OldestFirstTruncation {
    fn determine_indices_to_remove(
        &self,
        messages: &Vec<Message>,
        token_counts: &Vec<usize>,
        context_limit: usize,
    ) -> Result<HashSet<usize>> {
        let mut indices_to_remove = HashSet::new();
        let mut total_tokens: usize = token_counts.iter().sum();
        let mut tool_ids_to_remove = HashSet::new();

        for (i, message) in messages.iter().enumerate() {
            if total_tokens <= context_limit {
                break;
            }

            // Remove the message
            indices_to_remove.insert(i);
            total_tokens -= token_counts[i];
            println!(
                "OldestFirst: Removing message at index {}. Tokens removed: {}",
                i, token_counts[i]
            );

            // If it's a ToolRequest or ToolResponse, mark its pair for removal
            if message.is_tool_call() || message.is_tool_response() {
                if let Some(tool_id) = message.get_tool_id() {
                    tool_ids_to_remove.insert((i, tool_id.to_string()));
                }
            }
        }

        // Now, find and remove paired ToolResponses or ToolRequests
        for (i, message) in messages.iter().enumerate() {
            if let Some(tool_id) = message.get_tool_id() {
                // the other part of the pair has same tool_id but different message index
                if tool_ids_to_remove
                    .iter()
                    .any(|&(idx, ref id)| id == &tool_id && idx != i)
                {
                    indices_to_remove.insert(i);
                    total_tokens -= token_counts[i];
                }
            }
        }

        Ok(indices_to_remove)
    }
}

/// Strategy to truncate messages by removing from the middle outwards
pub struct MiddleOutTruncation;

impl TruncationStrategy for MiddleOutTruncation {
    fn determine_indices_to_remove(
        &self,
        messages: &Vec<Message>,
        token_counts: &Vec<usize>,
        context_limit: usize,
    ) -> Result<HashSet<usize>> {
        let mut indices_to_remove = HashSet::new();
        let mut total_tokens: usize = token_counts.iter().sum();

        let mut tool_ids_to_remove = HashSet::new();
        let mut left = 0;
        let mut right = messages.len().saturating_sub(1);

        while total_tokens > context_limit && left <= right {
            let mid = (left + right) / 2;
            indices_to_remove.insert(mid);
            total_tokens -= token_counts[mid];
            println!(
                "MiddleOut: Removing message at index {}. Tokens removed: {}",
                mid, token_counts[mid]
            );

            // If it's a ToolRequest or ToolResponse, mark its pair for removal
            if messages[mid].is_tool_call() || messages[mid].is_tool_response() {
                if let Some(tool_id) = messages[mid].get_tool_id() {
                    tool_ids_to_remove.insert((mid, tool_id.to_string()));
                }
            }

            // Alternate removal from left and right
            if left < mid {
                left += 1;
            }
            if right > mid {
                right = right.saturating_sub(1);
            }
        }

        // Now, find and remove paired ToolResponses or ToolRequests
        for (i, message) in messages.iter().enumerate() {
            if let Some(tool_id) = message.get_tool_id() {
                // the other part of the pair has same tool_id but different message index
                if tool_ids_to_remove
                    .iter()
                    .any(|&(idx, ref id)| id == &tool_id && idx != i)
                {
                    indices_to_remove.insert(i);
                    total_tokens -= token_counts[i];
                }
            }
        }

        Ok(indices_to_remove)
    }
}

/// Truncates the messages to fit within the model's context window.
/// Mutates the input messages and token counts in place.
/// Returns an error if it's impossible to truncate the messages within the context limit.
/// - messages: The vector of messages in the conversation.
/// - token_counts: A parallel vector containing the token count for each message.
/// - context_limit: The maximum allowed context length in tokens.
/// - strategy: The truncation strategy to use. Either OldestFirstTruncation or MiddleOutTruncation.
pub fn truncate_messages(
    messages: &mut Vec<Message>,
    token_counts: &mut Vec<usize>,
    context_limit: usize,
    strategy: &dyn TruncationStrategy,
) -> Result<()> {
    // Step 1: Calculate total tokens
    let mut total_tokens: usize = token_counts.iter().sum();
    println!("Total tokens before truncation: {}", total_tokens);

    if total_tokens <= context_limit {
        return Ok(()); // No truncation needed
    }

    // Step 2: Determine indices to remove based on strategy
    let indices_to_remove =
        strategy.determine_indices_to_remove(messages, &token_counts, context_limit)?;

    // Step 3: Remove the marked messages
    // Vectorize the set and sort in reverse order to avoid shifting indices when removing
    let mut indices_to_remove = indices_to_remove.iter().cloned().collect::<Vec<usize>>();
    indices_to_remove.sort_unstable_by(|a, b| b.cmp(a));

    for &index in &indices_to_remove {
        if index < messages.len() {
            let removed = messages.remove(index);
            let removed_tokens = token_counts.remove(index);
            total_tokens -= removed_tokens;
            println!(
                "Removed message at index {}. Tokens removed: {}. Role: {:?}",
                index, removed_tokens, removed.role
            );
        }
    }

    // Step 4: Ensure the last message is a user message with TextContent only
    while let Some(last_msg) = messages.last() {
        if last_msg.role != Role::User || !last_msg.has_only_text_content() {
            let removed = messages.pop().ok_or(anyhow!("Failed to pop message"))?;
            let removed_tokens = token_counts
                .pop()
                .ok_or(anyhow!("Failed to pop token count"))?;
            total_tokens -= removed_tokens;
            println!(
                "Removed non-user or non-text message from end. Tokens removed: {}. Role: {:?}",
                removed_tokens, removed.role
            );
        } else {
            break;
        }
    }

    println!("Total tokens after truncation: {}", total_tokens);

    if total_tokens > context_limit {
        return Err(anyhow!(
            "Unable to truncate messages within context window."
        ));
    }

    println!("Truncation complete. Total tokens: {}", total_tokens);
    Ok(())
}

// truncate.rs

#[cfg(test)]
mod tests {
    use super::*;
    use crate::message::Message;
    use anyhow::Result;
    use mcp_core::content::Content;
    use mcp_core::tool::ToolCall;
    use serde_json::json;

    // Helper function to create a user text message with a specified token count
    fn user_text(content: &str, tokens: usize) -> (Message, usize) {
        (Message::user().with_text(content), tokens)
    }

    // Helper function to create an assistant text message with a specified token count
    fn assistant_text(content: &str, tokens: usize) -> (Message, usize) {
        (Message::assistant().with_text(content), tokens)
    }

    // Helper function to create a tool request message with a specified token count
    fn assistant_tool_request(id: &str, tool_call: ToolCall, tokens: usize) -> (Message, usize) {
        (
            Message::assistant().with_tool_request(id, Ok(tool_call)),
            tokens,
        )
    }

    // Helper function to create a tool response message with a specified token count
    fn user_tool_response(id: &str, result: Vec<Content>, tokens: usize) -> (Message, usize) {
        (Message::user().with_tool_response(id, Ok(result)), tokens)
    }

    // Test OldestFirstTruncation: No truncation needed
    #[test]
    fn test_oldest_first_no_truncation() -> Result<()> {
        let messages = vec![user_text("Hello!", 10).0, assistant_text("Hi there!", 10).0];
        let token_counts = vec![10, 10];
        let context_limit = 25; // Total tokens = 20 < 25

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        assert_eq!(messages_clone, messages);
        assert_eq!(token_counts_clone, token_counts);
        Ok(())
    }

    // Test OldestFirstTruncation: Truncate oldest messages first
    #[test]
    fn test_oldest_first_truncation() -> Result<()> {
        let messages = vec![
            user_text("Hello!", 10).0,         // 10 tokens
            assistant_text("Hi there!", 10).0, // 10 tokens
            user_text("How are you?", 10).0,   // 10 tokens
            assistant_text("I'm fine.", 10).0, // 10 tokens
        ];
        let token_counts = vec![10, 10, 10, 10];
        let context_limit = 25; // Need to remove at least two messages

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Expect the first two messages to be removed
        let expected_messages = vec![
            user_text("How are you?", 10).0,
            assistant_text("I'm fine.", 10).0,
        ];
        let expected_token_counts = vec![10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test MiddleOutTruncation: Truncate from the middle
    #[test]
    fn test_middle_out_truncation() -> Result<()> {
        let messages = vec![
            user_text("Msg 1", 10).0,      // 10 tokens
            assistant_text("Msg 2", 10).0, // 10 tokens
            user_text("Msg 3", 10).0,      // 10 tokens
            assistant_text("Msg 4", 10).0, // 10 tokens
            user_text("Msg 5", 10).0,      // 10 tokens
        ];
        let token_counts = vec![10, 10, 10, 10, 10];
        let context_limit = 30; // Need to remove two messages

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        // Expect the middle message(s) to be removed first
        let expected_messages = vec![
            user_text("Msg 1", 10).0,
            assistant_text("Msg 2", 10).0,
            assistant_text("Msg 4", 10).0,
            user_text("Msg 5", 10).0,
        ];
        let expected_token_counts = vec![10, 10, 10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test truncation with tool request and response pairs
    #[test]
    fn test_truncation_with_tool_pairs() -> Result<()> {
        let tool_call = ToolCall::new("example_tool", json!({"param": "value"}));
        let messages = vec![
            user_text("Hello!", 10).0,                                // 10 tokens
            assistant_tool_request("tool1", tool_call.clone(), 10).0, // 10 tokens
            user_tool_response("tool1", vec![Content::text("Result".to_string())], 10).0, // 10 tokens
            assistant_text("How can I assist you?", 10).0, // 10 tokens
        ];
        let token_counts = vec![10, 10, 10, 10];
        let context_limit = 25; // Need to remove at least one message, but tool pair must be removed together

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Expect the first three messages to be removed because of the tool pair
        let expected_messages = vec![assistant_text("How can I assist you?", 10).0];
        let expected_token_counts = vec![10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test truncation when only tool messages exist
    #[test]
    fn test_truncation_only_tool_messages() -> Result<()> {
        let tool_call1 = ToolCall::new("tool1", json!({"param": "value1"}));
        let tool_call2 = ToolCall::new("tool2", json!({"param": "value2"}));
        let messages = vec![
            assistant_tool_request("tool1", tool_call1.clone(), 10).0,
            user_tool_response("tool1", vec![Content::text("Result1")], 10).0,
            assistant_tool_request("tool2", tool_call2.clone(), 10).0,
            user_tool_response("tool2", vec![Content::text("Result2")], 10).0,
        ];
        let token_counts = vec![10, 10, 10, 10];
        let context_limit = 15; // Need to remove at least two messages (one tool pair)

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Expect the first tool pair to be removed
        let expected_messages = vec![
            assistant_tool_request("tool2", tool_call2.clone(), 10).0,
            user_tool_response("tool2", vec![Content::text("Result2".to_string())], 10).0,
        ];
        let expected_token_counts = vec![10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test truncation with the last message not being a user text message
    #[test]
    fn test_truncate_last_message_non_user_text() -> Result<()> {
        let messages = vec![
            user_text("Hello!", 10).0,
            assistant_text("Hi!", 10).0,
            assistant_text("How can I help you?", 10).0,
        ];
        let token_counts = vec![10, 10, 10];
        let context_limit = 20; // Need to remove one message

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // The last message is assistant and not user, so it should be removed
        let expected_messages = vec![user_text("Hello!", 10).0, assistant_text("Hi!", 10).0];
        let expected_token_counts = vec![10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test no messages
    #[test]
    fn test_no_messages() -> Result<()> {
        let messages: Vec<Message> = vec![];
        let token_counts: Vec<usize> = vec![];
        let context_limit = 10;

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        assert!(messages_clone.is_empty());
        assert!(token_counts_clone.is_empty());
        Ok(())
    }

    // Test context limit zero
    #[test]
    fn test_context_limit_zero() -> Result<()> {
        let messages = vec![user_text("Hello!", 10).0, assistant_text("Hi!", 10).0];
        let token_counts = vec![10, 10];
        let context_limit = 0;

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        let result = truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        );

        // Expect an error since it's impossible to fit within context limit
        assert!(result.is_err());
        Ok(())
    }

    // Test truncate_messages with exact context limit
    #[test]
    fn test_truncate_exact_context_limit() -> Result<()> {
        let messages = vec![
            user_text("Hello!", 10).0,         // 10 tokens
            assistant_text("Hi there!", 10).0, // 10 tokens
            user_text("How are you?", 10).0,   // 10 tokens
        ];
        let token_counts = vec![10, 10, 10];
        let context_limit = 30; // Exactly the total tokens

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        assert_eq!(messages_clone, messages);
        assert_eq!(token_counts_clone, token_counts);
        Ok(())
    }

    // Test that the last message is a user text message after truncation
    #[test]
    fn test_last_message_is_user_text() -> Result<()> {
        let messages = vec![
            user_text("Hello!", 10).0,
            assistant_text("Hi!", 10).0,
            assistant_text("How can I assist you?", 10).0,
        ];
        let token_counts = vec![10, 10, 10];
        let context_limit = 20; // Need to remove one message

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // The last message is assistant, which should be removed to make the last message a user message
        let expected_messages = vec![user_text("Hello!", 10).0, assistant_text("Hi!", 10).0];
        let expected_token_counts = vec![10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Additional Tests

    // Test MiddleOutTruncation with tool pairs
    #[test]
    fn test_middle_out_truncation_with_tool_pairs() -> Result<()> {
        let tool_call = ToolCall::new("tool_middle", json!({"param": "value"}));
        let messages = vec![
            user_text("Msg 1", 10).0,                                       // 10 tokens
            assistant_text("Msg 2", 10).0,                                  // 10 tokens
            assistant_tool_request("tool_middle", tool_call.clone(), 10).0, // 10 tokens
            user_tool_response("tool_middle", vec![Content::text("Result")], 10).0, // 10 tokens
            assistant_text("Msg 4", 10).0,                                  // 10 tokens
            user_text("Msg 5", 10).0,                                       // 10 tokens
        ];
        let token_counts = vec![10, 10, 10, 10, 10, 10];
        let context_limit = 40; // Total tokens = 60, need to remove 20 tokens (two messages)

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        // Expect the middle tool pair to be removed
        let expected_messages = vec![
            user_text("Msg 1", 10).0,
            assistant_text("Msg 2", 10).0,
            assistant_text("Msg 4", 10).0,
            user_text("Msg 5", 10).0,
        ];
        let expected_token_counts = vec![10, 10, 10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test removing multiple tool pairs
    #[test]
    fn test_truncation_multiple_tool_pairs() -> Result<()> {
        let tool_call1 = ToolCall::new("tool1", json!({"param": "value1"}));
        let tool_call2 = ToolCall::new("tool2", json!({"param": "value2"}));
        let messages = vec![
            user_text("Hello!", 10).0,                                 // 10 tokens
            assistant_tool_request("tool1", tool_call1.clone(), 10).0, // 10 tokens
            user_tool_response("tool1", vec![Content::text("Result1".to_string())], 10).0, // 10 tokens
            assistant_tool_request("tool2", tool_call2.clone(), 10).0, // 10 tokens
            user_tool_response("tool2", vec![Content::text("Result2".to_string())], 10).0, // 10 tokens
            assistant_text("How can I help?", 10).0, // 10 tokens
        ];
        let token_counts = vec![10, 10, 10, 10, 10, 10];
        let context_limit = 20; // Need to remove four messages (two tool pairs)

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Expect the first two tool pairs to be removed
        let expected_messages = vec![assistant_text("How can I help?", 10).0];
        let expected_token_counts = vec![10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test that removing a tool request without its response is handled correctly
    #[test]
    fn test_truncate_tool_request_without_response() -> Result<()> {
        let tool_call = ToolCall::new("tool1", json!({"param": "value"}));
        let messages = vec![
            user_text("Hello!", 10).0,                                // 10 tokens
            assistant_tool_request("tool1", tool_call.clone(), 10).0, // 10 tokens
            assistant_text("How can I assist?", 10).0,                // 10 tokens
        ];
        let token_counts = vec![10, 10, 10];
        let context_limit = 15; // Need to remove at least one message

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        let result = truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        );

        // Since tool request is removed, but there's no response, it should remove only the tool request
        // Resulting messages should be ["Hello!", "How can I assist?"]
        assert!(result.is_ok());
        let expected_messages = vec![
            user_text("Hello!", 10).0,
            assistant_text("How can I assist?", 10).0,
        ];
        let expected_token_counts = vec![10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test that truncation preserves tool response if tool request is kept
    #[test]
    fn test_truncate_preserve_tool_response_with_request() -> Result<()> {
        let tool_call = ToolCall::new("tool1", json!({"param": "value"}));
        let messages = vec![
            user_text("Hello!", 10).0,                                // 10 tokens
            assistant_text("Hi there!", 10).0,                        // 10 tokens
            assistant_tool_request("tool1", tool_call.clone(), 10).0, // 10 tokens
            user_tool_response("tool1", vec![Content::text("Result".to_string())], 10).0, // 10 tokens
            assistant_text("How can I help you?", 10).0, // 10 tokens
        ];
        let token_counts = vec![10, 10, 10, 10, 10];
        let context_limit = 30; // Total tokens = 50, need to remove 20 tokens (two messages)

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        // MiddleOutTruncation would attempt to remove middle messages first
        // It should remove the tool request and its response together
        let expected_messages = vec![
            user_text("Hello!", 10).0,
            assistant_text("Hi there!", 10).0,
            assistant_text("How can I help you?", 10).0,
        ];
        let expected_token_counts = vec![10, 10, 10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test that truncation fails when even the last user text message exceeds the context limit
    #[test]
    fn test_truncate_fail_due_to_large_last_message() -> Result<()> {
        let messages = vec![
            user_text("Hello!", 10).0,         // 10 tokens
            assistant_text("Hi there!", 10).0, // 10 tokens
            user_text(
                "This is a very long message that cannot be truncated further.",
                50,
            )
            .0, // 50 tokens
        ];
        let token_counts = vec![10, 10, 50];
        let context_limit = 30; // Last message alone exceeds limit

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        let result = truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        );

        // Expect an error since the last user message exceeds the context limit
        assert!(result.is_err());
        Ok(())
    }
}
