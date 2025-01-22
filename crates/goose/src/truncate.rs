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

    // Step 5: Check first msg is not an Assistant msg
    if let Some(first_msg) = messages.first() {
        if first_msg.role != Role::User {
            let removed = messages.remove(0);
            let removed_tokens = token_counts.remove(0);
            total_tokens -= removed_tokens;
            println!(
                "Removed non-user message from beginning. Tokens removed: {}. Role: {:?}",
                removed_tokens, removed.role
            );
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
    fn user_text(index: usize, tokens: usize) -> (Message, usize) {
        // The content does not matter for this test
        let content = format!("User message {}", index);
        (Message::user().with_text(content), tokens)
    }

    // Helper function to create an assistant text message with a specified token count
    fn assistant_text(index: usize, tokens: usize) -> (Message, usize) {
        // The content does not matter for this test
        let content = format!("Assistant message {}", index);
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

    // Helper function to create messages with alternating user and assistant 
    // text messages of a fixed token count
    fn create_messages_with_counts(num_pairs: usize, tokens: usize, remove_last: bool) -> (Vec<Message>, Vec<usize>) {
        // the message content themselves do not matter for this test
        let mut messages: Vec<Message> = (0..num_pairs)
            .flat_map(|i| {
                vec![
                    user_text(i*2, tokens).0,
                    assistant_text((i*2)+1, tokens).0,
                ]
            })
            .collect();

        if remove_last {
            messages.pop();
        }

        let token_counts = vec![tokens; messages.len()];
        
        (messages, token_counts)
    }

    // Test OldestFirstTruncation: No truncation needed
    #[test]
    fn test_oldest_first_no_truncation() -> Result<()> {
        let (messages, token_counts) = create_messages_with_counts(1, 10, false);
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
        // 6 msgs - (u, a, u, a, u, a) 
        // first 3 will be removed, leaving us with (a, u, a)
        // but that's an invalid state so we trim a from both sides to get (u) - index 4
        let (messages, token_counts) = create_messages_with_counts(3, 10, false);

        let context_limit = 25; // Need to remove at least two messages

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Expect only the last user msg to be left (index 4)
        let expected_messages = vec![
            messages[4].clone(),
        ];
        let expected_token_counts = vec![10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test MiddleOutTruncation: Truncate from the middle
    #[test]
    fn test_middle_out_truncation() -> Result<()> {
        // 6 msgs - (u, a, u, a, u, a) 
        // middle 3 will be removed, leaving us with (u, a, a)
        // but that's an invalid state so we trim a from both sides to get (u) - index 1
        let (messages, token_counts) = create_messages_with_counts(6, 10, true);
        let context_limit = 30; // Need to remove two messages

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        // Expect only the first user msg to be left (index 0)
        let expected_messages = vec![
            messages[0].clone(),
        ];
        let expected_token_counts = vec![10];
        assert_eq!(messages_clone, expected_messages);
        assert_eq!(token_counts_clone, expected_token_counts);
        Ok(())
    }

    // Test truncation with tool request and response pairs
    #[test]
    fn test_truncation_with_tool_pairs() -> Result<()> {
        let tool_call = ToolCall::new("example_tool", json!({"param": "value"}));
        let messages = vec![
            user_text(1, 10).0,                                // 10 tokens
            assistant_tool_request("tool1", tool_call.clone(), 10).0, // 10 tokens
            user_tool_response("tool1", vec![Content::text("Result".to_string())], 10).0, // 10 tokens
            assistant_text(2, 10).0, // 10 tokens
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

        // Expect the first three messages to be removed because of context limit + the tool pair
        // Assistant text message is left but it gets removed because it's not a user message
        assert_eq!(messages_clone.is_empty(), true);
        assert_eq!(token_counts_clone.is_empty(), true);
        Ok(())
    }

}