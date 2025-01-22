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
        let mut total_tokens: usize = token_counts.iter().sum();
        let mut left = messages.len() / 4; // Start at ~1/4 point
        let mut right = messages.len() * 3 / 4; // End at ~3/4 point

        // Much easier to have user messages on the left
        // and assistant messages on the right
        if left > 0 && messages[left].role == Role::Assistant {
            left = left - 1; // guaranteed to be user since we alternate
        }

        if right < messages.len() - 1 && messages[right].role == Role::User {
            right = right + 1; // guaranteed to be assistant
        }

        // If after removing tokens between 1/4 and 3/4, we would still exceed the context limit,
        // Then its better to just use the oldest first strategy (recent messages are more important)
        let middle_half_tokens = token_counts[left..=right].iter().sum::<usize>();
        if (total_tokens - middle_half_tokens) > context_limit {
            return OldestFirstTruncation.determine_indices_to_remove(
                messages,
                token_counts,
                context_limit,
            );
        }

        // Else, we start from 1/4 and move right towards 3/4
        let mut indices_to_remove = HashSet::new();
        let mut tool_ids_to_remove = HashSet::new();
        let mut i = left;

        while i <= right {
            if total_tokens <= context_limit {
                break;
            }
            let message = &messages[i];
            // Remove the message
            indices_to_remove.insert(i);
            total_tokens -= token_counts[i];
            println!(
                "MiddleOut: Removing message at index {}. Tokens removed: {}",
                i, token_counts[i]
            );

            // If it's a ToolRequest or ToolResponse, mark its pair for removal
            if message.is_tool_call() || message.is_tool_response() {
                if let Some(tool_id) = message.get_tool_id() {
                    tool_ids_to_remove.insert((i, tool_id.to_string()));
                }
            }
            i += 1;
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
    if messages.len() != token_counts.len() {
        return Err(anyhow!(
            "The vector for messages and token_counts must have same length"
        ));
    }

    // Step 1: Calculate total tokens
    let mut total_tokens: usize = token_counts.iter().sum();
    println!("Total tokens before truncation: {}", total_tokens);

    // Check if any individual message is larger than the context limit
    let min_user_msg_tokens = messages
        .iter()
        .zip(token_counts.iter())
        .filter(|(msg, _)| msg.role == Role::User && msg.has_only_text_content())
        .map(|(_, &tokens)| tokens)
        .min();

    // If there are no valid user messages, or the smallest one is too big for the context
    if min_user_msg_tokens.is_none() || min_user_msg_tokens.unwrap() > context_limit {
        return Err(anyhow!(
            "Not possible to truncate messages within context limit"
        ));
    }

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

    // Step 5: Check first msg is a User message with TextContent only
    while let Some(first_msg) = messages.first() {
        if first_msg.role != Role::User || !first_msg.has_only_text_content() {
            let removed = messages.remove(0);
            let removed_tokens = token_counts.remove(0);
            total_tokens -= removed_tokens;
            println!(
                "Removed non-user or non-text message from the start. Tokens removed: {}. Role: {:?}",
                removed_tokens, removed.role
            );
        } else {
            break;
        }
    }

    println!("Total tokens after truncation: {}", total_tokens);

    // Ensure we have at least one message remaining and it's within context limit
    if messages.is_empty() {
        return Err(anyhow!(
            "Unable to preserve any messages within context limit"
        ));
    }

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
        let content = format!("User message {}", index);
        (Message::user().with_text(content), tokens)
    }

    // Helper function to create an assistant text message with a specified token count
    fn assistant_text(index: usize, tokens: usize) -> (Message, usize) {
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
    fn create_messages_with_counts(
        num_pairs: usize,
        tokens: usize,
        remove_last: bool,
    ) -> (Vec<Message>, Vec<usize>) {
        let mut messages: Vec<Message> = (0..num_pairs)
            .flat_map(|i| {
                vec![
                    user_text(i * 2, tokens).0,
                    assistant_text((i * 2) + 1, tokens).0,
                ]
            })
            .collect();

        if remove_last {
            messages.pop();
        }

        let token_counts = vec![tokens; messages.len()];

        (messages, token_counts)
    }

    #[test]
    fn test_oldest_first_no_truncation() -> Result<()> {
        let (messages, token_counts) = create_messages_with_counts(1, 10, false);
        let context_limit = 25;

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

    #[test]
    fn test_complex_conversation_with_tools() -> Result<()> {
        // Simulating a real conversation with multiple tool interactions
        let tool_call1 = ToolCall::new("file_read", json!({"path": "/tmp/test.txt"}));
        let tool_call2 = ToolCall::new("database_query", json!({"query": "SELECT * FROM users"}));

        let messages = vec![
            user_text(1, 15).0, // Initial user query
            assistant_tool_request("tool1", tool_call1.clone(), 20).0,
            user_tool_response(
                "tool1",
                vec![Content::text("File contents".to_string())],
                10,
            )
            .0,
            assistant_text(2, 25).0, // Assistant processes file contents
            user_text(3, 10).0,      // User follow-up
            assistant_tool_request("tool2", tool_call2.clone(), 30).0,
            user_tool_response(
                "tool2",
                vec![Content::text("Query results".to_string())],
                20,
            )
            .0,
            assistant_text(4, 35).0, // Assistant analyzes query results
            user_text(5, 5).0,       // Final user confirmation
        ];

        let token_counts = vec![15, 20, 10, 25, 10, 30, 20, 35, 5];
        let context_limit = 100; // Force truncation while preserving some tool interactions

        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Verify that tool pairs are kept together and the conversation remains coherent
        assert!(messages_clone.len() >= 3); // At least one complete interaction should remain
        assert!(messages_clone.last().unwrap().role == Role::User); // Last message should be from user

        // Verify tool pairs are either both present or both removed
        let tool_ids: HashSet<_> = messages_clone
            .iter()
            .filter_map(|m| m.get_tool_id())
            .collect();

        // Each tool ID should appear 0 or 2 times (request + response)
        for id in tool_ids {
            let count = messages_clone
                .iter()
                .filter(|m| m.get_tool_id() == Some(id))
                .count();
            assert!(count == 0 || count == 2, "Tool pair was split: {}", id);
        }

        Ok(())
    }

    #[test]
    fn test_edge_case_context_window() -> Result<()> {
        // Test case where we're exactly at the context limit
        let (mut messages, mut token_counts) = create_messages_with_counts(2, 25, false);
        let context_limit = 100; // Exactly matches total tokens

        truncate_messages(
            &mut messages,
            &mut token_counts,
            context_limit,
            &OldestFirstTruncation,
        )?;

        assert_eq!(messages.len(), 4); // No truncation needed
        assert_eq!(token_counts.iter().sum::<usize>(), 100);

        // Now add one more token to force truncation
        messages.push(user_text(5, 1).0);
        token_counts.push(1);

        truncate_messages(
            &mut messages,
            &mut token_counts,
            context_limit,
            &OldestFirstTruncation,
        )?;

        assert!(token_counts.iter().sum::<usize>() <= context_limit);
        assert!(messages.last().unwrap().role == Role::User);

        Ok(())
    }

    #[test]
    fn test_multi_tool_chain() -> Result<()> {
        // Simulate a chain of dependent tool calls
        let tool_calls = vec![
            ToolCall::new("git_status", json!({})),
            ToolCall::new("git_diff", json!({"file": "main.rs"})),
            ToolCall::new("git_commit", json!({"message": "Update"})),
        ];

        let mut messages = Vec::new();
        let mut token_counts = Vec::new();

        // Build a chain of related tool calls
        // 30 tokens each round
        for (i, tool_call) in tool_calls.into_iter().enumerate() {
            let id = format!("git_{}", i);
            messages.push(user_text(i, 10).0);
            token_counts.push(10);

            messages.push(assistant_tool_request(&id, tool_call, 15).0);
            token_counts.push(20);
        }

        let context_limit = 50; // Force partial truncation
        let mut messages_clone = messages.clone();
        let mut token_counts_clone = token_counts.clone();

        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Verify that remaining tool chains are complete
        let remaining_tool_ids: HashSet<_> = messages_clone
            .iter()
            .filter_map(|m| m.get_tool_id())
            .collect();

        for id in remaining_tool_ids {
            // Count request/response pairs
            let requests = messages_clone
                .iter()
                .filter(|m| m.is_tool_call() && m.get_tool_id() == Some(id))
                .count();
            let responses = messages_clone
                .iter()
                .filter(|m| m.is_tool_response() && m.get_tool_id() == Some(id))
                .count();

            assert_eq!(requests, 1, "Each remaining tool should have one request");
            assert_eq!(responses, 1, "Each remaining tool should have one response");
        }

        Ok(())
    }

    #[test]
    fn test_truncation_with_image_content() -> Result<()> {
        // Create a conversation with image content mixed in
        let mut messages = vec![
            Message::user().with_image("base64_data", "image/png"), // 50 tokens
            Message::assistant().with_text("I see the image"),      // 10 tokens
            Message::user().with_text("Can you describe it?"),      // 10 tokens
            Message::assistant().with_text("It shows..."),          // 20 tokens
            Message::user().with_text("Thanks!"),                   // 5 tokens
        ];
        let mut token_counts = vec![50, 10, 10, 20, 5];
        let context_limit = 45; // Force truncation

        truncate_messages(
            &mut messages,
            &mut token_counts,
            context_limit,
            &OldestFirstTruncation,
        )?;

        // Verify the conversation still makes sense
        assert!(messages.len() >= 1);
        assert!(messages.last().unwrap().role == Role::User);
        assert!(token_counts.iter().sum::<usize>() <= context_limit);

        Ok(())
    }

    #[test]
    fn test_error_cases() -> Result<()> {
        // Test impossibly small context window
        let (mut messages, mut token_counts) = create_messages_with_counts(1, 10, false);
        let result = truncate_messages(
            &mut messages,
            &mut token_counts,
            5, // Impossibly small context
            &OldestFirstTruncation,
        );
        assert!(result.is_err());

        // Test unmatched token counts
        let mut messages = vec![user_text(1, 10).0];
        let mut token_counts = vec![10, 10]; // Mismatched length
        let result = truncate_messages(
            &mut messages,
            &mut token_counts,
            100,
            &OldestFirstTruncation,
        );
        assert!(result.is_err());

        Ok(())
    }

    #[test]
    fn test_middle_out_role_alternation() -> Result<()> {
        // Create a conversation with 8 messages (U,A,U,A,U,A,U,A)
        let messages = vec![
            user_text(1, 10).0,      // 0: Keep
            assistant_text(1, 10).0, // 1: Keep
            user_text(2, 20).0,      // 2: Remove
            assistant_text(2, 20).0, // 3: Remove
            user_text(3, 20).0,      // 4: Remove
            assistant_text(3, 20).0, // 5: Remove
            user_text(4, 10).0,      // 6: Keep
            assistant_text(4, 10).0, // 7: Keep but will be removed as non-user end
        ];
        let token_counts = vec![10, 10, 20, 20, 20, 20, 10, 10];
        let context_limit = 50; // Forces middle messages to be removed

        let mut messages_clone = messages;
        let mut token_counts_clone = token_counts;
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        // Check that messages still alternate
        let mut last_role = None;
        for msg in &messages_clone {
            if let Some(prev_role) = last_role {
                assert_ne!(prev_role, msg.role, "Messages must alternate roles");
            }
            last_role = Some(msg.role.clone());
        }

        // Verify we end with a user message
        assert!(messages_clone.last().unwrap().role == Role::User);

        // Verify we're within context limit
        assert!(token_counts_clone.iter().sum::<usize>() <= context_limit);

        Ok(())
    }

    #[test]
    fn test_middle_out_tool_pairs() -> Result<()> {
        // Create a conversation with multiple tool interactions in the middle
        let tool_call1 = ToolCall::new("tool1", json!({"action": "read"}));
        let tool_call2 = ToolCall::new("tool2", json!({"action": "write"}));

        let messages = vec![
            user_text(1, 10).0,                                // Initial message
            assistant_text(1, 10).0,                           // Assistant acknowledgment
            user_text(2, 10).0,                                // User request
            assistant_tool_request("tool1", tool_call1, 20).0, // First tool request
            user_tool_response("tool1", vec![Content::text("Result 1".to_string())], 15).0,
            assistant_tool_request("tool2", tool_call2, 20).0, // Second tool request
            user_tool_response("tool2", vec![Content::text("Result 2".to_string())], 15).0,
            assistant_text(2, 10).0, // Final response
            user_text(3, 10).0,      // Final confirmation
        ];

        let token_counts = vec![10, 10, 10, 20, 15, 20, 15, 10, 10];
        let context_limit = 60; // Force significant truncation

        let mut messages_clone = messages;
        let mut token_counts_clone = token_counts;
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        // Check tool pairs are either both present or both removed
        let tool_ids: HashSet<_> = messages_clone
            .iter()
            .filter_map(|m| m.get_tool_id())
            .collect();

        for id in tool_ids {
            let requests = messages_clone
                .iter()
                .filter(|m| m.is_tool_call() && m.get_tool_id() == Some(id))
                .count();
            let responses = messages_clone
                .iter()
                .filter(|m| m.is_tool_response() && m.get_tool_id() == Some(id))
                .count();

            assert_eq!(
                requests, responses,
                "Tool request/response pairs must stay together for id: {}",
                id
            );
            assert!(
                requests <= 1,
                "Should not have duplicate tool requests for id: {}",
                id
            );
        }

        Ok(())
    }

    #[test]
    fn test_middle_out_complex_scenario() -> Result<()> {
        // Create a complex conversation with tool calls and varying token lengths
        let tool_call = ToolCall::new("analyze", json!({"data": "test"}));

        let messages = vec![
            user_text(1, 5).0,       // Short initial message
            assistant_text(1, 20).0, // Longer response
            user_text(2, 30).0,      // Even longer message
            assistant_tool_request("analyze", tool_call, 15).0,
            user_tool_response("analyze", vec![Content::text("OK".to_string())], 10).0,
            assistant_text(2, 25).0,
            user_text(3, 5).0, // Short final message
        ];

        let token_counts = vec![5, 20, 30, 15, 10, 25, 5];
        let total_tokens: usize = token_counts.iter().sum();
        let context_limit = total_tokens / 2; // Force removal of about half the messages

        let mut messages_clone = messages;
        let mut token_counts_clone = token_counts;
        truncate_messages(
            &mut messages_clone,
            &mut token_counts_clone,
            context_limit,
            &MiddleOutTruncation,
        )?;

        println!("messages_clone: {:?}", messages_clone);

        // Verify basic requirements
        assert!(!messages_clone.is_empty());
        assert_eq!(messages_clone.len(), token_counts_clone.len());
        assert!(token_counts_clone.iter().sum::<usize>() <= context_limit);
        assert!(messages_clone.last().unwrap().role == Role::User);

        // Verify role alternation
        let mut last_role = None;
        for msg in &messages_clone {
            if let Some(prev_role) = last_role {
                assert_ne!(prev_role, msg.role, "Messages must alternate roles");
            }
            last_role = Some(msg.role.clone());
        }

        // Verify tool pairs
        let tool_requests = messages_clone.iter().filter(|m| m.is_tool_call()).count();
        let tool_responses = messages_clone
            .iter()
            .filter(|m| m.is_tool_response())
            .count();
        assert_eq!(
            tool_requests, tool_responses,
            "Tool requests and responses must be paired"
        );

        Ok(())
    }
}
